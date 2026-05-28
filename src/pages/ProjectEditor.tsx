import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileDown,
    Mail,
    MoreHorizontal,
    Play,
    Save,
    Loader2,
    ChevronLeft,
    SlidersHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useUIStore } from "@/store/uiStore";
import { useProjectStore } from "@/store/projectStore";
import { useHarmonization } from "@/hooks/useHarmonization";
import { supabase } from "@/integrations/supabase/client";
import { Project, ProjectSection, ChangeLogEntry, Profile, FormAnalysis } from "@/types";
import { SectionNavigator } from "@/components/editor/SectionNavigator";
import SectionCard from "@/components/editor/SectionCard";
import RIPPhase from "@/components/editor/RIPPhase";
import { APAStatePanel } from "@/components/editor/APAStatePanel";
import { generateProposalPDF, populateOriginalPDF } from "@/lib/pdf-generator";
import { useAIStream } from "@/hooks/useAIStream";
import { toast } from "sonner";
import ChangeRequestPanel from "@/components/editor/ChangeRequestPanel";
import FinalAssemblyModal from "@/components/editor/FinalAssemblyModal";
import EmailDialog from "@/components/projects/EmailDialog";
import { notifyChangeRequest } from "@/lib/notifications";

interface ProjectCollaborator {
    id: string;
    user_id: string;
    role: 'owner' | 'editor' | 'reviewer' | 'viewer';
    status: 'pending' | 'accepted' | 'declined';
    profiles?: Profile;
}

export default function ProjectEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { setPageTitle } = useUIStore();
    const {
        currentProject,
        sections,
        setCurrentProject,
        setSections,
        updateSection
    } = useProjectStore();
    const { content: streamingContent, isStreaming, streamSection } = useAIStream();
    const [loading, setLoading] = useState(true);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [currentGeneratingSectionId, setCurrentGeneratingSectionId] = useState<string | null>(null);
    const [retryableSectionId, setRetryableSectionId] = useState<string | null>(null);
    const retryTimeoutRef = useRef<number | null>(null);
    const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
    const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
    const [changeSection, setChangeSection] = useState<ProjectSection | null>(null);
    const [showAssembly, setShowAssembly] = useState(false);
    const [showEmailDialog, setShowEmailDialog] = useState(false);
    const [showFieldMapping, setShowFieldMapping] = useState(false);
    const [fieldToSectionMap, setFieldToSectionMap] = useState<Record<string, string>>({});
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // TDZ-safe hook order: declare activeSectionId state before useHarmonization
    useHarmonization(activeSectionId || undefined);

    const clearRetryTimer = useCallback(() => {
        if (retryTimeoutRef.current) {
            window.clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }
        setRetryableSectionId(null);
    }, []);

    useEffect(() => {
        return () => {
            if (retryTimeoutRef.current) {
                window.clearTimeout(retryTimeoutRef.current);
            }
        };
    }, []);

    const fetchProjectData = useCallback(async () => {
        if (!id) return;
        setLoading(true);

        try {
            const { data: project, error: pError } = await supabase
                .from<Project>('projects')
                .select('*')
                .eq('id', id)
                .single();

            if (pError || !project) throw pError || new Error('Projekt nije pronađen');
            setCurrentProject(project);
            setFieldToSectionMap(project.form_template_analysis?.field_to_section_map ?? {});
            setPageTitle(project?.title || "Projekat");

            const { data: sectionsData, error: sError } = await supabase
                .from<ProjectSection>('project_sections')
                .select('*')
                .eq('project_id', id)
                .order('display_order', { ascending: true });

            if (sError) throw sError;
            setSections(sectionsData || []);
            console.log('Aktivne sekcije u editoru:', sectionsData || []);
            if (sectionsData?.length) {
                setActiveSectionId((prev) => prev || (sectionsData[0]?.id ?? null));
            }

            // AUTO-FIX: Reset stuck 'generating' sekcija u pending'
            const stuckSections = (sectionsData || []).filter((s) => s.status === 'generating');
            if (stuckSections.length > 0) {
                console.log(`[APA-Fix] Pronađeno ${stuckSections.length} zaglavljenih sekcija. Resetujem na 'pending'...`);
                for (const section of stuckSections) {
                    await supabase
                        .from<ProjectSection>('project_sections')
                        .update({ status: 'pending' })
                        .eq('id', section.id);
                }
                const resetSections = (sectionsData || []).map((s) => s.status === 'generating' ? { ...s, status: 'pending' } : s);
                setSections(resetSections);
                toast.info("Pronađene su zaglavljene sekcije iz prethodne sesije. Status je resetovan na 'pending'.");
            }

            const { data: collabData } = await supabase
                .from<ProjectCollaborator>('project_collaborators')
                .select('*, profiles(*)')
                .eq('project_id', id);

            setCollaborators(collabData || []);

            const { data: logData } = await supabase
                .from<ChangeLogEntry>('change_log')
                .select('*')
                .eq('project_id', id)
                .order('created_at', { ascending: false });

            setChangeLog(logData || []);

        } catch (err) {
            console.error("Error fetching project data:", err);
            toast.error("Greška pri učitavanju projekta.");
        } finally {
            setLoading(false);
        }
    }, [id, setCurrentProject, setSections, setPageTitle]);

    const subscribeToChanges = useCallback(() => {
        if (!id) return () => undefined;
        const channel = supabase
            .channel(`project-${id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'project_sections',
                filter: `project_id=eq.${id}`
            }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    const newSection = payload.new as ProjectSection;
                    updateSection(newSection.section_key, newSection);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, updateSection]);

    useEffect(() => {
        if (id) {
            fetchProjectData();
            const cleanup = subscribeToChanges();
            return cleanup;
        }
    }, [id, fetchProjectData, subscribeToChanges]);

    const scrollToSection = (sectionId: string) => {
        setActiveSectionId(sectionId);
        const element = document.getElementById(`section-${sectionId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleApprove = useCallback(async (sectionId: string) => {
        try {
            const section = sections.find(s => s.id === sectionId);
            if (!section) return;

            const { error } = await supabase
                .from('project_sections')
                .update({ status: 'approved', approved_at: new Date().toISOString() })
                .eq('id', sectionId);

            if (error) throw error;

            // Notify collaborators that this section was approved
            if (currentProject && collaborators && collaborators.length > 0) {
                collaborators.forEach((collab: ProjectCollaborator) => {
                    if (collab.user_id !== currentProject?.owner_id) {
                        notifyChangeRequest(
                            collab.user_id,
                            currentProject.id,
                            section.section_title_bs,
                            `Sekcija "${section.section_title_bs}" je odobrena i sada je dostupna za pregled.`
                        ).catch(err => console.error("Notification error:", err));
                    }
                });
            }

            toast.success("Sekcija odobrena!");
        } catch (err) {
            toast.error("Greška pri odobravanju.");
        }
    }, [sections, currentProject, collaborators]);

    const handleRegenerate = useCallback(async (sectionId: string) => {
        console.log("DEBUG: Pokušaj okidanja generisanja za sekciju:", sectionId, {
            currentProjectId: currentProject?.id,
            currentProjectTitle: currentProject?.title,
            currentProjectStatus: currentProject?.status,
            currentSection: sections.find(s => s.id === sectionId)
        });

        const section = sections.find(s => s.id === sectionId);
        if (!section) {
            console.error("DEBUG: Sekcija nije pronađena za generisanje:", sectionId);
            return;
        }

        if (!currentProject?.id) {
            console.error("❌ Greška: Projektni ID nedostaje, prekidam AI poziv.");
            toast.error("Interna greška: Projektni ID nedostaje.");
            return;
        }

        clearRetryTimer();
        setRetryableSectionId(null);
        setCurrentGeneratingSectionId(sectionId);

        if (retryTimeoutRef.current) {
            window.clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }

        retryTimeoutRef.current = window.setTimeout(() => {
            setRetryableSectionId(sectionId);
            toast.error('AI sistem ne odgovara. Provjerite internet vezu.');
        }, 15000);

        try {
            // Set status to generating locally & in DB
            updateSection(section.section_key, { ...section, status: 'generating' });
            await supabase
                .from('project_sections')
                .update({ status: 'generating' })
                .eq('id', sectionId);

            // Start stream
            const finalContent = await streamSection({
                project_id: currentProject.id,
                section_key: section.section_key,
                protocol: 'WA',
                messages: [],
                project_context: {
                    title: currentProject.title,
                    donor: currentProject.donor_name,
                    priority: currentProject.priority_area,
                    apa_collected_data: currentProject.apa_collected_data,
                    public_call_analysis: currentProject.public_call_analysis,
                    rip_data: currentProject.rip_data,
                    form_template_analysis: currentProject.form_template_analysis
                },
                onFirstChunk: () => {
                    clearRetryTimer();
                }
            });

            clearRetryTimer();

            if (finalContent) {
                // Save final content
                const { error: updError } = await supabase
                    .from('project_sections')
                    .update({
                        content_html: finalContent,
                        status: 'awaiting_approval',
                        version: (section.version || 1) + 1
                    })
                    .eq('id', sectionId);

                if (updError) throw updError;
                toast.success(`Sekcija "${section.section_title_bs}" generisana.`);
            }
        } catch (err) {
            console.error("Stream error:", err);
            clearRetryTimer();
            toast.error("Greška pri generisanju sekcije.");
            await supabase
                .from('project_sections')
                .update({ status: 'pending' })
                .eq('id', sectionId);
        } finally {
            setCurrentGeneratingSectionId(null);
        }
    }, [sections, currentProject, streamSection, updateSection, clearRetryTimer]);

    const handleExportPDF = async () => {
        if (!currentProject) return;

        const approvedSections = sections.filter(s => s.status === 'approved' && s.content_html);
        if (approvedSections.length === 0) {
            toast.warning("Nijedna sekcija sa sadržajem nije odobrena za izvoz.");
            return;
        }

        setShowAssembly(true);
    };

    const finalizeExport = async () => {
        setShowAssembly(false);
        const approvedSections = sections.filter(s => s.status === 'approved' && s.content_html);

        if (!currentProject) return;

        const exportPromise = currentProject.form_template_url && currentProject.form_template_analysis?.field_to_section_map
            ? populateOriginalPDF(currentProject.form_template_url, currentProject.form_template_analysis, approvedSections, currentProject.title)
            : generateProposalPDF(approvedSections, currentProject.title, currentProject.donor_name ?? undefined);

        toast.promise(exportPromise, {
            loading: currentProject.form_template_url && currentProject.form_template_analysis?.field_to_section_map
                ? 'Popunjavam originalni PDF obrazac...'
                : 'Generišem industrijski PDF...',
            success: currentProject.form_template_url && currentProject.form_template_analysis?.field_to_section_map
                ? 'Originalni PDF obrazac je popunjen i preuzet!'
                : 'Projektni prijedlog uspješno sačuvan!',
            error: 'Greška pri generisanju PDF-a.'
        });
    };

    const fieldMappingFields = useMemo(() => {
        const fieldAnalysis = currentProject?.form_template_analysis;
        const fieldNames = new Set<string>();

        fieldAnalysis?.fields?.forEach((field) => {
            if (field.field_name) fieldNames.add(field.field_name);
        });

        Object.keys(fieldAnalysis?.field_to_section_map ?? {}).forEach((fieldName) => {
            if (fieldName) fieldNames.add(fieldName);
        });

        return Array.from(fieldNames);
    }, [currentProject?.form_template_analysis]);

    const handleFieldMappingChange = useCallback((fieldName: string, sectionKey: string) => {
        setFieldToSectionMap((prev) => ({
            ...prev,
            [fieldName]: sectionKey,
        }));
    }, []);

    const handleSaveFieldMapping = useCallback(async () => {
        if (!currentProject) return;

        const updatedAnalysis = currentProject.form_template_analysis
            ? { ...currentProject.form_template_analysis, field_to_section_map: fieldToSectionMap }
            : {
                form_language: 'bs',
                sections: [],
                color_scheme: { header_bg: '#ffffff', header_text: '#000000', accent: '#003366' },
                has_logo: false,
                field_to_section_map: fieldToSectionMap,
            } as FormAnalysis;

        try {
            const { error } = await supabase
                .from('projects')
                .update({ form_template_analysis: updatedAnalysis })
                .eq('id', currentProject.id);

            if (error) throw error;

            setCurrentProject({ ...currentProject, form_template_analysis: updatedAnalysis });
            toast.success('Mapa PDF polja je sačuvana.');
            setShowFieldMapping(false);
        } catch (err) {
            console.error('Field mapping save error:', err);
            toast.error('Greška pri spremanju mape PDF polja.');
        }
    }, [currentProject, fieldToSectionMap, setCurrentProject]);

    const handleChangeRequest = useCallback((section: ProjectSection) => {
        setChangeSection(section);
    }, []);

    const handleApplyChange = useCallback(async (description: string) => {
        if (!changeSection || !currentProject) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Korisnik nije prijavljen");

            // Apply FIX-06 protocol: APA Analysis already shown in UI
            // Now log the change request in DB
            await supabase.from('change_log').insert({
                project_id: currentProject.id,
                requested_by: user.id,
                change_description: description,
                affected_sections: [changeSection.section_title_bs],
                status: 'pending'
            });

            // Notify collaborators that a change was requested
            if (collaborators && collaborators.length > 0) {
                collaborators.forEach((collab: ProjectCollaborator) => {
                    if (collab.user_id !== user.id) {
                        notifyChangeRequest(
                            collab.user_id,
                            currentProject.id,
                            changeSection.section_title_bs,
                            description
                        ).catch(err => console.error("Notification error:", err));
                    }
                });
            }

            const sId = changeSection.id;
            setChangeSection(null);
            handleRegenerate(sId);
            toast.success("Izmjena registrovana i sekcija se ponovo piše.");
        } catch (err) {
            console.error("Change apply error:", err);
            toast.error("Greška pri bilježenju izmjene.");
        }
    }, [changeSection, currentProject, handleRegenerate, collaborators]);

    const approvedCount = useMemo(() =>
        sections.filter(s => s.status === 'approved').length,
        [sections]);

    const ripCompleteness = currentProject?.rip_data?.completeness;
    const ripStatus = ripCompleteness !== undefined
        ? ripCompleteness >= 100 ? 'COMPLETE' : 'IN_PROGRESS'
        : 'PENDING';

    const visibleSections = useMemo(() => {
        if (sections.length === 0) return [];
        const activeIndex = sections.findIndex((section) => section.id === activeSectionId);
        if (activeIndex === -1) {
            return sections.slice(0, 3);
        }

        const start = Math.max(0, activeIndex - 1);
        const end = Math.min(sections.length, activeIndex + 2);
        return sections.slice(start, end);
    }, [sections, activeSectionId]);

    const renderedSections = useMemo(() =>
        visibleSections.map((section) => (
            <SectionCard
                key={section.id}
                section={section}
                liveContent={section.id === currentGeneratingSectionId ? streamingContent : undefined}
                onApprove={handleApprove}
                onRegenerate={handleRegenerate}
                onEdit={() => handleChangeRequest(section)}
                retryable={section.id === retryableSectionId}
                onRetry={handleRegenerate}
            />
        )),
        [visibleSections, streamingContent, currentGeneratingSectionId, handleApprove, handleRegenerate, handleChangeRequest, retryableSectionId]);

    useEffect(() => {
        if (currentGeneratingSectionId && !isStreaming) {
            const timeout = window.setTimeout(() => {
                if (currentGeneratingSectionId && !isStreaming) {
                    console.error('DEBUG: AI poziv nije inicijalizovan nakon 3 sekunde za sekciju:', currentGeneratingSectionId);
                    toast.error('Interna greška: AI poziv nije inicijalizovan.');
                    setRetryableSectionId(currentGeneratingSectionId);
                }
            }, 3000);

            return () => window.clearTimeout(timeout);
        }
        return undefined;
    }, [currentGeneratingSectionId, isStreaming]);

    if (loading || !currentProject) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] gap-4 bg-[#E7F5FF] text-[#0F172A]">
                <Loader2 className="h-10 w-10 text-brand animate-spin" />
                <div className="space-y-3 text-center">
                    <p className="text-lg font-semibold">Učitavam projektne podatke...</p>
                    <p className="text-text-dim text-sm">Zadržite se ovdje dok se editor i sekcije sigurno pripremaju.</p>
                </div>
            </div>
        );
    }


    return (
        <motion.div
            style={{ perspective: 1100 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex h-[calc(100vh-64px)] overflow-hidden -m-6 bg-background"
        >
            {/* Left Column: Section Navigator */}
            <motion.div
                initial={{ x: -28, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="z-10"
            >
                <SectionNavigator
                    sections={sections}
                    activeSectionId={activeSectionId}
                    onSectionClick={scrollToSection}
                    approvedCount={approvedCount}
                    totalCount={sections.length}
                />
            </motion.div>

            {/* Center Column: canvas */}
            <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
                className="flex-1 flex flex-col bg-white/95 overflow-hidden border-r border-[#D6E6F5] relative shadow-[0_12px_32px_rgba(47,128,237,0.08)]"
            >
                {/* Editor Top Bar */}
                <div className="h-16 px-6 border-b border-[#D6E6F5] flex items-center justify-between bg-white/90 backdrop-blur-xl z-20 sticky top-0">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/projects')} className="text-text-dim">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="font-display font-bold text-base truncate max-w-[240px] leading-tight">
                                {currentProject?.title}
                            </h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-[10px] text-text-dim font-bold uppercase tracking-widest whitespace-nowrap">
                                    {currentProject?.status?.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-9 gap-2 border-border bg-bg-tertiary/30 text-xs font-bold" onClick={() => setShowFieldMapping(true)}>
                            <SlidersHorizontal className="h-4 w-4 text-brand" /> PDF polja
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 gap-2 border-border bg-bg-tertiary/30 text-xs font-bold" onClick={handleExportPDF}>
                            <FileDown className="h-4 w-4 text-brand" /> {currentProject?.form_template_url ? 'Finalni dokument' : 'Izvezi PDF'}
                        </Button>
                        <Button variant="brand" size="sm" className="h-9 gap-2 text-xs font-bold px-4 shadow-lg shadow-brand/20" onClick={() => setShowEmailDialog(true)}>
                            <Mail className="h-4 w-4" /> Pošalji
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-text-dim">
                            <MoreHorizontal className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Scrollable Canvas */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar space-y-12 pb-40 relative z-0"
                >
                    <div className="max-w-4xl mx-auto space-y-12 relative z-0">
                        {/* RIP Phase Banner */}
                        <RIPPhase />

                        {/* Sections */}
                        {renderedSections}
                    </div>
                </div>

                {/* Change Request Panel [FIX-06] */}
                {changeSection && (
                    <ChangeRequestPanel
                        sectionTitle={changeSection.section_title_bs}
                        onApply={handleApplyChange}
                        onCancel={() => setChangeSection(null)}
                    />
                )}

                {/* Final Assembly Modal [FIX-08] */}
                {showAssembly && (
                    <FinalAssemblyModal
                        sections={sections}
                        onComplete={finalizeExport}
                        onCancel={() => setShowAssembly(false)}
                    />
                )}

                <Dialog open={showFieldMapping} onOpenChange={setShowFieldMapping}>
                    <DialogContent className="sm:max-w-4xl bg-bg-secondary border-white/5">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                                <SlidersHorizontal className="h-5 w-5 text-brand" />
                                PDF Field Mapping
                            </DialogTitle>
                            <DialogDescription>
                                Povežite detektovana PDF polja s odgovarajućim sekcijama. Ova mapa se koristi prilikom popunjavanja originalnog obrasca.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            {!fieldMappingFields.length ? (
                                <div className="rounded-3xl border border-border bg-white p-6 text-sm text-text-dim">
                                    Nije detektovano nijedno PDF polje. Ako imate postojeću mapu, ona će se koristiti pri popunjavanju.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {fieldMappingFields.map((fieldName) => {
                                        const fieldDef = currentProject?.form_template_analysis?.fields?.find((field) => field.field_name === fieldName);
                                        return (
                                            <div key={fieldName} className="rounded-3xl border border-border bg-white p-4">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-sm text-foreground truncate">{fieldName}</p>
                                                        <p className="text-xs text-text-dim">
                                                            {fieldDef?.label ? `Label: ${fieldDef.label}` : 'Nema oznake'}
                                                            {fieldDef?.page ? ` · Strana ${fieldDef.page}` : ''}
                                                        </p>
                                                    </div>
                                                    <select
                                                        value={fieldToSectionMap[fieldName] ?? ''}
                                                        onChange={(event) => handleFieldMappingChange(fieldName, event.target.value)}
                                                        className="max-w-[320px] w-full rounded-2xl border border-border bg-bg-primary px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                                                    >
                                                        <option value="">Ignoriši polje</option>
                                                        {sections.map((section) => (
                                                            <option key={section.section_key} value={section.section_key}>
                                                                {section.section_title_bs}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <DialogFooter className="pt-4 flex flex-wrap gap-2">
                            <Button variant="ghost" onClick={() => setShowFieldMapping(false)}>
                                Zatvori
                            </Button>
                            <Button variant="brand" onClick={handleSaveFieldMapping}>
                                Sačuvaj mapu
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <EmailDialog
                    open={showEmailDialog}
                    onOpenChange={setShowEmailDialog}
                    projectTitle={currentProject?.title || ''}
                />

                {/* Glass Overlay for Streaming */}
                <AnimatePresence>
                    {isStreaming && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 
                         bg-bg-secondary/80 backdrop-blur-xl border border-brand/30 
                         px-6 py-3 rounded-full flex items-center gap-4 shadow-2xl"
                        >
                            <Loader2 className="h-5 w-5 text-brand animate-spin" />
                            <p className="text-sm font-medium text-text-primary whitespace-nowrap">
                                APA AI piše sadržaj... <span className="text-text-dim ml-2 italic text-xs">{streamingContent.length} karaktera</span>
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Right Column: APA State Panel */}
            <motion.div
                initial={{ x: 28, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.45, ease: "easeOut", delay: 0.12 }}
                className="z-10"
            >
                <APAStatePanel
                    projectTitle={currentProject?.title || "Projekat"}
                    sections={sections}
                    collaborators={collaborators}
                    ripStatus={ripStatus}
                    changeLog={changeLog}
                />
            </motion.div>
        </motion.div>
    );
}
