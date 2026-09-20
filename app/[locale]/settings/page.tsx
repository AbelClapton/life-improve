import { getTranslations } from 'next-intl/server';
import { createClientServer } from '@/lib/supabase-server';

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('Settings');
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('username, display_name, timezone, theme').eq('id', user.id).single();

  return (
    <div>
      <header className="page-heading">
        <span className="eyebrow">{t('eyebrow')}</span>
        <h1 className="page-title">{t('title')}</h1>
        <p className="page-subtitle">{t('subtitle')}</p>
      </header>
      <section className="panel settings-list">
        <div className="list-row"><span>{t('email')}</span><strong>{user.email}</strong></div>
        <div className="list-row"><span>{t('display_name')}</span><strong>{profile?.display_name || profile?.username || t('not_set')}</strong></div>
        <div className="list-row"><span>{t('timezone')}</span><strong>{profile?.timezone || 'Europe/Madrid'}</strong></div>
        <div className="list-row"><span>{t('theme')}</span><strong>{profile?.theme || 'system'}</strong></div>
      </section>
      <p className="muted-copy mt-5">{t('next_step')}</p>
    </div>
  );
}