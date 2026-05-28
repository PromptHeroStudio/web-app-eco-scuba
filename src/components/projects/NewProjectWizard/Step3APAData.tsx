import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProjectStore } from "@/store/projectStore";

interface ApiDataMap {
    title?: string;
    applicant_name?: string;
    partners?: string;
    priority_area?: string;
    target_group?: string;
    locations?: string;
    duration?: string;
    budget_overview?: string;
    [key: string]: string | undefined;
}

interface Props {
    data: ApiDataMap;
    onNext: (data: ApiDataMap) => void;
    onBack: () => void;
}

const questions = [
    {
        id: 'title',
        label: '1. Koji je naziv vašeg projekta?',
        placeholder: 'npr. Eko Scuba Ambasadori 2024',
        description: 'APA će koristiti ovaj naziv kroz cijelu dokumentaciju.',
        type: 'input'
    },
    {
        id: 'applicant_name',
        label: '2. Ko je podnosilac projekta?',
        placeholder: 'npr. KVS S.C.U.B.A. ili Sekcija ECO SCUBA',
        description: 'Odredite pravni subjekt koji aplicira.',
        type: 'input'
    },
    {
        id: 'partners',
        label: '3. Ko su partneri na projektu?',
        placeholder: 'npr. nema partnera ili npr. Ministarstvo okoliša KS',
        description: 'Ako nemate partnera, napišite "nema partnera".',
        type: 'input'
    },
    {
        id: 'priority_area',
        label: '4. Koja je prioritetna oblast poziva?',
        placeholder: 'npr. Zaštita voda i biodiverziteta',
        description: 'Ova oblast definiše ton argumentacije.',
        type: 'input'
    },
    {
        id: 'target_group',
        label: '5. Ko je vaš ciljna grupa i koliko je korisnika?',
        placeholder: 'npr. 50 mladih ronioca i ronioca početnika...',
        description: 'Navedite profil i procjenjen broj direktnih korisnika/ca.',
        type: 'textarea'
    },
    {
        id: 'locations',
        label: '6. Gdje se provodi projekat?',
        placeholder: 'npr. Sarajevo, Neum, Jajce...',
        description: 'Navedite kantone, općine ili specifične lokacije.',
        type: 'input'
    },
    {
        id: 'duration',
        label: '7. Koliko traje projekat (faze, mjeseci)?',
        placeholder: 'npr. 12 mjeseci (juni 2024 - maj 2025)',
        description: 'Navedite ukupan broj mjeseci i okvirni početak/kraj.',
        type: 'input'
    },
    {
        id: 'budget_overview',
        label: '8. Koji je okvirni budžet projekta?',
        placeholder: 'npr. Ukupno 30.000 KM (25.000 KM od donatora, 5.000 KM vlastito)',
        description: 'Navedite ukupni iznos, traženi iznos i vlastiti doprinos.',
        type: 'textarea'
    }
];

export default function Step3APAData({ data, onNext, onBack }: Props) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({
        title: data.title || "",
        applicant_name: data.applicant_name || "KVS S.C.U.B.A.",
        partners: data.partners || "nema partnera",
        priority_area: data.priority_area || "",
        target_group: data.target_group || "",
        locations: data.locations || "",
        duration: data.duration || "",
        budget_overview: data.budget_overview || "",
    });
    const [isTyping, setIsTyping] = useState(true);
    const { currentProject, setCurrentProject } = useProjectStore();

    const currentQ = questions[currentIdx];

    useEffect(() => {
        setIsTyping(true);
        const timer = setTimeout(() => setIsTyping(false), 500);
        return () => clearTimeout(timer);
    }, [currentIdx]);

    const currentValue = answers[currentQ.id] ?? "";
    const currentLength = currentValue.length;
    const isNearLimit = currentLength > 1400;

    const handleNext = () => {
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(currentIdx + 1);
        } else {
            onNext(answers);
        }
    };

    const handleBack = () => {
        if (currentIdx > 0) {
            setCurrentIdx(currentIdx - 1);
        } else {
            onBack();
        }
    };

    useEffect(() => {
        if (!currentProject) return;

        // Only write back to the store if the collected APA data actually changed.
        const existing = (currentProject.apa_collected_data as ApiDataMap | undefined) || {};
        const merged: ApiDataMap = { ...existing, ...answers };
        try {
            const existingJson = JSON.stringify(existing);
            const mergedJson = JSON.stringify(merged);
            if (existingJson === mergedJson) return; // no changes -> avoid triggering update loop
        } catch (err) {
            // fallback: if stringify fails, loosely compare
            let changed = false;
            for (const k of Object.keys(merged)) {
                if (existing[k] !== merged[k]) { changed = true; break; }
            }
            if (!changed) return;
        }

        setCurrentProject({
            ...currentProject,
            apa_collected_data: merged,
        });
    }, [answers, currentProject, setCurrentProject]);

    return (
        <div className="flex flex-col h-full">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-brand" /> APA Pitanja (v3 Protokol)
                    </h3>
                    <p className="text-xs text-text-dim mt-1">
                        Obavezno polje {currentIdx + 1} od {questions.length}
                    </p>
                </div>
                <div className="flex gap-1.5">
                    {questions.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 w-6 rounded-full transition-all duration-500 ${i <= currentIdx ? "bg-brand shadow-[0_0_8px_rgba(14,165,233,0.4)]" : "bg-white/5"}`}
                        />
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQ.id}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.05, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="w-full"
                    >
                        <div style={{ transform: 'translateZ(0)' }} className="p-10 bg-bg-tertiary/50 backdrop-blur-2xl rounded-[20px] border border-white/5 shadow-[0_8px_24px_rgba(47,128,237,0.08)] relative">
                            <div className="absolute -top-4 -left-4 h-12 w-12 rounded-2xl bg-brand flex items-center justify-center shadow-xl shadow-brand/20 border border-white/10">
                                <span className="text-white font-bold text-lg">{currentIdx + 1}</span>
                            </div>

                            <label className="text-xl font-bold block mb-3 text-text-primary leading-tight">
                                {currentQ.label}
                            </label>
                            <p className="text-sm text-text-dim mb-8 leading-relaxed max-w-md">
                                {currentQ.description}
                            </p>

                            {currentQ.type === 'textarea' ? (
                                <>
                                    <Textarea
                                        autoFocus
                                        rows={4}
                                        placeholder={currentQ.placeholder}
                                        value={answers[currentQ.id]}
                                        maxLength={1500}
                                        onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                                        className="bg-bg-surface/50 border-white/10 focus:border-brand/50 focus:ring-4 focus:ring-brand/10 transition-all resize-none text-base p-6 rounded-2xl"
                                    />
                                    <motion.div
                                        initial={false}
                                        animate={{ color: isNearLimit ? '#f97316' : '#94a3b8' }}
                                        className="mt-2 text-right text-xs font-medium"
                                    >
                                        {currentLength} / 1500
                                    </motion.div>
                                </>
                            ) : (
                                <Input
                                    autoFocus
                                    type={currentQ.type}
                                    placeholder={currentQ.placeholder}
                                    value={answers[currentQ.id]}
                                    onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                                    className="bg-bg-surface/50 border-white/10 focus:border-brand/50 focus:ring-4 focus:ring-brand/10 transition-all h-16 text-base px-6 rounded-2xl"
                                />
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>

                <div className="mt-12 flex items-center justify-between w-full px-2">
                    <Button variant="ghost" className="h-12 gap-2 text-text-dim hover:text-text-primary transition-colors" onClick={handleBack}>
                        <ChevronLeft className="h-4 w-4" /> Nazad
                    </Button>

                    <Button
                        className="h-16 px-12 gap-3 shadow-2xl shadow-brand/25 rounded-2xl group relative overflow-hidden font-bold"
                        onClick={handleNext}
                        disabled={!answers[currentQ.id]}
                    >
                        <span className="relative z-10">
                            {currentIdx === questions.length - 1 ? "Završi prikupljanje" : "Sljedeće polje"}
                        </span>
                        <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform relative z-10" />
                    </Button>
                </div>
            </div>

            <div className="mt-auto pt-10 flex flex-col items-center gap-2 opacity-40">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">APA State Memory Active</span>
                </div>
                <div className="h-1 w-32 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-brand"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
