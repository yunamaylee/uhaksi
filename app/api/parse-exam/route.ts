import { NextRequest, NextResponse } from 'next/server'
import { parseExamFromImage } from '@/lib/services/parseExam'
import { RateLimitError, httpStatusFromError } from '@/lib/services/errors'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File
    const datesJson = formData.get('dates') as string
    const dates: string[] = datesJson ? JSON.parse(datesJson) : []

    if (!file) {
      return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp'

    const result = await parseExamFromImage(buffer, mediaType, dates)

    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json(
        { error: e.message },
        { status: httpStatusFromError(e), headers: { 'Retry-After': '30' } },
      )
    }
    console.error('POST /api/parse-exam 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
