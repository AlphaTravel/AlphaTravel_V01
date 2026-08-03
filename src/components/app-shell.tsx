"use client";

import {
  Bell,
  BusFront,
  ChevronDown,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  Menu,
  Route,
  Search,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { signOutAction } from "@/app/actions";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pellegrini", label: "Pellegrini", icon: Users },
  { href: "/viaggi", label: "Viaggi", icon: Route },
  { href: "/operazioni", label: "Operazioni", icon: BusFront },
  { href: "/pagamenti", label: "Pagamenti", icon: CreditCard },
];

export function AppShell({ children, user }: { children: ReactNode; user: { name: string; role: string; initials: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-frame">
      {open ? <button className="sidebar-scrim" aria-label="Chiudi menu" onClick={() => setOpen(false)} /> : null}
      <aside className={cn("sidebar", open && "sidebar-open")}>
        <div className="brand-row">
          <Link className="brand" href="/dashboard" onClick={() => setOpen(false)}>
            <span className="brand-mark">A</span>
            <span>
              <strong>AlphaTravel</strong>
              <small>Group travel OS</small>
            </span>
          </Link>
          <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Chiudi menu">
            <X size={19} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Navigazione principale">
          <p className="nav-label">Workspace</p>
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                href={href}
                key={href}
                className={cn("nav-link", active && "nav-link-active")}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} strokeWidth={2} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />
        <div className="alpha-assistant">
          <span><Sparkles size={16} /> Alpha Assist</span>
          <p>Controlla automaticamente dati mancanti e conflitti organizzativi.</p>
          <Link href="/operazioni">Vedi 12 avvisi</Link>
        </div>
        <nav className="sidebar-nav sidebar-nav-bottom">
          <Link className={cn("nav-link", pathname.startsWith("/impostazioni") && "nav-link-active")} href="/impostazioni">
            <Settings size={18} /> Impostazioni
          </Link>
          <Link className="nav-link" href="/impostazioni#supporto">
            <CircleHelp size={18} /> Supporto
          </Link>
        </nav>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Apri menu">
            <Menu size={21} />
          </button>
          <label className="global-search">
            <Search size={17} />
            <input aria-label="Ricerca globale" placeholder="Cerca pellegrino, viaggio o documento…" />
            <kbd>⌘ K</kbd>
          </label>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifiche">
              <Bell size={19} />
              <span className="notification-dot" />
            </button>
            <form action={signOutAction}>
            <button className="profile-button" title="Esci da AlphaTravel" type="submit">
              <span className="avatar">{user.initials}</span>
              <span className="profile-copy"><strong>{user.name}</strong><small>{user.role}</small></span>
              <ChevronDown size={15} />
            </button>
            </form>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
