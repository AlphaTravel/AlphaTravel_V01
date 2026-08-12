import { cn } from "@/lib/utils";

const toneByLabel: Record<string, string> = {
  Confermato: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  Pronto: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  Aperto: "bg-blue-50 text-blue-700 ring-blue-600/15",
  Pagato: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  Parziale: "bg-amber-50 text-amber-700 ring-amber-600/15",
  "In attesa": "bg-amber-50 text-amber-700 ring-amber-600/15",
  "Da completare": "bg-rose-50 text-rose-700 ring-rose-600/15",
  "Da organizzare": "bg-violet-50 text-violet-700 ring-violet-600/15",
  "Non iscritto": "bg-slate-100 text-slate-700 ring-slate-500/15",
  Annullato: "bg-slate-100 text-slate-600 ring-slate-500/15",
  "Da pagare": "bg-slate-100 text-slate-700 ring-slate-500/15",
  Scaduto: "bg-rose-50 text-rose-700 ring-rose-600/15",
  Bozza: "bg-slate-100 text-slate-700 ring-slate-500/15",
  Completo: "bg-violet-50 text-violet-700 ring-violet-600/15",
  Concluso: "bg-slate-100 text-slate-600 ring-slate-500/15",
};

export function StatusBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset",
        toneByLabel[label] ?? "bg-slate-100 text-slate-700 ring-slate-500/15",
        className,
      )}
    >
      {label}
    </span>
  );
}
