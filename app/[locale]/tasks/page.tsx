import { getTranslations } from 'next-intl/server';
import { createClientServer } from '@/lib/supabase-server';
import { createTask, toggleTask, deleteTask } from '../../actions';
import { TopThreeControls } from '@/app/components/top-three-controls';

type SearchParam = string | string[] | undefined;

function firstSearchParam(value: SearchParam) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TasksPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ area?: SearchParam; priority?: SearchParam; status?: SearchParam }> }) {
  const { locale } = await params;
  const common = await getTranslations('Common');
  const rawFilters = await searchParams;
  const filters = {
    area: firstSearchParam(rawFilters.area),
    priority: firstSearchParam(rawFilters.priority),
    status: firstSearchParam(rawFilters.status),
  };
  const t = await getTranslations('Tasks');
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).single();
  const timeZone = profile?.timezone || 'Europe/Madrid';

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

  return (
    <div>
      <header className="page-heading">
        <span className="eyebrow">Make room for what matters</span>
        <h1 className="page-title">{t('title')}</h1>
      </header>

      {/* Add Task Form */}
      <section className="panel mb-8">
        <div className="panel-heading"><h2 className="panel-title">{t('add_new')}</h2></div>
        <form action={async (formData) => {
          await createTask(locale, formData);
        }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="field-label">{t('form.title')}</label>
            <input name="title" required className="field-input" placeholder={t('form.title_placeholder')} />
          </div>
          <div className="space-y-2">
            <label className="field-label">{t('form.due_date')}</label>
            <input name="due_at" type="datetime-local" className="field-input" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="field-label">{t('form.description')}</label>
            <textarea name="description" className="field-input" placeholder={t('form.description_placeholder')} />
          </div>
          <div className="space-y-2">
            <label className="field-label" htmlFor="area_id">{t('form.area')}</label>
            <select name="area_id" id="area_id" className="field-input" defaultValue="">
              <option value="">{t('form.no_area')}</option>
              {areas?.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="field-label" htmlFor="priority">{t('form.priority')}</label>
            <select name="priority" id="priority" className="field-input" defaultValue="medium">
              <option value="high">{t('form.high')}</option>
              <option value="medium">{t('form.medium')}</option>
              <option value="low">{t('form.low')}</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="field-label" htmlFor="start_at">{t('form.start_time')}</label>
            <input name="start_at" id="start_at" type="datetime-local" className="field-input" />
          </div>
          <div className="space-y-2">
            <label className="field-label" htmlFor="duration_min">{t('form.duration')}</label>
            <input name="duration_min" id="duration_min" type="number" min="1" className="field-input" placeholder="30" />
          </div>
          <div className="space-y-2">
            <label className="field-label" htmlFor="recurrence">{t('form.recurrence')}</label>
            <select name="recurrence" id="recurrence" className="field-input" defaultValue="none">
              <option value="none">{t('form.none')}</option>
              <option value="daily">{t('form.daily')}</option>
              <option value="weekly">{t('form.weekly')}</option>
              <option value="monthly">{t('form.monthly')}</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-4 md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_top_three" />
              {t('form.top_three')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_reminder" id="is_reminder" />
              {t('form.reminder')}
            </label>
          </div>
          <button type="submit" className="primary-button md:col-span-2">
            {t('form.submit')}
          </button>
        </form>
      </section>

      {/* Task List */}
      <section className="panel">
        <div className="panel-heading"><h2 className="panel-title">{t('list_title')}</h2><span className="eyebrow">{tasks?.length || 0}</span></div>
        <form method="get" className="task-filters">
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
                  <form action={async () => {
                    await toggleTask(locale, task.id, !task.completed_at)
                  }}>
                    <button
                      type="submit"
                      className={`task-check ${task.completed_at ? 'task-check-done' : ''}`}
                      aria-label={task.completed_at ? t('mark_pending') : t('mark_done')}
                    >
                      {task.completed_at ? '✓' : ''}
                    </button>
                  </form>
                  <div className="flex flex-col">
                    <p className={task.completed_at ? 'line-through text-gray-400' : 'font-medium'}>
                      {task.title}
                    </p>
                    {task.due_at && (
                      <p className="muted-copy">
                        {t('due_prefix', { date: new Date(task.due_at).toLocaleString(locale, { timeZone }) })}
                      </p>
                    )}
                    <p className="muted-copy task-meta">
                      <span className="area-label"><span className="area-dot" style={{ background: task.areas?.color || 'var(--accent)' }} />{task.areas?.name || t('form.no_area')}</span>
                      <span>{t(`priority.${task.priority || 'medium'}`)}</span>
                    </p>
                  </div>
                </div>
                <TopThreeControls
                  locale={locale}
                  taskId={task.id}
                  selected={task.is_top_three && task.status !== 'completed'}
                  position={task.top_three_position}
                  addLabel={t('add_top_three')}
                  removeLabel={t('remove_top_three')}
                  moveUpLabel={t('move_up')}
                  moveDownLabel={t('move_down')}
                  limitError={t('top_three_limit')}
                />
                <div className="task-actions">
                  <form action={async () => { await deleteTask(locale, task.id) }}>
                    <button className="danger-action">{common('actions.delete')}</button>
                  </form>
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
