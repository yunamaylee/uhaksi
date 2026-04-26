import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { Resend } from 'resend'
import * as userRepo from '@/lib/repositories/user'
import { LOGIN_ID_RE, normalizeLoginId } from '@/lib/loginId'
import { RESEND_FROM, RESEND_REPLY_TO } from '@/lib/resendFrom'
import { NotFoundError, ForbiddenError, ValidationError, MailDeliveryError } from '@/lib/services/errors'
import { verifyStudentIdWithVision } from '@/lib/visionModeration'
import { normalizePersonNameForMatch } from '@/lib/personName'
import type { AccountKind } from '@/types/accountKind'

export type RegisterUserParams = {
  loginId: string
  email: string
  password: string
  name: string
  accountKind: AccountKind
}

// 회원가입 (중복 확인 → 생성 → 인증 이메일 발송)
export async function registerUser(params: RegisterUserParams): Promise<void> {
  const { loginId, email, password, name, accountKind } = params

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY 누락')

  const [byLogin, byEmail] = await Promise.all([
    userRepo.findUserByLoginId(loginId),
    userRepo.findUserByEmail(email),
  ])
  if (byLogin) throw new ValidationError('이미 사용 중인 아이디예요.')
  if (byEmail) throw new ValidationError('이미 가입된 이메일입니다.')

  const hashedPassword = await bcrypt.hash(password, 12)
  const verifyToken = crypto.randomBytes(32).toString('hex')

  await userRepo.createUser({ loginId, email, name, password: hashedPassword, verifyToken, accountKind })

  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify?token=${verifyToken}`
  const resend = new Resend(apiKey)

  await resend.emails.send({
    from: RESEND_FROM,
    replyTo: RESEND_REPLY_TO,
    to: email,
    subject: '우리학교시험 이메일 인증',
    text: [
      '이메일 인증',
      '',
      '아래 링크를 브라우저 주소창에 붙여 넣어 인증을 완료해 주세요.',
      verifyUrl,
      '',
      '링크는 24시간 동안 유효합니다.',
    ].join('\n'),
    html: `
      <h2>이메일 인증</h2>
      <p>아래 버튼을 클릭해서 이메일 인증을 완료해주세요.</p>
      <a href="${verifyUrl}" style="background:#3a7d52;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
        이메일 인증하기
      </a>
      <p style="color:#888;font-size:12px;margin-top:16px;">링크는 24시간 동안 유효합니다.</p>
      <p style="color:#888;font-size:12px;margin-top:8px;">버튼이 안 보이면 이 링크를 복사해 주세요:<br/>${verifyUrl}</p>
    `,
  })
}

// 비밀번호 재설정 이메일 발송 (존재·인증 여부를 응답으로 구분하지 않음)
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY 누락')

  const user = await userRepo.findUserByEmailWithVerification(email)
  if (!user || !user.emailVerified) return

  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 60 * 60 * 1000)

  await userRepo.setPasswordResetToken(user.id, token, expires)

  const resetUrl = `${process.env.NEXTAUTH_URL ?? ''}/reset-password?token=${encodeURIComponent(token)}`
  const resend = new Resend(apiKey)

  try {
    await resend.emails.send({
      from: RESEND_FROM,
      replyTo: RESEND_REPLY_TO,
      to: email,
      subject: '우리학교시험 비밀번호 재설정',
      text: [
        '비밀번호 재설정',
        '',
        '아래 링크를 브라우저 주소창에 붙여 넣어 새 비밀번호를 설정해 주세요.',
        resetUrl,
        '',
        '링크는 1시간 동안만 유효합니다.',
      ].join('\n'),
      html: `
        <h2>비밀번호 재설정</h2>
        <p>아래 버튼을 눌러 새 비밀번호를 설정해주세요.</p>
        <a href="${resetUrl}" style="background:#ff6f0f;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
          비밀번호 재설정하기
        </a>
        <p style="color:#888;font-size:12px;margin-top:16px;">링크는 1시간 동안만 유효합니다.</p>
        <p style="color:#888;font-size:12px;margin-top:8px;">버튼이 안 보이면 이 링크를 복사해 주세요:<br/>${resetUrl}</p>
      `,
    })
  } catch {
    await userRepo.clearPasswordResetToken(user.id)
    throw new MailDeliveryError('메일 발송에 실패했어요. 잠시 후 다시 시도해주세요.')
  }
}

// 비밀번호 재설정 실행
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const user = await userRepo.findUserByPasswordResetToken(token)
  if (!user) throw new ValidationError('링크가 만료됐거나 이미 사용됐어요. 다시 비밀번호 찾기를 진행해주세요.')

  const hashedPassword = await bcrypt.hash(newPassword, 12)
  await userRepo.updatePasswordById(user.id, hashedPassword)
}

// 이메일 인증 처리
export async function verifyEmail(token: string): Promise<void> {
  const user = await userRepo.findUserByVerifyToken(token)
  if (!user) throw new NotFoundError('유효하지 않은 인증 토큰입니다.')

  await userRepo.verifyUserEmail(user.id)
}

// 이름+이메일로 로그인 아이디 찾기
export async function findLoginId(name: string, email: string): Promise<string> {
  const user = await userRepo.findLoginIdByEmail(email)
  if (!user || user.name.trim() !== name) throw new NotFoundError('이름과 이메일이 일치하는 계정을 찾지 못했어요.')

  return user.loginId
}

// 아이디 사용 가능 여부 확인
export async function checkLoginIdAvailability(
  rawLoginId: string,
): Promise<{ available: boolean; reason: 'empty' | 'format' | 'taken' | 'ok' }> {
  const loginId = normalizeLoginId(rawLoginId)

  if (!loginId) return { available: false, reason: 'empty' }
  if (!LOGIN_ID_RE.test(loginId)) return { available: false, reason: 'format' }

  const existing = await userRepo.findUserByLoginId(loginId)
  if (existing) return { available: false, reason: 'taken' }

  return { available: true, reason: 'ok' }
}

// 계정 탈퇴 (비밀번호 확인 후 삭제)
export async function deleteAccount(userId: number, password: string): Promise<void> {
  const user = await userRepo.findUserForDelete(userId)
  if (!user) throw new NotFoundError('사용자를 찾을 수 없습니다.')
  if (user.isAdmin) throw new ForbiddenError('관리자 계정은 이 경로로 탈퇴할 수 없어요. 운영 측에 문의해 주세요.')
  if (!user.emailVerified) throw new ForbiddenError('이메일 인증을 완료한 뒤 탈퇴할 수 있어요.')

  const passwordMatch = await bcrypt.compare(password, user.password)
  if (!passwordMatch) throw new ValidationError('비밀번호가 올바르지 않아요.')

  await userRepo.deleteUserWithReviews(userId)
}

// 학생증 인증 처리
export async function verifyStudentAccount(
  userId: number,
  base64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<{ schoolName: string }> {
  const user = await userRepo.findUserForStudentVerify(userId)
  if (!user) throw new NotFoundError('사용자를 찾을 수 없습니다.')
  if (user.isAdmin) throw new ForbiddenError('관리자 계정은 학생증 인증 없이 커뮤니티를 이용할 수 있어요.')
  if (user.accountKind !== 'STUDENT') throw new ForbiddenError('학생으로 가입한 계정만 학생증 인증을 할 수 있어요.')
  if (user.studentVerifiedAt) throw new ValidationError('이미 인증이 완료된 계정이에요.')

  const vision = await verifyStudentIdWithVision(base64, mediaType)
  if (!vision.ok || !vision.schoolName || !vision.studentName) {
    throw new ValidationError(vision.reason || '학생증으로 확인되지 않았어요. 더 선명한 사진으로 다시 시도해 주세요.')
  }

  const expectedName = normalizePersonNameForMatch(user.name)
  const cardName = normalizePersonNameForMatch(vision.studentName)
  if (!expectedName || expectedName !== cardName) {
    throw new ValidationError(
      '학생증에 보이는 이름이 가입 시 입력한 이름과 일치하지 않아요. 이름을 본명으로 가입 정보와 맞춘 뒤 다시 시도해 주세요.',
    )
  }

  await userRepo.setStudentVerified(userId, vision.schoolName)
  return { schoolName: vision.schoolName }
}
