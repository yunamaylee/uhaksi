import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'
import { RateLimitError } from '@/lib/services/errors'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type ParsedSubject = {
  date: string
  grade: number
  period: number
  subject: string
}

// Anthropic API 응답에서 HTTP 상태코드 추출
function getStatus(err: unknown): number | null {
  if (typeof err !== 'object' || err === null) return null
  const anyErr = err as { status?: unknown; response?: { status?: unknown } }
  const status = anyErr?.status ?? anyErr?.response?.status
  return typeof status === 'number' ? status : null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 레이트리밋 재시도 포함 메시지 생성
async function createMessageWithRetry(args: Anthropic.Messages.MessageCreateParamsNonStreaming) {
  const maxAttempts = 3
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await client.messages.create(args)
    } catch (e) {
      const status = getStatus(e)
      const retryable = status === 429 || status === 529 || status === 503
      if (!retryable || attempt === maxAttempts) throw e
      const base = Math.min(2000, 400 * Math.pow(2, attempt - 1))
      const jitter = Math.floor(Math.random() * 150)
      await sleep(base + jitter)
    }
  }
  throw new Error('unreachable')
}

// 시험 시간표 이미지를 AI로 파싱하여 과목 목록 반환
export async function parseExamFromImage(
  buffer: Buffer,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
  dates: string[],
): Promise<{ subjects: ParsedSubject[] }> {
  try {
    const base64 = buffer.toString('base64')

    const enhancedPng = await sharp(buffer)
      .rotate()
      .resize({ width: 1800, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer()
    const enhancedBase64 = enhancedPng.toString('base64')

    const datesText =
      dates.length > 0
        ? `시험 날짜 목록 (순서대로): ${dates.join(', ')}`
        : '날짜가 제공되지 않았습니다. 이미지에서 날짜를 직접 추출하세요.'

    const response = await createMessageWithRetry({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: enhancedBase64 } },
            {
              type: 'text',
              text: `이 이미지는 학교 시험 시간표입니다. 첫 번째는 원본, 두 번째는 대비를 높인(흑백) 버전입니다. 더 잘 보이는 버전을 기준으로 읽으세요.

${datesText}

표에서 학년별, 교시별, 날짜별 과목 정보를 추출해서 아래 JSON 형식으로만 반환하세요.
다른 텍스트나 설명 없이 JSON만 반환하세요.

{
  "subjects": [
    {
      "date": "YYYYMMDD 형식",
      "grade": 학년 숫자 (1, 2, 3),
      "period": 교시 숫자 (1, 2, 3, 4),
      "subject": "과목명"
    }
  ]
}

규칙:
- 날짜 목록이 제공된 경우, 표의 열 순서대로 날짜를 매핑하세요
- 표에 날짜 텍스트가 잘 안 보이면, 제공된 날짜 목록의 순서를 우선으로 사용하세요
- 날짜는 YYYYMMDD 형식
- 학년은 숫자만 (1, 2, 3)
- 교시는 숫자만 (1, 2, 3, 4)
- 과목명만 추출 (괄호 안 숫자 제거)
- 빈 칸은 포함하지 마세요
- JSON만 반환, 절대 다른 텍스트 없이`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.')

    return JSON.parse(jsonMatch[0]) as { subjects: ParsedSubject[] }
  } catch (e) {
    const status = getStatus(e)
    if (status === 429 || status === 529 || status === 503) {
      throw new RateLimitError('AI 서버가 혼잡합니다. 잠시 후 다시 시도해주세요.')
    }
    throw e
  }
}
