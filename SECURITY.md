# Sicurezza di AlphaTravel

Nessun software può offrire una garanzia assoluta di sicurezza. AlphaTravel è stato però progettato con controlli sovrapposti e con il principio del minimo privilegio.

## Controlli presenti

- isolamento multi-tenant tramite `organization_id` e Row Level Security su tutte le tabelle esposte;
- ruoli `admin`, `manager`, `operator`, `guide`, `accountant` e `viewer` applicati direttamente in PostgreSQL;
- dati sanitari separati dall’anagrafica e non accessibili a contabilità o lettori;
- documenti in bucket Supabase privato, con formato, dimensione e percorso controllati;
- audit senza copie del contenuto sensibile;
- cookie di sessione gestiti dal server, route protette, risposte non memorizzabili e CSP con nonce univoco per richiesta;
- area `/admin` separata dal workspace e accessibile soltanto agli utenti presenti nella tabella protetta `platform_admins`;
- creazione e modifica di uffici, account e password eseguite in una Edge Function Supabase con JWT verificato, controllo super-admin, origine consentita e comandi PostgreSQL transazionali con rollback delle operazioni incomplete;
- login tramite username risolto esclusivamente lato server, con email interna non restituita al browser, risposte anti-enumerazione e rate limit dedicato;
- nessuna chiave segreta o `service_role` presente nell’applicazione Vercel o nel browser;
- protezione database che impedisce di sospendere o declassare l’ultimo amministratore attivo;
- nessun dato completo di carta o CVV memorizzato.
- avvio fail-closed: senza configurazione Supabase non viene creato alcun utente o dato demo;
- controlli transazionali nel database per capienza viaggi/camere, coerenza tra viaggio, gruppo, camera e posto, e limiti contabili su incassi e rimborsi;
- upload documenti con firma binaria verificata, nome ripulito, limite 4 MB, bucket privato e link di download firmati per 60 secondi.

## Prima dell’uso reale

1. Far verificare privacy, informative, consensi, tempi di conservazione e nomine GDPR da un consulente competente.
2. Valutare in futuro MFA o passkey come opzione per gli utenti che trattano dati sanitari, se compatibile con il flusso operativo richiesto.
3. Mantenere disabilitate le registrazioni pubbliche in Supabase Auth; gli account devono essere creati dal controllo piattaforma.
4. Configurare un SMTP aziendale e inviti con conferma esplicita o OTP, così i controlli antispam non possono consumare i link monouso.
5. Configurare backup, Point-in-Time Recovery e avvisi di sicurezza del progetto Supabase.
6. Impostare log retention e un processo di revoca immediata degli account.
7. Effettuare vulnerability scan, dependency review e penetration test prima di trattare dati reali.

L’audit tecnico corrente e i rischi residui sono documentati in [SECURITY_AUDIT.md](./SECURITY_AUDIT.md).

## Segnalazioni

Non inserire vulnerabilità in issue pubbliche. Usa un canale privato dell’organizzazione e includi impatto, riproduzione e versione interessata.
