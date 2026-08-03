# AlphaTravel

Gestionale React per pellegrinaggi e viaggi di gruppo. La base include dashboard, anagrafiche, esigenze riservate, gruppi, viaggi, camere, posti pullman, programma, camminate, pagamenti, documenti, ruoli e audit.

## Stack

- Next.js 16 + React 19 + TypeScript
- Supabase Auth, PostgreSQL, Row Level Security e Storage privato
- Vercel per hosting e deploy
- Vitest e Testing Library

## Avvio locale

Requisiti: Node.js 20.9 o superiore e pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Senza variabili Supabase l’app si apre in modalità demo e non salva dati.

## Configurazione Supabase

Il progetto remoto AlphaTravel è gestito dalla CLI ufficiale. Per un nuovo ambiente:

```bash
pnpm supabase login
pnpm supabase link --project-ref PROJECT_REF
pnpm supabase db push --dry-run
pnpm supabase db push
pnpm supabase config push
pnpm supabase secrets set APP_SITE_URL=https://example.com
pnpm supabase functions deploy admin-users --use-api
```

Le migration creano schema, RLS, bucket privato, comandi transazionali e controllo amministrativo. La configurazione Auth chiude il signup pubblico, richiede password forti e abilita TOTP. Il primo amministratore va invitato in Supabase Auth e collegato all’organizzazione; tutti gli utenti successivi vengono invitati dall’area **Amministrazione**.

Le variabili pubbliche sono:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SITE_URL` è consigliata e diventa necessaria quando si cambia dominio. Non aggiungere mai una chiave segreta o `service_role` a Vercel: l’operazione privilegiata di invito vive esclusivamente in una Edge Function Supabase autenticata e protetta da MFA.

## Deploy Vercel

1. Importa il repository `AlphaTravel/AlphaTravel_V01` in Vercel.
2. Framework preset: **Next.js**. Root directory: lascia vuota.
3. Aggiungi le tre variabili sopra per Production, Preview e Development.
4. In produzione imposta `NEXT_PUBLIC_SITE_URL` al dominio Vercel o al dominio personalizzato, senza slash finale.
5. In Supabase, **Authentication > URL Configuration**, imposta lo stesso dominio come Site URL e aggiungi `http://localhost:3000/**` solo tra i redirect di sviluppo.
6. Avvia il deploy. Build command e output vengono rilevati automaticamente.

## Verifiche

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
```

La cartella `src/lib/demo-data.ts` contiene esclusivamente dati fittizi e viene usata solo quando Supabase non è configurato. Con Supabase attivo, elenchi e creazione di pellegrini e viaggi lavorano sul database reale. Consulta anche [SECURITY.md](./SECURITY.md).
