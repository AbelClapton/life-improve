import LoginForm from '@/app/components/login-form'

export default async function LoginPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string }> }) {
  const { locale } = await params
  const { error } = await searchParams

  return <LoginForm locale={locale} initialError={error === 'magic_link' ? 'magic_link' : null} />
}
