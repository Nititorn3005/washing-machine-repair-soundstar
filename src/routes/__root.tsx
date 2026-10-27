import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NotFoundPage } from '@/components/error-pages'
import { AppShell } from '@/components/app-shell'
import { StoreProvider } from '@/lib/store'

import '../styles.css'

const siteName = 'ระบบบริหารงานซ่อมเครื่องซักผ้า | บริษัท หาดใหญ่ซาวด์สตาร์ จำกัด (สำนักงานใหญ่)'
const siteDescription =
  'ระบบใบงานซ่อม สต๊อกอะไหล่ และรายงาน สำหรับงานซ่อมเครื่องซักผ้า บริษัท หาดใหญ่ซาวด์สตาร์ จำกัด'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { name: 'theme-color', content: '#B71C1C' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'format-detection', content: 'telephone=no' },
      {
        title: siteName,
      },
      {
        name: 'description',
        content: siteDescription,
      },
      {
        property: 'og:title',
        content: siteName,
      },
      {
        property: 'og:description',
        content: siteDescription,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <HeadContent />
      </head>
      <body>
        <TooltipProvider>
          <StoreProvider>
            <AppShell>{children}</AppShell>
          </StoreProvider>
        </TooltipProvider>
        <Toaster position="top-center" richColors />
        <Scripts />
      </body>
    </html>
  )
}
