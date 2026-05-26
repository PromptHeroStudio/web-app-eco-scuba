// src/components/layout/AppShell.tsx
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import TopNav from './TopNav';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

export default function AppShell() {
  const { sidebarOpen, pageTitle } = useUIStore();

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary text-text-primary">
      <AppSidebar />
      <div className={cn(
        'flex flex-col flex-1 overflow-hidden transition-all duration-300',
        sidebarOpen ? 'md:ml-[256px]' : 'md:ml-[64px]'
      )}>
        <TopNav title={pageTitle} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
