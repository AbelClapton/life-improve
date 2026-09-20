import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { createClientServer } from '@/lib/supabase-server';

export default async function CalendarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('Calendar');
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .gte('due_at', start.toISOString())
    .lt('due_at', end.toISOString())
    .order('due_at', { ascending: true });

  return (
    <div>
      <header className="page-heading">
        <span className="eyebrow">{t('eyebrow')}</span>
        <h1 className="page-title">{t('title')}</h1>
        <p className="page-subtitle">{t('subtitle')}</p>
      </header>
      <section className="panel">
        <div className="panel-heading"><h2 className="panel-title">{t('week')}</h2><span className="eyebrow">{tasks?.length || 0}</span></div>
        {tasks && tasks.length > 0 ? (
          <ul className="space-y-3">
            {tasks.map(task => (
              <li key={task.id} className="list-row">
                <div>
                  <strong>{task.title}</strong>
                  <p className="muted-copy">{new Date(task.due_at).toLocaleString(locale, { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                </div>
                <span className="muted-copy">{task.status === 'completed' ? t('completed') : t('pending')}</span>
              </li>
            ))}
          </ul>
        ) : <p className="muted-copy">{t('empty')}</p>}
        <Link className="primary-button inline-flex mt-6" href={`/${locale}/tasks`}>{t('add_task')}</Link>
      </section>
    </div>
  );
}