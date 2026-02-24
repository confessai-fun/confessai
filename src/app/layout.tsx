import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/components/WalletProvider';
import { ToastProvider } from '@/components/Toast';
import UsernameModal from '@/components/UsernameModal';

export const metadata: Metadata = {
  title: 'Confessai.fun — Confess Your Crypto Sins',
  description: 'The anonymous confessional for degens. An AI priest judges your worst trades. $CONFESS on Base.',
  openGraph: {
    title: 'Confessai.fun — Confess Your Crypto Sins',
    description: 'An AI priest judges your worst crypto trades. $CONFESS on Base.',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
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
