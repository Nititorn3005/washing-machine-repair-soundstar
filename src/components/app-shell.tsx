import { Link } from '@tanstack/react-router'
import { BarChart3, ClipboardList, Package, Settings } from 'lucide-react'
import { useStore } from '@/lib/store'

const NAV = [
  { to: '/', label: 'ใบงานซ่อม', icon: ClipboardList, exact: true },
  { to: '/stock', label: 'สต๊อกอะไหล่', icon: Package, exact: false },
  { to: '/reports', label: 'รายงาน', icon: BarChart3, exact: false },
  { to: '/settings', label: 'ตั้งค่า', icon: Settings, exact: false },
] as const

export function AppShell({ children }: { children: React.ReactNode }) {
  const { company } = useStore()
  return (
    <div className="flex min-h-dvh flex-col bg-muted print:bg-white">
      <header className="no-print sticky top-0 z-30 bg-brand-dark text-white shadow-md">
        <div className="mx-auto flex max-w-content items-center gap-3 px-4 py-3 sm:px-6">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-white font-bold text-brand-dark">
            HS
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold leading-tight sm:text-lg">
              {company.name} {company.branch}
            </p>
            <p className="truncate text-xs text-white/80 sm:text-sm">
              ระบบบริหารจัดการงานซ่อมเครื่องซักผ้า
            </p>
          </div>
        </div>
        <nav className="hidden border-t border-white/15 md:block" aria-label="เมนูหลัก">
          <div className="mx-auto flex max-w-content gap-1 px-4 sm:px-6">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.exact }}
                className="flex items-center gap-2 border-b-[3px] border-transparent px-4 py-3 text-[15px] font-medium text-white/85 transition-colors hover:text-white motion-reduce:transition-none"
                activeProps={{ className: '!border-white !text-white' }}
              >
                <n.icon className="size-4" aria-hidden />
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-content flex-1 px-3 pt-4 pb-28 sm:px-6 md:pb-10 print:max-w-none print:p-0">
        {children}
      </main>

      <footer className="no-print border-t bg-background pb-24 md:pb-0">
        <div className="mx-auto max-w-content space-y-1 px-4 py-5 text-sm text-muted-foreground sm:px-6">
          <p className="font-semibold text-foreground">
            {company.name} {company.branch}
          </p>
          <p>{company.address}</p>
          <p>
            โทร.{' '}
            {company.phones.map((p, i) => (
              <span key={p}>
                {i > 0 && ', '}
                <a href={`tel:${p}`} className="underline-offset-2 hover:underline">
                  {p}
                </a>
              </span>
            ))}
          </p>
        </div>
      </footer>

      <nav
        className="no-print pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-background shadow-[0_-2px_8px_rgba(0,0,0,0.06)] md:hidden"
        aria-label="เมนูหลัก"
      >
        <div className="grid grid-cols-4">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact }}
              className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-muted-foreground"
              activeProps={{ className: '!text-brand-dark' }}
            >
              <n.icon className="size-6" aria-hidden />
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
