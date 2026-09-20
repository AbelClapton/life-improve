import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import Link from 'next/link';
import { CalendarDays, ChartNoAxesColumn, CirclePlus, House, Settings, Sparkles } from 'lucide-react';
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

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <div className="app-shell">
            <header className="app-header">
              <div className="app-header-inner">
                <Link className="brand" href={`/${locale}`}>
                  <span className="brand-mark" aria-hidden="true"><Sparkles size={16} /></span>
                  Mi Día
                </Link>
                <nav className="app-nav" aria-label="Primary navigation">
                  <Link className="nav-link" href={`/${locale}`}><House size={15} /> Hoy</Link>
                  <Link className="nav-link" href={`/${locale}/calendar`}><CalendarDays size={15} /> Calendario</Link>
                  <Link className="nav-link" href={`/${locale}/progress`}><ChartNoAxesColumn size={15} /> Progreso</Link>
                  <Link className="nav-link" href={`/${locale}/settings`}><Settings size={15} /> Ajustes</Link>
                  <Link className="nav-link nav-link-action" href={`/${locale}/tasks`}><CirclePlus size={15} /> Nueva tarea</Link>
                </nav>
              </div>
            </header>
            <main className="app-main">{children}</main>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
