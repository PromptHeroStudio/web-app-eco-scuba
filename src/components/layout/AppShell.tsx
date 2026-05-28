// src/components/layout/AppShell.tsx
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import TopNav from './TopNav';
import OceanBubbles from './OceanBubbles';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

export default function AppShell() {
  const { sidebarOpen, pageTitle } = useUIStore();

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-background text-foreground" style={{ backgroundColor: '#F7FBFF' }}>
      <OceanBubbles />
      <AppSidebar />
      <div className={cn(
        'flex flex-col flex-1 overflow-hidden transition-all duration-300',
        sidebarOpen ? 'md:ml-[256px]' : 'md:ml-[64px]'
      )}>
        <TopNav title={pageTitle} />
        <main className="flex-1 min-h-0 h-full max-w-full overflow-y-auto custom-scrollbar break-words p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
