import './globals.css';
import type { Metadata } from 'next';
import { PlayerShell } from '@/components/player-shell';
import { AuthProvider } from '@/components/auth-provider';
import { Sidebar } from '@/components/sidebar';

export const metadata: Metadata = {
  title: 'Resonate — listen together',
  description: 'A music platform with synced listening rooms.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="with-player-padding flex-1">{children}</div>
          </div>
          <PlayerShell />
        </AuthProvider>
      </body>
    </html>
  );
}
