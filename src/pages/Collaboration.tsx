import { useCallback, useEffect, useState, useMemo, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    Plus,
    Clock,
    MoreVertical,
    UserPlus,
    LayoutDashboard,
    Filter,
    CheckCircle2,
    Mail,
    ShieldCheck,
    UserCircle2,
    ArrowRight,
    Send,
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyCollaboratorInvite } from "@/lib/notifications";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const columns = [
    { id: 'open', title: 'Otvoreni', color: 'bg-slate-500' },
    { id: 'in_progress', title: 'U toku', color: 'bg-blue-500' },
    { id: 'review', title: 'Na pregledu', color: 'bg-amber-500' },
    { id: 'done', title: 'Završeni', color: 'bg-emerald-500' },
];

interface ProjectItem {
    id: string;
    title: string;
}

interface CollaboratorRecord {
    id: string;
    project_id: string;
    role: string | null;
    status: string | null;
    section_assignments: string[] | null;
    user_id: string;
    collaborator_profile?: {
        id: string;
        full_name: string | null;
        email: string;
        role: string | null;
    };
    inviter_profile?: {
        full_name: string | null;
        email: string | null;
    };
}

interface TaskRecord {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    due_date: string | null;
    project: { title: string };
    assigned_to_profile?: { full_name?: string | null };
}

export default function Collaboration() {
    const { setPageTitle } = useUIStore();
    const [tasks, setTasks] = useState<TaskRecord[]>([]);
    const [collaborators, setCollaborators] = useState<CollaboratorRecord[]>([]);
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteLoading, setInviteLoading] = useState(false);

    const fetchTasks = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('collaboration_tasks')
                .select('*, project:projects(title), assigned_to_profile:profiles!collaboration_tasks_assigned_to_fkey(full_name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTasks((data || []) as TaskRecord[]);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchCollaborators = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('project_collaborators')
                .select('*, collaborator_profile:profiles!project_collaborators_user_id_fkey(*), inviter_profile:profiles!project_collaborators_invited_by_fkey(full_name,email), projects(title)')
                .order('invited_at', { ascending: false });

            if (error) throw error;
            setCollaborators((data || []) as CollaboratorRecord[]);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchProjects = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('id, title')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setProjects((data || []) as ProjectItem[]);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchTasks(), fetchCollaborators(), fetchProjects()]);
        setLoading(false);
    }, [fetchTasks, fetchCollaborators, fetchProjects]);

    useEffect(() => {
        setPageTitle("Saradnja");
        fetchData();
        const cleanup = subscribeRealtime();
        return () => cleanup();
    }, [setPageTitle, fetchData]);

    const subscribeRealtime = () => {
        const channel = supabase
            .channel('realtime-collaboration')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'collaboration_tasks' }, payload => {
                if (payload.eventType === 'INSERT') {
                    setTasks(prev => [payload.new as TaskRecord, ...prev]);
                }
                if (payload.eventType === 'UPDATE') {
                    setTasks(prev => prev.map(task => task.id === payload.new.id ? (payload.new as TaskRecord) : task));
                }
                if (payload.eventType === 'DELETE') {
                    setTasks(prev => prev.filter(task => task.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    const updateTaskStatus = async (taskId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('collaboration_tasks')
                .update({ status: newStatus })
                .eq('id', taskId);

            if (error) throw error;
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
            toast.success("Status zadatka ažuriran");
        } catch (err) {
            toast.error("Greška pri ažuriranju statusa");
        }
    };

    const inviteCollaborator = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const email = String(formData.get('email') || '').trim();
        const fullName = String(formData.get('name') || '').trim();
        const role = String(formData.get('role') || 'editor');
        const projectId = String(formData.get('project') || projects?.[0]?.id || '');

            if (!email || !projectId) {
                toast.error('Email i projekt su obavezni.');
                return;
            }

            setInviteLoading(true);
            try {
                const profileRes = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', email)
                    .single();

                if (profileRes.error || !profileRes.data) {
                    throw new Error('Korisnik sa tom adresom nije registrovan. Molimo kontaktirajte ga da kreira nalog.');
                }

                const existingRes = await supabase
                    .from('project_collaborators')
                    .select('id', { head: true, count: 'exact' })
                    .eq('project_id', projectId)
                    .eq('user_id', profileRes.data.id);

                if (existingRes.error) {
                    throw existingRes.error;
                }

                if ((existingRes.count ?? 0) > 0) {
                    toast.warning('Ovaj korisnik je već dio projekta.');
                    setInviteLoading(false);
                    return;
                }

                const { error } = await supabase
                    .from('project_collaborators')
                    .insert([{
                        project_id: projectId,
                        user_id: profileRes.data.id,
                        role,
                        status: 'pending',
                    }]);

                if (error) {
                    if (error.message?.toLowerCase().includes('duplicate key value')) {
                        toast.warning('Ovaj korisnik je već dio projekta.');
                        return;
                    }
                    throw error;
                }

            // Get project title for notification
            const projectData = projects.find(p => p.id === projectId);
            const projectTitle = projectData?.title || 'Projekat';
            const inviterName = user?.user_metadata?.full_name || 'Korisnik';

            // Notify the invited user
            await notifyCollaboratorInvite(
                profileRes.data.id,
                projectId,
                projectTitle,
                inviterName
            );

            toast.success('Pozivnica je kreirana i poslana.');
            setInviteOpen(false);
            fetchCollaborators();
        } catch (err: unknown) {
            console.error('Invite error:', err);
            const message = err instanceof Error
                ? err.message
                : typeof err === 'object' && err !== null
                    ? JSON.stringify(err, Object.getOwnPropertyNames(err))
                    : String(err);
            toast.error(message || 'Greška pri slanju pozivnice.');
        } finally {
            setInviteLoading(false);
        }
    };

    const invitedCount = collaborators.filter(c => c.status === 'pending').length;
    const acceptedCount = collaborators.filter(c => c.status === 'accepted').length;

    const collaboratorSummary = useMemo(() => ({
        owners: collaborators.filter(c => c.role === 'owner').length,
        editors: collaborators.filter(c => c.role === 'editor').length,
        reviewers: collaborators.filter(c => c.role === 'reviewer').length,
        viewers: collaborators.filter(c => c.role === 'viewer').length,
    }), [collaborators]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex flex-col xl:flex-row gap-6">
                <div className="flex-1 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">Saradnja</h1>
                            <p className="text-sm text-muted-foreground">Upravljajte timom, zadacima i pozivnicama sa realnim timskim ulogama.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" className="gap-2" onClick={() => setInviteOpen(true)}>
                                <UserPlus className="h-4 w-4" /> Pozovi saradnika
                            </Button>
                            <Button className="gap-2 shadow-lg shadow-primary/20">
                                <Plus className="h-5 w-5" /> Novi zadatak
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        <div className="rounded-3xl border border-border bg-bg-secondary/80 p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <ShieldCheck className="h-4 w-4 text-brand" />
                                <span className="text-[10px] uppercase tracking-[0.24em] text-text-dim">Tim</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-bold">{collaborators.length}</p>
                                    <p className="text-xs text-text-muted uppercase tracking-[0.2em]">Ukupno članova</p>
                                </div>
                                <div className="rounded-2xl bg-emerald-500/10 px-3 py-2 text-emerald-400 text-sm font-bold">{acceptedCount} potvrdjeno</div>
                            </div>
                        </div>
                        <div className="rounded-3xl border border-border bg-bg-secondary/80 p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <Users className="h-4 w-4 text-brand" />
                                <span className="text-[10px] uppercase tracking-[0.24em] text-text-dim">Pozivnice</span>
                            </div>
                            <p className="text-3xl font-bold">{invitedCount}</p>
                            <p className="text-xs text-text-muted uppercase tracking-[0.2em]">Na čekanju</p>
                        </div>
                        <div className="rounded-3xl border border-border bg-bg-secondary/80 p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <LayoutDashboard className="h-4 w-4 text-brand" />
                                <span className="text-[10px] uppercase tracking-[0.24em] text-text-dim">Uloge</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="rounded-2xl bg-bg-tertiary/60 p-3">Owner: {collaboratorSummary.owners}</div>
                                <div className="rounded-2xl bg-bg-tertiary/60 p-3">Editor: {collaboratorSummary.editors}</div>
                                <div className="rounded-2xl bg-bg-tertiary/60 p-3">Reviewer: {collaboratorSummary.reviewers}</div>
                                <div className="rounded-2xl bg-bg-tertiary/60 p-3">Viewer: {collaboratorSummary.viewers}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="xl:w-[360px] space-y-4">
                    <div className="rounded-[32px] border border-[#D6E6F5] bg-[#EAF4FF]/70 backdrop-blur-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.24em] text-text-dim">Aktivni saradnici</p>
                                <h2 className="text-lg font-bold">Workspace tim</h2>
                            </div>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </div>
                        {collaborators.length > 0 ? (
                            <div className="grid gap-4">
                                {collaborators.map(collab => (
                                    <div key={collab.id} className="group relative overflow-hidden rounded-[24px] bg-white p-5 border border-slate-100 shadow-[0_12px_32px_rgba(47,128,237,0.08)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_18px_48px_rgba(0,194,255,0.18)]">
                                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="h-12 w-12 rounded-3xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-black text-base">
                                                {collab.collaborator_profile?.full_name?.split(' ').map(part => part[0]).join('') || 'N'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 truncate">{collab.collaborator_profile?.full_name || collab.collaborator_profile?.email || 'Neimenovani korisnik'}</p>
                                                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mt-0.5">{collab.role || 'viewer'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Status poziva</p>
                                                <p className={`mt-1 text-sm font-semibold ${collab.status === 'accepted' ? 'text-emerald-600' : 'text-amber-500'}`}>
                                                    {collab.status === 'accepted' ? 'Prihvaćen' : 'Na čekanju'}
                                                </p>
                                            </div>
                                            <div className={`rounded-full px-3 py-1 text-[11px] font-semibold ${collab.status === 'accepted' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {collab.status === 'accepted' ? 'Aktivan' : 'Pending'}
                                            </div>
                                        </div>
                                        <div className="mt-4 text-[11px] text-slate-500">
                                            Pozvao: {collab.inviter_profile?.full_name || 'Nepoznato'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-8 text-center">
                                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-100 text-cyan-700">
                                    <Users className="h-8 w-8" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Još uvijek radite sami?</h3>
                                <p className="text-sm text-slate-600">Pozovite tim da vam se pridruži i pretvorite listu u aktivan workspace.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 min-h-[600px]">
                {columns.map((col) => (
                    <div key={col.id} className="flex flex-col gap-4 bg-bg-secondary/50 rounded-2xl p-4 border border-border/50">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${col.color}`} />
                                <h3 className="font-bold text-sm uppercase tracking-wider">{col.title}</h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground font-bold">
                                    {tasks.filter(t => t.status === col.id).length}
                                </span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex-1 space-y-4">
                            <AnimatePresence>
                                {tasks
                                    .filter(t => t.status === col.id)
                                    .map((task) => (
                                        <motion.div
                                            key={task.id}
                                            layoutId={task.id}
                                            initial={{ opacity: 0, scale: 0.96 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.96 }}
                                            className="p-4 bg-bg-secondary rounded-xl border border-border shadow-sm transition-all duration-300 group relative hover:-translate-y-1 hover:shadow-[0_18px_48px_rgba(0,194,255,0.18)]"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${task.priority === 'urgent' ? 'bg-red-500/10 text-red-500' :
                                                    task.priority === 'high' ? 'bg-amber-500/10 text-amber-500' :
                                                        'bg-blue-500/10 text-blue-500'
                                                    }`}>
                                                    {task.priority}
                                                </span>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreVertical className="h-3 w-3" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44 text-xs">
                                                        <DropdownMenuItem onClick={() => updateTaskStatus(task.id, 'in_progress')}>Prebaci u 'U toku'</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => updateTaskStatus(task.id, 'review')}>Prebaci u 'Pregled'</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => updateTaskStatus(task.id, 'done')}>Prebaci u 'Završeno'</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive">Obriši</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-text-dim mb-3">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-bg-tertiary/80 border border-white/5">
                                                    <ArrowRight className="h-3 w-3" /> {task.project?.title}
                                                </span>
                                            </div>

                                            <h4 className="text-sm font-bold mb-1 leading-tight">{task.title}</h4>
                                            <p className="text-[10px] text-muted-foreground line-clamp-2 mb-3">{task.description}</p>

                                            <div className="flex items-center justify-between pt-2 border-t border-border">
                                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {task.due_date ? new Date(task.due_date).toLocaleDateString('bs') : 'Bez roka'}
                                                </div>
                                                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                                                    {task.assigned_to_profile?.full_name?.[0] || 'U'}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                {tasks.filter(t => t.status === col.id).length === 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-3xl border border-dashed border-white/10 bg-bg-tertiary/50 p-6 text-center text-sm text-text-dim"
                                    >
                                        <p className="font-semibold text-text-primary mb-2">Nema zadataka u ovoj koloni</p>
                                        <p>Dodajte novi zadatak ili prebaci zadatak iz druge kolone.</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogContent className="sm:max-w-lg bg-bg-secondary border-white/5">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-primary" /> Pozovi saradnika
                        </DialogTitle>
                        <DialogDescription>
                            Popunite email, ulogu i projekat kako biste poslali novu pozivnicu.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={inviteCollaborator} className="space-y-4 py-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-semibold">Email saradnika</label>
                                <Input id="email" name="email" type="email" placeholder="ime.prezime@domain.ba" required />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-semibold">Ime i prezime</label>
                                <Input id="name" name="name" placeholder="Maja Drnda" required />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="role" className="text-sm font-semibold">Uloga</label>
                                    <Select id="role" name="role" defaultValue="editor">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Izaberite ulogu" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="owner">Owner</SelectItem>
                                            <SelectItem value="editor">Editor</SelectItem>
                                            <SelectItem value="reviewer">Reviewer</SelectItem>
                                            <SelectItem value="viewer">Viewer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="project" className="text-sm font-semibold">Projekt</label>
                                    <Select id="project" name="project" defaultValue={projects[0]?.id || ''}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Izaberite projekt" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projects.map(project => (
                                                <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="section_assignments" className="text-sm font-semibold">Dodjela sekcija</label>
                                <Textarea id="section_assignments" name="section_assignments" placeholder="Unesite ključeve sekcija ili naslove, odvojene zarezom." rows={3} />
                            </div>
                        </div>
                        <DialogFooter className="pt-4 flex flex-wrap gap-2">
                            <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>Otkaži</Button>
                            <Button type="submit" disabled={inviteLoading} className="gap-2">
                                {inviteLoading ? 'Šaljem...' : 'Pošalji pozivnicu'} <Send className="h-4 w-4" />
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
