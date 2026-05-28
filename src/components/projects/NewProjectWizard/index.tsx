// src/components/projects/NewProjectWizard/index.tsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Step0PublicCall from "./Step0PublicCall";
import Step1Upload from "./Step1Upload";
import Step2Basics from "./Step2Basics";
import Step3APAData from "./Step3APAData";
import Step4Review from "./Step4Review";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProjectStore } from '@/store/projectStore';
import { toast } from "sonner";

interface Props {
    onClose?: () => void;
}

type WizardFormData = {
    project_language: string;
    status: string;
    eligibility_decision?: string;
    title?: string;
    donor_name?: string;
    extractedData?: Record<string, unknown>;
    priority_area?: string;
    hasTemplate?: boolean;
    public_call_analysis?: Record<string, unknown>;
    [key: string]: unknown;
};

interface ProjectSectionInsert {
    project_id: string;
    section_key: string;
    section_title_bs: string;
    display_order: number;
    status: string;
}

const steps = ["Javni Poziv", "Obrazac", "Osnove", "APA Podaci", "Pregled"];

export default function NewProjectWizard({ onClose = () => {} }: Props) {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<WizardFormData>({
        project_language: 'bs',
        status: 'draft'
    });
    const [isCreating, setIsCreating] = useState(false);
    const [createProgress, setCreateProgress] = useState(0);
    const [createStatus, setCreateStatus] = useState('');
    const navigate = useNavigate();
    const { setCurrentProject, setSections } = useProjectStore();

    const handleNext = async (data: Partial<WizardFormData>) => {
        const updatedData = { ...formData, ...data } as WizardFormData;
        setFormData(updatedData);

        if (updatedData.eligibility_decision === 'not_applying') {
            toast.error("Analiza je prekinuta. Pokrenite novi projekat kada budete spremni.");
            onClose();
            setCurrentStep(0);
            setFormData({ project_language: 'bs', status: 'draft' });
            return;
        }

        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        } else {
            await launchProject(updatedData);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const updateWizardProgress = (progress: number, status: string) => {
        setCreateProgress(progress);
        setCreateStatus(status);
    };

    const launchProject = async (finalData: WizardFormData) => {
        setIsCreating(true);
        updateWizardProgress(5, 'Provjeravam korisničku sesiju i pokrećem projekt...');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Korisnik nije prijavljen");

            // 1. Create Project
            const projectInsert = {
                title: (typeof finalData.title === 'string' && finalData.title.trim()) ? finalData.title : "Novi Projekat",
                donor_name: typeof finalData.donor_name === 'string' ? finalData.donor_name : null,
                owner_id: user.id,
                status: 'in_progress',
                public_call_analysis: typeof finalData.public_call_analysis === 'object' && finalData.public_call_analysis !== null ? finalData.public_call_analysis : {},
                form_template_analysis: typeof finalData.extractedData === 'object' && finalData.extractedData !== null ? finalData.extractedData : {},
                apa_collected_data: finalData,
                priority_area: typeof finalData.priority_area === 'string' ? finalData.priority_area : null,
                project_language: finalData.project_language || 'bs',
            };


            const { data: project, error: pError } = await supabase
                .from('projects')
                .insert(projectInsert)
                .select()
                .single();

            if (pError) {
                console.error("Supabase Project Create Error:", pError);
                toast.error("DB Error (project create): " + (pError.message || JSON.stringify(pError)));
                throw pError;
            }

            updateWizardProgress(35, 'Projekt je kreiran. Pripremam LOD 2 mapiranje sekcija...');

            const projectData = project as { id?: string } | null;
            if (!projectData || !projectData.id) {
                const msg = 'Kreiran projekt nema `id`.';
                toast.error(msg);
                throw new Error(msg);
            }

            if (typeof finalData.form_template_base64 === 'string' && finalData.form_template_base64.trim()) {
                try {
                    const base64String = finalData.form_template_base64;
                    const arrayBuffer = Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));
                    const fileName = `project-${projectData.id}-form.pdf`;
                    const { error: uploadError } = await supabase.storage
                        .from('project-forms')
                        .upload(fileName, arrayBuffer, { upsert: true });

                    if (!uploadError) {
                        const { data } = await supabase.storage
                            .from('project-forms')
                            .getPublicUrl(fileName);

                        if (data?.publicUrl) {
                            await supabase.from('projects').update({ form_template_url: data.publicUrl }).eq('id', projectData.id);
                            projectData.form_template_url = data.publicUrl;
                        }
                    } else {
                        console.warn('Form upload failed:', uploadError);
                    }
                } catch (uploadErr) {
                    console.error('Unable to upload template form:', uploadErr);
                }
            }

            // 2. Initialize sections
            const mandatorySections = [
                { key: 'naslovna_strana', title: 'Naslovna strana', order: 0 },
                { key: 'uvod', title: 'Uvod', order: 1 },
                { key: 'sazetak', title: 'Sažetak', order: 2 },
                { key: 'nositelj', title: 'Informacije o nositelju projekta', order: 3 },
                { key: 'potreba_problem', title: 'Potreba/problem u lokalnoj zajednici', order: 4 },
                { key: 'razlozi_znacaj', title: 'Razlozi i značaj projekta', order: 5 },
                { key: 'ciljevi', title: 'Ciljevi projekta', order: 6 },
                { key: 'ciljna_grupa', title: 'Ciljna grupa', order: 7 },
                { key: 'sveukupni_cilj', title: 'Sveukupni cilj projekta', order: 8 },
                { key: 'specificni_ciljevi', title: 'Specifični ciljevi projekta', order: 9 },
                { key: 'ocekivani_rezultati', title: 'Očekivani rezultati', order: 10 },
                { key: 'aktivnosti', title: 'Aktivnosti', order: 11 },
                { key: 'pretpostavke_rizici', title: 'Pretpostavke i rizici', order: 12 },
                { key: 'trajanje_projekta', title: 'Trajanje projekta', order: 13 },
                { key: 'pracenje', title: 'Praćenje provedbe i izvještavanje', order: 14 },
                { key: 'budzet', title: 'Budžet', order: 15 },
                { key: 'vidljivost', title: 'Vidljivost (Promocija projekta)', order: 16 },
                { key: 'lista_aneksa', title: 'Lista aneksa', order: 17 }
            ];

            const sectionsToInsert = mandatorySections.map((s) => ({
                project_id: projectData.id,
                section_key: s.key,
                section_title_bs: s.title,
                display_order: s.order,
                status: 'pending'
            }));

            updateWizardProgress(60, 'Generišem LOD 2 strukturu projekta... (Paralelna inicijalizacija)');
            const { error: sError } = await supabase.from('project_sections').insert(sectionsToInsert as ProjectSectionInsert[]);
            if (sError) {
                console.error('Sections init error:', sError);
                toast.error('DB Error (sections init): ' + (sError.message || JSON.stringify(sError)));
                throw sError;
            }

            updateWizardProgress(95, 'Sekcije su zapisane. Finaliziram projekt i preusmjeravam u editor...');

            // Reset any temporary project state and navigate to editor
            setCurrentProject(projectData);
            setSections(sectionsToInsert);
            updateWizardProgress(100, 'Projekat je spreman. Preusmjeravam u editor...');
            toast.success("Projekat uspješno inicijaliziran prema v3.1 protokolu!");
            onClose();
            navigate(`/projects/${projectData.id}/edit`);

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : JSON.stringify(err);
            updateWizardProgress(0, 'Greška pri kreiranju projekta. Pokušajte ponovo.');
            toast.error("Greška: " + (message || "Neuspješno kreiranje projekta"));
            console.error('launchProject error:', err);
        } finally {
            setIsCreating(false);
        }
    };

    // Esc key closes wizard
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                // reset store and navigate back
                setCurrentProject(null);
                setSections([]);
                onClose();
                navigate('/dashboard');
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose, navigate, setCurrentProject, setSections]);

    useEffect(() => {
        setCurrentStep(0);
        setFormData({ project_language: 'bs', status: 'draft' });
    }, []);

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden">
            {/* Header with Close Button */}
            <div className="flex items-center justify-between p-6 border-b border-[#D6E6F5] bg-white/95 sticky top-0 z-30">
                <div>
                    <h1 className="font-display text-2xl font-bold text-text-primary">Novi Projektni Prijedlog</h1>
                    <p className="text-sm text-text-dim mt-1">Čarobnjak v3.1 — Od Javnog poziva do finalnog prijedloga.</p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        setCurrentProject(null);
                        setSections([]);
                        onClose();
                        navigate('/dashboard');
                    }}
                    className="h-10 w-10 text-text-dim hover:text-text-primary"
                >
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Left Stepper Panel (Glass) */}
                <div className="hidden lg:flex w-80 bg-[#EAF4FF]/60 backdrop-blur-[8px] p-4 lg:p-8 border-r border-[#D6E6F5] flex-col justify-between overflow-y-auto custom-scrollbar max-h-screen">
                        <div>
                            <h2 className="font-display text-xl font-bold text-text-primary mb-10 tracking-tight">Novi Projekat</h2>
                            <div className="space-y-6 relative">
                                <div className="absolute left-[15px] top-6 bottom-6 w-[2px] bg-white/5" />
                                {steps.map((step, i) => {
                                    const isActive = currentStep === i;
                                    const isCompleted = currentStep > i;
                                    return (
                                        <div key={step} className="flex items-center gap-4 relative z-10 transition-all duration-300">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${isActive ? "bg-primary text-white scale-110 shadow-[0_0_20px_rgba(14,165,233,0.4)]" :
                                                isCompleted ? "bg-emerald-500 text-white" : "bg-bg-tertiary text-text-muted border border-white/5"
                                                }`}>
                                                {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? "text-primary" : "text-text-dim"}`}>
                                                    Korak {i + 1}
                                                </span>
                                                <span className={`text-sm font-medium ${isActive ? "text-text-primary" : "text-text-muted"}`}>
                                                    {step}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                            <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1">APA Engine Status</p>
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse outline outline-emerald-500/30 outline-offset-2" />
                                <span className="text-[11px] text-emerald-500/80 font-medium">Sistem v3.1 Aktivan</span>
                            </div>
                        </div>
                </div>

                {/* Right Content - Main Workspace Panel */}
                <div className="flex-1 flex flex-col relative bg-white overflow-hidden max-h-screen h-full">
                    {isCreating && (
                                <div className="absolute inset-0 bg-bg-secondary/90 backdrop-blur-md z-50 flex flex-col items-center justify-center text-center p-8 animate-in fade-in transition-all">
                        <div className="relative h-16 w-16 mb-6">
                            <div className="absolute inset-0 border-2 border-primary/20 rounded-full" />
                            <div className="absolute inset-0 border-2 border-primary rounded-full animate-spin border-t-transparent" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">Konfiguracija Projekta v3.1</h3>
                        <p className="text-sm text-text-dim max-w-xs leading-relaxed mb-4">
                            {createStatus || 'Inicijalizacija projektnog zapisa i strukture sekcija...'}
                        </p>
                        <div className="w-full max-w-md bg-white/10 rounded-full h-3 overflow-hidden mb-3 border border-white/10">
                            <div className="h-full bg-gradient-to-r from-primary via-cyan-400 to-sky-500 transition-all duration-500"
                                style={{ width: `${createProgress}%` }}
                            />
                        </div>
                        <div className="text-xs uppercase tracking-[0.24em] text-text-dim w-full max-w-md">
                            {createProgress}% completed
                        </div>
                    </div>
                    )}
                    <div className="flex-1 p-4 lg:p-6 overflow-y-auto custom-scrollbar bg-gradient-to-b from-white to-[#F9FBFC] h-full max-w-full">
                        <div className="max-w-full mx-auto break-words">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="w-full"
                                >
                                    <div className="bg-white rounded-[20px] shadow-[0_12px_32px_rgba(47,128,237,0.08)] p-8">
                                        {currentStep === 0 && <Step0PublicCall onNext={handleNext} />}
                                        {currentStep === 1 && <Step1Upload onNext={handleNext} onBack={handleBack} />}
                                        {currentStep === 2 && <Step2Basics data={formData} onNext={handleNext} onBack={handleBack} />}
                                        {currentStep === 3 && <Step3APAData data={formData} onNext={handleNext} onBack={handleBack} />}
                                        {currentStep === 4 && <Step4Review data={formData} onNext={handleNext} onBack={handleBack} />}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
