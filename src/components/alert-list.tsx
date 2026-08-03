import { AlertCircle, BedDouble, BusFront, FileWarning, Salad, WalletCards } from "lucide-react";
import Link from "next/link";

const alerts = [
  { icon: FileWarning, tone: "rose", count: 14, title: "Documenti mancanti", detail: "3 documenti scadono prima della partenza", href: "/pellegrini" },
  { icon: WalletCards, tone: "amber", count: 23, title: "Saldi da incassare", detail: "8 pagamenti risultano già scaduti", href: "/pagamenti" },
  { icon: BedDouble, tone: "violet", count: 6, title: "Persone senza camera", detail: "Hotel Alba · Lourdes", href: "/viaggi/lourdes-2026" },
  { icon: BusFront, tone: "blue", count: 3, title: "Persone senza posto", detail: "Pullman 1 e 3", href: "/viaggi/lourdes-2026" },
  { icon: Salad, tone: "green", count: 11, title: "Menu speciali", detail: "Da confermare con hotel e ristoranti", href: "/operazioni" },
];

export function AlertList() {
  return (
    <div className="alert-list">
      {alerts.map(({ icon: Icon, tone, count, title, detail, href }) => (
        <Link href={href} className="alert-row" key={title}>
          <span className={`alert-icon alert-icon-${tone}`}><Icon size={17} /></span>
          <span className="alert-copy"><strong>{title}</strong><small>{detail}</small></span>
          <span className="alert-count">{count}</span>
        </Link>
      ))}
      <div className="alert-summary"><AlertCircle size={15} /> Ultimo controllo automatico: 2 minuti fa</div>
    </div>
  );
}
