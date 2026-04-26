import { NextRequest, NextResponse } from 'next/server'
import schoolsData from '../../../public/schools.json'

type School = { id: number; name: string; address: string | null }

const allSchools = schoolsData as School[]

export async function GET(request: NextRequest) {
  try {
    const searchQuery = (request.nextUrl.searchParams.get('q') ?? '').trim()
    const exact = request.nextUrl.searchParams.get('exact')

    if (!searchQuery || searchQuery.length < 1) return NextResponse.json([])

    if (exact === 'true') {
      const school = allSchools.find(s => s.name.includes(searchQuery)) ?? null
      return NextResponse.json(school)
    }

    const results = allSchools
      .filter(s => s.name.includes(searchQuery))
      .slice(0, 10)

    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}