import { Button } from "@/components/ui/button";
import { ChevronLeft, Rocket, CheckCircle2, FileText, Globe } from "lucide-react";

interface ReviewData {
    title?: string;
    donor_name?: string;
    project_language?: string;
    hasTemplate?: boolean;
    public_call_analysis?: Record<string, unknown>;
}

interface Props {
    data: ReviewData;
    onNext: (data: Partial<ReviewData>) => void;
    onBack: () => void;
}

export default function Step4Review({ data, onNext, onBack }: Props) {
    return (
        <div className="flex flex-col h-full">
            <div className="mb-8">
                <h3 className="text-xl font-bold text-text-primary mb-2">Pregled i Pokretanje</h3>
                <p className="text-text-dim text-sm">Sve je spremno za generisanje vašeg projektnog prijedloga.</p>
            </div>

            <div className="flex-1 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-bg-tertiary p-4 rounded-xl border border-white/5">
                        <p className="text-[10px] uppercase tracking-widest text-text-dim font-bold mb-1">Naziv Projekta</p>
                        <p className="text-sm font-medium text-text-primary">{data.title}</p>
                    </div>
                    <div className="bg-bg-tertiary p-4 rounded-xl border border-white/5">
                        <p className="text-[10px] uppercase tracking-widest text-text-dim font-bold mb-1">Donator</p>
                        <p className="text-sm font-medium text-text-primary">{data.donor_name}</p>
                    </div>
                    <div className="bg-bg-tertiary p-4 rounded-xl border border-white/5 flex items-center gap-3">
                        <Globe className="h-4 w-4 text-primary" />
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-text-dim font-bold">Jezik</p>
                            <p className="text-sm font-medium text-text-primary">{data.project_language === 'bs' ? 'Bosanski' : 'Engleski'}</p>
                        </div>
                    </div>
                    <div className="bg-bg-tertiary p-4 rounded-xl border border-white/5 flex items-center gap-3">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-text-dim font-bold">Forma</p>
                            <p className="text-sm font-medium text-text-primary">{data.hasTemplate ? 'Skenirana forma' : 'Standardni format'}</p>
                        </div>
                    </div>
                </div>

                {data.public_call_analysis?.recommended_program && (
                    <div className="bg-bg-tertiary p-4 rounded-xl border border-white/5">
                        <p className="text-[10px] uppercase tracking-widest text-text-dim font-bold mb-2">Odabrani program</p>
                        <p className="text-sm text-text-primary">{data.public_call_analysis.recommended_program}</p>
                    </div>
                )}

                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        </div>
                        <h4 className="text-lg font-bold text-text-primary">APA je spremna</h4>
                    </div>
                    <p className="text-sm text-text-dim leading-relaxed mb-4">
                        Na osnovu vaših unosa, APA će automatski generisati strukturu projekta i započeti pisanje sekcija koristeći <strong>RIP bazu znanja</strong>.
                    </p>
                    <ul className="space-y-2">
                        {[
                            "Automatsko generisanje 16+ sekcija",
                            "Institucionalni podaci KVS S.C.U.B.A. uključeni",
                            "Praćenje promjena u realnom vremenu",
                            "Saradnički mod omogućen"
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-text-dim">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="mt-8 flex justify-between">
                <Button variant="ghost" className="gap-2" onClick={onBack}>
                    <ChevronLeft className="h-4 w-4" /> Nazad
                </Button>
                <Button className="gap-2 bg-primary hover:bg-primary-hover shadow-[0_0_20px_rgba(14,165,233,0.3)]" onClick={() => onNext({})}>
                    Pokreni Projekt <Rocket className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
