import { Activity, Building2, Gauge, LayoutGrid, LogOut, Plane, Users } from "lucide-react";
import Link from "next/link";
import { signOutAction } from "@/app/actions";

type AdminIdentity = { userId: string; displayName: string; email: string };

export function PlatformAdminShell({ children, admin }: { children: React.ReactNode; admin: AdminIdentity }) {
  const initials = admin.displayName.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
  return (
    <div className="platform-frame">
      <aside className="platform-sidebar">
        <Link href="/admin" className="platform-brand"><span><Plane size={20} /></span><div><strong>AlphaTravel</strong><small>Platform console</small></div></Link>
        <nav aria-label="Navigazione piattaforma">
          <p>Console</p>
          <a href="#overview"><LayoutGrid size={17} /> Panoramica</a>
          <a href="#analytics"><Gauge size={17} /> Analitiche</a>
          <a href="#offices"><Building2 size={17} /> Uffici clienti</a>
          <a href="#users"><Users size={17} /> Utenti e accessi</a>
          <a href="#activity"><Activity size={17} /> Attività</a>
        </nav>
        <div className="platform-sidebar-spacer" />
        <Link className="platform-workspace-link" href="/dashboard">Apri workspace agenzia</Link>
        <div className="platform-admin-profile">
          <span>{initials}</span>
          <div><strong>{admin.displayName}</strong><small>Super amministratore</small></div>
          <form action={signOutAction}><button type="submit" aria-label="Esci"><LogOut size={16} /></button></form>
        </div>
      </aside>
      <main id="overview" className="platform-main">{children}</main>
    </div>
  );
}
