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

function getDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return { year: values.year, month: values.month, day: values.day }
}

function getLocalDate(date: Date, timeZone: string) {
  const parts = getDateParts(date, timeZone)
  return `${parts.year}-${parts.month}-${parts.day}`
}

function getLocalHour(date: Date, timeZone: string) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hour12: false }).format(date))
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const value = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value || 'GMT'
  if (value === 'GMT') return 0
  const match = value.match(/GMT([+-])(\d{2}):?(\d{2})?$/)
  if (!match) return 0
  const minutes = Number(match[2]) * 60 + Number(match[3] || 0)
  return (match[1] === '+' ? 1 : -1) * minutes * 60 * 1000
}

function getUtcStart(localDate: string, timeZone: string) {
  const localAsUtc = new Date(`${localDate}T00:00:00.000Z`)
  let utcStart = localAsUtc
  for (let attempt = 0; attempt < 2; attempt += 1) {
    utcStart = new Date(localAsUtc.getTime() - getTimeZoneOffset(utcStart, timeZone))
  }
  return utcStart
}

function getNextLocalDate(localDate: string) {
  const next = new Date(`${localDate}T12:00:00.000Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10)
}

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

  let digestSent = 0
  let digestSkipped = 0
  let digestFailures = 0
  const { data: digestProfiles, error: digestProfileError } = await supabase
    .from('profiles')
    .select('id, timezone, notifications_enabled')
    .eq('notifications_enabled', true)

  if (digestProfileError) return Response.json({ error: digestProfileError.message }, { status: 500 })

  for (const profile of digestProfiles || []) {
    const timeZone = profile.timezone || 'Europe/Madrid'
    const localDate = getLocalDate(now, timeZone)
    const localHour = getLocalHour(now, timeZone)
    const kind = localHour >= 8 && localHour < 9
      ? 'morning_summary'
      : localHour >= 21 && localHour < 22
        ? 'night_closure'
        : null
    if (!kind) continue

    const claim = await supabase.rpc('claim_notification_digest', {
      target_user_id: profile.id,
      target_kind: kind,
      target_local_date: localDate,
    })
    if (claim.error) {
      digestFailures += 1
      continue
    }
    if (!claim.data) {
      digestSkipped += 1
      continue
    }

    const todayStart = getUtcStart(localDate, timeZone)
    const tomorrowStart = getUtcStart(getNextLocalDate(localDate), timeZone)
    const { data: dayTasks, error: dayTaskError } = await supabase
      .from('tasks')
      .select('title, status, completed_at, is_top_three, due_at')
      .eq('user_id', profile.id)
      .gte('due_at', todayStart.toISOString())
      .lt('due_at', tomorrowStart.toISOString())
      .order('is_top_three', { ascending: false })
      .order('due_at', { ascending: true })

    if (dayTaskError) {
      await supabase.from('notification_digest_deliveries').update({ status: 'failed', last_error: dayTaskError.message }).eq('claim_token', claim.data)
      digestFailures += 1
      continue
    }

    const tasksForDay = dayTasks || []
    const completed = tasksForDay.filter((task) => task.status === 'completed' || task.completed_at).length
    const pending = tasksForDay.length - completed
    let reviewSaved = false
    if (kind === 'night_closure') {
      const { data: review, error: reviewError } = await supabase
        .from('daily_reviews')
        .select('id')
        .eq('user_id', profile.id)
        .eq('review_date', localDate)
        .maybeSingle()
      if (reviewError) {
        await supabase.from('notification_digest_deliveries').update({ status: 'failed', last_error: reviewError.message }).eq('claim_token', claim.data)
        digestFailures += 1
        continue
      }
      reviewSaved = Boolean(review)
    }

    const topThree = tasksForDay.filter((task) => task.is_top_three && task.status !== 'completed' && !task.completed_at).slice(0, 3)
    const topThreeTitles = topThree.map((task) => task.title).join(', ')
    const payloads = {
      es: kind === 'morning_summary'
        ? { title: 'Resumen de hoy', body: `${pending} tareas pendientes${topThreeTitles ? `: ${topThreeTitles}` : '.'}` }
        : { title: 'Cierre del día', body: `Completaste ${completed} de ${tasksForDay.length} tareas.${reviewSaved ? ' Tu cierre diario está guardado.' : ' Aún puedes guardar tu cierre diario.'}` },
      en: kind === 'morning_summary'
        ? { title: 'Today\'s summary', body: `${pending} pending tasks${topThreeTitles ? `: ${topThreeTitles}` : '.'}` }
        : { title: 'Day closure', body: `You completed ${completed} of ${tasksForDay.length} tasks.${reviewSaved ? ' Your daily review is saved.' : ' You can still save your daily review.'}` },
    }

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, locale')
      .eq('user_id', profile.id)
    let delivered = false
    let lastPushError = ''
    if (subscriptionError) {
      lastPushError = subscriptionError.message
    } else {
      for (const subscription of subscriptions || []) {
        let endpoint: URL
        try {
          endpoint = new URL(subscription.endpoint)
        } catch {
          lastPushError = 'Invalid push provider endpoint.'
          continue
        }
        if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.port || !allowedPushHost(endpoint.hostname)) {
          lastPushError = 'Unsupported push provider endpoint.'
          continue
        }
        try {
          const locale = subscription.locale === 'en' ? 'en' : 'es'
          await webpush.sendNotification({ endpoint: endpoint.toString(), keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ ...payloads[locale], kind, localDate, locale }))
          digestSent += 1
          delivered = true
        } catch (error) {
          lastPushError = error instanceof Error ? error.message : 'Push provider rejected the notification.'
          const statusCode = error instanceof webpush.WebPushError ? error.statusCode : 0
          if (statusCode === 404 || statusCode === 410) await supabase.from('push_subscriptions').delete().eq('id', subscription.id)
        }
      }
    }
    const finalization = delivered
      ? { status: 'sent', delivered_at: new Date().toISOString(), last_error: null }
      : { status: 'failed', delivered_at: null, last_error: lastPushError || 'No active push subscription.' }
    const { error: finalizationError } = await supabase
      .from('notification_digest_deliveries')
      .update(finalization)
      .eq('claim_token', claim.data)
    if (finalizationError || !delivered) digestFailures += 1
  }

  return finalizationFailures > 0 || subscriptionFailures > 0 || deliveryFailures > 0 || cleanupFailures > 0 || claimFailures > 0 || providerFailures > 0 || digestFailures > 0
    ? Response.json({ error: 'reminder_delivery_failed', sent, skipped, checked: tasks?.length || 0, digestSent, digestSkipped, digestFailures, claimFailures, subscriptionFailures, deliveryFailures, providerFailures, cleanupFailures, finalizationFailures }, { status: 500 })
    : Response.json({ sent, skipped, checked: tasks?.length || 0, digestSent, digestSkipped, digestFailures, claimFailures, subscriptionFailures, deliveryFailures, providerFailures, cleanupFailures, finalizationFailures })
})
