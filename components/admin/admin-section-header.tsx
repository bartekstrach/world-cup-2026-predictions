import { cn } from "@/lib/utils";
import type { ComponentType } from "react";

export function AdminSectionHeader({
  title,
  subtitle,
  icon: Icon,
  className,
}: {
  title: string;
  subtitle: string;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 mb-6", className)}>
      {Icon ? <Icon className="w-8 h-8 text-[#10b981]" /> : null}
      <div className="space-y-1">
        <h2 className="text-2xl md:text-3xl font-bold text-[#0a192f]">
          {title}
        </h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}
