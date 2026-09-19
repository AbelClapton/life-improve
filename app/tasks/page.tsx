import { createClientServer } from '@/lib/supabase'
import { createTask, toggleTask, deleteTask } from './actions'
import { revalidatePath } from 'next/cache'

export default async function TasksPage() {
  const supabase = await createClientServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('due_at', { ascending: true })

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Tasks</h1>

      {/* Add Task Form */}
      <section className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
        <form action={async (formData) => {
          'use server'
          await createTask(formData)
          revalidatePath('/tasks')
        }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Title</label>
            <input name="title" required className="w-full p-2 border rounded" placeholder="Task name" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Due Date</label>
            <input name="due_at" type="datetime-local" className="w-full p-2 border rounded" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-medium">Description</label>
            <textarea name="description" className="w-full p-2 border rounded" placeholder="Optional details" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="is_reminder" id="is_reminder" />
            <label htmlFor="is_reminder" className="text-sm">Mark as Reminder</label>
          </div>
          <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            Add Task
          </button>
        </form>
      </section>

      {/* Task List */}
      <section className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">All Tasks</h2>
        <div className="space-y-4">
          {tasks && tasks.length > 0 ? (
            tasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <form action={async () => {
                    'use server'
                    await toggleTask(task.id, !task.completed_at)
                    revalidatePath('/tasks')
                  }}>
                    <input
                      type="checkbox"
                      checked={!!task.completed_at}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />
                  </form>
                  <div>
                    <p className={task.completed_at ? 'line-through text-gray-400' : 'font-medium'}>
                      {task.title}
                    </p>
                    {task.due_at && (
                      <p className="text-xs text-gray-500">
                        Due: {new Date(task.due_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <form action={async () => {
                  'use server'
                  await deleteTask(task.id)
                  revalidatePath('/tasks')
                }}>
                  <button className="text-red-500 text-sm hover:underline">Delete</button>
                </form>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No tasks found.</p>
          )}
        </div}
      </section>
    </div>
  )
}
