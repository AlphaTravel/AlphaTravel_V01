import { AlertCircle, BedDouble, BusFront, FileWarning, Salad, WalletCards } from "lucide-react";
import Link from "next/link";

export type OperationalAlert = {
  kind: "documents" | "balances" | "rooms" | "seats" | "menus";
  tone: "rose" | "amber" | "violet" | "blue" | "green";
  count: number;
  title: string;
  detail: string;
  href: string;
};

const icons = {
  documents: FileWarning,
  balances: WalletCards,
  rooms: BedDouble,
  seats: BusFront,
  menus: Salad,
};

export function AlertList({ alerts }: { alerts: OperationalAlert[] }) {
  return (
    <div className="alert-list">
      {alerts.length ? alerts.map(({ kind, tone, count, title, detail, href }) => {
        const Icon = icons[kind];
        return (
        <Link href={href} className="alert-row" key={kind}>
          <span className={`alert-icon alert-icon-${tone}`}><Icon size={17} /></span>
          <span className="alert-copy"><strong>{title}</strong><small>{detail}</small></span>
          <span className="alert-count">{count}</span>
        </Link>
        );
      }) : <div className="empty-inline">Nessuna anomalia rilevata sui dati correnti.</div>}
      <div className="alert-summary"><AlertCircle size={15} /> Controllo calcolato sui dati aggiornati</div>
    </div>
  );
}
