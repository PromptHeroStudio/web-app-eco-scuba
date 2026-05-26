import { Plus, Search, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NotificationBell from "./NotificationBell";
import { useState } from "react";
import NewProjectWizard from "../projects/NewProjectWizard";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Link, useLocation } from "react-router-dom";

interface TopNavProps {
  title: string;
}

export default function TopNav({ title }: TopNavProps) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Projekti", path: "/projects" },
    { label: "Analitika", path: "/analytics" },
    { label: "Saradnja", path: "/collaboration" },
    { label: "Podešavanja", path: "/settings" },
  ];

  return (
    <>
      <Drawer open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DrawerContent className="bg-bg-secondary text-text-primary p-0">
          <DrawerHeader className="flex items-center justify-between border-b border-border px-4 py-4">
            <DrawerTitle className="text-lg font-bold">ECO SCUBA</DrawerTitle>
            <DrawerClose asChild>
              <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/20 hover:text-foreground transition-all">
                <X className="h-5 w-5" />
              </button>
            </DrawerClose>
          </DrawerHeader>

          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileNavOpen(false)}
                  className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </DrawerContent>
      </Drawer>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all md:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Otvori navigaciju"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground truncate max-w-[240px] md:max-w-[400px]">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pretraži..."
              className="w-48 xl:w-64 pl-9 bg-muted/20 border-border focus:border-primary/50 transition-all rounded-xl h-10"
            />
          </div>

          <NotificationBell />

          <Button
            size="sm"
            className="gap-2 rounded-xl h-10 px-4 shadow-lg shadow-primary/20"
            onClick={() => setWizardOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novi projekat</span>
          </Button>
        </div>
      </header>

      <NewProjectWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </>
  );
}
