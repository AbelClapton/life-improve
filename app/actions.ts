'use server'

import { redirect } from 'next/navigation'
import { revalidatePaths } from '@/lib/cache'
import { withUser } from '@/lib/auth-wrapper'
import { getDateInTimeZone, isValidTimeZone, localDateTimeToUtc } from '@/lib/date'

const topThreeLimitError = 'top_three_limit'

function mapTopThreeError(message: string) {
  return {
    'TOP_THREE_LIMIT': 'top_three_limit',
    'Task not found.': 'task_not_found',
    'Completed tasks cannot be selected as a top priority.': 'completed_task_top_three',
    'Top priority not found.': 'top_three_not_found',
  }[message] || 'unable_to_save'
}

export const createTask = async (locale: string, formData: FormData) =>
  await withUser(async (user, supabase) => {
    const title = String(formData.get('title') || '').trim()
    const notes = String(formData.get('notes') || formData.get('description') || '').trim()
    const areaId = formData.get('area_id') as string
    const priority = formData.get('priority') as string
    const due_at = formData.get('due_at') as string
    const start_at = formData.get('start_at') as string
    const durationMin = formData.get('duration_min') as string
    const isTopThree = formData.get('is_top_three') === 'on'
    const recurrence = formData.get('recurrence') as string
    const is_reminder = formData.get('is_reminder') === 'on'
    if (!title) return { error: 'task_title_required' }
    const parsedDuration = durationMin ? Number(durationMin) : null
    if (parsedDuration !== null && (!Number.isInteger(parsedDuration) || parsedDuration < 1)) return { error: 'duration_invalid' }
    if (areaId) {
      const { data: area, error: areaError } = await supabase
        .from('areas')
        .select('id')
        .eq('id', areaId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (areaError) return { error: 'unable_to_save' }
      if (!area) return { error: 'area_not_found' }
    }
    const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).single()
    const timeZone = profile?.timezone || 'Europe/Madrid'
    const dueAt = due_at ? localDateTimeToUtc(due_at, timeZone) : null
    const startAt = start_at ? localDateTimeToUtc(start_at, timeZone) : null
    if ((due_at && !dueAt) || (start_at && !startAt)) return { error: 'invalid_datetime' }
    const recurrenceDay = recurrence === 'monthly' && due_at ? Number(due_at.slice(8, 10)) : null

    const { error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title,
        notes: notes || null,
        area_id: areaId || null,
        priority: priority || 'medium',
        due_at: dueAt,
        start_at: startAt,
        duration_min: parsedDuration,
        is_top_three: isTopThree,
        recurrence: recurrence || 'none',
        recurrence_day: recurrenceDay,
        is_reminder,
      })

    if (error) return { error: error.message === 'TOP_THREE_LIMIT' ? topThreeLimitError : 'unable_to_save' }
    revalidatePaths([`/${locale}`, `/${locale}/tasks`, `/${locale}/calendar`, `/${locale}/progress`])
    return { success: true }
  })

export const updateTask = async (locale: string, taskId: string, formData: FormData) =>
  await withUser(async (user, supabase) => {
    const title = String(formData.get('title') || '').trim()
    const notes = String(formData.get('notes') || '').trim()
    const areaId = String(formData.get('area_id') || '')
    const priority = String(formData.get('priority') || 'medium')
    const due_at = String(formData.get('due_at') || '')
    const start_at = String(formData.get('start_at') || '')
    const durationMin = String(formData.get('duration_min') || '')
    const recurrence = String(formData.get('recurrence') || 'none')
    const is_reminder = formData.get('is_reminder') === 'on'

    if (!title) return { error: 'task_title_required' }
    const parsedDuration = durationMin ? Number(durationMin) : null
    if (parsedDuration !== null && (!Number.isInteger(parsedDuration) || parsedDuration < 1)) {
      return { error: 'duration_invalid' }
    }

    if (areaId) {
      const { data: area, error: areaError } = await supabase
        .from('areas')
        .select('id')
        .eq('id', areaId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (areaError) return { error: 'unable_to_save' }
      if (!area) return { error: 'area_not_found' }
    }

    const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).single()
    const timeZone = profile?.timezone || 'Europe/Madrid'
    const dueAt = due_at ? localDateTimeToUtc(due_at, timeZone) : null
    const startAt = start_at ? localDateTimeToUtc(start_at, timeZone) : null
    if ((due_at && !dueAt) || (start_at && !startAt)) return { error: 'invalid_datetime' }
    const recurrenceDay = recurrence === 'monthly' && due_at ? Number(due_at.slice(8, 10)) : null

    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update({
        title,
        notes: notes || null,
        area_id: areaId || null,
        priority,
        due_at: dueAt,
        start_at: startAt,
        duration_min: parsedDuration,
        recurrence,
        recurrence_day: recurrenceDay,
        is_reminder,
      })
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle()

    if (error) return { error: 'unable_to_save' }
    if (!updatedTask) return { error: 'task_not_found' }
    revalidatePaths([`/${locale}`, `/${locale}/tasks`, `/${locale}/calendar`, `/${locale}/progress`])
    return { success: true }
  })

export const postponeTask = async (locale: string, taskId: string, targetDate: string) =>
  await withUser(async (user, supabase) => {
    const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).single()
    const timeZone = profile?.timezone || 'Europe/Madrid'
    const today = getDateInTimeZone(new Date(), timeZone)
    const tomorrowDate = new Date(`${today}T12:00:00Z`)
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1)
    const minimumDate = tomorrowDate.toISOString().slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || targetDate < minimumDate) return { error: 'invalid_datetime' }
    const dueAt = localDateTimeToUtc(`${targetDate}T09:00`, timeZone)
    if (!dueAt) return { error: 'invalid_datetime' }

    const { data: postponedTask, error } = await supabase
      .from('tasks')
      .update({ due_at: dueAt, status: 'postponed' })
      .eq('id', taskId)
      .eq('user_id', user.id)
      .neq('status', 'completed')
      .is('completed_at', null)
      .select('id')
      .maybeSingle()

    if (error) return { error: 'unable_to_save' }
    if (!postponedTask) return { error: 'task_not_found' }
    revalidatePaths([`/${locale}`, `/${locale}/tasks`, `/${locale}/calendar`, `/${locale}/progress`])
    return { success: true }
  })

export const toggleTask = async (locale: string, taskId: string, completed: boolean) =>
  await withUser(async (user, supabase) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', user.id)
      .single()

    if (profileError) return { error: profileError.message }

    const completedAt = new Date()
    const { error } = await supabase.rpc('complete_task', {
      target_task_id: taskId,
      should_complete: completed,
      completion_timestamp: completedAt.toISOString(),
      completion_date: getDateInTimeZone(completedAt, profile.timezone || 'Europe/Madrid'),
    })

    if (error) return { error: error.message }
    revalidatePaths([`/${locale}`, `/${locale}/tasks`, `/${locale}/calendar`, `/${locale}/progress`])
    return { success: true }
  })

export const deleteTask = async (locale: string, taskId: string) =>
  await withUser(async (user, supabase) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id)

    if (error) return { error: error.message }
    revalidatePaths([`/${locale}`, `/${locale}/tasks`, `/${locale}/calendar`, `/${locale}/progress`])
    return { success: true }
  })

export const setTaskTopThree = async (locale: string, taskId: string, selected: boolean) =>
  await withUser(async (user, supabase) => {
    const { error } = await supabase.rpc('set_task_top_three', {
      target_task_id: taskId,
      should_select: selected,
    })

    if (error) return { error: mapTopThreeError(error.message) }
    revalidatePaths([`/${locale}`, `/${locale}/tasks`])
    return { success: true }
  })

export const moveTaskTopThree = async (locale: string, taskId: string, direction: 'up' | 'down') =>
  await withUser(async (_user, supabase) => {
    const { error } = await supabase.rpc('move_task_top_three', {
      target_task_id: taskId,
      move_direction: direction,
    })

    if (error) return { error: mapTopThreeError(error.message) }
    revalidatePaths([`/${locale}`, `/${locale}/tasks`])
    return { success: true }
  })

export const saveDailyReview = async (locale: string, reviewDate: string, formData: FormData) =>
  await withUser(async (user, supabase) => {
    const { error } = await supabase.from('daily_reviews').upsert({
      user_id: user.id,
      review_date: reviewDate,
      intention: String(formData.get('intention') || '').trim() || null,
      mood: Number(formData.get('mood')) || null,
      energy: Number(formData.get('energy')) || null,
      wins: String(formData.get('wins') || '').trim() || null,
      blockers: String(formData.get('blockers') || '').trim() || null,
      tomorrow_top_three: String(formData.get('tomorrow_top_three') || '').trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,review_date' })

    if (error) return { error: error.message }
    revalidatePaths([`/${locale}`])
    return { success: true }
  })

export const updateProfile = async (locale: string, formData: FormData) =>
  await withUser(async (user, supabase) => {
    const displayName = String(formData.get('display_name') || '').trim()
    const timezone = String(formData.get('timezone') || 'Europe/Madrid')
    const theme = String(formData.get('theme') || 'system')
    const notificationsEnabled = formData.get('notifications_enabled') === 'on'
    if (!isValidTimeZone(timezone)) return { error: 'Invalid time zone.' }

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName || null,
        timezone,
        theme,
        notifications_enabled: notificationsEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) return { error: error.message }
    revalidatePaths([`/${locale}/settings`, `/${locale}`, `/${locale}/calendar`])
    return { success: true }
  })

export const createArea = async (locale: string, formData: FormData) =>
  await withUser(async (user, supabase) => {
    const name = String(formData.get('name') || '').trim()
    const color = String(formData.get('color') || '#6366f1')
    const icon = String(formData.get('icon') || 'circle')
    const goal = String(formData.get('goal') || '').trim()

    if (!name) return { error: 'Area name is required.' }
    const { error } = await supabase.from('areas').insert({
      user_id: user.id,
      name,
      color,
      icon,
      goal: goal || null,
    })

    if (error) return { error: error.message }
    revalidatePaths([`/${locale}/settings`, `/${locale}/tasks`])
    return { success: true }
  })

export const deleteArea = async (locale: string, areaId: string) =>
  await withUser(async (user, supabase) => {
    const { error } = await supabase
      .from('areas')
      .delete()
      .eq('id', areaId)
      .eq('user_id', user.id)

    if (error) return { error: error.message }
    revalidatePaths([`/${locale}/settings`, `/${locale}/tasks`])
    return { success: true }
  })

export const signOut = async (locale: string) =>
  await withUser(async (_user, supabase) => {
    await supabase.auth.signOut()
    redirect(`/${locale}/login`)
  })

export const createHabit = async (locale: string, formData: FormData) =>
  await withUser(async (user, supabase) => {
    const name = formData.get('name') as string
    const frequency = formData.get('frequency') as string

    const { error } = await supabase
      .from('habits')
      .insert({
        user_id: user.id,
        name,
        frequency,
      })

    if (error) return { error: error.message }
    revalidatePaths([`/${locale}`, `/${locale}/habits`])
    return { success: true }
  })

export const toggleHabitLog = async (locale: string, habitId: string, date: string) =>
  await withUser(async (user, supabase) => {
    const { data: existing } = await supabase
      .from('habit_logs')
      .select('id')
      .eq('habit_id', habitId)
      .eq('completed_at', date)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('habit_logs')
        .delete()
        .eq('id', existing.id)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase
        .from('habit_logs')
        .insert({ habit_id: habitId, completed_at: date })
      if (error) return { error: error.message }
    }

    revalidatePaths([`/${locale}`, `/${locale}/habits`])
    return { success: true }
  })

export const deleteHabit = async (locale: string, habitId: string) =>
  await withUser(async (user, supabase) => {
    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', habitId)
      .eq('user_id', user.id)

    if (error) return { error: error.message }
    revalidatePaths([`/${locale}`, `/${locale}/habits`])
    return { success: true }
  })
