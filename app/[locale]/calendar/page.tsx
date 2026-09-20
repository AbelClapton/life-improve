import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { createClientServer } from '@/lib/supabase-server';
import { getDateInTimeZone } from '@/lib/date';

type CalendarView = 'week' | 'month';
type SearchParam = string | string[] | undefined;

function firstSearchParam(value: SearchParam) {
  return Array.isArray(value) ? value[0] : value;
}

function shiftDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return getDateInTimeZone(date, 'UTC');
}

function shiftMonth(dateKey: string, months: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  return getDateInTimeZone(date, 'UTC');
}

function getValidDateKey(value: string | undefined, fallback: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || getDateInTimeZone(date, 'UTC') !== value) return fallback;
  return value;
}

export default async function CalendarPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ view?: SearchParam; date?: SearchParam }> }) {
  const { locale } = await params;
  const query = await searchParams;
  const t = await getTranslations('Calendar');
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).single();
  const timeZone = profile?.timezone || 'Europe/Madrid';
  const today = getDateInTimeZone(new Date(), timeZone);
  const view: CalendarView = firstSearchParam(query.view) === 'month' ? 'month' : 'week';
  const requestedDate = firstSearchParam(query.date);
  const anchorDate = getValidDateKey(requestedDate, today);
  const anchor = new Date(`${anchorDate}T12:00:00Z`);
  const monthStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1, 12));
  const rangeStart = view === 'month'
    ? shiftDate(getDateInTimeZone(monthStart, 'UTC'), -((monthStart.getUTCDay() + 6) % 7))
    : anchorDate;
  const dayCount = view === 'month' ? 42 : 7;
  const displayDays = Array.from({ length: dayCount }, (_, index) => shiftDate(rangeStart, index));
  const queryStart = new Date(`${rangeStart}T00:00:00Z`);
  queryStart.setUTCDate(queryStart.getUTCDate() - 1);
  const queryEnd = new Date(`${displayDays[displayDays.length - 1]}T23:59:59Z`);
  queryEnd.setUTCDate(queryEnd.getUTCDate() + 1);
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, due_at, status, areas(name, color)')
    .eq('user_id', user.id)
    .gte('due_at', queryStart.toISOString())
    .lt('due_at', queryEnd.toISOString())
    .not('due_at', 'is', null)
    .order('due_at', { ascending: true });
  const scheduledTasks = (tasks ?? []).filter(task => displayDays.includes(getDateInTimeZone(new Date(task.due_at), timeZone)));
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
        <div className="calendar-toolbar">
          <div className="panel-heading"><h2 className="panel-title">{view === 'month' ? new Date(`${anchorDate}T12:00:00Z`).toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }) : t('week')}</h2><span className="eyebrow">{scheduledTasks.length}</span></div>
          <div className="calendar-controls">
            <Link className="icon-button" href={`/${locale}/calendar?view=${view}&date=${view === 'month' ? shiftMonth(anchorDate, -1) : shiftDate(anchorDate, -7)}`} aria-label={t('previous')} title={t('previous')}>←</Link>
            <Link className="secondary-button" href={`/${locale}/calendar?view=${view}&date=${today}`}>{t('today')}</Link>
            <Link className="icon-button" href={`/${locale}/calendar?view=${view}&date=${view === 'month' ? shiftMonth(anchorDate, 1) : shiftDate(anchorDate, 7)}`} aria-label={t('next')} title={t('next')}>→</Link>
            <Link className={view === 'week' ? 'secondary-button calendar-view-active' : 'secondary-button'} href={`/${locale}/calendar?view=week&date=${anchorDate}`}>{t('week_view')}</Link>
            <Link className={view === 'month' ? 'secondary-button calendar-view-active' : 'secondary-button'} href={`/${locale}/calendar?view=month&date=${anchorDate}`}>{t('month_view')}</Link>
          </div>
        </div>
        <div className={view === 'month' ? 'calendar-month-grid' : 'calendar-week-grid'}>
          {displayDays.map(day => {
            const dayTasks = tasksByDate.get(day) ?? [];
            const dayLabel = new Date(`${day}T12:00:00Z`).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
            const isOutsideMonth = view === 'month' && new Date(`${day}T12:00:00Z`).getUTCMonth() !== anchor.getUTCMonth();
            return (
              <div key={day} className={`calendar-day${day === today ? ' calendar-day-today' : ''}${isOutsideMonth ? ' calendar-day-outside' : ''}`}>
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