import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { getBranding } from '@crm/db';
import './globals.css';
import DvhVarSetter from '@/components/dvh-var-setter';
import { ThemeProvider } from '@/components/theme-provider';
import { BrandingProvider } from '@/components/branding-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  const faviconUrl = branding.faviconId ? `/api/uploads/${branding.faviconId}` : '/favicon.ico';
  return {
    title: {
      default: branding.appName,
      template: `%s — ${branding.appName}`,
    },
    description: branding.loginSubtitle,
    icons: { icon: faviconUrl },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getBranding();

  return (
    <html lang="en" suppressHydrationWarning>
      <DvhVarSetter />
      <body
        className={`${geistSans.variable} ${geistMono.variable} smart-min-dvh flex flex-col antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <BrandingProvider branding={branding}>
            <SessionProvider>{children}</SessionProvider>
          </BrandingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
