import { prisma } from '@/lib/prisma'
import type { AccountKind } from '@/types/accountKind'

export type CreateUserInput = {
  loginId: string
  email: string
  name: string
  password: string
  verifyToken: string
  accountKind: AccountKind
}

// loginId로 유저 존재 확인
export async function findUserByLoginId(loginId: string) {
  return prisma.user.findUnique({ where: { loginId }, select: { id: true } })
}

// 이메일로 유저 존재 확인
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email }, select: { id: true } })
}

// 이메일로 유저 조회 (이메일 인증 여부 포함)
export async function findUserByEmailWithVerification(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  })
}

// 이메일로 로그인 아이디와 이름 조회
export async function findLoginIdByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { name: true, loginId: true },
  })
}

// 비밀번호 재설정 토큰으로 유저 조회
export async function findUserByPasswordResetToken(token: string) {
  return prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gt: new Date() },
    },
    select: { id: true },
  })
}

// 이메일 인증 토큰으로 유저 조회
export async function findUserByVerifyToken(token: string) {
  return prisma.user.findFirst({ where: { verifyToken: token } })
}

// ID로 유저 기본 존재 확인
export async function findUserById(id: number) {
  return prisma.user.findUnique({ where: { id }, select: { id: true } })
}

// ID로 유저 조회 (계정 삭제용)
export async function findUserForDelete(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: { password: true, emailVerified: true, isAdmin: true },
  })
}

// ID로 유저 조회 (학생 인증용)
export async function findUserForStudentVerify(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: { accountKind: true, studentVerifiedAt: true, isAdmin: true, name: true },
  })
}

// 유저 생성
export async function createUser(data: CreateUserInput) {
  return prisma.user.create({ data })
}

// 비밀번호 재설정
export async function updatePasswordById(id: number, hashedPassword: string) {
  return prisma.user.update({
    where: { id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  })
}

// 비밀번호 재설정 토큰 저장
export async function setPasswordResetToken(id: number, token: string, expires: Date) {
  return prisma.user.update({
    where: { id },
    data: { passwordResetToken: token, passwordResetExpires: expires },
  })
}

// 비밀번호 재설정 토큰 초기화 (발송 실패 롤백용)
export async function clearPasswordResetToken(id: number) {
  return prisma.user.update({
    where: { id },
    data: { passwordResetToken: null, passwordResetExpires: null },
  })
}

// 이메일 인증 완료 처리
export async function verifyUserEmail(id: number) {
  return prisma.user.update({
    where: { id },
    data: { emailVerified: true, verifyToken: null },
  })
}

// 학생 인증 완료 처리
export async function setStudentVerified(id: number, schoolName: string) {
  return prisma.user.update({
    where: { id },
    data: { studentVerifiedAt: new Date(), verifiedSchoolName: schoolName },
  })
}

// 유저 삭제 (시험 후기 먼저 삭제 후 유저 삭제, 트랜잭션)
export async function deleteUserWithReviews(id: number) {
  return prisma.$transaction(async (tx) => {
    await tx.examReview.deleteMany({ where: { createdByUserId: id } })
    await tx.user.delete({ where: { id } })
  })
}
