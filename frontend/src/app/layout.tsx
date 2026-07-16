import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'ClaimSight — AI Damage Assessment',
    template: '%s · ClaimSight',
  },
  description:
    'Automated warranty and insurance claim damage assessor. AI-powered analysis, fraud detection, and instant cost estimation for adjusters and claimants.',
  keywords: ['insurance claim', 'damage assessment', 'AI', 'fraud detection', 'vehicle damage'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full antialiased">
        {children}
      </body>
    </html>
  );
}
