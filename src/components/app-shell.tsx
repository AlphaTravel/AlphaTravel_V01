"use client";

import {
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { signOutAction } from "@/app/actions";
import { cn } from "@/lib/utils";
import type { AppRole, CurrentMember } from "@/lib/types";

type NavigationItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: readonly AppRole[];
};

const navigation: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pellegrini", label: "Pellegrini", icon: Users },
  { href: "/viaggi", label: "Viaggi", icon: Route },
  { href: "/pagamenti", label: "Pagamenti", icon: CreditCard, roles: ["admin", "manager", "operator", "accountant"] },
];

export function AppShell({ children, user }: { children: ReactNode; user: CurrentMember }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-frame">
      {open ? <button className="sidebar-scrim" type="button" aria-label="Chiudi menu" onClick={() => setOpen(false)} /> : null}
      <aside className={cn("sidebar", open && "sidebar-open")}>
        <div className="brand-row">
          <Link className="brand" href="/dashboard" onClick={() => setOpen(false)}>
            <span className="brand-mark">A</span>
            <span>
              <strong>AlphaTravel</strong>
              <small>Group travel OS</small>
            </span>
          </Link>
          <button className="mobile-close" type="button" onClick={() => setOpen(false)} aria-label="Chiudi menu">
            <X size={19} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Navigazione principale">
          <p className="nav-label">Workspace</p>
          {navigation.filter((item) => !item.roles || item.roles.includes(user.roleKey)).map(({ href, label, icon: Icon }) => {
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
          {user.isPlatformAdmin ? (
            <Link
              href="/admin"
              className={cn("nav-link", pathname.startsWith("/admin") && "nav-link-active")}
              onClick={() => setOpen(false)}
            >
              <ShieldCheck size={18} strokeWidth={2} />
              <span>Piattaforma</span>
            </Link>
          ) : null}
        </nav>

        <div className="sidebar-spacer" />
        <nav className="sidebar-nav sidebar-nav-bottom">
          <Link className={cn("nav-link", pathname.startsWith("/impostazioni") && "nav-link-active")} href="/impostazioni">
            <Settings size={18} /> Impostazioni
          </Link>
        </nav>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="mobile-menu" type="button" onClick={() => setOpen(true)} aria-label="Apri menu">
            <Menu size={21} />
          </button>
          <form className="global-search" action="/pellegrini" method="get">
            <Search size={17} />
            <input name="q" aria-label="Cerca pellegrino" placeholder="Cerca pellegrino per nome, viaggio o gruppo…" />
          </form>
          <div className="topbar-actions">
            <form action={signOutAction}>
            <button className="profile-button" title="Esci da AlphaTravel" type="submit">
              <span className="avatar">{user.initials}</span>
              <span className="profile-copy"><strong>{user.name}</strong><small>{user.role}</small></span>
              <LogOut size={17} aria-hidden="true" />
            </button>
            </form>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
