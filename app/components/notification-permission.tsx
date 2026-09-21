'use client'

import { useState, useSyncExternalStore } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { savePushSubscription } from '@/app/actions'

function subscribe() { return () => undefined }
function getBrowserPermission(): NotificationPermission | 'unsupported' { return 'Notification' in window ? Notification.permission : 'unsupported' }
function getServerPermission(): NotificationPermission | 'unsupported' { return 'unsupported' }
function decodeVapidKey(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const decoded = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(decoded, character => character.charCodeAt(0))
}

export function NotificationPermission() {
  const locale = useLocale()
  const t = useTranslations('Settings')
  const browserPermission = useSyncExternalStore(subscribe, getBrowserPermission, getServerPermission)
  const [requestedPermission, setRequestedPermission] = useState<NotificationPermission | null>(null)
  const [requestFailed, setRequestFailed] = useState(false)
  const [subscriptionSaved, setSubscriptionSaved] = useState(false)
  const permission = requestedPermission || browserPermission

  async function requestPermission() {
    if (!('Notification' in window)) {
      return
    }
    try {
      setRequestFailed(false)
      const nextPermission = await Notification.requestPermission()
      setRequestedPermission(nextPermission)
      if (nextPermission === 'granted') await registerPushSubscription()
    } catch {
      setRequestFailed(true)
    }
  }

  async function registerPushSubscription() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setRequestFailed(true)
      return
    }
    const registration = await Promise.race([
      navigator.serviceWorker.register('/sw.js'),
      new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Service worker setup timed out')), 10000)),
    ])
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(vapidKey) })
    const keys = subscription.toJSON().keys
    if (!keys?.p256dh || !keys.auth) throw new Error('Invalid push subscription')
    const result = await savePushSubscription({ endpoint: subscription.endpoint, p256dh: keys.p256dh, auth: keys.auth, locale })
    if ('error' in result) throw new Error(result.error)
    setSubscriptionSaved(true)
  }

  async function setupPushSubscription() {
    try {
      setRequestFailed(false)
      await registerPushSubscription()
    } catch {
      setRequestFailed(true)
    }
  }

  const status = requestFailed
    ? t('notifications_error')
    : subscriptionSaved
      ? t('notifications_ready')
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
      {permission === 'granted' && !subscriptionSaved && !requestFailed && <button type="button" className="secondary-button" onClick={setupPushSubscription}>{t('notifications_setup')}</button>}
    </div>
  )
}
