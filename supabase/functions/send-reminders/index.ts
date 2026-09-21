import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.116.0'

const cronSecret = Deno.env.get('REMINDER_CRON_SECRET')
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
const vapidSubject = Deno.env.get('VAPID_SUBJECT')
let vapidConfigError = false
const allowedPushHost = (hostname: string) => hostname === 'fcm.googleapis.com'
  || hostname === 'web.push.apple.com'
  || hostname === 'updates.push.services.mozilla.com'
  || hostname.endsWith('.push.services.mozilla.com')
  || hostname.endsWith('.notify.windows.com')

if (vapidSubject && vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
  } catch {
    vapidConfigError = true
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST' || !cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!supabaseUrl || !serviceRoleKey || !vapidSubject || !vapidPublicKey || !vapidPrivateKey || vapidConfigError) {
    return Response.json({ error: 'Reminder service is not configured.' }, { status: 503 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const now = new Date()
  const since = new Date(now.getTime() - 15 * 60 * 1000)
  const until = new Date(now.getTime() + 5 * 60 * 1000)
  const { data: tasks, error: taskError } = await supabase
    .from('tasks')
    .select('id, user_id, title, due_at')
    .eq('is_reminder', true)
    .eq('status', 'pending')
    .is('completed_at', null)
    .gte('due_at', since.toISOString())
    .lt('due_at', until.toISOString())

  if (taskError) return Response.json({ error: taskError.message }, { status: 500 })

  const userIds = [...new Set((tasks || []).map((task) => task.user_id))]
  const { data: enabledProfiles, error: profileError } = userIds.length
    ? await supabase.from('profiles').select('id').in('id', userIds).eq('notifications_enabled', true)
    : { data: [], error: null }
  if (profileError) return Response.json({ error: profileError.message }, { status: 500 })
  const enabledUsers = new Set((enabledProfiles || []).map((profile) => profile.id))

  let sent = 0
  let skipped = 0
  let finalizationFailures = 0
  let subscriptionFailures = 0
  let deliveryFailures = 0
  let cleanupFailures = 0
  let claimFailures = 0
  let providerFailures = 0
  for (const task of tasks || []) {
    if (!enabledUsers.has(task.user_id)) {
      skipped += 1
      continue
    }
    const { data: claimToken, error: claimError } = await supabase.rpc('claim_notification_delivery', {
      target_user_id: task.user_id,
      target_task_id: task.id,
      target_due_at: task.due_at,
    })

    if (claimError) {
      claimFailures += 1
      continue
    }
    if (!claimToken) {
      skipped += 1
      continue
    }

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, locale')
      .eq('user_id', task.user_id)

    if (subscriptionError) {
      const finalization = { status: 'failed', delivered_at: null, last_error: subscriptionError.message }
      let { error: finalizationError, count } = await supabase.from('notification_deliveries').update(finalization, { count: 'exact' }).eq('claim_token', claimToken)
      if (finalizationError || count !== 1) {
        ({ error: finalizationError, count } = await supabase.from('notification_deliveries').update(finalization, { count: 'exact' }).eq('claim_token', claimToken))
      }
      if (finalizationError || count !== 1) finalizationFailures += 1
      subscriptionFailures += 1
      continue
    }

    let delivered = false
    let lastPushError = ''
    for (const subscription of subscriptions || []) {
      let endpoint: URL
      try {
        endpoint = new URL(subscription.endpoint)
      } catch {
        providerFailures += 1
        lastPushError = 'Invalid push provider endpoint.'
        continue
      }
      if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.port || !allowedPushHost(endpoint.hostname)) {
        providerFailures += 1
        lastPushError = 'Unsupported push provider endpoint.'
        continue
      }
      try {
        await webpush.sendNotification({ endpoint: endpoint.toString(), keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: 'Mi Día', body: task.title, taskId: task.id, locale: subscription.locale === 'en' ? 'en' : 'es' }))
        sent += 1
        delivered = true
      } catch (error) {
        providerFailures += 1
        lastPushError = error instanceof Error ? error.message : 'Push provider rejected the notification.'
        const statusCode = error instanceof webpush.WebPushError ? error.statusCode : 0
        if (statusCode === 404 || statusCode === 410) {
          const { error: cleanupError } = await supabase.from('push_subscriptions').delete().eq('id', subscription.id)
          if (cleanupError) cleanupFailures += 1
        }
      }
    }
    const finalStatus = delivered ? 'sent' : 'failed'
    if (!delivered) deliveryFailures += 1
    const finalization = { status: finalStatus, delivered_at: delivered ? new Date().toISOString() : null, last_error: lastPushError || (delivered ? null : 'No active push subscription.') }
    let { error: finalizationError, count } = await supabase.from('notification_deliveries').update(finalization, { count: 'exact' }).eq('claim_token', claimToken)
    if (finalizationError || count !== 1) {
      ({ error: finalizationError, count } = await supabase.from('notification_deliveries').update(finalization, { count: 'exact' }).eq('claim_token', claimToken))
    }
    if (finalizationError || count !== 1) finalizationFailures += 1
  }

  return finalizationFailures > 0 || subscriptionFailures > 0 || deliveryFailures > 0 || cleanupFailures > 0 || claimFailures > 0 || providerFailures > 0
    ? Response.json({ error: 'reminder_delivery_failed', sent, skipped, checked: tasks?.length || 0, claimFailures, subscriptionFailures, deliveryFailures, providerFailures, cleanupFailures, finalizationFailures }, { status: 500 })
    : Response.json({ sent, skipped, checked: tasks?.length || 0, claimFailures, subscriptionFailures, deliveryFailures, providerFailures, cleanupFailures, finalizationFailures })
})
