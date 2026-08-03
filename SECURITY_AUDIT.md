# Audit di sicurezza AlphaTravel

Data: 3 agosto 2026
Ambito: applicazione Next.js, Supabase Auth/PostgreSQL/Storage/Edge Functions, configurazione HTTP e dipendenze.

## Esito

Non esiste un software garantibile “sicuro al 100%”. L’audit non ha rilevato vulnerabilità note nelle dipendenze o errori di schema PostgreSQL, e i problemi ad alta priorità individuati durante la revisione sono stati corretti. Prima di inserire dati reali resta necessario un penetration test indipendente e un controllo GDPR organizzativo.

## Correzioni applicate

- Accesso **fail closed**: un utente autenticato ma senza membership attiva non entra nel workspace.
- Eliminato il fallback ai dati demo quando una query di produzione fallisce.
- Area `/admin` autorizzata server-side per ruolo, non soltanto nascosta nell’interfaccia.
- MFA TOTP AAL2 obbligatoria prima di caricare utenti, analitiche, audit o azioni amministrative.
- Provider email attivo per l’accesso, ma signup pubblico globalmente disabilitato; account solo su invito con password scelta dall’utente.
- Password: minimo 12 caratteri e complessità; OTP/inviti con scadenza 15 minuti.
- Rate limit Auth irrigidito; inviti amministrativi limitati anche dalla Edge Function.
- Scritture dirette sui ruoli revocate; modifica consentita solo da RPC vincolata a admin + MFA.
- Impossibile eliminare, sospendere o declassare l’ultimo amministratore attivo.
- Chiave privilegiata confinata nell’infrastruttura Supabase; non presente in Vercel, browser o repository.
- CSP per-request con nonce e `strict-dynamic`; script inline non autorizzati bloccati.
- Header HSTS, anti-framing, anti-MIME sniffing, Permissions Policy e `Cache-Control: private, no-store` verificati.
- RLS su tutte le tabelle esposte; dati sanitari e documenti sensibili separati e più restrittivi.
- Bucket documenti privato, limiti MIME/dimensione e autorizzazione per percorso/organizzazione.
- Audit delle modifiche sensibili senza memorizzare il contenuto modificato.

## Verifiche eseguite

- 5 migration remote sincronizzate con il repository.
- `supabase db lint --linked --level warning`: nessun errore.
- Edge Function senza autenticazione: risposta `401`.
- `pnpm audit --prod`: nessuna vulnerabilità nota.
- ESLint: zero warning/errori.
- TypeScript: zero errori.
- 30 test automatici superati.
- Build Next.js di produzione completata.
- Test locale della CSP: nonce della risposta presente sugli script Next.js e cache disabilitata.

## Rischi residui e attività obbligatorie

1. Effettuare un penetration test indipendente prima dell’uso con dati reali e ripeterlo dopo modifiche rilevanti.
2. Sul piano Supabase Free non sono disponibili timeout sessione forzati configurabili e Point-in-Time Recovery: per produzione è raccomandato il piano che li include.
3. Configurare SMTP aziendale, notifiche di sicurezza e monitoraggio degli errori. Il provider predefinito ha limiti bassi e i suoi link monouso possono essere consumati dai controlli antispam; usare un template con conferma esplicita o OTP.
4. Valutare CAPTCHA/Turnstile sul login dopo aver creato una chiave dedicata.
5. Configurare backup, prove periodiche di ripristino, retention degli audit e procedura di risposta agli incidenti.
6. Completare DPIA, informative, consensi, nomine e tempi di conservazione con un consulente GDPR.
7. Abilitare MFA anche ai ruoli che accedono a dati sanitari e documenti riservati.
8. Aggiungere il dominio definitivo alle allowlist Supabase e aggiornare `NEXT_PUBLIC_SITE_URL` quando il dominio cambia.
