'use server'

import { redirect } from 'next/navigation'
import { revalidatePaths } from '@/lib/cache'
import { withUser } from '@/lib/auth-wrapper'

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

    if (error) {
      return { error: error.message }
    }
    revalidatePaths([`/${locale}`, `/${locale}/tasks`])
    return { success: true }
  })

export const toggleTask = async (locale: string, taskId: string, completed: boolean) =>
  await withUser(async (user, supabase) => {
    const { data: existingTask, error: taskLookupError } = await supabase
      .from('tasks')
      .select('completed_at')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single()

    if (taskLookupError || !existingTask) return { error: taskLookupError?.message || 'Task not found.' }
    if (Boolean(existingTask.completed_at) === completed) return { success: true }

    const completedAt = completed ? new Date().toISOString() : null
    const { error } = await supabase
      .from('tasks')
      .update({
        completed_at: completedAt,
        status: completed ? 'completed' : 'pending',
      })
      .eq('id', taskId)
      .eq('user_id', user.id)

    if (error) return { error: error.message }
    if (completed && completedAt) {
      const completedOn = completedAt.slice(0, 10)
      const { data: existingEvent } = await supabase
        .from('task_completion_events')
        .select('id')
        .eq('task_id', taskId)
        .eq('completed_on', completedOn)
        .maybeSingle()

      if (!existingEvent) {
        const { error: eventError } = await supabase.from('task_completion_events').insert({
          task_id: taskId,
          user_id: user.id,
          completed_on: completedOn,
        })
        if (eventError) return { error: eventError.message }

        const { data: points } = await supabase
          .from('user_points')
          .select('points')
          .eq('user_id', user.id)
          .maybeSingle()
        const { error: pointsError } = await supabase.from('user_points').upsert({
          user_id: user.id,
          points: (points?.points || 0) + 10,
          last_active_date: completedOn,
          updated_at: new Date().toISOString(),
        })
        if (pointsError) return { error: pointsError.message }
      }
    }
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
