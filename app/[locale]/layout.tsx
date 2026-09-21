import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { PwaRegister } from '@/app/components/pwa-register';
import { AppNavigation } from '@/app/components/app-navigation';
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
                <AppNavigation locale={locale} labels={{ label: t('navigation_label'), today: t('navigation.today'), calendar: t('navigation.calendar'), progress: t('navigation.progress'), settings: t('navigation.settings'), newTask: t('navigation.new_task') }} />
              </div>
            </header>
            <main className="app-main">{children}</main>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
