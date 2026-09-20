import { getTranslations } from 'next-intl/server';
import { createClientServer } from '@/lib/supabase-server';
import { createArea, deleteArea, signOut, updateProfile } from '@/app/actions';

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('Settings');
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('username, display_name, timezone, theme, notifications_enabled').eq('id', user.id).single();
  const { data: areas } = await supabase.from('areas').select('id, name, color, icon, goal').eq('user_id', user.id).order('name');

  return (
    <div>
      <header className="page-heading">
        <span className="eyebrow">{t('eyebrow')}</span>
        <h1 className="page-title">{t('title')}</h1>
        <p className="page-subtitle">{t('subtitle')}</p>
      </header>
      <section className="panel mb-5">
        <div className="panel-heading"><h2 className="panel-title">{t('profile_title')}</h2></div>
        <form action={async (formData) => { await updateProfile(locale, formData); }} className="settings-form">
          <div className="list-row"><span>{t('email')}</span><strong>{user.email}</strong></div>
          <label className="field-label">{t('display_name')}<input name="display_name" className="field-input" defaultValue={profile?.display_name || ''} /></label>
          <label className="field-label">{t('timezone')}<input name="timezone" className="field-input" defaultValue={profile?.timezone || 'Europe/Madrid'} /></label>
          <label className="field-label">{t('theme')}<select name="theme" className="field-input" defaultValue={profile?.theme || 'system'}><option value="system">{t('theme_system')}</option><option value="light">{t('theme_light')}</option><option value="dark">{t('theme_dark')}</option></select></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notifications_enabled" defaultChecked={profile?.notifications_enabled ?? true} />{t('notifications')}</label>
          <button className="primary-button" type="submit">{t('save')}</button>
        </form>
      </section>
      <section className="panel">
        <div className="panel-heading"><h2 className="panel-title">{t('areas_title')}</h2><span className="eyebrow">{areas?.length || 0}</span></div>
        <form action={async (formData) => { await createArea(locale, formData); }} className="settings-area-form">
          <input name="name" required className="field-input" placeholder={t('area_name')} />
          <input name="color" type="color" className="color-input" defaultValue="#6366f1" aria-label={t('area_color')} />
          <input name="goal" className="field-input" placeholder={t('area_goal')} />
          <button className="primary-button" type="submit">{t('add_area')}</button>
        </form>
        <div className="settings-list">
          {areas?.map(area => <div key={area.id} className="list-row"><span className="area-label"><span className="area-dot" style={{ background: area.color }} />{area.name}</span><form action={async () => { await deleteArea(locale, area.id); }}><button className="danger-action">{t('delete_area')}</button></form></div>)}
        </div>
      </section>
      <form action={async () => { await signOut(locale); }} className="mt-5">
        <button className="danger-action" type="submit">{t('sign_out')}</button>
      </form>
    </div>
  );
}