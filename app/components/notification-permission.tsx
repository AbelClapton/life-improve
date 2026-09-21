'use client'

import { useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'

function subscribe() { return () => undefined }
function getBrowserPermission(): NotificationPermission | 'unsupported' { return 'Notification' in window ? Notification.permission : 'unsupported' }
function getServerPermission(): NotificationPermission | 'unsupported' { return 'unsupported' }

export function NotificationPermission() {
  const t = useTranslations('Settings')
  const browserPermission = useSyncExternalStore(subscribe, getBrowserPermission, getServerPermission)
  const [requestedPermission, setRequestedPermission] = useState<NotificationPermission | null>(null)
  const [requestFailed, setRequestFailed] = useState(false)
  const permission = requestedPermission || browserPermission

  async function requestPermission() {
    if (!('Notification' in window)) {
      return
    }
    try {
      setRequestFailed(false)
      setRequestedPermission(await Notification.requestPermission())
    } catch {
      setRequestFailed(true)
    }
  }

  const status = requestFailed
    ? t('notifications_error')
    : permission === 'granted'
      ? t('notifications_granted')
      : permission === 'denied'
        ? t('notifications_denied')
        : permission === 'unsupported'
          ? t('notifications_unsupported')
          : t('notifications_not_requested')

  return (
    <div className="settings-notification-permission" aria-live="polite">
      <div>
        <p className="field-label">{t('notifications_permission')}</p>
        <p className="muted-copy">{status}</p>
      </div>
      {permission === 'default' && !requestFailed && <button type="button" className="secondary-button" onClick={requestPermission}>{t('notifications_allow')}</button>}
    </div>
  )
}
