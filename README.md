# AlphaTravel

Gestionale React per pellegrinaggi e viaggi di gruppo. La base include dashboard, anagrafiche, esigenze riservate, gruppi, viaggi, camere, posti pullman, programma, camminate, pagamenti, documenti, ruoli e audit.

L’interfaccia espone solo le aree principali nel menu; camere, mezzi, gruppi e programma restano raccolti dentro il singolo viaggio. Le impostazioni dell’ufficio contengono soltanto nome, fuso orario e valuta, mentre la console proprietario è concentrata su uffici e credenziali.

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

Senza variabili Supabase l’app resta bloccata in modo sicuro: non esiste una modalità demo con privilegi impliciti.

## Configurazione Supabase

Il progetto remoto AlphaTravel è gestito dalla CLI ufficiale. Per un nuovo ambiente:

```bash
pnpm supabase login
pnpm supabase link --project-ref PROJECT_REF
pnpm supabase db push --dry-run
pnpm supabase db push
pnpm supabase config push
pnpm supabase secrets set APP_SITE_URL=https://example.com LOGIN_RATE_LIMIT_SECRET=UNA_STRINGA_CASUALE_DI_ALMENO_32_CARATTERI
pnpm supabase functions deploy admin-users --use-api
pnpm supabase functions deploy username-login --no-verify-jwt --use-api
```

Le migration creano schema, RLS, bucket privato, comandi transazionali e un controllo amministrativo separato dal workspace degli uffici. Gli utenti accedono con uno username globale; l’email Supabase resta un’identità tecnica interna, generata automaticamente e mai richiesta o esposta dal servizio di login. Il signup pubblico è bloccato. Da `/admin` il proprietario crea e modifica gli uffici, assegna username, ruoli e password, sospende o riattiva tutti gli accessi e può eliminare definitivamente un ufficio con conferma esplicita. L’accesso usa soltanto username e password, senza provider social o passaggio TOTP obbligatorio.

La cancellazione di un ufficio è intenzionalmente distruttiva: dopo la conferma con il nome esatto vengono rimossi documenti privati, account Auth e tutti i dati del tenant. L’ufficio interno AlphaTravel è protetto e non può essere eliminato dalla console.

Il servizio `username-login` è pubblico perché precede l’autenticazione, ma accetta soltanto richieste provenienti dal dominio configurato, non rivela se un account esiste e applica un limite di cinque tentativi ogni 15 minuti per coppia username/origine di rete. `LOGIN_RATE_LIMIT_SECRET` deve essere generato casualmente, conservato soltanto nei secret Supabase e mai inserito in Git o Vercel.

Per gli inviti di produzione configura un SMTP aziendale e un template che richieda una conferma esplicita o un OTP. I link monouso del provider email predefinito possono essere aperti anticipatamente dai sistemi antispam del destinatario.

Le variabili pubbliche sono:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SITE_URL` è consigliata e diventa necessaria quando si cambia dominio. Non aggiungere mai una chiave segreta o `service_role` a Vercel: le operazioni privilegiate vivono esclusivamente in una Edge Function Supabase autenticata, limitata al super amministratore e con controllo dell’origine.

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

Tutte le schermate operative leggono e scrivono il database reale: pellegrini, viaggi, gruppi, camere, mezzi, posti, programma, pagamenti, impostazioni e documenti privati. Consulta anche [SECURITY.md](./SECURITY.md).
