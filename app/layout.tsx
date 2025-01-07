'use client';

import './globals.css';
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
