# Sicurezza di AlphaTravel

Nessun software può offrire una garanzia assoluta di sicurezza. AlphaTravel è stato però progettato con controlli sovrapposti e con il principio del minimo privilegio.

## Controlli presenti

- isolamento multi-tenant tramite `organization_id` e Row Level Security su tutte le tabelle esposte;
- ruoli `admin`, `manager`, `operator`, `guide`, `accountant` e `viewer` applicati direttamente in PostgreSQL;
- dati sanitari separati dall’anagrafica e non accessibili a contabilità o lettori;
- documenti in bucket Supabase privato, con formato, dimensione e percorso controllati;
- audit senza copie del contenuto sensibile;
- cookie di sessione gestiti dal server, route protette, risposte non memorizzabili e CSP con nonce univoco per richiesta;
- area amministrativa visibile solo al ruolo `admin` e caricata esclusivamente dopo una verifica MFA AAL2;
- inviti eseguiti in una Edge Function Supabase con JWT verificato, controllo del ruolo, MFA, rate limit e rollback in caso di errore;
- nessuna chiave segreta o `service_role` presente nell’applicazione Vercel o nel browser;
- protezione database che impedisce di sospendere o declassare l’ultimo amministratore attivo;
- nessun dato completo di carta o CVV memorizzato.

## Prima dell’uso reale

1. Far verificare privacy, informative, consensi, tempi di conservazione e nomine GDPR da un consulente competente.
2. Estendere l’obbligo MFA a responsabili e operatori che trattano dati sanitari; per gli amministratori è già obbligatorio.
3. Mantenere disabilitate le registrazioni pubbliche in Supabase Auth; gli utenti devono essere invitati dall’amministratore.
4. Configurare backup, Point-in-Time Recovery e avvisi di sicurezza del progetto Supabase.
5. Impostare log retention e un processo di revoca immediata degli account.
6. Effettuare vulnerability scan, dependency review e penetration test prima di trattare dati reali.

L’audit tecnico corrente e i rischi residui sono documentati in [SECURITY_AUDIT.md](./SECURITY_AUDIT.md).

## Segnalazioni

Non inserire vulnerabilità in issue pubbliche. Usa un canale privato dell’organizzazione e includi impatto, riproduzione e versione interessata.
