import { getTranslations } from 'next-intl/server';
import { createClientServer } from '@/lib/supabase';
import { toggleHabitLog, toggleTask } from './actions';

export default async function Dashboard({ params: { locale } }: { params: { locale: string } }) {
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const t = await getTranslations('Dashboard');
  const today = new Date().toISOString().split('T')[0];

  // Fetch today's pending tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .or(`completed_at.is.null,due_at=gte.${new Date().toISOString()}`)
    .order('due_at', { ascending: true });

  // Fetch habits and their status for today
  const { data: habits } = await supabase
    .from('habits')
    .select('*, habit_logs(completed_at)')
    .eq('user_id', user.id);

  const habitStatuses = habits?.map(h => ({
    ...h,
    completedToday: h.habit_logs?.some(log => log.completed_at === today)
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">{t('greeting', { email: user.email })}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Today's Tasks */}
        <section className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">{t('tasks_title')}</h2>
          {tasks && tasks.length > 0 ? (
            <ul className="space-y-3">
              {tasks.map(task => (
                <li key={task.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                  <form action={async () => {
                    await toggleTask(task.id, !task.completed_at)
                  }}>
                    <input
                      type="checkbox"
                      checked={!!task.completed_at}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />
                  </form>
                  <span className={task.completed_at ? 'line-through text-gray-400' : ''}>
                    {task.title}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">{t('tasks_empty')}</p>
          )}
        </section>

        {/* Daily Habits */}
        <section className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">{t('habits_title')}</h2>
          {habitStatuses && habitStatuses.length > 0 ? (
            <ul className="space-y-3">
              {habitStatuses.map(habit => (
                <li key={habit.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <span>{habit.name}</span>
                  <form action={async () => {
                    await toggleHabitLog(habit.id, today)
                  }}>
                    <button
                      className={`px-3 py-1 rounded-full text-xs ${habit.completedToday ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}
                    >
                      {habit.completedToday ? t('done') : t('mark_done')}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">{t('habits_empty')}</p>
          )}
        </section>
      </div>
    </div>
  );
}
