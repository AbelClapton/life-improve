import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClientServer } from '@/lib/supabase-server';
import { createHabit, toggleHabitLog, deleteHabit } from '../../actions';
import { getDateInTimeZone } from '@/lib/date';

export default async function HabitsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('Habits');
  const common = await getTranslations('Common');
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).single();
  const today = getDateInTimeZone(new Date(), profile?.timezone || 'Europe/Madrid');
  const { data: habits } = await supabase
    .from('habits')
    .select('*, habit_logs(completed_at)')
    .eq('user_id', user.id);

  const habitStatuses = habits?.map(h => ({
    ...h,
    completedToday: h.habit_logs?.some((log: { completed_at: string | null }) => log.completed_at === today)
  }));

  return (
    <div>
      <header className="page-heading">
        <span className="eyebrow">Small actions, kept visible</span>
        <h1 className="page-title">{t('title')}</h1>
      </header>

      {/* Add Habit Form */}
      <section className="panel mb-8">
        <div className="panel-heading"><h2 className="panel-title">{t('add_new')}</h2></div>
        <form action={async (formData) => {
          await createHabit(locale, formData);
        }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <label className="field-label">{t('form.name')}</label>
            <input name="name" required className="field-input" placeholder={t('form.name_placeholder')} />
          </div>
          <div className="space-y-2">
            <label className="field-label">{t('form.frequency')}</label>
            <select name="frequency" className="field-input">
              <option value="daily">{t('form.daily')}</option>
              <option value="weekly">{t('form.weekly')}</option>
            </select>
          </div>
          <button type="submit" className="primary-button md:col-span-3">
            {t('form.submit')}
          </button>
        </form>
      </section>

      {/* Habits List */}
      <section className="panel">
        <div className="panel-heading"><h2 className="panel-title">{t('list_title')}</h2></div>
        <div className="space-y-4">
          {habitStatuses && habitStatuses.length > 0 ? (
            habitStatuses.map(habit => (
              <div key={habit.id} className="list-row">
                <div className="flex items-center gap-3">
                  <form action={async () => {
                    await toggleHabitLog(locale, habit.id, today)
                  }}>
                    <button
                      type="submit"
                      className={`task-check ${habit.completedToday ? 'task-check-done' : ''}`}
                      aria-label={habit.completedToday ? common('actions.mark_pending') : common('actions.mark_done')}
                    >
                      {habit.completedToday ? '✓' : ''}
                    </button>
                  </form>
                  <div className="flex flex-col">
                    <span className={habit.completedToday ? 'line-through muted-copy' : 'font-medium'}>
                      {habit.name}
                    </span>
                    <span className="muted-copy">{habit.frequency}</span>
                  </div>
                </div>
                <form action={async () => {
                  await deleteHabit(locale, habit.id)
                }}>
                  <button className="danger-action">
                    {common('actions.delete')}
                  </button>
                </form>
              </div>
            ))
          ) : (
            <p className="muted-copy">{t('empty')}</p>
          )}
        </div>
      </section>
    </div>
  )
}
