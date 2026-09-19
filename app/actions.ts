'use server'

import { revalidatePaths } from '@/lib/cache'
import { withUser } from '@/lib/auth-wrapper'

export const createTask = async (formData: FormData) =>
  await withUser(async (user, supabase) => {
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const due_at = formData.get('due_at') as string
    const is_reminder = formData.get('is_reminder') === 'on'

    const { error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title,
        description,
        due_at: due_at || null,
        is_reminder,
      })

    if (error) return { error: error.message }
    revalidatePaths(['/', '/tasks'])
    return { success: true }
  }, formData)

export const toggleTask = async (taskId: string, completed: boolean) =>
  await withUser(async (user, supabase) => {
    const { error } = await supabase
      .from('tasks')
      .update({ completed_at: completed ? new Date().toISOString() : null })
      .eq('id', taskId)
      .eq('user_id', user.id)

    if (error) return { error: error.message }
    revalidatePaths(['/', '/tasks'])
    return { success: true }
  }, taskId, completed)

export const deleteTask = async (taskId: string) =>
  await withUser(async (user, supabase) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id)

    if (error) return { error: error.message }
    revalidatePaths(['/', '/tasks'])
    return { success: true }
  }, taskId)

export const createHabit = async (formData: FormData) =>
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
    revalidatePaths(['/', '/habits'])
    return { success: true }
  }, formData)

export const toggleHabitLog = async (habitId: string, date: string) =>
  await withUser(async (user, supabase) => {
    // Check if log exists
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

    revalidatePaths(['/', '/habits'])
    return { success: true }
  }, habitId, date)

export const deleteHabit = async (habitId: string) =>
  await withUser(async (user, supabase) => {
    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', habitId)
      .eq('user_id', user.id)

    if (error) return { error: error.message }
    revalidatePaths(['/', '/habits'])
    return { success: true }
  }, habitId)

