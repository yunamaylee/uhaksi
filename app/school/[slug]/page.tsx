import { prisma } from '@/lib/prisma'
import ExamSchedule from '@/components/ExamSchedule'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Prisma } from '@prisma/client'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

function isNumericId(slug: string): boolean {
  return /^\d+$/.test(slug)
}

export default async function SchoolPage({ params }: Props) {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)

  type SchoolWithExams = Prisma.SchoolGetPayload<{
    include: { exams: { include: { subjects: true } } }
  }>

  let school: SchoolWithExams | null = null

  if (!isNumericId(decoded)) {
    const matches = await prisma.school.findMany({
      where: { name: decoded },
      orderBy: [{ address: 'asc' }, { id: 'asc' }],
      take: 20,
      select: { id: true, name: true, address: true },
    })

    if (matches.length === 1) {
      redirect(`/school/${matches[0].id}`)
    }

    if (matches.length > 1) {
      return (
        <main>
          <section
            style={{
              background: 'var(--pastel-blue)',
              padding: '44px 24px 28px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
              <div style={{ marginBottom: '10px' }}>
                <Badge tone="accent">학교 선택</Badge>
              </div>
              <h1
                style={{
                  color: 'var(--text)',
                  fontSize: '28px',
                  fontWeight: 1000,
                  letterSpacing: '-0.3px',
                  marginBottom: '10px',
                }}
              >
                {decoded}
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                같은 이름의 학교가 여러 곳에 있어요. 주소를 확인하고 선택해주세요.
              </p>
            </div>
          </section>

          <section style={{ maxWidth: '720px', margin: '0 auto', padding: '28px 24px 40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {matches.map((s) => (
                <Link
                  key={s.id}
                  href={`/school/${s.id}`}
                  style={{
                    display: 'block',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <Card style={{ padding: '16px' }}>
                    <p style={{ margin: 0, color: 'var(--text)', fontSize: '14px', fontWeight: 900 }}>
                      {s.name}
                    </p>
                    {s.address && (
                      <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: '13px' }}>{s.address}</p>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </main>
      )
    }

    school = await prisma.school.findFirst({
      where: { name: { contains: decoded } },
      include: {
        exams: {
          include: {
            subjects: true,
          },
        },
      },
    })

    if (!school) notFound()
  }

  if (isNumericId(decoded)) {
    const schoolId = Number(decoded)
    school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        exams: {
          include: {
            subjects: true,
          },
        },
      },
    })
    if (!school) notFound()
  }

  if (!school) notFound()

  return (
    <main>
      <section
        style={{
          background: 'var(--pastel-yellow)',
          padding: '32px 24px 22px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ marginBottom: '10px' }}>
            <Badge tone="accent">고등학교</Badge>
          </div>
          <h1
            style={{
              color: 'var(--text)',
              fontSize: '30px',
              fontWeight: 1000,
              letterSpacing: '-0.5px',
              marginBottom: '10px',
            }}
          >
            {school.name}
          </h1>
          {school.address && (
            <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>{school.address}</p>
          )}
        </div>
      </section>

      <section style={{ maxWidth: '720px', margin: '0 auto', padding: '18px 24px 40px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 1000, marginBottom: '6px', letterSpacing: '-0.2px' }}>
            시험 일정
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px' }}>
            시험 기간을 확인하고, 과목/시험범위를 등록해요.
          </p>
        </div>
        {school.neisCode && school.neisRegionCode ? (
          <ExamSchedule
            schoolId={school.id}
            schoolName={school.name}
            schoolAddress={school.address}
            neisRegionCode={school.neisRegionCode}
            neisCode={school.neisCode}
          />
        ) : (
          <p style={{ color: 'var(--sage-muted)', fontSize: '14px' }}>시험 일정 정보가 없습니다.</p>
        )}
      </section>
    </main>
  )
}

