import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { CalendarDays, ChartNoAxesColumn, CirclePlus, House, Settings, Sparkles } from 'lucide-react';
import { PwaRegister } from '@/app/components/pwa-register';
import { createClientServer } from '@/lib/supabase-server';
import './../globals.css';

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();
  const t = await getTranslations('Common');
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('theme').eq('id', user.id).maybeSingle()
    : { data: null };
  const theme = profile?.theme || 'system';

  return (
    <html lang={locale} data-theme={theme}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <PwaRegister />
          <div className="app-shell">
            <header className="app-header">
              <div className="app-header-inner">
                <Link className="brand" href={`/${locale}`}>
                  <span className="brand-mark" aria-hidden="true"><Sparkles size={16} /></span>
                  Mi Día
                </Link>
                <nav className="app-nav app-nav-desktop" aria-label={t('navigation_label')}>
                  <Link className="nav-link" href={`/${locale}`}><House size={15} /> {t('navigation.today')}</Link>
                  <Link className="nav-link" href={`/${locale}/calendar`}><CalendarDays size={15} /> {t('navigation.calendar')}</Link>
                  <Link className="nav-link" href={`/${locale}/progress`}><ChartNoAxesColumn size={15} /> {t('navigation.progress')}</Link>
                  <Link className="nav-link" href={`/${locale}/settings`}><Settings size={15} /> {t('navigation.settings')}</Link>
                  <Link className="nav-link nav-link-action" href={`/${locale}/tasks`}><CirclePlus size={15} /> {t('navigation.new_task')}</Link>
                </nav>
              </div>
            </header>
            <main className="app-main">{children}</main>
            <nav className="mobile-nav" aria-label={t('navigation_label')}>
              <Link className="mobile-nav-link" href={`/${locale}`}><House size={18} /> <span>{t('navigation.today')}</span></Link>
              <Link className="mobile-nav-link" href={`/${locale}/calendar`}><CalendarDays size={18} /> <span>{t('navigation.calendar')}</span></Link>
              <Link className="mobile-nav-action" href={`/${locale}/tasks`} aria-label={t('navigation.new_task')}><CirclePlus size={25} /></Link>
              <Link className="mobile-nav-link" href={`/${locale}/progress`}><ChartNoAxesColumn size={18} /> <span>{t('navigation.progress')}</span></Link>
              <Link className="mobile-nav-link" href={`/${locale}/settings`}><Settings size={18} /> <span>{t('navigation.settings')}</span></Link>
            </nav>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
