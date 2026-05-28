import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useUIStore } from "@/store/uiStore";
import {
    FolderOpen,
    Clock,
    CheckCircle2,
    Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { CollaborationTask, ProjectSection } from "@/types";

const AnalyticsCharts = lazy(() => import("@/components/analytics/AnalyticsCharts"));

interface AnalyticsStatusDatum {
    name: string;
    value: number;
    color: string;
}

interface PendingTaskRow {
    id: string;
    title: string;
    status: string;
    due_date: string | null;
    project: { title: string } | null;
}

interface NextStepRow {
    id: string;
    section_title_bs: string;
    status: string;
    updated_at: string;
    project: { title: string } | null;
}

interface ApprovalTrendDatum {
    day: number;
    approved: number;
}

export default function Analytics() {
    const { setPageTitle } = useUIStore();
    const [stats, setStats] = useState({
        totalProjects: 0,
        awaitingApproval: 0,
        openTasks: 0,
        activeCollaborators: 0,
    });
    const [projectStatusData, setProjectStatusData] = useState<AnalyticsStatusDatum[]>([]);
    const [sectionPieData, setSectionPieData] = useState<AnalyticsStatusDatum[]>([]);
    const [approvalTrend, setApprovalTrend] = useState<ApprovalTrendDatum[]>([]);
    const [pendingTasks, setPendingTasks] = useState<PendingTaskRow[]>([]);
    const [nextSteps, setNextSteps] = useState<NextStepRow[]>([]);

    const fetchStats = useCallback(async () => {
        try {
            const [
                projectsCountResponse,
                awaitingApprovalResponse,
                openTasksResponse,
                collaboratorsResponse,
                approvedSectionsResponse,
                pendingSectionsResponse,
                draftProjectsResponse,
                inProgressProjectsResponse,
                reviewProjectsResponse,
                completedProjectsResponse,
                archivedProjectsResponse,
                approvalTrendResponse,
                pendingTaskResponse,
                nextStepsResponse,
            ] = await Promise.all([
                supabase.from('projects').select('id', { count: 'exact', head: true }),
                supabase.from('project_sections').select('id', { count: 'exact', head: true }).eq('status', 'awaiting_approval'),
                supabase.from('collaboration_tasks').select('id', { count: 'exact', head: true }).eq('status', 'open'),
                supabase.from('project_collaborators').select('id', { count: 'exact', head: true }).eq('status', 'accepted'),
                supabase.from('project_sections').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
                supabase.from('project_sections').select('id', { count: 'exact', head: true }).in('status', ['pending', 'awaiting_approval', 'revision_requested']),
                supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
                supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
                supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'review'),
                supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
                supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'archived'),
                supabase.from<ProjectSection>('project_sections')
                    .select('approved_at, status')
                    .eq('status', 'approved')
                    .gte('approved_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
                    .not('approved_at', 'is', null),
                supabase.from<PendingTaskRow>('collaboration_tasks')
                    .select('id,title,status,due_date,project:projects(title)')
                    .in('status', ['open', 'in_progress'])
                    .order('due_date', { ascending: true })
                    .limit(6),
                supabase.from<NextStepRow>('project_sections')
                    .select('id,section_title_bs,status,updated_at,project:projects(title)')
                    .in('status', ['pending', 'awaiting_approval', 'revision_requested'])
                    .order('updated_at', { ascending: false })
                    .limit(6),
            ]);

            setStats({
                totalProjects: projectsCountResponse.count ?? 0,
                awaitingApproval: awaitingApprovalResponse.count ?? 0,
                openTasks: openTasksResponse.count ?? 0,
                activeCollaborators: collaboratorsResponse.count ?? 0,
            });

            setSectionPieData([
                { name: 'Odobrene', value: approvedSectionsResponse.count ?? 0, color: '#10b981' },
                { name: 'Na čekanju', value: pendingSectionsResponse.count ?? 0, color: '#f59e0b' },
            ]);

            setProjectStatusData([
                { name: 'Nacrti', value: draftProjectsResponse.count ?? 0, color: '#94a3b8' },
                { name: 'U toku', value: inProgressProjectsResponse.count ?? 0, color: '#0ea5e9' },
                { name: 'Pregled', value: reviewProjectsResponse.count ?? 0, color: '#f59e0b' },
                { name: 'Završeni', value: completedProjectsResponse.count ?? 0, color: '#10b981' },
                { name: 'Arhivirano', value: archivedProjectsResponse.count ?? 0, color: '#6b7280' },
            ]);

            const approvedRows = approvalTrendResponse.data ?? [];
            const trendMap = approvedRows.reduce<Record<string, number>>((acc, row) => {
                if (!row.approved_at) return acc;

                const dateKey = new Date(row.approved_at).toISOString().slice(0, 10);
                acc[dateKey] = (acc[dateKey] ?? 0) + 1;
                return acc;
            }, {});

            const trendDays = Array.from({ length: 30 }, (_, index) => {
                const date = new Date(Date.now() - (29 - index) * 24 * 60 * 60 * 1000);
                const key = date.toISOString().slice(0, 10);
                return {
                    day: index + 1,
                    approved: trendMap[key] ?? 0,
                };
            });

            setApprovalTrend(trendDays);

            if (pendingTaskResponse.error) {
                throw pendingTaskResponse.error;
            }

            setPendingTasks(pendingTaskResponse.data ?? []);

            if (nextStepsResponse.error) {
                throw nextStepsResponse.error;
            }

            setNextSteps(nextStepsResponse.data ?? []);
        } catch (error) {
            console.error('Analytics fetch error:', error);
            setStats({
                totalProjects: 0,
                awaitingApproval: 0,
                openTasks: 0,
                activeCollaborators: 0,
            });
            setProjectStatusData([]);
            setSectionPieData([]);
            setApprovalTrend([]);
            setPendingTasks([]);
            setNextSteps([]);
        }
    }, []);

    useEffect(() => {
        setPageTitle("Analitika");
        void fetchStats();
    }, [setPageTitle, fetchStats]);

    const formatDueDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('bs', { day: '2-digit', month: 'short' });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {[
                    { label: "Ukupno projekata", value: stats.totalProjects, icon: FolderOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { label: "Sekcije na čekanju", value: stats.awaitingApproval, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
                    { label: "Otvoreni zadaci", value: stats.openTasks, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                    { label: "Aktivni saradnici", value: stats.activeCollaborators, icon: Users, color: "text-violet-500", bg: "bg-violet-500/10" },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-6 bg-bg-secondary rounded-2xl border border-border flex items-center gap-4"
                    >
                        <div className={`h-12 w-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                            <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                            <h4 className="text-2xl font-bold">{stat.value}</h4>
                        </div>
                    </motion.div>
                ))}
            </div>

            {stats.totalProjects === 0 ? (
                <div className="p-8 bg-white/90 rounded-2xl border border-blue-100 shadow-[0_12px_32px_rgba(47,128,237,0.08)]">
                    <h2 className="text-xl font-semibold text-slate-900 mb-3">Još nema podataka za analizu</h2>
                    <p className="text-sm text-slate-600 max-w-2xl">
                        Ocean Light Analitika je spremna kada kreirate prvi projekat. Trenutačno nema odobrenih sekcija, zadataka ni aktivnih timova.
                    </p>
                </div>
            ) : (
                <Suspense fallback={
                    <div className="grid grid-cols-1 gap-6">
                        <div className="h-[300px] bg-bg-secondary rounded-2xl border border-border animate-pulse" />
                        <div className="h-[300px] bg-bg-secondary rounded-2xl border border-border animate-pulse" />
                        <div className="h-[300px] bg-bg-secondary rounded-2xl border border-border animate-pulse" />
                    </div>
                }>
                <AnalyticsCharts
                    projectStatusData={projectStatusData}
                    sectionPieData={sectionPieData}
                    activityData={approvalTrend}
                />
            </Suspense>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-bg-secondary rounded-2xl border border-border overflow-hidden">
                    <div className="p-6 border-b border-border">
                        <h3 className="text-lg font-bold">Čeka se od mene</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Projekat</th>
                                    <th className="px-6 py-3 font-semibold">Zadatak</th>
                                    <th className="px-6 py-3 font-semibold">Status</th>
                                    <th className="px-6 py-3 font-semibold">Rok</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {pendingTasks.length > 0 ? (
                                    pendingTasks.map((task) => (
                                        <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium">{task.project?.title ?? 'Nepoznato'}</td>
                                            <td className="px-6 py-4 text-sm">{task.title}</td>
                                            <td className="px-6 py-4 text-sm text-capitalize">{task.status.replace('_', ' ')}</td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">{task.due_date ? new Date(task.due_date).toLocaleDateString('bs', { day: '2-digit', month: 'short' }) : 'N/A'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-sm text-muted-foreground">Nema otvorenih zadataka za prikaz.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-bg-secondary rounded-2xl border border-border overflow-hidden">
                    <div className="p-6 border-b border-border">
                        <h3 className="text-lg font-bold">Sljedeći korak</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Projekat</th>
                                    <th className="px-6 py-3 font-semibold">Sekcija</th>
                                    <th className="px-6 py-3 font-semibold">Status</th>
                                    <th className="px-6 py-3 font-semibold">Posljednja izmjena</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {nextSteps.length > 0 ? (
                                    nextSteps.map((step) => (
                                        <tr key={step.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium">{step.project?.title ?? 'Nepoznato'}</td>
                                            <td className="px-6 py-4 text-sm">{step.section_title_bs}</td>
                                            <td className="px-6 py-4 text-sm text-capitalize">{step.status.replace('_', ' ')}</td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(step.updated_at).toLocaleDateString('bs', { day: '2-digit', month: 'short' })}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-sm text-muted-foreground">Nema aktivnih sljedećih koraka.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
