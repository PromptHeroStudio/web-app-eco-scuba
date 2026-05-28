import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  variant?: "brand" | "warning" | "success" | "default";
}

const variantConfig: Record<string, { border: string; iconBg: string; iconColor: string; shadow: string }> = {
  brand: {
    border: "border-brand/20 hover:border-brand/40",
    iconBg: "bg-brand/10",
    iconColor: "text-brand",
    shadow: "shadow-[0_8px_24px_rgba(47,128,237,0.08)]",
  },
  warning: {
    border: "border-warning/20 hover:border-warning/40",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    shadow: "shadow-[0_8px_24px_rgba(47,128,237,0.08)]",
  },
  success: {
    border: "border-success/20 hover:border-success/40",
    iconBg: "bg-success/10",
    iconColor: "text-success",
    shadow: "shadow-[0_8px_24px_rgba(47,128,237,0.08)]",
  },
  default: {
    border: "border-[#D6E6F5] hover:border-brand/20",
    iconBg: "bg-[#F4F9FF]",
    iconColor: "text-text-muted",
    shadow: "shadow-[0_8px_24px_rgba(47,128,237,0.08)]",
  },
};

export default function StatCard({ icon: Icon, label, value, trend, variant = "default" }: StatCardProps) {
  const config = variantConfig[variant as keyof typeof variantConfig] || variantConfig.default;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={cn(
        "rounded-[24px] border bg-white p-6 transition-all duration-300 shadow-[0_8px_24px_rgba(47,128,237,0.08)]",
        config.border,
        config.shadow
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", config.iconBg, config.iconColor)}>
          <Icon className="h-6 w-6" />
        </div>
        {trend && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 text-[10px] font-bold text-success uppercase tracking-widest">
            {trend}
          </div>
        )}
      </div>
      <div className="mt-5">
        <p className="text-3xl font-display font-bold text-text-primary tracking-tight">{value}</p>
        <p className="text-xs font-bold text-text-dim uppercase tracking-widest mt-1.5">{label}</p>
      </div>
    </motion.div>
  );
}
