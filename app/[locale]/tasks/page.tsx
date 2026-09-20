import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClientServer } from '@/lib/supabase-server';
import { TopThreeControls } from '@/app/components/top-three-controls';
import { TaskCompletionButton } from '@/app/components/task-completion-button';
import { TaskEditDialog } from '@/app/components/task-edit-dialog';
import { TaskCreateForm } from '@/app/components/task-create-form';
import { TaskPostponeButton } from '@/app/components/task-postpone-button';
import { TaskDeleteButton } from '@/app/components/task-delete-button';
import { getDateInTimeZone } from '@/lib/date';

type SearchParam = string | string[] | undefined;

function firstSearchParam(value: SearchParam) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TasksPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ area?: SearchParam; priority?: SearchParam; status?: SearchParam; due_at?: SearchParam; calendar_view?: SearchParam; calendar_date?: SearchParam }> }) {
  const { locale } = await params;
  const common = await getTranslations('Common');
  const rawFilters = await searchParams;
  const filters = {
    area: firstSearchParam(rawFilters.area),
    priority: firstSearchParam(rawFilters.priority),
    status: firstSearchParam(rawFilters.status),
  };
  const requestedDueAt = firstSearchParam(rawFilters.due_at);
  const initialDueAt = requestedDueAt && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(requestedDueAt) ? requestedDueAt : '';
  const calendarView = firstSearchParam(rawFilters.calendar_view);
  const calendarDate = firstSearchParam(rawFilters.calendar_date);
  const calendarHref = calendarView && calendarDate
    ? `/${locale}/calendar?view=${calendarView === 'month' ? 'month' : 'week'}&date=${calendarDate}`
    : `/${locale}/calendar`;
  const t = await getTranslations('Tasks');
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).single();
  const timeZone = profile?.timezone || 'Europe/Madrid';
  const tomorrow = new Date(`${getDateInTimeZone(new Date(), timeZone)}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const defaultPostponeDate = tomorrow.toISOString().slice(0, 10);

  let taskQuery = supabase
    .from('tasks')
    .select('*, areas(name, color)')
    .eq('user_id', user.id)
  if (filters.area === '__none__') taskQuery = taskQuery.is('area_id', null);
  else if (filters.area) taskQuery = taskQuery.eq('area_id', filters.area);
  if (filters.priority) taskQuery = taskQuery.eq('priority', filters.priority);
  if (filters.status) taskQuery = taskQuery.eq('status', filters.status);
  const { data: tasks } = await taskQuery
    .order('is_top_three', { ascending: false })
    .order('top_three_position', { ascending: true, nullsFirst: false })
    .order('due_at', { ascending: true });
  const { data: areas } = await supabase
    .from('areas')
    .select('id, name, color')
    .eq('user_id', user.id)
    .order('name', { ascending: true });
  const editLabels = {
    title: t('edit_task'),
    taskTitle: t('form.title'),
    notes: t('form.description'),
    area: t('form.area'),
    noArea: t('form.no_area'),
    priority: t('form.priority'),
    high: t('form.high'),
    medium: t('form.medium'),
    low: t('form.low'),
    dueDate: t('form.due_date'),
    startTime: t('form.start_time'),
    duration: t('form.duration'),
    recurrence: t('form.recurrence'),
    none: t('form.none'),
    daily: t('form.daily'),
    weekly: t('form.weekly'),
    monthly: t('form.monthly'),
    reminder: t('form.reminder'),
    close: t('close'),
    cancel: t('cancel'),
    save: t('save'),
    saving: t('saving'),
    edit: t('edit'),
    error: t('unable_to_save'),
    titleRequired: t('errors.title_required'),
    durationInvalid: t('errors.duration_invalid'),
    invalidDate: t('errors.invalid_datetime'),
    areaNotFound: t('errors.area_not_found'),
    taskNotFound: t('errors.task_not_found'),
  };

  return (
    <div>
      <header className="page-heading">
        <span className="eyebrow">Make room for what matters</span>
        <h1 className="page-title">{t('title')}</h1>
        {calendarView && calendarDate && <Link className="secondary-button inline-flex mt-4" href={calendarHref}>{t('back_to_calendar')}</Link>}
      </header>

      {/* Add Task Form */}
      <section className="panel mb-8">
        <div className="panel-heading"><h2 className="panel-title">{t('add_new')}</h2></div>
        <TaskCreateForm
          locale={locale}
          areas={areas || []}
          initialDueAt={initialDueAt}
          labels={{
            title: t('form.title'), titlePlaceholder: t('form.title_placeholder'), dueDate: t('form.due_date'),
            description: t('form.description'), descriptionPlaceholder: t('form.description_placeholder'),
            area: t('form.area'), noArea: t('form.no_area'), priority: t('form.priority'), high: t('form.high'),
            medium: t('form.medium'), low: t('form.low'), startTime: t('form.start_time'), duration: t('form.duration'),
            recurrence: t('form.recurrence'), none: t('form.none'), daily: t('form.daily'), weekly: t('form.weekly'),
            monthly: t('form.monthly'), topThree: t('form.top_three'), reminder: t('form.reminder'), submit: t('form.submit'),
            saving: t('saving'), error: t('unable_to_save'), titleRequired: t('errors.title_required'),
            durationInvalid: t('errors.duration_invalid'), invalidDate: t('errors.invalid_datetime'), areaNotFound: t('errors.area_not_found'), topThreeLimit: t('top_three_limit'),
          }}
        />
      </section>

      {/* Task List */}
      <section className="panel">
        <div className="panel-heading"><h2 className="panel-title">{t('list_title')}</h2><span className="eyebrow">{tasks?.length || 0}</span></div>
        <form method="get" className="task-filters">
          {calendarView && calendarDate && <>
            <input type="hidden" name="calendar_view" value={calendarView} />
            <input type="hidden" name="calendar_date" value={calendarDate} />
            {initialDueAt && <input type="hidden" name="due_at" value={initialDueAt} />}
          </>}
          <label className="field-label">{t('filters.area')}<select name="area" className="field-input" defaultValue={filters.area || ''}><option value="">{t('filters.all')}</option><option value="__none__">{t('form.no_area')}</option>{areas?.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
          <label className="field-label">{t('filters.priority')}<select name="priority" className="field-input" defaultValue={filters.priority || ''}><option value="">{t('filters.all')}</option><option value="high">{t('form.high')}</option><option value="medium">{t('form.medium')}</option><option value="low">{t('form.low')}</option></select></label>
          <label className="field-label">{t('filters.status')}<select name="status" className="field-input" defaultValue={filters.status || ''}><option value="">{t('filters.all')}</option><option value="pending">{t('filters.pending')}</option><option value="completed">{t('filters.completed')}</option><option value="postponed">{t('filters.postponed')}</option></select></label>
          <button type="submit" className="secondary-button">{t('filters.apply')}</button>
        </form>
        <div className="space-y-4">
          {tasks && tasks.length > 0 ? (
            tasks.map(task => (
              <div key={task.id} className="list-row">
                <div className="flex items-center gap-3">
                  <TaskCompletionButton locale={locale} taskId={task.id} completed={task.status === 'completed' || !!task.completed_at} isTopThree={!!task.is_top_three} markDoneLabel={t('mark_done')} markPendingLabel={t('mark_pending')} errorLabel={t('unable_to_save')} content={<div className="flex flex-col">
                    <p>{task.title}</p>
                    {task.due_at && (
                      <p className="muted-copy">
                        {t('due_prefix', { date: new Date(task.due_at).toLocaleString(locale, { timeZone }) })}
                      </p>
                    )}
                    <p className="muted-copy task-meta">
                      <span className="area-label"><span className="area-dot" style={{ background: task.areas?.color || 'var(--accent)' }} />{task.areas?.name || t('form.no_area')}</span>
                      <span>{t(`priority.${task.priority || 'medium'}`)}</span>
                    </p>
                  </div>} />
                </div>
                <TopThreeControls
                  locale={locale}
                  taskId={task.id}
                  selected={task.is_top_three && task.status !== 'completed' && !task.completed_at}
                  position={task.top_three_position}
                  addLabel={t('add_top_three')}
                  removeLabel={t('remove_top_three')}
                  moveUpLabel={t('move_up')}
                  moveDownLabel={t('move_down')}
                  limitError={t('top_three_limit')}
                  taskNotFoundError={t('errors.task_not_found')}
                  completedTaskError={t('errors.completed_task_top_three')}
                  topThreeNotFoundError={t('errors.top_three_not_found')}
                  unableToSaveError={t('unable_to_save')}
                />
                <TaskEditDialog
                  locale={locale}
                  task={task}
                  areas={areas || []}
                  timeZone={timeZone}
                  labels={editLabels}
                />
                <div className="task-actions">
                  {task.status !== 'completed' && !task.completed_at && <TaskPostponeButton locale={locale} taskId={task.id} defaultDate={defaultPostponeDate} label={t('postpone')} dateLabel={t('postpone_date')} errorLabel={t('unable_to_save')} />}
                  <TaskDeleteButton locale={locale} taskId={task.id} label={common('actions.delete')} confirmLabel={t('confirm_delete')} errorLabel={t('unable_to_save')} />
                </div>
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
