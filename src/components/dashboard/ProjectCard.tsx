import { motion } from "framer-motion";
import { Calendar, MoreHorizontal, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  title: string;
  donor: string;
  status: string;
  progress: number;
  dueDate: string;
  onClick?: () => void;
}

const statusConfig: Record<string, { label: string; class: string }> = {
  draft: { label: "Nacrt", class: "bg-bg-tertiary text-text-muted" },
  in_progress: { label: "U toku", class: "bg-brand/10 text-brand outline outline-1 outline-brand/20" },
  review: { label: "Na pregledu", class: "bg-warning/10 text-warning outline outline-1 outline-warning/20" },
  completed: { label: "Završeno", class: "bg-success/10 text-success outline outline-1 outline-success/20" },
  archived: { label: "Arhivirano", class: "bg-bg-tertiary/50 text-text-dim" },
};

export default function ProjectCard({ title, donor, status, progress, dueDate, onClick }: ProjectCardProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="group relative rounded-[24px] border border-[#D6E6F5] bg-white p-6 transition-all duration-300 cursor-pointer overflow-hidden shadow-[0_8px_24px_rgba(47,128,237,0.08)]"
    >
      {/* Subtle Gradient Glow */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-brand/5 blur-3xl group-hover:bg-brand/10 transition-colors" />

      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-lg text-text-primary truncate group-hover:text-brand transition-colors leading-snug">
            {title}
          </h3>
          <p className="text-sm text-text-dim mt-1 flex items-center gap-1.5 font-medium">
            <span className="h-1 w-1 rounded-full bg-brand" />
            {donor || 'Bez speciﬁciranog donatora'}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-text-dim hover:bg-bg-tertiary">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-6 relative z-10">
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider", config.class)}>
          {config.label}
        </span>
        {status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
      </div>

      {/* Progress */}
      <div className="mb-4 relative z-10">
        <div className="flex items-center justify-between text-[11px] font-bold mb-2">
          <span className="text-text-dim uppercase tracking-widest">Progress</span>
          <span className="text-brand">{progress}%</span>
        </div>
        <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand rounded-full shadow-[0_0_8px_rgba(14,165,233,0.3)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border/50 relative z-10">
        <div className="flex items-center gap-1.5 text-[11px] text-text-dim font-medium uppercase tracking-tighter">
          <Calendar className="h-3.5 w-3.5 text-brand" />
          <span>Rok: {dueDate}</span>
        </div>
        <div className="text-[10px] font-bold text-brand group-hover:translate-x-1 transition-transform">
          DETALJI →
        </div>
      </div>
    </motion.div>
  );
}
