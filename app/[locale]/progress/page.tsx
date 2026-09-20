import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClientServer } from '@/lib/supabase-server';
import { getDateInTimeZone } from '@/lib/date';

export default async function ProgressPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('Progress');
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).single();
  const today = getDateInTimeZone(new Date(), profile?.timezone || 'Europe/Madrid');
  const todayDate = new Date(`${today}T12:00:00Z`);
  const since = new Date(todayDate);
  since.setUTCDate(since.getUTCDate() - 6);
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(since);
    date.setUTCDate(since.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
  const { data: completionEvents } = await supabase
    .from('task_completion_events')
    .select('task_id, completed_on, area_id_snapshot, area_name_snapshot, area_color_snapshot')
    .eq('user_id', user.id)
    .gte('completed_on', dates[0])
    .lte('completed_on', dates[6]);
  const counts = dates.map(date => completionEvents?.filter(event => event.completed_on === date).length || 0);
  const total = counts.reduce((sum, count) => sum + count, 0);
  const areaSummary = new Map<string, { areaId: string | null; name: string; color: string; count: number }>();
  completionEvents?.forEach(event => {
    const areaId = event.area_id_snapshot || null;
    const key = areaId || '__none__';
    const current = areaSummary.get(key);
    areaSummary.set(key, { areaId, name: event.area_name_snapshot || t('no_area'), color: event.area_color_snapshot || 'var(--muted)', count: (current?.count || 0) + 1 });
  });
  const areasByCompletion = [...areaSummary.values()].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, locale));
  const { data: points } = await supabase.from('user_points').select('points').eq('user_id', user.id).maybeSingle();
  const { data: earnedAchievements } = await supabase
    .from('user_achievements')
    .select('earned_at, achievements(key, points)')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: true });
  const { data: allCompletionEvents } = await supabase.from('task_completion_events').select('completed_on').eq('user_id', user.id);
  const allDates = new Set(allCompletionEvents?.map(event => event.completed_on));
  let streak = 0;
  const streakCursor = new Date(`${today}T12:00:00Z`);
  if (!allDates.has(today)) streakCursor.setUTCDate(streakCursor.getUTCDate() - 1);
  while (allDates.has(streakCursor.toISOString().slice(0, 10))) {
    streak += 1;
    streakCursor.setUTCDate(streakCursor.getUTCDate() - 1);
  }

  return (
    <div>
      <header className="page-heading">
        <span className="eyebrow">{t('eyebrow')}</span>
        <h1 className="page-title">{t('title')}</h1>
        <p className="page-subtitle">{t('subtitle')}</p>
      </header>
      <div className="workspace-grid">
        <section className="panel"><span className="eyebrow">{t('week_label')}</span><p className="metric-value">{total}</p><p className="muted-copy">{t('completed_tasks')}</p></section>
        <section className="panel"><span className="eyebrow">{t('streak_label')}</span><p className="metric-value">{streak}</p><p className="muted-copy">{t('streak_days')}</p></section>
      </div>
      <section className="panel mt-5">
        <div className="panel-heading"><h2 className="panel-title">{t('area_summary_title')}</h2><span className="eyebrow">{total}</span></div>
        {areasByCompletion.length > 0 ? (
          <div className="area-summary-list">
            {areasByCompletion.map(area => <div className="area-summary-row" key={area.areaId || '__none__'}><span className="area-label"><span className="area-dot" style={{ background: area.color }} />{area.name}</span><strong>{area.count}</strong></div>)}
          </div>
        ) : <p className="muted-copy">{t('area_summary_empty')}</p>}
      </section>
      <section className="panel mt-5">
        <div className="panel-heading"><h2 className="panel-title">{t('week_chart')}</h2><span className="eyebrow">{t('points')}: {points?.points || 0}</span></div>
        <div className="weekly-chart">
          {dates.map((date, index) => <div className="chart-column" key={date}><span className="chart-value">{counts[index]}</span><div className="chart-bar-track"><div className="chart-bar" style={{ height: `${Math.max(counts[index] * 24, counts[index] ? 12 : 4)}px` }} /></div><span className="chart-label">{new Date(`${date}T12:00:00`).toLocaleDateString(locale, { weekday: 'short' })}</span></div>)}
        </div>
      </section>
      <section className="panel mt-5">
        <div className="panel-heading"><h2 className="panel-title">{t('achievements_title')}</h2><span className="eyebrow">{earnedAchievements?.length || 0}</span></div>
        {earnedAchievements && earnedAchievements.length > 0 ? (
          <div className="achievement-list">
            {earnedAchievements.map(achievement => {
              const details = Array.isArray(achievement.achievements) ? achievement.achievements[0] : achievement.achievements;
              const key = details?.key;
              return key ? <article className="achievement-item" key={key}><div><h3>{t(`achievements.${key}.name`)}</h3><p className="muted-copy">{t(`achievements.${key}.description`)}</p></div><span className="eyebrow">+{details?.points || 0}</span></article> : null;
            })}
          </div>
        ) : <p className="muted-copy">{t('achievements_empty')}</p>}
      </section>
    </div>
  );
}