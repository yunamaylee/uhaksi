import { NextRequest, NextResponse } from 'next/server'
import { verifyEmail } from '@/lib/services/user'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid', request.url))
  }

  try {
    await verifyEmail(token)
    return NextResponse.redirect(new URL('/login?verified=true', request.url))
  } catch {
    return NextResponse.redirect(new URL('/login?error=invalid', request.url))
  }
}
