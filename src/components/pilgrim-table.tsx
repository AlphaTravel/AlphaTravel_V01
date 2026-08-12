"use client";

import { AlertTriangle, ChevronRight, Filter, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Pilgrim } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

export function PilgrimTable({ data, initialQuery = "", canViewPayments = false }: { data: Pilgrim[]; initialQuery?: string; canViewPayments?: boolean }) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState("Tutti");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("it");
    return data.filter((pilgrim) => {
      const matchesQuery =
        !normalized ||
        [pilgrim.name, pilgrim.email, pilgrim.phone, pilgrim.group, pilgrim.tripName]
          .join(" ")
          .toLocaleLowerCase("it")
          .includes(normalized);
      const matchesStatus = status === "Tutti" || pilgrim.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [data, query, status]);

  return (
    <section className="table-card">
      <div className="table-toolbar">
        <label className="table-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca per nome, gruppo, viaggio…"
            aria-label="Cerca pellegrini"
          />
        </label>
        <div className="toolbar-actions">
          <label className="select-control">
            <Filter size={15} />
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtra per stato">
              <option>Tutti</option>
              <option>Pronto</option>
              <option>In attesa</option>
              <option>Da organizzare</option>
              <option>Da completare</option>
              <option>Non iscritto</option>
              <option>Annullato</option>
            </select>
          </label>
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Pellegrino</th>
              <th>Viaggio e gruppo</th>
              <th>Camera e posto</th>
              {canViewPayments ? <th>Pagamento</th> : null}
              <th>Stato</th>
              <th><span className="sr-only">Apri</span></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((pilgrim) => (
              <tr key={pilgrim.id}>
                <td>
                  <div className="person-cell">
                    <span className="table-avatar">{pilgrim.initials}</span>
                    <span><strong>{pilgrim.name}</strong><small>{pilgrim.email}</small></span>
                  </div>
                </td>
                <td><strong>{pilgrim.tripName}</strong><small>{pilgrim.group}</small></td>
                <td>
                  <strong>{pilgrim.room ?? (pilgrim.roomRequired ? "Camera da assegnare" : "Camera non prevista")}</strong>
                  <small>{pilgrim.coachSeat ?? (pilgrim.seatRequired ? "Posto da assegnare" : "Posto non previsto")}</small>
                </td>
                {canViewPayments ? <td>
                  <strong>{formatCurrency(pilgrim.paid)} / {formatCurrency(pilgrim.total)}</strong>
                  <small><StatusBadge label={pilgrim.paymentStatus} /></small>
                </td> : null}
                <td>
                  <StatusBadge label={pilgrim.status} />
                  {(canViewPayments ? pilgrim.missingItems : pilgrim.missingItems.filter((item) => !item.startsWith("Saldo"))).length ? (
                    <small className="warning-copy" title={(canViewPayments ? pilgrim.missingItems : pilgrim.missingItems.filter((item) => !item.startsWith("Saldo"))).join(", ")}><AlertTriangle size={12} /> {(canViewPayments ? pilgrim.missingItems : pilgrim.missingItems.filter((item) => !item.startsWith("Saldo"))).join(" · ")}</small>
                  ) : null}
                </td>
                <td><Link className="row-link" href={`/pellegrini/${pilgrim.id}`} aria-label={`Apri ${pilgrim.name}`}><ChevronRight size={18} /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>{filtered.length} di {data.length} pellegrini</span>
        <span>Dati visibili secondo il ruolo e l’organizzazione correnti.</span>
      </div>
    </section>
  );
}
