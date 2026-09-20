import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { createClientServer } from '@/lib/supabase-server';
import { getDateInTimeZone } from '@/lib/date';

export default async function CalendarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('Calendar');
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).single();
  const timeZone = profile?.timezone || 'Europe/Madrid';
  const today = getDateInTimeZone(new Date(), timeZone);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return getDateInTimeZone(date, 'UTC');
  });
  const queryStart = new Date(`${today}T00:00:00Z`);
  queryStart.setUTCDate(queryStart.getUTCDate() - 1);
  const queryEnd = new Date(`${weekDays[6]}T23:59:59Z`);
  queryEnd.setUTCDate(queryEnd.getUTCDate() + 1);
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, due_at, status, areas(name, color)')
    .eq('user_id', user.id)
    .gte('due_at', queryStart.toISOString())
    .lt('due_at', queryEnd.toISOString())
    .not('due_at', 'is', null)
    .order('due_at', { ascending: true });
  const scheduledTasks = (tasks ?? []).filter(task => weekDays.includes(getDateInTimeZone(new Date(task.due_at), timeZone)));
  const tasksByDate = new Map<string, typeof scheduledTasks>();
  for (const task of scheduledTasks) {
    const date = getDateInTimeZone(new Date(task.due_at), timeZone);
    const dayTasks = tasksByDate.get(date) ?? [];
    dayTasks.push(task);
    tasksByDate.set(date, dayTasks);
  }

  return (
    <div>
      <header className="page-heading">
        <span className="eyebrow">{t('eyebrow')}</span>
        <h1 className="page-title">{t('title')}</h1>
        <p className="page-subtitle">{t('subtitle')}</p>
      </header>
      <section className="panel">
        <div className="panel-heading"><h2 className="panel-title">{t('week')}</h2><span className="eyebrow">{scheduledTasks.length}</span></div>
        <div className="calendar-week-grid">
          {weekDays.map(day => {
            const dayTasks = tasksByDate.get(day) ?? [];
            const dayLabel = new Date(`${day}T12:00:00Z`).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
            return (
              <div key={day} className={`calendar-day${day === today ? ' calendar-day-today' : ''}`}>
                <div className="calendar-day-heading">
                  <strong>{dayLabel}</strong>
                  {day === today && <span className="eyebrow">{t('today')}</span>}
                </div>
                {dayTasks.length > 0 ? dayTasks.map(task => (
                  <article key={task.id} className="calendar-task">
                    <span className="area-dot" style={{ background: task.areas?.[0]?.color || 'var(--accent)' }} />
                    <div>
                      <strong>{task.title}</strong>
                      <p className="muted-copy">{new Date(task.due_at).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', timeZone })}</p>
                    </div>
                    <span className="muted-copy">{task.status === 'completed' ? t('completed') : t('pending')}</span>
                  </article>
                )) : <p className="muted-copy calendar-empty-day">{t('empty_day')}</p>}
              </div>
            );
          })}
        </div>
        <Link className="primary-button inline-flex mt-6" href={`/${locale}/tasks`}>{t('add_task')}</Link>
      </section>
    </div>
  );
}