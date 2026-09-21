import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClientServer } from '@/lib/supabase-server';
import { getDateInTimeZone, getUtcStartForDate, getUtcStartForNextDate } from '@/lib/date';
import { TaskEditDialog } from '@/app/components/task-edit-dialog';

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
  const taskT = await getTranslations('Tasks');
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

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
  const queryStart = getUtcStartForDate(rangeStart, timeZone);
  const queryEnd = getUtcStartForNextDate(displayDays[displayDays.length - 1], timeZone);
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, notes, area_id, priority, due_at, start_at, duration_min, recurrence, is_reminder, status, completed_at, areas(name, color)')
    .eq('user_id', user.id)
    .gte('due_at', queryStart || new Date(0).toISOString())
    .lt('due_at', queryEnd || new Date(8640000000000000).toISOString())
    .not('due_at', 'is', null)
    .order('due_at', { ascending: true });
  const { data: areas } = await supabase
    .from('areas')
    .select('id, name')
    .eq('user_id', user.id)
    .order('name', { ascending: true });
  const editLabels = {
    title: taskT('edit_task'),
    taskTitle: taskT('form.title'),
    notes: taskT('form.notes'),
    area: taskT('form.area'),
    noArea: taskT('form.no_area'),
    priority: taskT('form.priority'),
    high: taskT('form.high'),
    medium: taskT('form.medium'),
    low: taskT('form.low'),
    dueDate: taskT('form.due_date'),
    startTime: taskT('form.start_time'),
    duration: taskT('form.duration'),
    recurrence: taskT('form.recurrence'),
    none: taskT('form.none'),
    daily: taskT('form.daily'),
    weekly: taskT('form.weekly'),
    monthly: taskT('form.monthly'),
    reminder: taskT('form.reminder'),
    close: taskT('close'),
    cancel: taskT('cancel'),
    save: taskT('save'),
    saving: taskT('saving'),
    edit: taskT('edit'),
    error: taskT('unable_to_save'),
    titleRequired: taskT('errors.title_required'),
    durationInvalid: taskT('errors.duration_invalid'),
    invalidDate: taskT('errors.invalid_datetime'),
    areaNotFound: taskT('errors.area_not_found'),
    taskNotFound: taskT('errors.task_not_found'),
  };
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
                <Link
                  className="calendar-day-add"
                  href={`/${locale}/tasks?due_at=${day}T09%3A00&calendar_view=${view}&calendar_date=${anchorDate}`}
                >
                  {t('add_task')}
                </Link>
                {dayTasks.length > 0 ? dayTasks.map(task => {
                  const area = Array.isArray(task.areas) ? task.areas[0] : task.areas;
                  return (
                  <article key={task.id} className="calendar-task">
                    <span className="area-dot" style={{ background: area?.color || 'var(--accent)' }} />
                    <div>
                      <strong>{task.title}</strong>
                      <p className="muted-copy">{new Date(task.due_at).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', timeZone })}</p>
                    </div>
                    <span className="muted-copy">{task.status === 'completed' || task.completed_at ? t('completed') : t('pending')}</span>
                    <TaskEditDialog
                      locale={locale}
                      task={task}
                      areas={areas || []}
                      timeZone={timeZone}
                      labels={editLabels}
                    />
                  </article>
                  );
                }) : <p className="muted-copy calendar-empty-day">{t('empty_day')}</p>}
              </div>
            );
          })}
        </div>
        <Link className="primary-button inline-flex mt-6" href={`/${locale}/tasks?calendar_view=${view}&calendar_date=${anchorDate}`}>{t('add_task')}</Link>
      </section>
    </div>
  );
}