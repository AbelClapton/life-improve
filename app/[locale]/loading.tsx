import { getTranslations } from 'next-intl/server'

export default async function Loading() {
  const t = await getTranslations('Common')

  return (
    <div className="route-state" role="status" aria-live="polite" aria-label={t('loading')}>
      <span className="route-state-mark route-state-spinner" aria-hidden="true" />
      <div>
        <p className="eyebrow">Mi Día</p>
        <p className="route-state-title">{t('loading')}</p>
      </div>
    </div>
  )
}