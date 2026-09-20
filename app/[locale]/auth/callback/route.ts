import { NextRequest, NextResponse } from 'next/server'
import { createClientServer } from '@/lib/supabase-server'

function getSafeNextPath(next: string | null, locale: string) {
  const fallback = `/${locale}`
  if (!next || !next.startsWith(`/${locale}`) || next.startsWith('//')) return fallback
  return next
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const code = request.nextUrl.searchParams.get('code')
  const nextPath = getSafeNextPath(request.nextUrl.searchParams.get('next'), locale)

  if (!code) return NextResponse.redirect(new URL(`/${locale}/login?error=magic_link`, request.url))

  const supabase = await createClientServer()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(new URL(`/${locale}/login?error=magic_link`, request.url))

  return NextResponse.redirect(new URL(nextPath, request.url))
}