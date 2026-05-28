import { FileText, CheckCircle, Loader2, Clock, AlertTriangle, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface Section {
    id: string;
    section_key: string;
    section_title_bs: string;
    status: 'pending' | 'generating' | 'awaiting_approval' | 'approved' | 'revision_requested';
}

interface Props {
    sections: Section[];
    activeSectionId: string | null;
    onSectionClick: (id: string) => void;
    approvedCount: number;
    totalCount: number;
}

export function SectionNavigator({
    sections,
    activeSectionId,
    onSectionClick,
    approvedCount,
    totalCount
}: Props) {
    const progress = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0;

    const getStatusIcon = (status: Section['status']) => {
        switch (status) {
            case 'approved': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
            case 'generating': return <Loader2 className="h-4 w-4 text-brand animate-spin" />;
            case 'awaiting_approval': return <Clock className="h-4 w-4 text-warning" />;
            case 'revision_requested': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
            default: return <div className="h-4 w-4 rounded-full border-2 border-bg-tertiary" />;
        }
    };

    return (
        <div style={{ perspective: 1000 }} className="w-[280px] h-full flex flex-col border-r border-[#D6E6F5] bg-[#EAF4FF]/60 backdrop-blur-[12px] shadow-[0_12px_32px_rgba(47,128,237,0.08)] sticky top-0">
            <div className="p-6 border-b border-[#D6E6F5] bg-white/90">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4">Struktura projekta</h3>
                <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-text-dim">{approvedCount}/{totalCount} Odobreno</span>
                        <span className="text-brand">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5 bg-bg-tertiary" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 py-4 space-y-1 custom-scrollbar">
                {sections.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => onSectionClick(section.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-[22px] transition-all duration-200 group border ${activeSectionId === section.id
                                ? "bg-brand/10 text-brand border-brand/20 shadow-[0_12px_28px_rgba(47,128,237,0.12)]"
                                : "text-text-muted hover:bg-[#F4F9FF] hover:text-foreground border-transparent"
                            }`}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <FileText className={`h-4 w-4 shrink-0 ${activeSectionId === section.id ? "text-brand" : "text-text-dim group-hover:text-text-muted"}`} />
                            <span className="text-[13px] font-medium truncate leading-tight">{section.section_title_bs}</span>
                            {section.status === 'revision_requested' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300">
                                    <AlertTriangle className="h-3 w-3" /> Revizija
                                </span>
                            )}
                        </div>
                        {getStatusIcon(section.status)}
                    </button>
                ))}
            </div>

            <div className="p-4 border-t border-border bg-bg-tertiary/10">
                <Button variant="outline" className="w-full gap-2 border-dashed border-2 bg-transparent text-xs font-bold border-border hover:border-brand hover:bg-brand/5">
                    <Plus className="h-3 w-3" /> Dodaj sekciju
                </Button>
            </div>
        </div>
    );
}
