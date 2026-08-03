import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  trend,
  tone = "blue",
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  trend?: "up" | "down";
  tone?: "blue" | "green" | "amber" | "violet";
}) {
  return (
    <article className="stat-card">
      <div className={cn("stat-icon", `stat-icon-${tone}`)}>
        <Icon size={19} strokeWidth={2} />
      </div>
      <div className="stat-copy">
        <p>{label}</p>
        <strong>{value}</strong>
        <span className={cn(trend === "down" && "text-rose-600")}> 
          {trend === "up" ? <ArrowUpRight size={13} /> : null}
          {trend === "down" ? <ArrowDownRight size={13} /> : null}
          {detail}
        </span>
      </div>
    </article>
  );
}
