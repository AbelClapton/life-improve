'use server'

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
    const { error } = await supabase
      .from('tasks')
      .update({
        completed_at: completed ? new Date().toISOString() : null,
        status: completed ? 'completed' : 'pending',
      })
      .eq('id', taskId)
      .eq('user_id', user.id)

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
