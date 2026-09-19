import { createClientServer } from '@/lib/supabase'
import { createHabit, toggleHabitLog, deleteHabit } from './actions'
import { revalidatePath } from 'next/cache'

export default async function HabitsPage() {
  const supabase = await createClientServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date().toISOString().split('T')[0]
  const { data: habits } = await supabase
    .from('habits')
    .select('*, habit_logs(completed_at)')
    .eq('user_id', user.id)

  const habitStatuses = habits?.map(h => ({
    ...h,
    completedToday: h.habit_logs?.some(log => log.completed_at === today)
  }))

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Habits</h1>

      {/* Add Habit Form */}
      <section className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Add New Habit</h2>
        <form action={async (formData) => {
          'use server'
          await createHabit(formData)
          revalidatePath('/habits')
        }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-medium">Habit Name</label>
            <input name="name" required className="w-full p-2 border rounded" placeholder="e.g., Read for 30 mins" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Frequency</label>
            <select name="frequency" className="w-full p-2 border rounded">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 md:col-span-3">
            Add Habit
          </button>
        </form>
      </section>

      {/* Habits List */}
      <section className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">My Habits</h2>
        <div className="space-y-4">
          {habitStatuses && habitStatuses.length > 0 ? (
            habitStatuses.map(habit => (
              <div key={habit.id} className="flex items-center justify-between p-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <form action={async () => {
                    'use server'
                    await toggleHabitLog(habit.id, today)
                    revalidatePath('/habits')
                  }}>
                    <input
                      type="checkbox"
                      checked={habit.completedToday}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />
                  </form>
                  <div className="flex flex-col">
                    <span className={habit.completedToday ? 'line-through text-gray-400' : 'font-medium'}>
                      {habit.name}
                    </span>
                    <span className="text-xs text-gray-500">{habit.frequency}</span>
                  </div>
                </div>
                <form action={async () => {
                  'use server'
                  await deleteHabit(habit.id)
                  revalidatePath('/habits')
                }}>
                  <button className="text-red-500 text-sm hover:underline">Delete</button>
                </form>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No habits found.</p>
          )}
        </div}
      </section>
    </div>
  )
}
