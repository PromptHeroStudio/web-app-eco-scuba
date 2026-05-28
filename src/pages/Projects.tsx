import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Project } from "@/types";
import {
  Plus,
  Search,
  MoreVertical,
  ExternalLink,
  Copy,
  Archive,
  Trash2,
  FolderOpen
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProjectCard from "@/components/dashboard/ProjectCard";
import NewProjectWizard from "@/components/projects/NewProjectWizard";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const statuses = [
  { label: "Svi", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "U toku", value: "in_progress" },
  { label: "Na pregledu", value: "review" },
  { label: "Završeni", value: "completed" },
  { label: "Arhivirani", value: "archived" },
];

export default function Projects() {
  const { setPageTitle } = useUIStore();
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  interface ProjectListItem extends Project {
    progress?: number;
    deadline?: string | null;
  }

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageTitle("Upravljanje projektima");
    fetchProjects();
  }, [setPageTitle]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase Database Error [Projects]:", error.message, error.details, error.hint);
        throw error;
      }
      setProjects(data || []);
    } catch (err: unknown) {
      console.error("Critical Projects Fetch Error:", err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Greška pri učitavanju liste projekata: " + (message || "Provjerite bazu podataka."));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Da li ste sigurni da želite obrisati projekat "${title}"? Ova akcija je nepovratna.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Projekat je uspješno obrisan");
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err: unknown) {
      console.error("Delete error:", err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Greška pri brisanju: " + message);
    }
  };

  const handleDuplicate = async (project: ProjectListItem) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Korisnik nije prijavljen");

      const { data, error } = await supabase
        .from('projects')
        .insert({
          title: `${project.title} (Kopija)`,
          donor_name: project.donor_name,
          owner_id: user.id,
          project_language: project.project_language,
          status: 'draft',
          apa_collected_data: project.apa_collected_data,
          project_locations: project.project_locations,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Projekat je dupliciran");
      fetchProjects();
    } catch (err: unknown) {
      console.error("Duplicate error:", err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Greška pri dupliciranju: " + message);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesFilter = filter === "all" || p.status === filter;
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.donor_name?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <AnimatePresence mode="wait">
      {wizardOpen ? (
        // Wizard Full-Page View
        <motion.div
          key="wizard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-hidden bg-background"
        >
          <NewProjectWizard onClose={() => setWizardOpen(false)} />
        </motion.div>
      ) : (
        // Projects List View
        <motion.div
          key="list"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-8 max-w-7xl mx-auto"
        >
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
            <div className="space-y-1">
              <h1 className="text-3xl font-display font-bold tracking-tight text-text-primary">Moji projekti</h1>
              <p className="text-text-dim text-sm max-w-lg">
                Pregled i upravljanje svim projektnim prijedlozima ECO SCUBA Sekcije.
              </p>
            </div>
            <Button
              size="lg"
              variant="brand"
              className="gap-2 h-12 px-6 shadow-xl shadow-brand/20 font-bold text-sm"
              onClick={() => setWizardOpen(true)}
            >
              <Plus className="h-5 w-5" /> Novi projekat
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-bg-secondary rounded-2xl border border-border w-full lg:w-auto">
              {statuses.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setFilter(s.value)}
                  className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 ${filter === s.value
                    ? "bg-brand text-white shadow-lg shadow-brand/10"
                    : "text-text-dim hover:text-text-primary hover:bg-bg-tertiary"
                    }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="relative w-full lg:max-w-md lg:ml-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
              <Input
                placeholder="Pretraži po nazivu ili donatoru..."
                className="pl-11 h-12 bg-bg-secondary border-border focus:ring-brand shadow-sm rounded-2xl text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Grid */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-64 rounded-3xl bg-bg-secondary border border-border animate-pulse" />
                ))}
              </motion.div>
            ) : filteredProjects.length > 0 ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                {filteredProjects.map((p) => (
                  <div key={p.id} className="relative group animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <ProjectCard
                      title={p.title}
                      donor={p.donor_name}
                      status={p.status}
                      progress={p.progress || 0}
                      dueDate={p.deadline ? new Date(p.deadline).toLocaleDateString('bs') : 'Nema roka'}
                      onClick={() => navigate(`/projects/${p.id}/edit`)}
                    />
                    <div className="absolute top-6 right-6 z-20">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 bg-bg-secondary/40 backdrop-blur-md border border-white/5 hover:bg-bg-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4 text-text-muted" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-bg-secondary border-border rounded-xl shadow-2xl">
                          <DropdownMenuItem className="gap-2 text-[13px] py-2.5" onClick={() => navigate(`/projects/${p.id}/edit`)}>
                            <ExternalLink className="h-4 w-4" /> Otvori urednik
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-[13px] py-2.5" onClick={() => handleDuplicate(p)}>
                            <Copy className="h-4 w-4" /> Dupliciraj projekat
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-[13px] py-2.5">
                            <Archive className="h-4 w-4" /> Arhiviraj
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 text-[13px] py-2.5 text-danger focus:text-danger focus:bg-danger/10"
                            onClick={() => handleDelete(p.id, p.title)}
                          >
                            <Trash2 className="h-4 w-4" /> Obriši projekat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center bg-bg-secondary/40 rounded-[3rem] border-2 border-dashed border-border/50"
              >
                <div className="h-24 w-24 rounded-full bg-brand/5 flex items-center justify-center mb-8 relative">
                  <div className="absolute inset-0 bg-brand/10 blur-2xl rounded-full" />
                  <FolderOpen className="h-12 w-12 text-brand relative z-10" />
                </div>
                <h3 className="text-2xl font-display font-bold text-text-primary">Nema pronađenih projekata</h3>
                <p className="text-text-dim mt-3 max-w-sm text-sm">
                  {search || filter !== "all"
                    ? "Pokušajte prilagoditi kriterije pretrage ili promijenite aktivni filter."
                    : "Još uvijek niste kreirali nijedan projektni prijedlog. Krenimo!"}
                </p>
                {!search && filter === "all" && (
                  <Button
                    variant="brand"
                    className="mt-10 gap-2 h-12 px-8 rounded-2xl shadow-lg shadow-brand/20 font-bold"
                    onClick={() => setWizardOpen(true)}
                  >
                    <Plus className="h-5 w-5" /> Kreiraj prvi projekat
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
