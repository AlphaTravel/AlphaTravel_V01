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

1. Crea un progetto Supabase in regione europea.
2. In **SQL Editor**, esegui nell’ordine:
   - `supabase/migrations/202608030001_initial_schema.sql`
   - `supabase/migrations/202608030002_private_documents.sql`
   - `supabase/migrations/202608030003_transactional_commands.sql`
   - `supabase/migrations/202608030004_explicit_api_grants.sql`
3. In **Authentication > Providers > Email**, disabilita la registrazione pubblica e usa solo inviti amministrativi.
4. Crea il primo utente da **Authentication > Users**.
5. Recupera l’UUID di quell’utente e usa le due istruzioni commentate in `supabase/seed.sql` per creare organizzazione e amministratore.
6. Da **Project Settings > API** copia Project URL e Publishable key.

Le sole variabili richieste sono:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Non aggiungere la `service_role` a Vercel: questa app non ne ha bisogno.

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
