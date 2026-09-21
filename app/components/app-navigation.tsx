'use client'

import { CalendarDays, ChartNoAxesColumn, CirclePlus, House, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavigationLabels = {
  label: string
  today: string
  calendar: string
  progress: string
  settings: string
  newTask: string
}

export function AppNavigation({ locale, labels }: { locale: string; labels: NavigationLabels }) {
  const pathname = usePathname()
  const routes = [
    { href: `/${locale}`, label: labels.today, icon: House },
    { href: `/${locale}/calendar`, label: labels.calendar, icon: CalendarDays },
    { href: `/${locale}/progress`, label: labels.progress, icon: ChartNoAxesColumn },
    { href: `/${locale}/settings`, label: labels.settings, icon: Settings },
  ]

  function isCurrent(href: string) {
    return pathname === href || (href !== `/${locale}` && pathname.startsWith(`${href}/`))
  }

  return (
    <>
      <nav className="app-nav app-nav-desktop" aria-label={labels.label}>
        {routes.map(({ href, label, icon: Icon }) => (
          <Link key={href} className={`nav-link${isCurrent(href) ? ' nav-link-current' : ''}`} href={href} aria-current={isCurrent(href) ? 'page' : undefined}>
            <Icon size={15} /> {label}
          </Link>
        ))}
        <Link className="nav-link nav-link-action" href={`/${locale}/tasks`}>
          <CirclePlus size={15} /> {labels.newTask}
        </Link>
      </nav>
      <nav className="mobile-nav" aria-label={labels.label}>
        {routes.slice(0, 2).map(({ href, label, icon: Icon }) => (
          <Link key={href} className={`mobile-nav-link${isCurrent(href) ? ' mobile-nav-link-current' : ''}`} href={href} aria-current={isCurrent(href) ? 'page' : undefined}>
            <Icon size={18} /> <span>{label}</span>
          </Link>
        ))}
        <Link className="mobile-nav-action" href={`/${locale}/tasks`} aria-label={labels.newTask} title={labels.newTask}>
          <CirclePlus size={25} />
        </Link>
        {routes.slice(2).map(({ href, label, icon: Icon }) => (
          <Link key={href} className={`mobile-nav-link${isCurrent(href) ? ' mobile-nav-link-current' : ''}`} href={href} aria-current={isCurrent(href) ? 'page' : undefined}>
            <Icon size={18} /> <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}