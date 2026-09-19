import { getTranslations } from 'next-intl/server';
import { createClientServer } from '@/lib/supabase';
import { createTask } from '../../actions';

export default async function TasksPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations('Tasks');
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('due_at', { ascending: true });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">{t('title')}</h1>

      {/* Add Task Form */}
      <section className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">{t('add_new')}</h2>
        <form action={async (formData) => {
          await createTask(locale, formData);
        }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">{t('form.title')}</label>
            <input name="title" required className="w-full p-2 border rounded" placeholder={t('form.title_placeholder')} />
          </div}
          <div className="space-y-2">
            <label className="block text-sm font-medium">{t('form.due_date')}</label>
            <input name="due_at" type="datetime-local" className="w-full p-2 border rounded" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-medium">{t('form.description')}</label>
            <textarea name="description" className="w-full p-2 border rounded" placeholder={t('form.description_placeholder')} />
          </div}
          <div className="flex items-center gap-2">
            <input type="checkbox" name="is_reminder" id="is_reminder" />
            <label htmlFor="is_reminder" className="text-sm">{t('form.reminder')}</label>
          </div}
          <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            {t('form.submit')}
          </button>
        </form>
      </section>

      {/* Task List */}
      <section className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">{t('list_title')}</h2>
        <div className="space-y-4">
          {tasks && tasks.length > 0 ? (
            tasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <form action={async () => {
                    await toggleTask(locale, task.id, !task.completed_at)
                  }}>
                    <input
                      type="checkbox"
                      checked={!!task.completed_at}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />
                  </form>
                  <div className="flex flex-col">
                    <p className={task.completed_at ? 'line-through text-gray-400' : 'font-medium'}>
                      {task.title}
                    </p>
                    {task.due_at && (
                      <p className="text-xs text-gray-500">
                        {t('due_prefix', { date: new Date(task.due_at).toLocaleString() })}
                      </p>
                    )}
                  </div>
                </div>
                <form action={async () => {
                  await deleteTask(locale, task.id)
                }}>
                  <button className="text-red-500 text-sm hover:underline">
                    {t('Common.actions.delete')}
                  </button>
                </form>
              </div>
            ))
          ) : (
            <p className="text-gray-500">{t('empty')}</p>
          )}
        </div}
      </section>
    </div>
  )
}
