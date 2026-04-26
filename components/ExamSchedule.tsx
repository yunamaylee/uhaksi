import ExamAccordion from '@/components/ExamAccordion'
import { extractExamPeriodsFromNeis, type NeisScheduleRow } from '@/lib/neisExam'
import { resolveNeisSchoolCodesByAddress } from '@/lib/neisSchool'
import { findExamsBySchoolId } from '@/lib/repositories/exam'
import { loadExamAggBundlesForExams } from '@/lib/examReviewAggregatesForSchool'

type ExamPeriod = {
  name: string
  dates: string[]
  startDate: string
  endDate: string
}

type Props = {
  schoolId: number
  schoolName: string
  schoolAddress?: string | null
  neisRegionCode: string
  neisCode: string
}

function ymdToTime(yyyymmdd: string): number {
  const y = Number(yyyymmdd.slice(0, 4))
  const m = Number(yyyymmdd.slice(4, 6)) - 1
  const d = Number(yyyymmdd.slice(6, 8))
  return new Date(y, m, d).getTime()
}

async function fetchAllSchedule(neisRegionCode: string, neisCode: string, year: number) {
  let allRows: NeisScheduleRow[] = []
  let pageIndex = 1

  while (true) {
    const url = `https://open.neis.go.kr/hub/SchoolSchedule?KEY=${process.env.NEIS_API_KEY}&Type=json&pIndex=${pageIndex}&pSize=100&ATPT_OFCDC_SC_CODE=${neisRegionCode}&SD_SCHUL_CODE=${neisCode}&AA_FROM_YMD=${year}0101&AA_TO_YMD=${year}1231`

    const res = await fetch(url, { next: { revalidate: 3600 } })
    const data = await res.json()

    if (!data.SchoolSchedule) break

    const rows = (data?.SchoolSchedule?.[1]?.row ?? []) as NeisScheduleRow[]
    allRows = [...allRows, ...rows]

    if (rows.length < 100) break
    pageIndex++
  }

  return allRows
}

async function getExamSchedule(neisRegionCode: string, neisCode: string): Promise<ExamPeriod[]> {
  const year = new Date().getFullYear()
  const rows = await fetchAllSchedule(neisRegionCode, neisCode, year)
  return extractExamPeriodsFromNeis(rows)
}

export default async function ExamSchedule({ schoolId, schoolName, schoolAddress, neisRegionCode, neisCode }: Props) {
  const apiKey = process.env.NEIS_API_KEY ?? ''
  const resolved = await resolveNeisSchoolCodesByAddress({
    apiKey,
    schoolName,
    address: schoolAddress,
  })
  const finalRegionCode = resolved?.neisRegionCode ?? neisRegionCode
  const finalNeisCode = resolved?.neisCode ?? neisCode

  const [exams, existing] = await Promise.all([
    getExamSchedule(finalRegionCode, finalNeisCode),
    findExamsBySchoolId(schoolId),
  ])

  const existingByTitle = new Map(existing.map((e) => [e.title, e]))

  if (exams.length === 0) {
    return (
      <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
        시험 일정 정보가 없습니다.
      </p>
    )
  }

  const now = Date.now()
  const ranked = exams
    .map((e) => {
      const start = ymdToTime(e.startDate)
      const end = ymdToTime(e.endDate) + 24 * 60 * 60 * 1000 - 1
      const isNow = now >= start && now <= end
      const dist = start - now
      return { e, isNow, dist, start }
    })
    .sort((a, b) => {
      if (a.isNow !== b.isNow) return a.isNow ? -1 : 1
      const aFuture = a.dist >= 0
      const bFuture = b.dist >= 0
      if (aFuture !== bFuture) return aFuture ? -1 : 1
      return aFuture ? a.dist - b.dist : b.start - a.start
    })

  const primaryName = ranked[0]?.e.name ?? null

  const examTitles = ranked.map(({ e }) => e.name)
  const reviewAggByExam = await loadExamAggBundlesForExams(schoolId, examTitles)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {ranked.map(({ e }) => (
        <ExamAccordion
          key={e.name}
          exam={e}
          schoolId={schoolId}
          schoolName={schoolName}
          existingExam={existingByTitle.get(e.name) ?? null}
          defaultOpen={e.name === primaryName}
          reviewAggregateBundle={reviewAggByExam.get(e.name) ?? { 1: null, 2: null, 3: null }}
        />
      ))}
    </div>
  )
}