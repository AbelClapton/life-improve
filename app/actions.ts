'use server'

import { createClientServer } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function createTask(formData: FormData) {
  const supabase = await createClientServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

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

  if (error) throw error
  revalidatePath('/')
  revalidatePath('/tasks')
}

export async function toggleTask(taskId: string, completed: boolean) {
  const supabase = await createClientServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('tasks')
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) throw error
  revalidatePath('/')
  revalidatePath('/tasks')
}

export async function deleteTask(taskId: string) {
  const supabase = await createClientServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) throw error
  revalidatePath('/')
  revalidatePath('/tasks')
}

export async function createHabit(formData: FormData) {
  const supabase = await createClientServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const name = formData.get('name') as string
  const frequency = formData.get('frequency') as string

  const { error } = await supabase
    .from('habits')
    .insert({
      user_id: user.id,
      name,
      frequency,
    })

  if (error) throw error
  revalidatePath('/')
  revalidatePath('/habits')
}

export async function toggleHabitLog(habitId: string, date: string) {
  const supabase = await createClientServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

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
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('habit_logs')
      .insert({ habit_id: habitId, completed_at: date })
    if (error) throw error
  }

  revalidatePath('/')
  revalidatePath('/habits')
}

export async function deleteHabit(habitId: string) {
  const supabase = await createClientServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId)
    .eq('user_id', user.id)

  if (error) throw error
  revalidatePath('/')
  revalidatePath('/habits')
}
