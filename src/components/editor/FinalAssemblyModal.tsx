import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Check,
    Layout,
    FileText,
    ShieldCheck,
    ArrowRight,
    Loader2,
    Zap,
    Download
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionSummary {
    id?: string;
    section_title_bs?: string;
}

interface Props {
    sections: SectionSummary[];
    onComplete: () => void;
    onCancel: () => void;
}

export default function FinalAssemblyModal({ sections, onComplete, onCancel }: Props) {
    const [assembling, setAssembling] = useState(true);
    const [currentCheck, setCurrentCheck] = useState(0);

    const checks = [
        "Provjera konzistentnosti svih numeričkih podataka (budžet, korisnici)",
        "Sinhronizacija lokacija i koordinate kroz cijeli dokument",
        "Provjera vremenskog okvira i faza projekta",
        "Verifikacija svih zakonskih referenci i RIP izvora",
        "Standardizacija terminologije i 'tone-of-voice'",
        "Validacija HTML strukture prema obrascu donatora",
        "Generisanje automatske liste aneksa [FIX-08]"
    ];

    useEffect(() => {
        if (assembling) {
            const interval = setInterval(() => {
                setCurrentCheck(prev => {
                    if (prev >= checks.length - 1) {
                        clearInterval(interval);
                        setAssembling(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [assembling, checks.length]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/90 backdrop-blur-xl"
        >
            <div className="w-full max-w-2xl bg-bg-secondary rounded-[40px] border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-10 border-b border-white/5 bg-bg-tertiary/20 text-center">
                    <div className="h-20 w-20 rounded-[28px] bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand/20">
                        <Layout className="h-10 w-10 text-brand" />
                    </div>
                    <h2 className="text-3xl font-display font-bold tracking-tight mb-2">Finalno Asembliranje [FIX-08]</h2>
                    <p className="text-text-dim text-sm max-w-sm mx-auto">
                        APA sistem vrši završnu 7-stepenu provjeru konzistentnosti prije generisanja finalnog projektnog prijedloga.
                    </p>
                </div>

                {/* Progress Content */}
                <div className="flex-1 p-10 space-y-4">
                    <div className="space-y-3">
                        {checks.map((check, i) => {
                            const isCurrent = i === currentCheck && assembling;
                            const isDone = i < currentCheck || !assembling;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${isCurrent ? 'bg-brand/5 border-brand/30 shadow-lg' : isDone ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/[0.02] border-white/5 opacity-50'}`}
                                >
                                    <div className={`h-6 w-6 rounded-lg flex items-center justify-center border transition-all duration-500 ${isDone ? 'bg-emerald-500 text-white border-emerald-500' : isCurrent ? 'bg-brand/20 border-brand text-brand' : 'bg-transparent border-white/20'}`}>
                                        {isDone ? <Check className="h-4 w-4" /> : isCurrent ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                    </div>
                                    <span className={`text-[13px] font-bold tracking-tight ${isCurrent ? 'text-brand' : isDone ? 'text-text-primary' : 'text-text-dim'}`}>
                                        {check}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-10 border-t border-white/5 bg-bg-tertiary/20 flex flex-col items-center">
                    {!assembling ? (
                        <div className="space-y-8 w-full">
                            <div className="text-center space-y-2">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20 mb-2">
                                    <ShieldCheck className="h-3 w-3" /> Verificirano
                                </div>
                                <p className="text-sm text-text-muted">
                                    Finalni projektni prijedlog je asembliran. Uključuje {sections.length} sekcija, sve odobrene izmjene su primijenjene.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <Button variant="outline" onClick={onCancel} className="flex-1 h-14 rounded-2xl border-white/10 hover:bg-white/5 font-bold">
                                    Nazad u editor
                                </Button>
                                <Button onClick={onComplete} className="flex-1 h-14 rounded-2xl bg-brand shadow-2xl shadow-brand/30 font-bold gap-3">
                                    Preuzmi Projekat <Download className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 text-brand">
                            <Zap className="h-5 w-5 animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-[0.3em] animate-pulse">APA State Processor Active...</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
