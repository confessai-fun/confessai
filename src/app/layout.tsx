import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/components/WalletProvider';
import { ToastProvider } from '@/components/Toast';
import UsernameModal from '@/components/UsernameModal';
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: 'ConfessAI — Confess Your Crypto Sins On-Chain',
  description: 'The on-chain church for degens. AI priest judges your sins. Baptize sinners with ETH. Every confession permanent on Base.',
  openGraph: {
    title: 'ConfessAI — Confess Your Crypto Sins On-Chain',
    description: 'AI priest judges your crypto sins on-chain. Baptize sinners with ETH on Base.',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Analytics /> {/* Vercel Analytics */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body text-gray-100 leading-relaxed">
        <WalletProvider>
          <ToastProvider>
            <UsernameModal />
            {children}
          </ToastProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
