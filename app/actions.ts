'use server'

import { redirect } from 'next/navigation'
import { revalidatePaths } from '@/lib/cache'
import { withUser } from '@/lib/auth-wrapper'
import { getDateInTimeZone } from '@/lib/date'

const topThreeLimitMessage = 'You can only choose three top priorities.'

export const createTask = async (locale: string, formData: FormData) =>
  await withUser(async (user, supabase) => {
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const notes = formData.get('notes') as string
    const areaId = formData.get('area_id') as string
    const priority = formData.get('priority') as string
    const due_at = formData.get('due_at') as string
    const start_at = formData.get('start_at') as string
    const durationMin = formData.get('duration_min') as string
    const isTopThree = formData.get('is_top_three') === 'on'
    const recurrence = formData.get('recurrence') as string
    const is_reminder = formData.get('is_reminder') === 'on'

    const { error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title,
        description,
        notes: notes || description || null,
        area_id: areaId || null,
        priority: priority || 'medium',
        due_at: due_at || null,
        start_at: start_at || null,
        duration_min: durationMin ? Number(durationMin) : null,
        is_top_three: isTopThree,
        recurrence: recurrence || 'none',
        is_reminder,
      })

    if (error) return { error: error.message === 'TOP_THREE_LIMIT' ? topThreeLimitMessage : error.message }
    revalidatePaths([`/${locale}`, `/${locale}/tasks`])
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
    revalidatePaths([`/${locale}`, `/${locale}/tasks`])
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
    revalidatePaths([`/${locale}`, `/${locale}/tasks`])
    return { success: true }
  })

export const setTaskTopThree = async (locale: string, taskId: string, selected: boolean) =>
  await withUser(async (user, supabase) => {
    const { error } = await supabase.rpc('set_task_top_three', {
      target_task_id: taskId,
      should_select: selected,
    })

    if (error) return { error: error.message === 'TOP_THREE_LIMIT' ? topThreeLimitMessage : error.message }
    revalidatePaths([`/${locale}`, `/${locale}/tasks`])
    return { success: true }
  })

export const moveTaskTopThree = async (locale: string, taskId: string, direction: 'up' | 'down') =>
  await withUser(async (_user, supabase) => {
    const { error } = await supabase.rpc('move_task_top_three', {
      target_task_id: taskId,
      move_direction: direction,
    })

    if (error) return { error: error.message }
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
    revalidatePaths([`/${locale}/settings`])
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
