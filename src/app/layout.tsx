import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from '@/components/Providers'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ToastProvider } from '@/components/ToastProvider'

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'The Mirror — Time Tracking',
  description: 'See where your time goes. The real you is defined by where you spend your time.',
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "The Mirror",
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <Providers>
          <ThemeProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
