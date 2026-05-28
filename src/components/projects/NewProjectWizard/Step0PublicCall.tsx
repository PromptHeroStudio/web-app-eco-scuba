// src/components/projects/NewProjectWizard/Step0PublicCall.tsx
import { useState, forwardRef } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";

const loadPdfJs = async (): Promise<typeof import('pdfjs-dist')> => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
    ).toString();
    return pdfjsLib;
};

interface ScoringItem {
    label?: string;
    criteria?: string;
    name?: string;
    max_points?: number;
    max?: number;
    estimate?: string;
    score?: number;
    status?: string;
}

interface AnalysisPayload {
    call_title: string;
    call_id: string;
    donor: string;
    total_funds: number | null;
    recommended_program: string;
    eligibility_criteria: unknown[];
    not_relevant_programs: unknown[];
    verdict: string;
    risk_notes: unknown[];
    scoring: ScoringItem[];
    raw_html_summary: string;
}

interface Props {
    onNext: (data: Record<string, unknown>) => void;
}

const Step0PublicCall = forwardRef<HTMLDivElement, Props>(({ onNext }, ref) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const droppedFiles = Array.from(e.dataTransfer.files || []);
        if (droppedFiles.length > 0) {
            setFile(droppedFiles[0]);
        }
    };

    const extractTextFromPDF = async (file: File): Promise<string> => {
        try {
            const pdfjsLib = await loadPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let text = '';
            const maxPages = Math.min(pdf.numPages, 20);
            for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map((item: { str: string }) => item.str).join(' ') + '\n';
            }
            console.log(`[PDF.js] Ekstrahovan tekst: ${text.length} znakova, ${pdf.numPages} stranica`);
            return text.substring(0, 8000);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn('[PDF.js] Ekstrakcija nije uspjela:', message);
            return '';
        }
    };

    const startAnalysis = async () => {
        if (!file) return;
        setIsUploading(true);
        setError(null);
        setAnalysis(null);

        try {
            setIsUploading(true);
            setIsStreaming(true);

            // Early Session Guard
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError("Sesija istekla ili korisnik nije prijavljen.");
                setIsUploading(false);
                setIsStreaming(false);
                return;
            }

            // Čitaj PDF kao base64 I ekstrahuj tekst paralelno
            const [base64, extractedText] = await Promise.all([
                new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                }),
                extractTextFromPDF(file)
            ]);

            const isScanned = extractedText.trim().length < 100;
            console.log(`[Step0] base64 spreman, tekst: ${extractedText.length} znakova, skenirani PDF: ${isScanned}`);

            // Pošalji kroz Edge Function - ako je skenirani PDF, Gemini čita direktno iz base64
            const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-form-upload`;

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    pdf_base64: base64,
                    text_content: extractedText,
                    source: 'public_call'
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Edge Function greška ${response.status}: ${errText}`);
            }

            const data = await response.json() as Record<string, unknown>;

            const getString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
            const getNumber = (value: unknown) => typeof value === 'number' ? value : null;
            const getArray = (value: unknown) => Array.isArray(value) ? value : [];

            setAnalysis({
                call_title: getString(data.call_title, getString(data.document_title, "Javni poziv")),
                call_id: getString(data.call_id, getString(data.document_number, "N/A")),
                donor: getString(data.donor, getString(data.funder, "Nepoznati donator")),
                total_funds: getNumber(data.total_funds) ?? (typeof data.budget_limits === 'object' && data.budget_limits !== null ? getNumber((data.budget_limits as Record<string, unknown>).max) : null),
                recommended_program: getString(data.recommended_program, "Preporučeni program"),
                eligibility_criteria: getArray(data.eligibility_criteria),
                not_relevant_programs: getArray(data.not_relevant_programs),
                verdict: getString(data.eligibility_verdict, "✅ MOŽE APLICIRATI"),
                risk_notes: getArray(data.risk_notes).length ? getArray(data.risk_notes) : getArray(data.eligibility_notes),
                scoring: getArray(data.scoring).length ? getArray(data.scoring) : getArray(data.criteria_scoring),
                raw_html_summary: getString(data.raw_html_summary, getString(data.summary, JSON.stringify(data, null, 2)))
            });
            setIsUploading(false);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("UI Error Catch:", message);
            setError(message || "Došlo je do neočekivane greške pri analizi.");
        } finally {
            setIsUploading(false);
            setIsStreaming(false);
        }
    };

    return (
        <div ref={ref} className="flex flex-col h-full">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-text-primary">KORAK 1: Upload Javnog poziva</h3>
                <p className="text-sm text-text-dim mt-1">
                    Uploadujte dokument Javnog poziva (tekstualni ili skenirani PDF).
                    Sistem će procijeniti eligibilnost i zahtjeve.
                </p>
            </div>

            {!analysis && (
                <div className="flex-1 flex flex-col">
                    <label
                        className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all cursor-pointer ${file ? 'border-primary/50 bg-primary/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'} ${isDragOver ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_18px_rgba(0,194,255,0.16)]' : ''}`}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                        {file ? (
                            <div className="text-center">
                                <FileText className="h-16 w-16 text-primary mx-auto mb-4" />
                                <p className="font-bold text-text-primary">{file.name}</p>
                                <p className="text-xs text-text-dim mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="h-16 w-16 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-inner">
                                    <Upload className="h-8 w-8 text-text-dim" />
                                </div>
                                <p className="font-bold text-text-primary">Odaberi PDF dokument</p>
                                <p className="text-xs text-text-dim mt-2">Ili ga prevuci ovdje (Max 25MB)</p>
                            </div>
                        )}
                    </label>

                            <Button
                        className="mt-6 h-14 rounded-2xl font-bold bg-primary hover:bg-brand shadow-lg shadow-primary/20"
                        disabled={!file || isUploading}
                        onClick={startAnalysis}
                    >
                        {isUploading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Uplodujem...</> :
                            isStreaming ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analiziram...</> :
                                "Pokreni Eligibility Analizu"}
                    </Button>
                </div>
            )}

            {analysis && (
                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                            <div className="grid gap-4 lg:grid-cols-2">
                                {/* Verdict Card - Platinum Boost */}
                                <div
                                    className={`p-5 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 ${analysis && (/MOŽE|✅|can/i).test(analysis.verdict) ? 'bg-emerald-500/6' : 'bg-amber-500/6'}`}
                                    style={{
                                        borderWidth: 2,
                                        borderStyle: 'solid',
                                        borderColor: analysis && (/MOŽE|✅|can/i).test(analysis.verdict) ? 'rgba(30,213,166,0.22)' : 'rgba(255,176,32,0.18)',
                                        boxShadow: analysis && (/MOŽE|✅|can/i).test(analysis.verdict) ? '0 8px 28px rgba(30,213,166,0.06)' : '0 8px 28px rgba(255,176,32,0.06)'
                                    }}
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <CheckCircle2 size={32} className={`${analysis && (/MOŽE|✅|can/i).test(analysis.verdict) ? 'text-emerald-500' : 'text-amber-500'} shrink-0`} />
                                        <div>
                                            <p className={`${analysis && (/MOŽE|✅|can/i).test(analysis.verdict) ? 'text-emerald-500' : 'text-amber-500'} text-sm uppercase tracking-[0.22em] font-bold`}>Verdikt</p>
                                            <h4 className="mt-1 text-3xl md:text-4xl font-bold leading-tight text-text-primary">{analysis.verdict}</h4>
                                        </div>
                                    </div>
                                    <p className="text-sm text-text-primary/80">
                                        {analysis.call_title} · {analysis.call_id}
                                    </p>
                                    <p className="text-sm text-text-primary/80 mt-2">
                                        Donator: <strong>{analysis.donor}</strong>
                                        {analysis.total_funds ? ` · Ukupno sredstva: ${analysis.total_funds} KM` : ''}
                                    </p>
                                </div>

                        <div className="space-y-3">
                            <div className="rounded-2xl border border-border bg-bg-surface p-5">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-text-dim mb-3">Preporučeni program</p>
                                <h4 className="text-lg font-semibold text-text-primary">{analysis.recommended_program}</h4>
                            </div>
                            <div className="rounded-2xl border border-border bg-bg-surface p-5">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-text-dim mb-3">Dodatne opcije</p>
                                <p className="text-sm text-text-dim leading-relaxed">
                                    Ako želite, možete pokrenuti novu analizu sa drugim programom ili prekinuti proces.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-bg-secondary p-6">
                        <h4 className="text-sm font-bold uppercase tracking-[0.22em] text-text-dim mb-4">Scoring i kriteriji</h4>
                        {analysis.scoring?.length ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm text-text-primary">
                                    <thead>
                                        <tr className="border-b border-border/50 text-text-dim">
                                            <th className="py-3 pr-4">Kriterij</th>
                                            <th className="py-3 pr-4">Maks. bodova</th>
                                            <th className="py-3">Procjena</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analysis.scoring.map((item, index) => (
                                            <tr key={index} className={index % 2 === 0 ? 'bg-bg-primary/5' : ''}>
                                                <td className="py-3 pr-4 align-top">{item.label || item.criteria || item.name}</td>
                                                <td className="py-3 pr-4 align-top">{item.max_points ?? (item.max ?? '-')}</td>
                                                <td className="py-3 align-top">{item.estimate || item.score || item.status || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-text-dim">AI nije vratio eksplicitnu scoring tabelu. Pogledajte sažetak ispod.</p>
                        )}
                    </div>

                    <div className="glass rounded-2xl border border-border p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <Info className="h-20 w-20" />
                        </div>
                        <h4 className="font-bold text-sm uppercase tracking-widest text-text-dim mb-4">Sažetak Javnog poziva</h4>
                        <div className="prose prose-sm prose-invert max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(analysis.raw_html_summary) }} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 py-4">
                        <Button
                            className="h-14 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500"
                            onClick={() => onNext({ public_call_analysis: analysis })}
                        >
                            (a) Nastavljamo s programom: {analysis.recommended_program}
                        </Button>
                        <Button variant="outline" className="h-14 rounded-2xl font-bold border-white/10 hover:bg-white/5" onClick={() => {
                            setAnalysis(null);
                            setFile(null);
                            setError(null);
                        }}>
                            (b) Želim analizu drugog programa
                        </Button>
                        <Button variant="ghost" className="h-14 rounded-2xl font-bold text-text-dim hover:text-white" onClick={() => {
                            onNext({ public_call_analysis: analysis, eligibility_decision: 'not_applying' });
                        }}>
                            (c) Ne nastavljamo s ovim pozivom
                        </Button>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3 text-destructive text-sm font-medium">
                    <AlertCircle className="h-4 w-4" /> {error}
                </div>
            )}
        </div>
    );
});

Step0PublicCall.displayName = 'Step0PublicCall';

export default Step0PublicCall;
