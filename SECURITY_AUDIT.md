# Audit di sicurezza AlphaTravel

Data: 12 agosto 2026
Ambito: applicazione Next.js, Supabase Auth/PostgreSQL/Storage/Edge Functions, configurazione HTTP e dipendenze.

## Esito

Non esiste un software garantibile “sicuro al 100%”. L’audit non ha rilevato vulnerabilità note nelle dipendenze o errori di schema PostgreSQL, e i problemi ad alta priorità individuati durante la revisione sono stati corretti. Prima di inserire dati reali resta necessario un penetration test indipendente e un controllo GDPR organizzativo.

## Correzioni applicate

- Accesso **fail closed**: un utente autenticato ma senza membership attiva non entra nel workspace.
- Eliminati il fallback e i dati demo: se Supabase non è configurato il workspace resta bloccato.
- Area `/admin` separata dal workspace, autorizzata server-side e database tramite `platform_admins`.
- Rimosso il passaggio TOTP/MFA su richiesta del proprietario; accesso tramite username e password.
- Signup pubblico globalmente disabilitato; account creati esclusivamente dalla console piattaforma.
- Password: minimo 8 caratteri con lettera e numero, impostabile o modificabile dal super amministratore.
- Rate limit Auth irrigidito; inviti amministrativi limitati anche dalla Edge Function.
- Username univoci e normalizzati; risoluzione dell’identità solo nella Edge Function, token trasferiti esclusivamente al Server Action e tentativi memorizzati come HMAC senza IP o username in chiaro.
- Scritture dirette sui ruoli revocate; le modifiche piattaforma passano dalla Edge Function autenticata e da comandi PostgreSQL transazionali che verificano il JWT del proprietario, mentre quelle dell’ufficio restano vincolate al ruolo admin.
- Impossibile eliminare, sospendere o declassare l’ultimo amministratore attivo.
- Chiave privilegiata confinata nell’infrastruttura Supabase; non presente in Vercel, browser o repository.
- CSP per-request con nonce e `strict-dynamic`; script inline non autorizzati bloccati.
- Tutti i moduli gestiti nel browser dichiarano `POST`: anche prima del caricamento di JavaScript le credenziali e i dati sensibili non possono finire nella query string.
- Header HSTS, anti-framing, anti-MIME sniffing, Permissions Policy e `Cache-Control: private, no-store` verificati.
- RLS su tutte le tabelle esposte; dati sanitari e documenti sensibili separati e più restrittivi.
- Bucket documenti privato, limiti MIME/dimensione e autorizzazione per percorso/organizzazione.
- Upload documenti con verifica della firma binaria, nome file ripulito, limite 4 MB e download firmato di 60 secondi.
- Esportazioni CSV protette dalla formula injection e prive di dati sanitari o numeri di carta.
- Controlli database concorrenti su capienza dei viaggi e delle camere, coerenza gruppo/camera/posto con il viaggio e saldo netto di pagamenti/rimborsi.
- Stato operativo dei partecipanti calcolato dai dati reali del viaggio: documento valido, saldo e scadenze, camera e posto; i vecchi valori fissi dell’iscrizione non possono più lasciare la scheda bloccata.
- Un solo posto per iscrizione, capienza del viaggio mai inferiore agli iscritti, iscrizioni chiuse rispettate e attività limitate alle date effettive del viaggio anche a livello PostgreSQL.
- Scadenza del documento sincronizzata dall’archivio privato e relazione documento/organizzazione protetta da un vincolo database dedicato.
- Controlli per ruolo replicati su pagina, Server Action, API e Row Level Security; le sezioni non autorizzate non vengono renderizzate.
- Audit delle modifiche sensibili senza memorizzare il contenuto modificato.
- Console piattaforma ridotta alle sole operazioni essenziali; dashboard calcolata con rollup aggregati per evitare interrogazioni ripetute per ogni ufficio.
- Navigazione ufficio e impostazioni ridotte alle funzioni effettivamente operative; eliminati collegamenti e pannelli informativi duplicati.
- Dashboard ufficio ottimizzata con una query dedicata ai soli indicatori di attenzione, senza caricare profili e contatti completi dei pellegrini.
- Instradamento autenticato corretto: solo `platform_admins` attivi entrano nella console piattaforma; il semplice ruolo admin di un ufficio non è sufficiente.
- Audit di leggibilità automatizzato: nessun testo con dimensione esplicita inferiore a 12 px nelle interfacce ufficio e piattaforma.
- Sospensione dell’ufficio applicata a tutte le sessioni tramite RLS; riattivazione esplicita disponibile dalla stessa console.
- Eliminazione permanente in due fasi: nome esatto, protezione dell’ufficio interno, sospensione immediata, rimozione dei file privati e degli account Auth, quindi cancellazione transazionale dei dati del tenant.

## Verifiche eseguite

- 17 migration remote sincronizzate con il repository.
- Supabase CLI: 17 migration applicate e registrate; schema remoto verificato senza errori.
- Edge Function senza autenticazione: risposta `401`.
- `pnpm audit --prod`: nessuna vulnerabilità nota.
- ESLint: zero warning/errori.
- TypeScript: zero errori.
- 97 test automatici superati in 14 suite, inclusi tutti i moduli viaggio, stati automatici, date/orari, inventario strutturale di pulsanti/form/collegamenti, fallback POST e soglia minima delle scritte.
- Collaudo autenticato in produzione della console piattaforma, del salvataggio ufficio, del salvataggio utente e delle otto pagine operative principali.
- Build Next.js di produzione completata.
- 26 route dinamiche compilate, incluse logistica, modifica, documenti privati, pagamenti e impostazioni.
- Test locale della CSP: nonce della risposta presente sugli script Next.js e cache disabilitata.

## Rischi residui e attività obbligatorie

1. Effettuare un penetration test indipendente prima dell’uso con dati reali e ripeterlo dopo modifiche rilevanti.
2. Sul piano Supabase Free non sono disponibili timeout sessione forzati configurabili e Point-in-Time Recovery: per produzione è raccomandato il piano che li include.
3. Configurare SMTP aziendale, notifiche di sicurezza e monitoraggio degli errori. Il provider predefinito ha limiti bassi e i suoi link monouso possono essere consumati dai controlli antispam; usare un template con conferma esplicita o OTP.
4. Valutare CAPTCHA/Turnstile sul login dopo aver creato una chiave dedicata.
5. Configurare backup, prove periodiche di ripristino, retention degli audit e procedura di risposta agli incidenti.
6. Completare DPIA, informative, consensi, nomine e tempi di conservazione con un consulente GDPR.
7. Rivalutare MFA o passkey opzionali quando il prodotto verrà aperto a più organizzazioni reali.
8. Aggiungere il dominio definitivo alle allowlist Supabase e aggiornare `NEXT_PUBLIC_SITE_URL` quando il dominio cambia.
