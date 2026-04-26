import { prisma } from '@/lib/prisma'

// ID로 학교 조회 (NEIS 코드 포함)
export async function findSchoolWithNeisById(id: number) {
  return prisma.school.findUnique({
    where: { id },
    select: { name: true, neisRegionCode: true, neisCode: true, address: true },
  })
}

// 이름으로 학교 조회 (NEIS 코드 포함)
export async function findSchoolWithNeisByName(name: string) {
  return prisma.school.findFirst({
    where: { name },
    select: { name: true, neisRegionCode: true, neisCode: true, address: true },
  })
}

// 이름으로 학교 조회 (NEIS 코드만)
export async function findSchoolNeisByName(name: string) {
  return prisma.school.findFirst({
    where: { name },
    select: { neisRegionCode: true, neisCode: true },
  })
}
