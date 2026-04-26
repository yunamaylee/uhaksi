export type NeisScheduleRow = {
  AA_YMD: string
  EVENT_NM: string
  EVENT_CNTNT?: string
}

export type ExamPeriod = {
  name: string
  dates: string[]
  startDate: string
  endDate: string
}

function ymdToUtcDate(yyyymmdd: string): Date {
  const y = Number(yyyymmdd.slice(0, 4))
  const m = Number(yyyymmdd.slice(4, 6)) - 1
  const d = Number(yyyymmdd.slice(6, 8))
  return new Date(Date.UTC(y, m, d))
}

function diffDaysUtc(a: string, b: string): number {
  const da = ymdToUtcDate(a)
  const db = ymdToUtcDate(b)
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24))
}

function inferSemesterFromMonth(month: number): 1 | 2 | null {
  if (month >= 3 && month <= 7) return 1
  if (month >= 8 && month <= 12) return 2
  return null
}

function inferExamType(name: string): 'mid' | 'final' | 'written' | null {
  // 학교별 표기가 제각각이라 "중간/기말"을 넓게 인식하되,
  // normalizeExamKey에서 shouldExclude로 안내/범위 등의 잡음을 걸러냅니다.
  if (/중간(\s*고사)?/.test(name)) return 'mid'
  if (/기말(\s*고사)?/.test(name)) return 'final'
  if (/지필\s*평가|지필평가|지필\s*고사|지필고사/.test(name)) return 'written'

  // "1회고사/2회고사", "시험", "평가"처럼 중간/기말 텍스트 없이 기록되는 케이스가 있어 fallback
  if (/(고사|시험|평가)/.test(name)) return 'written'
  return null
}

function shouldExclude(name: string): boolean {
  // "시험"이라는 단어가 들어가도 실제 시험일(지필고사)과 무관한 안내/준비/성적/범위 공지가 섞여 들어옵니다.
  if (
    /(안내|가정통신문|범위|시간표|성적|결과|제출|신청|접수|대비|준비|보충|재시험|추가\s*시험|예비|계획|공고)/.test(
      name
    )
  ) {
    return true
  }
  // "모의고사"에만 걸리는 '고사' 때문에 inferExamType('written') → 월 기준 중간/기말로 오인되는 일 방지
  if (
    /모의고사|사설|전국연합|연합학력평가|모의평가|대학수학능력시험|교육청\s*모의/.test(name)
  ) {
    return true
  }
  return false
}

function isAllGradesEvent(name: string): boolean {
  // NEIS 일정명에 학년 범위가 들어오는 케이스가 많습니다.
  // (예: "(1,2,3학년)", "(2,3학년)")
  return /(1\s*,\s*2\s*,\s*3\s*학년|전\s*학년|전체\s*학년|전교생)/.test(name)
}

function normalizeExamKey(row: NeisScheduleRow): { key: string; displayName: string } | null {
  const raw = (row.EVENT_NM ?? '').trim()
  if (!raw) return null
  if (shouldExclude(raw)) return null

  const examType = inferExamType(raw)
  if (!examType) return null

  const month = Number(row.AA_YMD.slice(4, 6))
  const semester = inferSemesterFromMonth(month)
  if (!semester) return null

  const mappedType = examType === 'written'
    ? // "지필평가"는 학교마다 중간/기말 대신 쓰는 경우가 있어 기본은 월 기준으로 중간/기말로 보정
      (month >= 3 && month <= 5 ? 'mid' : month >= 6 && month <= 7 ? 'final' : month >= 9 && month <= 10 ? 'mid' : 'final')
    : examType

  const label = mappedType === 'mid' ? '중간고사' : '기말고사'
  const displayName = `${semester}학기 ${label}`
  const key = `${semester}-${mappedType}`

  return { key, displayName }
}

function clusterDates(dates: string[]): string[][] {
  const sorted = [...new Set(dates)].sort()
  if (sorted.length === 0) return []

  const clusters: string[][] = []
  let cur: string[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const next = sorted[i]
    const gap = diffDaysUtc(prev, next)

    // Fri -> Mon 같은 주말 점프(3일)까지는 같은 시험기간으로 묶고,
    // 그 이상 벌어지면 다른 시험/이벤트로 취급합니다.
    if (gap <= 3) {
      cur.push(next)
      continue
    }
    clusters.push(cur)
    cur = [next]
  }
  clusters.push(cur)
  return clusters
}

export function extractExamPeriodsFromNeis(rows: NeisScheduleRow[]): ExamPeriod[] {
  const grouped: Record<string, { name: string; dates: string[]; allGradesByDate: Record<string, boolean> }> = {}

  for (const row of rows) {
    if (!row?.AA_YMD || !row?.EVENT_NM) continue
    const norm = normalizeExamKey(row)
    if (!norm) continue

    if (!grouped[norm.key]) {
      grouped[norm.key] = { name: norm.displayName, dates: [], allGradesByDate: {} }
    }
    grouped[norm.key].dates.push(row.AA_YMD)
    grouped[norm.key].allGradesByDate[row.AA_YMD] =
      grouped[norm.key].allGradesByDate[row.AA_YMD] || isAllGradesEvent(row.EVENT_NM)
  }

  const periods: ExamPeriod[] = []
  for (const { name, dates, allGradesByDate } of Object.values(grouped)) {
    for (const cluster of clusterDates(dates)) {
      const sorted = [...cluster].sort()

      // "시험 일정"은 보통 전학년 기준으로 보는 UX라서,
      // 전학년 이벤트가 섞여 있으면 그 날짜들만 노출합니다.
      const allGradeDates = sorted.filter((d) => allGradesByDate[d])
      const displayDates = allGradeDates.length > 0 ? allGradeDates : sorted

      periods.push({
        name,
        dates: displayDates,
        startDate: displayDates[0],
        endDate: displayDates[displayDates.length - 1],
      })
    }
  }

  // 같은 이름(1학기 중간고사)이 여러 클러스터로 나뉜 경우, 가장 "긴"(날짜 많은) 기간을 우선 노출
  // (학교마다 학년별로 따로 기재되어 여러 덩어리로 들어오는 경우가 있어요.)
  const bestByName = new Map<string, ExamPeriod>()
  for (const p of periods) {
    const prev = bestByName.get(p.name)
    if (!prev || p.dates.length > prev.dates.length) bestByName.set(p.name, p)
  }

  return [...bestByName.values()].sort((a, b) => a.startDate.localeCompare(b.startDate))
}

