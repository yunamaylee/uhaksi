import { NextRequest, NextResponse } from 'next/server'
import { findSchoolWithNeisById, findSchoolWithNeisByName } from '@/lib/repositories/school'
import { extractExamPeriodsFromNeis } from '@/lib/neisExam'
import { resolveNeisSchoolCodesByAddress } from '@/lib/neisSchool'

export async function GET(request: NextRequest) {
  try {
    const schoolIdParam = request.nextUrl.searchParams.get('schoolId')
    const schoolName = request.nextUrl.searchParams.get('school')
    if (!schoolIdParam && !schoolName) return NextResponse.json([])

    const school = schoolIdParam
      ? await findSchoolWithNeisById(Number(schoolIdParam))
      : await findSchoolWithNeisByName(schoolName ?? '')

    const apiKey = process.env.NEIS_API_KEY ?? ''

    // 같은 이름의 학교가 여러 지역에 존재할 수 있어 주소 기반으로 NEIS 코드를 재결정
    const resolved = await resolveNeisSchoolCodesByAddress({
      apiKey,
      schoolName: school?.name ?? schoolName ?? '',
      address: school?.address,
    })

    const neisRegionCode = resolved?.neisRegionCode ?? school?.neisRegionCode
    const neisCode = resolved?.neisCode ?? school?.neisCode

    if (!neisCode || !neisRegionCode) return NextResponse.json([])

    const year = new Date().getFullYear()
    const url = `https://open.neis.go.kr/hub/SchoolSchedule?KEY=${process.env.NEIS_API_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${neisRegionCode}&SD_SCHUL_CODE=${neisCode}&AA_FROM_YMD=${year}0101&AA_TO_YMD=${year}1231`

    const res = await fetch(url)
    const data = await res.json()

    if (!data.SchoolSchedule) return NextResponse.json([])

    const rows = data.SchoolSchedule[1].row
    return NextResponse.json(extractExamPeriodsFromNeis(rows))
  } catch (e) {
    console.error('GET /api/search/schedule 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
