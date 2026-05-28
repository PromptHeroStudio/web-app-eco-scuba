import { useState, useEffect, useRef } from "react";
import { Check, Edit3, RotateCcw, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DOMPurify from "dompurify";
import { DisclaimerBanner } from "./DisclaimerBanner";
import { parseRIPStatus } from "@/lib/rip-parser";

interface ScoringAlignmentItem {
    label: string;
    score?: string;
    status?: string;
}

interface Props {
    section: {
        id: string;
        section_key: string;
        section_title_bs: string;
        content_html: string | null;
        status: 'pending' | 'generating' | 'awaiting_approval' | 'approved' | 'revision_requested';
        version: number;
        display_order: number;
        scoring_alignment?: ScoringAlignmentItem[];
    };
    liveContent?: string;
    onApprove: (id: string) => void;
    onEdit: (id: string) => void;
    onRegenerate: (id: string) => void;
    retryable?: boolean;
    onRetry?: (id: string) => void;
}

export default function SectionCard({ section, liveContent, onApprove, onEdit, onRegenerate, retryable, onRetry }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [revisionNote, setRevisionNote] = useState("");
    const streamRef = useRef<HTMLDivElement | null>(null);

    const cleanHtmlOutput = (html: string) => {
        const cleaned = html
            .replace(/```(?:html)?\n?/gi, '')
            .replace(/```/g, '')
            .replace(/\[FIX-[0-9]{2}\]/g, '')
            .replace(/<\/??pre>/gi, '')
            .trim();
        return DOMPurify.sanitize(parseRIPStatus(cleaned));
    };

    const isGenerating = section.status === 'generating';
    const isAwaiting = section.status === 'awaiting_approval';
    const isApproved = section.status === 'approved';
    const isRevision = section.status === 'revision_requested';
    const hasLiveStream = isGenerating && !!liveContent;

    useEffect(() => {
        if (hasLiveStream && streamRef.current) {
            streamRef.current.scrollTop = streamRef.current.scrollHeight;
        }
    }, [liveContent, hasLiveStream]);

    return (
        <div id={`section-${section.id}`} className="p-8 bg-white rounded-[24px] border border-[#D6E6F5] shadow-[0_8px_24px_rgba(47,128,237,0.08)] space-y-6 relative overflow-hidden group z-10 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(47,128,237,0.12)]">
            {/* Background Glow for Active/Generating */}
            {isGenerating && (
                <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />
            )}

            {/* Header */}
            <div className="flex items-center justify-between relative z-20">
                <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-lg bg-bg-tertiary border border-border flex items-center justify-center font-bold text-sm text-primary">
                        {section.display_order + 1}
                    </div>
                    <h3 className="text-xl font-bold">{section.section_title_bs}</h3>
                </div>
                <div className="flex items-center gap-2">
                    {isApproved && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                            <Check className="h-3 w-3" /> ODOBRENO
                        </div>
                    )}
                    {isAwaiting && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold border border-amber-500/20">
                            <Sparkles className="h-3 w-3" /> ČEKA ODOBRENJE
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="prose prose-invert max-w-none relative z-10">
                {isGenerating && hasLiveStream ? (
                    <div ref={streamRef} className="space-y-4 overflow-hidden">
                        <div className="text-text-primary leading-relaxed whitespace-pre-wrap break-words">
                            {cleanHtmlOutput(liveContent || '')}
                        </div>
                        <div className="mt-3 text-sm text-text-dim flex items-center gap-2">
                            <span className="inline-block h-2 w-2 rounded-full bg-brand animate-pulse" />
                            Generišem sadržaj uživo…
                        </div>
                    </div>
                ) : isGenerating ? (
                    <div className="space-y-4">
                        <div className="h-4 bg-slate-700/50 rounded-full w-3/4 animate-pulse" />
                        <div className="h-4 bg-slate-700/50 rounded-full w-full animate-pulse" />
                        <div className="h-4 bg-slate-700/50 rounded-full w-5/6 animate-pulse" />
                        <div className="flex items-center gap-2 text-primary text-sm font-medium animate-pulse mt-4">
                            <Loader2 className="h-4 w-4 animate-spin" /> Generišem sadržaj pomoću APA sistema...
                        </div>
                        {retryable && onRetry ? (
                            <div className="pt-3">
                                <Button size="sm" variant="outline" onClick={() => onRetry(section.id)}>
                                    Pokušaj ponovo
                                </Button>
                            </div>
                        ) : null}
                    </div>
                ) : section.content_html ? (
                    <div
                        className="text-text-primary leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: cleanHtmlOutput(section.content_html) }}
                    />
                ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center opacity-50">
                        <Sparkles className="h-12 w-12 mb-4 text-muted-foreground" />
                        <p className="text-sm">Nema generisanog sadržaja.</p>
                        <Button variant="outline" className="mt-4" onClick={() => onRegenerate(section.id)}>
                            Generiši sekciju
                        </Button>
                    </div>
                )}
            </div>

            {/* Scoring Alignment Badges */}
            {section.scoring_alignment?.length ? (
                <div className="flex flex-wrap gap-2 pt-4">
                    {section.scoring_alignment.map((item, index) => (
                        <span key={index} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11px] font-semibold bg-bg-tertiary/70 text-text-primary">
                            <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                            {item.label}{item.score ? ` • ${item.score}` : ''}
                        </span>
                    ))}
                </div>
            ) : null}

            {/* Disclaimer Banner - Mandatory for Awaiting/Revision */}
            {(isAwaiting || isRevision) && (
                <DisclaimerBanner
                    onApprove={() => onApprove(section.id)}
                    onEdit={() => onEdit(section.id)}
                    onRewrite={() => onRegenerate(section.id)}
                    onAddInfo={() => onEdit(section.id)}
                    isDisabled={isGenerating}
                />
            )}

            {/* Action Bar for Approved */}
            {isApproved && (
                <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" onClick={() => onEdit(section.id)}>
                        <Edit3 className="h-3.5 w-3.5" /> Izmijeni
                    </Button>
                </div>
            )}
        </div>
    );
}
