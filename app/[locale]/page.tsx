import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClientServer } from '@/lib/supabase-server';
import { saveDailyReview, toggleTask } from '@/app/actions';
import { QuickCapture } from '@/app/components/quick-capture';
import { getDateInTimeZone } from '@/lib/date';

export default async function Dashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations('Dashboard');
  const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).single();
  const today = getDateInTimeZone(new Date(), profile?.timezone || 'Europe/Madrid');

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, areas(name, color, icon)')
    .eq('user_id', user.id)
    .or(`due_at.is.null,due_at.gte.${today}T00:00:00`)
    .order('due_at', { ascending: true });

  const todaysTasks = tasks ?? [];
  const completedCount = todaysTasks.filter(task => task.status === 'completed' || task.completed_at).length;
  const progress = todaysTasks.length === 0 ? 0 : Math.round((completedCount / todaysTasks.length) * 100);
  const topThree = todaysTasks.filter(task => task.is_top_three).slice(0, 3);
  const pendingTasks = todaysTasks.filter(task => !task.due_at && task.status !== 'completed');
  const { data: dailyReview } = await supabase
    .from('daily_reviews')
    .select('intention, mood, energy, wins, blockers, tomorrow_top_three')
    .eq('user_id', user.id)
    .eq('review_date', today)
    .maybeSingle();

  return (
    <div>
      <header className="page-heading">
        <span className="eyebrow">{new Date().toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        <h1 className="page-title">{t('greeting', { email: user.email || '' })}</h1>
        <p className="page-subtitle">{t('subtitle')}</p>
      </header>

      <div className="today-overview">
        <section className="panel progress-panel">
          <div className="progress-ring" style={{ background: `conic-gradient(var(--accent) ${progress}%, var(--surface-muted) 0)` }}>
            <div className="progress-ring-value"><strong>{progress}%</strong><span>{t('progress')}</span></div>
          </div>
          <div>
            <span className="eyebrow">{t('focus_label')}</span>
            <h2 className="panel-title">{t('progress_summary', { completed: completedCount, total: todaysTasks.length })}</h2>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading"><h2 className="panel-title">{t('top_three')}</h2><span className="eyebrow">{topThree.length}/3</span></div>
          {topThree.length > 0 ? (
            <ul className="space-y-3">
              {topThree.map(task => (
                <li key={task.id} className="task-row">
                  <form action={async () => { await toggleTask(locale, task.id, !task.completed_at) }}>
                    <button className={`task-check ${task.completed_at ? 'task-check-done' : ''}`} aria-label={task.completed_at ? t('mark_pending') : t('mark_done')}>
                      {task.completed_at ? '✓' : ''}
                    </button>
                  </form>
                  <span className={task.completed_at ? 'line-through muted-copy' : ''}>{task.title}</span>
                  <span className="area-dot" style={{ background: task.areas?.color || 'var(--accent)' }} title={task.areas?.name || t('no_area')} />
                </li>
              ))}
            </ul>
          ) : <p className="muted-copy">{t('top_three_empty')}</p>}
        </section>
      </div>

      <div className="workspace-grid">
        <section className="panel">
          <div className="panel-heading"><h2 className="panel-title">{t('timeline')}</h2><span className="eyebrow">{todaysTasks.length}</span></div>
          {todaysTasks.length > 0 ? (
            <ul className="space-y-3">
              {todaysTasks.filter(task => task.due_at).map(task => (
                <li key={task.id} className="list-row">
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
                  <span className={task.completed_at ? 'line-through muted-copy' : ''}>
                    {task.title}
                  </span>
                  <span className="muted-copy">{new Date(task.due_at).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-copy">{t('timeline_empty')}</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading"><h2 className="panel-title">{t('pending')}</h2><span className="eyebrow">{pendingTasks.length}</span></div>
          {pendingTasks.length > 0 ? (
            <ul className="space-y-3">
              {pendingTasks.map(task => (
                <li key={task.id} className="list-row">
                  <span>{task.title}</span>
                  <form action={async () => {
                    await toggleTask(locale, task.id, true)
                  }}>
                    <button className="secondary-button">{t('mark_done')}</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-copy">{t('pending_empty')}</p>
          )}
        </section>
      </div>
      <section className="panel daily-review-panel">
        <div className="panel-heading"><h2 className="panel-title">{t('review_title')}</h2><span className="eyebrow">{t('review_eyebrow')}</span></div>
        <form action={async (formData) => { await saveDailyReview(locale, today, formData); }} className="daily-review-form">
          <label className="field-label">{t('intention')}<input name="intention" className="field-input" defaultValue={dailyReview?.intention || ''} placeholder={t('intention_placeholder')} /></label>
          <div className="review-scale-grid">
            <label className="field-label">{t('mood')}<select name="mood" className="field-input" defaultValue={dailyReview?.mood || ''}><option value="">-</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <label className="field-label">{t('energy')}<select name="energy" className="field-input" defaultValue={dailyReview?.energy || ''}><option value="">-</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          </div>
          <label className="field-label">{t('wins')}<textarea name="wins" className="field-input" defaultValue={dailyReview?.wins || ''} /></label>
          <label className="field-label">{t('blockers')}<textarea name="blockers" className="field-input" defaultValue={dailyReview?.blockers || ''} /></label>
          <label className="field-label">{t('tomorrow_top_three')}<textarea name="tomorrow_top_three" className="field-input" defaultValue={dailyReview?.tomorrow_top_three || ''} /></label>
          <button className="primary-button" type="submit">{t('save_review')}</button>
        </form>
      </section>
      <QuickCapture locale={locale} label={t('quick_capture')} />
    </div>
  );
}
