import { getTranslations } from 'next-intl/server';
import { createClientServer } from '@/lib/supabase-server';

export default async function ProgressPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('Progress');
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);
  const { data: completedTasks } = await supabase
    .from('tasks')
    .select('completed_at')
    .eq('user_id', user.id)
    .not('completed_at', 'is', null)
    .gte('completed_at', since.toISOString());
  const total = completedTasks?.length || 0;

  return (
    <div>
      <header className="page-heading">
        <span className="eyebrow">{t('eyebrow')}</span>
        <h1 className="page-title">{t('title')}</h1>
        <p className="page-subtitle">{t('subtitle')}</p>
      </header>
      <div className="workspace-grid">
        <section className="panel"><span className="eyebrow">{t('week_label')}</span><p className="metric-value">{total}</p><p className="muted-copy">{t('completed_tasks')}</p></section>
        <section className="panel"><span className="eyebrow">{t('streak_label')}</span><p className="metric-value">0</p><p className="muted-copy">{t('streak_placeholder')}</p></section>
      </div>
      <section className="panel mt-5"><div className="panel-heading"><h2 className="panel-title">{t('coming_title')}</h2></div><p className="muted-copy">{t('coming_copy')}</p></section>
    </div>
  );
}