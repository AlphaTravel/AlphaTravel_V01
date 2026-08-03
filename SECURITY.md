# Sicurezza di AlphaTravel

Nessun software può offrire una garanzia assoluta di sicurezza. AlphaTravel è stato però progettato con controlli sovrapposti e con il principio del minimo privilegio.

## Controlli presenti

- isolamento multi-tenant tramite `organization_id` e Row Level Security su tutte le tabelle esposte;
- ruoli `admin`, `manager`, `operator`, `guide`, `accountant` e `viewer` applicati direttamente in PostgreSQL;
- dati sanitari separati dall’anagrafica e non accessibili a contabilità o lettori;
- documenti in bucket Supabase privato, con formato, dimensione e percorso controllati;
- audit senza copie del contenuto sensibile;
- cookie di sessione gestiti dal server, route protette e header HTTP difensivi;
- nessuna chiave `service_role` richiesta dall’applicazione web;
- nessun dato completo di carta o CVV memorizzato.

## Prima dell’uso reale

1. Far verificare privacy, informative, consensi, tempi di conservazione e nomine GDPR da un consulente competente.
2. Abilitare MFA per tutti gli utenti e renderlo obbligatorio almeno per amministratori e responsabili.
3. Disabilitare le registrazioni pubbliche in Supabase Auth; gli utenti devono essere invitati dall’amministratore.
4. Configurare backup, Point-in-Time Recovery e avvisi di sicurezza del progetto Supabase.
5. Impostare log retention e un processo di revoca immediata degli account.
6. Effettuare vulnerability scan, dependency review e penetration test prima di trattare dati reali.

## Segnalazioni

Non inserire vulnerabilità in issue pubbliche. Usa un canale privato dell’organizzazione e includi impatto, riproduzione e versione interessata.
