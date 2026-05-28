import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, History, CheckCircle, Info, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionStatus {
    id: string;
    section_title_bs: string;
    version?: string;
    status?: 'approved' | 'awaiting_approval' | 'generating' | string;
}

interface CollaboratorProfile {
    full_name?: string;
}

interface CollaboratorItem {
    profiles?: CollaboratorProfile;
    role?: string;
}

interface Props {
    sections: SectionStatus[];
    collaborators: CollaboratorItem[];
}

export default function RightSidebar({ sections, collaborators }: Props) {
    return (
        <div className="w-[320px] h-full flex flex-col border-l border-border bg-bg-secondary sticky top-0 overflow-hidden">
            <Tabs defaultValue="status" className="flex-1 flex flex-col">
                <div className="p-4 border-b border-border">
                    <TabsList className="grid grid-cols-4 h-10 bg-bg-tertiary">
                        <TabsTrigger value="status" className="px-0"><CheckCircle className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="history" className="px-0"><History className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="users" className="px-0"><Users className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="info" className="px-0"><Info className="h-4 w-4" /></TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <TabsContent value="status" className="m-0 p-0">
                        <div className="p-4 border-b border-border bg-bg-tertiary/50">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status sekcija</h4>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-border">
                                    <TableHead className="text-[10px] h-10">Sekcija</TableHead>
                                    <TableHead className="text-[10px] h-10">V</TableHead>
                                    <TableHead className="text-[10px] h-10 text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sections.map((s) => (
                                    <TableRow key={s.id} className="hover:bg-white/5 border-border">
                                        <TableCell className="text-[11px] font-medium py-3 max-w-[120px] truncate">{s.section_title_bs}</TableCell>
                                        <TableCell className="text-[11px] text-muted-foreground py-3">{s.version}</TableCell>
                                        <TableCell className="text-right py-3">
                                            <div className={`h-2 w-2 rounded-full inline-block ${s.status === 'approved' ? 'bg-emerald-500' :
                                                    s.status === 'awaiting_approval' ? 'bg-amber-500' :
                                                        s.status === 'generating' ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'
                                                }`} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TabsContent>

                    <TabsContent value="history" className="m-0 p-4 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Dnevnik izmjena</h4>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="relative pl-6 pb-6 border-l border-border last:pb-0">
                                <div className="absolute left-[-5px] top-0 h-[9px] w-[9px] rounded-full bg-border" />
                                <p className="text-xs font-bold">Verzija 1.{i} generisana</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Prije {i}h · APA Sistem</p>
                                <p className="text-[10px] italic mt-2 text-text-dim">Uključeni RIP podaci o demografiji.</p>
                            </div>
                        ))}
                    </TabsContent>

                    <TabsContent value="users" className="m-0 p-4">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Saradnici</h4>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary">
                                <UserPlus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {collaborators.map((c, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                        {c.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold truncate">{c.profiles?.full_name || 'Korisnik'}</p>
                                        <p className="text-[10px] text-muted-foreground capitalize">{c.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="info" className="m-0 p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Sljedeći korak</h4>
                        <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                            <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-2">Potrebna radnja</p>
                            <p className="text-xs leading-relaxed">Odobriti sekciju "Budžet" (Dodao Amir S. prije 15 min)</p>
                            <Button className="w-full mt-4 h-8 text-[11px] font-bold uppercase">Idi na sekciju</Button>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
