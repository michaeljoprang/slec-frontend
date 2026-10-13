import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './globals.css';
import ThemeRegistry from '@/components/ThemeRegistry';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Syncrum Logistics Education Center | SLEC',
  description:
    'Enterprise safety management dashboard for safety patrols, findings tracking, evidence management, and compliance reporting.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
