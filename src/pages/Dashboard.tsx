import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FolderOpen, CheckCircle, ListTodo, Clock, ArrowRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import StatCard from "@/components/dashboard/StatCard";
import ProjectCard from "@/components/dashboard/ProjectCard";
import ProjectProgressChart from "@/components/analytics/ProjectProgressChart";
import NewProjectWizard from "@/components/projects/NewProjectWizard";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";

type ProjectRow = Database['public']['Tables']['projects']['Row'];

const sectionStatusLabelMap: Record<string, string> = {
  approved: 'Odobrene',
  awaiting_approval: 'Na odobrenju',
  revision_requested: 'Za reviziju',
  pending: 'U pripremi',
  in_progress: 'U toku',
  generating: 'Generisanje',
  done: 'Završeno',
};

interface ActivityItem {
  id: string;
  text: string;
  project: string;
  time: string;
}

interface DashboardTask {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  dueDate: string | null;
  project: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { setPageTitle } = useUIStore();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [stats, setStats] = useState({ totalProjects: 0, awaitingApproval: 0, openTasks: 0 });
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [sectionProgressByProject, setSectionProgressByProject] = useState<Record<string, number>>({});
  const [sectionStatusData, setSectionStatusData] = useState<{ name: string; count: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [projectTasks, setProjectTasks] = useState<DashboardTask[]>([]);

  useEffect(() => {
    setPageTitle("Dashboard");

    const load = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          setProjects([]);
          setStats({ totalProjects: 0, awaitingApproval: 0, openTasks: 0 });
          setSectionProgressByProject({});
          setSectionStatusData([]);
          setRecentActivity([]);
          setProjectTasks([]);
          return;
        }

        const { data: projectData, error: projectError, count: projectCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact' })
          .eq('owner_id', user.id)
          .order('updated_at', { ascending: false });

        if (projectError) throw projectError;

        const projectList = projectData ?? [];
        setProjects(projectList);
        const exactProjectCount = typeof projectCount === 'number' ? projectCount : projectList.length;

        const projectIds = projectList.map((project) => project.id);
        let awaitingApproval = 0;
        let openTasks = 0;
        const progressMap: Record<string, number> = {};
        const statusCounts: Record<string, number> = {};
        const activityItems: Array<ActivityItem & { timestamp: number }> = [];
        const titleMap = projectList.reduce<Record<string, string>>((acc, project) => {
          acc[project.id] = project.title;
          return acc;
        }, {});

        if (projectIds.length > 0) {
          const { data: sectionRows, error: sectionError } = await supabase
            .from('project_sections')
            .select('id, project_id, section_title_bs, status, created_at, updated_at')
            .in('project_id', projectIds)
            .order('updated_at', { ascending: false });

          if (sectionError) throw sectionError;

          const rawSections = sectionRows ?? [];
          const projectSectionStats = rawSections.reduce<Record<string, { total: number; approved: number }>>((acc, section) => {
            const projectId = section.project_id;
            if (!acc[projectId]) acc[projectId] = { total: 0, approved: 0 };
            acc[projectId].total += 1;
            if (section.status === 'approved') acc[projectId].approved += 1;

            const statusKey = section.status || 'draft';
            statusCounts[statusKey] = (statusCounts[statusKey] ?? 0) + 1;

            const statusLabel = sectionStatusLabelMap[section.status ?? ''] ?? 'Ažurirana';
            const projectTitle = titleMap[projectId] ?? 'Nepoznati projekat';
            const timestamp = new Date(section.updated_at ?? section.created_at ?? '').getTime() || 0;

            activityItems.push({
              id: section.id,
              text: section.status
                ? `Sekcija "${section.section_title_bs}" je sada ${statusLabel.toLowerCase()}.`
                : `Sekcija "${section.section_title_bs}" je ažurirana.`,
              project: projectTitle,
              time: section.updated_at
                ? new Date(section.updated_at).toLocaleDateString('bs-BH', { day: 'numeric', month: 'short', year: 'numeric' })
                : section.created_at
                  ? new Date(section.created_at).toLocaleDateString('bs-BH', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'N/A',
              timestamp,
            });

            return acc;
          }, {});

          Object.entries(projectSectionStats).forEach(([projectId, counts]) => {
            progressMap[projectId] = Math.round((counts.approved / Math.max(counts.total, 1)) * 100);
          });

          awaitingApproval = rawSections.filter((section) => section.status === 'awaiting_approval').length;
          openTasks = rawSections.filter((section) => ['pending', 'generating', 'awaiting_approval', 'revision_requested', 'in_progress'].includes(section.status ?? '')).length;

          const sectionChartData = Object.entries(statusCounts)
            .map(([status, count]) => ({ name: sectionStatusLabelMap[status] ?? status, count }))
            .sort((a, b) => b.count - a.count);

          setSectionStatusData(sectionChartData);

          const { data: taskRows, error: taskError } = await supabase
            .from('collaboration_tasks')
            .select('id, title, description, status, priority, due_date, project:projects(title), updated_at, created_at')
            .in('project_id', projectIds)
            .in('status', ['pending', 'in_progress', 'review'])
            .order('updated_at', { ascending: false });

          if (taskError) throw taskError;

          const taskData = taskRows ?? [];
          setProjectTasks(
            taskData.map((task) => ({
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              dueDate: task.due_date,
              project: task.project?.title ?? 'Nepoznati projekt',
            }))
          );

          taskData.forEach((task) => {
            const timestamp = new Date(task.updated_at ?? task.created_at ?? '').getTime() || 0;
            activityItems.push({
              id: task.id,
              text: `Zadatak "${task.title}" je ažuriran.`,
              project: task.project?.title ?? 'Nepoznati projekt',
              time: task.updated_at
                ? new Date(task.updated_at).toLocaleDateString('bs-BH', { day: 'numeric', month: 'short', year: 'numeric' })
                : task.created_at
                  ? new Date(task.created_at).toLocaleDateString('bs-BH', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'N/A',
              timestamp,
            });
          });

          const sortedActivity = activityItems
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5)
            .map(({ timestamp, ...item }) => item);

          setRecentActivity(sortedActivity);
        } else {
          setSectionStatusData([]);
          setProjectTasks([]);
          setRecentActivity([]);
        }

        setSectionProgressByProject(progressMap);
        setStats({
          totalProjects: exactProjectCount,
          awaitingApproval,
          openTasks,
        });

      } catch (err: unknown) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [setPageTitle]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={FolderOpen} label="Ukupno projekata" value={stats.totalProjects} trend="Ažurirano" variant="brand" />
        <StatCard icon={CheckCircle} label="Sekcije na odobrenju" value={stats.awaitingApproval} variant="warning" />
        <StatCard icon={ListTodo} label="Otvoreni zadaci" value={stats.openTasks} variant="default" />
      </motion.div>

      {/* Analytics Highlights */}
      <motion.div variants={item} className="grid grid-cols-1 gap-6">
        <ProjectProgressChart data={sectionStatusData} />
      </motion.div>

      {/* Projects + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects */}
        <motion.div variants={item} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Moji projekti</h2>
              <p className="text-sm text-text-dim mt-1">Najnovijih pet projekata i njihov status.</p>
            </div>
            <Button variant="ghost" size="sm" className="text-primary gap-1" onClick={() => setWizardOpen(true)}>
              Novi projekat <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="h-56 rounded-3xl bg-bg-secondary border border-border animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-bg-secondary p-10 text-center">
              <p className="text-sm text-text-dim mb-4">Nemate nijedan projekat. Kreirajte prvi projekat da biste započeli.</p>
              <Button size="lg" variant="brand" onClick={() => setWizardOpen(true)}>
                Novi projekat
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {projects.slice(0, 5).map((project) => (
                <ProjectCard
                  key={project.id}
                  title={project.title}
                  donor={project.donor_name || 'Nepoznati donor'}
                  status={project.status || 'draft'}
                  progress={sectionProgressByProject[project.id] ?? 0}
                  dueDate={project.donor_deadline ? new Date(project.donor_deadline).toLocaleDateString('bs-BH') : 'Nema roka'}
                  onClick={() => window.location.assign(`/projects/${project.id}/edit`)}
                />
              ))}
                  </div>
                )}
              </motion.div>

              {/* Activity */}
        <motion.div variants={item} className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Aktivnost</h2>
          <div className="rounded-[24px] border border-[#D6E6F5] bg-white p-4 space-y-4 shadow-[0_8px_24px_rgba(47,128,237,0.08)]">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary/60" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{activity.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activity.project} · {activity.time}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-bg-secondary/80 p-6 text-center text-sm text-text-dim">
                Nema novih aktivnosti za prikaz. Ažurirajte projekat kako biste videli poslednje promene.
              </div>
            )}
          </div>

          {/* Tasks */}
          <h2 className="font-display text-lg font-semibold text-foreground pt-2">Zadaci koji čekaju</h2>
          <div className="rounded-[24px] border border-[#D6E6F5] bg-white p-4 space-y-3 shadow-[0_8px_24px_rgba(47,128,237,0.08)]">
            {projectTasks.length > 0 ? (
              projectTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-3">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${task.priority === 'urgent' ? 'bg-destructive' :
                    task.priority === 'high' ? 'bg-warning' : 'bg-primary'
                    }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{task.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{task.description || 'Bez opisa'}</p>
                  </div>
                  <span className={`text-xs shrink-0 ${task.priority === 'urgent' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    <Clock className="inline h-3 w-3 mr-0.5" />{task.dueDate || 'Bez roka'}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-bg-secondary/80 p-6 text-center text-sm text-text-dim">
                Trenutno nema otvorenih zadataka. Kreirajte novi zadatak iz saradnje ili pregledajte sekcije projekta.
              </div>
            )}
          </div>
        </motion.div>
      </div>
      {wizardOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center p-8 bg-black/20">
          <div className="w-full max-w-[1200px] h-full overflow-auto">
            <NewProjectWizard onClose={() => setWizardOpen(false)} />
          </div>
        </div>
      )}
    </motion.div>
  );
}
