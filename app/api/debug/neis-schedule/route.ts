import { NextRequest, NextResponse } from 'next/server'
import { findSchoolNeisByName } from '@/lib/repositories/school'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const schoolName = request.nextUrl.searchParams.get('school')
    const from = request.nextUrl.searchParams.get('from')
    const to = request.nextUrl.searchParams.get('to')

    if (!schoolName) return NextResponse.json({ error: 'school is required' }, { status: 400 })

    const school = await findSchoolNeisByName(schoolName)

    if (!school?.neisCode || !school?.neisRegionCode) {
      return NextResponse.json({ error: 'school missing neis codes' }, { status: 404 })
    }

    const year = new Date().getFullYear()
    const aaFrom = from ?? `${year}0101`
    const aaTo = to ?? `${year}1231`

    const url =
      `https://open.neis.go.kr/hub/SchoolSchedule?` +
      `KEY=${process.env.NEIS_API_KEY}` +
      `&Type=json` +
      `&pIndex=1&pSize=1000` +
      `&ATPT_OFCDC_SC_CODE=${school.neisRegionCode}` +
      `&SD_SCHUL_CODE=${school.neisCode}` +
      `&AA_FROM_YMD=${aaFrom}` +
      `&AA_TO_YMD=${aaTo}`

    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    const rows = (data?.SchoolSchedule?.[1]?.row ?? []) as Array<{
      AA_YMD: string
      EVENT_NM: string
      EVENT_CNTNT?: string
    }>

    const candidates = rows.filter((row) => /(중간|기말|지필|고사|시험|평가)/.test(row.EVENT_NM))

    return NextResponse.json({
      school: { name: schoolName, ...school },
      range: { from: aaFrom, to: aaTo },
      total: rows.length,
      candidates: candidates
        .sort((a, b) => (a.AA_YMD + a.EVENT_NM).localeCompare(b.AA_YMD + b.EVENT_NM))
        .map((row) => ({ AA_YMD: row.AA_YMD, EVENT_NM: row.EVENT_NM, EVENT_CNTNT: row.EVENT_CNTNT })),
    })
  } catch (e) {
    console.error('GET /api/debug/neis-schedule 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
