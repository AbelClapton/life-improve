'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

export default function LoginForm({ locale, initialError }: { locale: string; initialError: 'magic_link' | null }) {
  const t = useTranslations('Login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [error, setError] = useState<string | null>(initialError === 'magic_link' ? t('magicLinkError') : null)
  const router = useRouter()
  const supabase = createClient()

  async function handleAuth(type: 'signIn' | 'signUp') {
    setLoading(true)
    setError(null)
    try {
      const { error } = type === 'signIn'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

      if (error) throw error
      router.push(`/${locale}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('authError'))
    } finally {
      setLoading(false)
    }
  }

  async function sendMagicLink() {
    setLoading(true)
    setError(null)
    setMagicLinkSent(false)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/${locale}/auth/callback` },
      })
      if (error) throw error
      setMagicLinkSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('authError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="panel w-full max-w-md">
        <span className="eyebrow">A quieter way to organize</span>
        <h1 className="page-title text-4xl mb-8">{t('title')}</h1>
        <div className="space-y-4">
          <div>
            <label className="field-label" htmlFor="login-email">{t('email')}</label>
            <input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field-input" placeholder="email@example.com" autoComplete="email" />
          </div>
          <div>
            <label className="field-label" htmlFor="login-password">{t('password')}</label>
            <input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field-input" placeholder="••••••••" autoComplete="current-password" />
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--coral)' }} role="alert">{error}</p>}
          {magicLinkSent && <p className="text-sm" role="status">{t('magicLinkSent')}</p>}
          <div className="flex gap-2">
            <button onClick={() => handleAuth('signIn')} disabled={loading} className="primary-button flex-1 disabled:opacity-50" aria-busy={loading}>{loading ? t('loading') : t('signIn')}</button>
            <button onClick={() => handleAuth('signUp')} disabled={loading} className="secondary-button flex-1 disabled:opacity-50" aria-busy={loading}>{t('signUp')}</button>
          </div>
          <button type="button" onClick={sendMagicLink} disabled={loading || !email} className="secondary-button w-full disabled:opacity-50" aria-busy={loading}>
            {loading ? t('loading') : t('magicLink')}
          </button>
        </div>
      </div>
    </div>
  )
}
