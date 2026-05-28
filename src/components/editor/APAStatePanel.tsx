import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    ClipboardCheck,
    History,
    Info,
    Search,
    AlertCircle,
    ShieldCheck,
    Layers,
    Users
} from "lucide-react";
import { ProjectSection, ChangeLogEntry, Profile } from "@/types";
import { SECTION_STATUS_CONFIG, cn } from "@/lib/utils";

interface Collaborator {
    id: string;
    user_id?: string;
    role: string;
    status?: string;
    profiles?: Profile;
}

interface Props {
    projectTitle: string;
    sections: ProjectSection[];
    collaborators: Collaborator[];
    ripStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETE';
    changeLog: ChangeLogEntry[];
}

export function APAStatePanel({ projectTitle, sections, collaborators, ripStatus, changeLog }: Props) {
    const statusCounts = sections.reduce(
        (acc, section) => {
            acc[section.status] = (acc[section.status] || 0) + 1;
            return acc;
        },
        {
            pending: 0,
            generating: 0,
            awaiting_approval: 0,
            approved: 0,
            revision_requested: 0
        } as Record<string, number>
    );

    return (
        <div className="w-[340px] h-full flex flex-col border-l border-white/5 bg-bg-secondary sticky top-0 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-bg-tertiary/20 backdrop-blur-3xl">
                <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-4 w-4 text-brand" />
                    <p className="text-[10px] font-black text-brand uppercase tracking-[0.2em]">APA State Register</p>
                </div>
                <h2 className="text-sm font-bold truncate text-text-primary leading-tight">{projectTitle}</h2>
            </div>

            <Tabs defaultValue="status" className="flex-1 flex flex-col">
                <div className="px-4 py-3 border-b border-white/5 bg-bg-secondary/50">
                    <TabsList className="grid grid-cols-3 h-10 bg-bg-tertiary/50 border border-white/5 p-1 rounded-xl">
                        <TabsTrigger value="status" title="Status" className="rounded-lg data-[state=active]:bg-brand data-[state=active]:text-white"><ClipboardCheck className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="log" title="Log" className="rounded-lg data-[state=active]:bg-brand data-[state=active]:text-white"><History className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="global" title="Globalne izmjene" className="rounded-lg data-[state=active]:bg-brand data-[state=active]:text-white"><Layers className="h-4 w-4" /></TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-bg-secondary/30">
                    {/* STATUS TAB */}
                    <TabsContent value="status" className="m-0 focus-visible:outline-none">
                        <div className="p-4 space-y-4 border-b border-white/5 bg-bg-tertiary/10">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">Status sekcija</span>
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black tracking-widest border",
                                    ripStatus === 'COMPLETE' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                        ripStatus === 'IN_PROGRESS' ? "bg-brand/10 text-brand animate-pulse border-brand/20" : "bg-bg-tertiary text-text-dim border-white/5"
                                )}>
                                    RIP {ripStatus}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-white/5 bg-bg-secondary/80 p-4">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-2">Ukupno sekcija</p>
                                    <p className="text-3xl font-bold text-text-primary">{sections.length}</p>
                                </div>
                                <div className="rounded-2xl border border-white/5 bg-bg-secondary/80 p-4">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-2">Odobreno</p>
                                    <p className="text-3xl font-bold text-emerald-400">{statusCounts.approved}</p>
                                </div>
                                <div className="rounded-2xl border border-white/5 bg-bg-secondary/80 p-4">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-2">Na čekanju</p>
                                    <p className="text-3xl font-bold text-brand">{statusCounts.awaiting_approval}</p>
                                </div>
                                <div className="rounded-2xl border border-white/5 bg-bg-secondary/80 p-4">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-2">U procesu</p>
                                    <p className="text-3xl font-bold text-amber-400">{statusCounts.generating + statusCounts.pending + statusCounts.revision_requested}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-white/5">
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest h-10 px-6">Sekcija</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest h-10 text-right pr-6">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sections.map((section) => (
                                        <TableRow key={section.id} className="hover:bg-white/[0.02] border-white/5 transition-colors">
                                            <TableCell className="py-4 px-6">
                                                <p className="text-[11px] font-bold text-text-primary truncate max-w-[160px] tracking-tight">
                                                    {section.section_title_bs}
                                                </p>
                                                <p className="text-[9px] text-text-dim mt-0.5 font-medium">Verzija {section.version}</p>
                                            </TableCell>
                                            <TableCell className="text-right py-4 pr-6">
                                                <div className={cn(
                                                    "inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter border",
                                                    SECTION_STATUS_CONFIG[section.status as keyof typeof SECTION_STATUS_CONFIG]?.bg,
                                                    SECTION_STATUS_CONFIG[section.status as keyof typeof SECTION_STATUS_CONFIG]?.color,
                                                    "border-current/10"
                                                )}>
                                                    {SECTION_STATUS_CONFIG[section.status as keyof typeof SECTION_STATUS_CONFIG]?.label}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {/* LOG TAB */}
                    <TabsContent value="log" className="m-0 p-6 focus-visible:outline-none">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-text-dim">Dnevnik Izmjena</h4>
                            <span className="text-[9px] font-bold text-brand px-2 py-0.5 rounded-full bg-brand/10">FIX-07</span>
                        </div>
                        <div className="space-y-8">
                            {changeLog.length > 0 ? changeLog.map((entry, index) => (
                                <div key={entry.id} className="relative pl-6 pb-2 border-l border-brand/20 last:pb-0">
                                    <div className="absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full bg-brand shadow-[0_0_10px_rgba(14,165,233,0.6)] border border-white" />
                                    <p className="text-[11px] font-black text-text-primary mr-1 tracking-tight">
                                        {entry.affected_sections?.length > 0 ? entry.affected_sections.join(', ') : "Globalna izmjena"}
                                    </p>
                                    <p className="text-[10px] text-text-muted mt-2 leading-relaxed font-medium">
                                        {entry.change_description}
                                    </p>
                                    <div className="mt-4 p-2 rounded-lg bg-bg-tertiary/50 border border-white/5">
                                        <p className="text-[9px] text-brand font-bold uppercase tracking-widest mb-1">Status Propagacije</p>
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "h-1 w-1 rounded-full",
                                                entry.status === 'applied' ? "bg-emerald-500" : "bg-amber-500"
                                            )} />
                                            <span className="text-[9px] text-text-dim font-bold">
                                                {entry.status === 'applied' ? "Uspješno primijenjeno" : "Čeka na primjenu"}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-text-dim mt-4 font-bold">{new Date(entry.created_at).toLocaleDateString('bs-BA')}</p>
                                </div>
                            )) : (
                                <div className="text-center py-12 opacity-20">
                                    <History className="h-10 w-10 mx-auto mb-4" />
                                    <p className="text-[11px] font-bold uppercase tracking-widest">Nema registrovanih izmjena</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* GLOBALNE IZMENE TAB */}
                    <TabsContent value="global" className="m-0 p-6 focus-visible:outline-none">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-text-dim">Globalne izmjene</h4>
                            <span className="text-[9px] font-bold text-brand px-2 py-0.5 rounded-full bg-brand/10">APA SYNTHESIS</span>
                        </div>
                        <div className="space-y-5">
                            <div className="rounded-3xl border border-white/10 bg-bg-tertiary/20 p-5">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-text-dim mb-3">Globalni pregled izmjena</p>
                                <div className="grid gap-3">
                                    <div className="rounded-2xl bg-bg-secondary/70 p-4 border border-white/5">
                                        <p className="text-[11px] font-bold text-text-primary">Izmjena u toku</p>
                                        <p className="text-sm text-text-dim mt-2">{changeLog.length} aktivnih zapisa promjena</p>
                                    </div>
                                    <div className="rounded-2xl bg-bg-secondary/70 p-4 border border-white/5">
                                        <p className="text-[11px] font-bold text-text-primary">Akcije u procesu</p>
                                        <p className="text-sm text-text-dim mt-2">{statusCounts.awaiting_approval} sekcija čeka odobrenje • {statusCounts.revision_requested} sekcija vraćena na reviziju</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-white/10 bg-bg-secondary/60 p-5">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-text-dim mb-3">Aktivni saradnici</p>
                                <div className="space-y-3">
                                    {collaborators.length > 0 ? collaborators.map((collab, index) => (
                                        <div key={index} className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-bg-tertiary/60 p-3">
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-bold text-text-primary truncate">{collab.profiles?.full_name || 'Anonimni korisnik'}</p>
                                                <p className="text-[9px] uppercase tracking-[0.18em] text-text-dim mt-1">{collab.role}</p>
                                            </div>
                                            <Users className="h-4 w-4 text-brand" />
                                        </div>
                                    )) : (
                                        <p className="text-[10px] text-text-dim">Nema aktivnih saradnika za ovaj projekat.</p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-3xl border border-white/10 bg-amber-950/10 p-5">
                                <div className="flex items-center gap-2 mb-3 text-amber-500">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Praznine podataka</span>
                                </div>
                                <ul className="text-[10px] text-amber-200/70 list-disc space-y-2 pl-4 font-medium">
                                    <li>Specifični budžet lokalnih vlasti za spašavanje okoliša</li>
                                    <li>Potvrđeni partneri za logističku podršku u Neumu</li>
                                    <li>Detalji o kanalima komunikacije sa donatorom</li>
                                </ul>
                            </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>

            {/* Footer Info */}
            <div className="p-6 bg-bg-tertiary/40 backdrop-blur-3xl border-t border-white/5">
                <div className="flex gap-3">
                    <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold leading-relaxed text-text-dim uppercase tracking-wider">
                        APA State Memory Engine [FIX-07] automatski prati sve promjene i vrši sinhronizaciju kroz cijeli dokument.
                    </p>
                </div>
            </div>
        </div>
    );
}
