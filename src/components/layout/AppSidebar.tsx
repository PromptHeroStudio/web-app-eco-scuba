import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FolderOpen,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Waves,
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: FolderOpen, label: "Projekti", path: "/projects" },
  { icon: BarChart3, label: "Analitika", path: "/analytics" },
  { icon: Users, label: "Saradnja", path: "/collaboration" },
  { icon: Settings, label: "Podešavanja", path: "/settings" },
];

export default function AppSidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    signOut();
    navigate("/login");
  };

  const isCollapsed = !sidebarOpen;

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col border-r border-border bg-bg-secondary"
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4 border-b border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Waves className="h-5 w-5 text-primary" />
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <span className="font-display text-lg font-bold text-foreground">
                ECO SCUBA
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative ${isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className="h-5 w-5 shrink-0" />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Responsibilities Section - Mandatory */}
      <div className="px-4 py-4 space-y-3 border-t border-border">
        {!isCollapsed && (
          <h4 className="text-[10px] font-bold text-text-dim uppercase tracking-widest pl-1">
            Odgovornosti
          </h4>
        )}
        <div className={`rounded-xl bg-orange-500/5 border border-orange-500/20 p-3 overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 pointer-events-none' : 'h-[150px] opacity-100'}`}>
          <p className="text-[11px] text-orange-500/80 leading-relaxed overflow-y-auto h-full scrollbar-none select-none">
            <strong>OBAVJEŠTENJE:</strong> ECO SCUBA AI (APA sistem) generiše sadržaj na osnovu vještačke inteligencije.
            Sistem može kreirati netačne podatke. Korisnik (autor projekta) preuzima punu odgovornost za tačnost, istinitost i provjeru svih generisanih informacija i statistika u finalnom dokumentu.
            KVS S.C.U.B.A. nije odgovoran za eventualne propuste proizašle iz automatskog generisanja.
          </p>
        </div>
      </div>

      {/* Footer / Logout */}
      <div className="border-t border-border p-2 space-y-1">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Odjava</span>}
        </button>

        {/* Collapse button */}
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Smanji</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
