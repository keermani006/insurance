import AuthGuard from '@/components/layout/AuthGuard';
import { Sidebar, MobileNavbar, TopBar } from '@/components/layout/Sidebar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-full min-h-screen" style={{ backgroundColor: 'var(--bg-canvas)' }}>
        <Sidebar />
        <TopBar />
        <main
          className="flex-1 lg:pl-64 flex flex-col min-h-screen"
          id="main-content"
        >
          <div className="flex-1 p-6 lg:p-8 pb-20 lg:pb-8">
            {children}
          </div>
        </main>
        <MobileNavbar />
      </div>
    </AuthGuard>
  );
}
