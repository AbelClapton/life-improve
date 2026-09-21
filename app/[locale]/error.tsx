'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('Common')

  useEffect(() => {
    document.getElementById('route-error-retry')?.focus()
  }, [])

  return (
    <div className="route-state route-state-error" role="alert">
      <span className="route-state-mark" aria-hidden="true">!</span>
      <div>
        <p className="eyebrow">Mi Día</p>
        <h1 className="route-state-title">{t('error_title')}</h1>
        <p className="muted-copy">{t('error_description')}</p>
        <button id="route-error-retry" type="button" className="primary-button route-state-action" onClick={() => reset()}>
          {t('retry')}
        </button>
      </div>
    </div>
  )
}