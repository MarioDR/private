LAB-SAFE
Assistente Intelligente per la Sicurezza in Laboratorio

Academy di Intelligenza Artificiale · A.A. 2025/2026
Gruppo 11 — Francesca Gaia Amato, Mario Dello Russo, Mattia Gerardo Bavaro

================================================================================

DESCRIZIONE

Lab-Safe è un sistema in tempo reale per il monitoraggio e la verifica dei
Dispositivi di Protezione Individuale (DPI) in un laboratorio chimico, basato
su computer vision e machine learning.

Il sistema riconosce lo stato di sicurezza dell'operatore attraverso l'analisi
visiva combinata di volto e corpo intero, traducendo i risultati in avvisi di
sicurezza e attivando un chatbot conversazionale (Dialogflow) capace di
guidare l'utente passo passo durante l'intero esperimento, non solo nella
fase di accesso iniziale.

Pipeline:

  Webcam / Immagine
         |
         v
  OpenCV + YOLOv8 Pose -> estrazione Face ROI + Body ROI
  (con correzione luminosità CLAHE)
         |
         +--> Teachable Machine (Face Model)   -> occhiali / mascherina
         +--> Teachable Machine (Full-Body)     -> guanti / camice
         |
         v
  Lab-Safe UI -> verifica conformità DPI -> Dialogflow (chatbot + fasi guidate)

================================================================================

FUNZIONALITA' PRINCIPALI

- Accesso utenti con sistema di login (username/password) e ruoli
  (dottore, dottoressa, studente, studentessa)
- Rilevamento DPI tramite webcam live o upload immagine
- Doppia estrazione Region of Interest (volto e corpo intero) tramite
  YOLOv8 Pose con OpenCV
- Correzione automatica dell'illuminazione (CLAHE su spazio colore LAB) per
  migliorare la robustezza del rilevamento in condizioni di luce variabile
- Doppia classificazione DPI tramite due modelli Teachable Machine
  indipendenti (Face e Full-Body)
- Chatbot conversazionale (Dialogflow) esteso con flusso guidato multi-fase
  per l'intero esperimento
- Verifica conformità DPI specifica per ciascuna attività di laboratorio
- Sospensione e ripresa automatica delle fasi guidate se un DPI viene
  rimosso durante l'esperimento
- Comandi conversazionali aggiuntivi: informazioni sullo smaltimento
  rifiuti, procedura di emergenza, elenco comandi disponibili, cambio
  attività con conferma
- Storico sessioni con statistiche e grafici
- Interfaccia user-friendly con tema light/dark, input vocale e sintesi
  vocale (TTS via Web Speech API)


Modelli Teachable Machine:

  Modello     | Classi                                  | Stato
  ------------|------------------------------------------|----------------
  Face        | Occhiali, Mascherina, Entrambi, Nessuno   | Completato
  Full Body   | Camice, Guanti, Entrambi, Nessuno         | Completato


Attività supportate:

  Attività              | DPI richiesti                          | Rischio | Modello
  -----------------------|------------------------------------------|---------|-------------------
  Pesatura reagenti      | Mascherina                                | Basso   | Face
  Lettura pH             | Occhiali                                  | Basso   | Face
  Preparazione tamponi   | Occhiali, Mascherina                      | Medio   | Face
  Campionamento          | Occhiali, Mascherina                      | Medio   | Face
  Pipettaggio            | Guanti                                    | Basso   | Full-Body
  Briefing               | Camice                                    | Basso   | Full-Body
  Sterilizzazione        | Guanti, Camice                            | Medio   | Full-Body
  Titolazione            | Occhiali, Guanti                          | Medio   | Face + Full-Body
  Uso solventi           | Occhiali, Guanti, Mascherina              | Medio   | Face + Full-Body
  Miscelazione acidi     | Occhiali, Guanti, Camice, Mascherina      | Alto    | Face + Full-Body
  Uso fiamme libere      | Occhiali, Guanti, Camice                  | Alto    | Face + Full-Body

Ogni attività ha un flusso guidato di 1-3 fasi che l'operatore segue dopo
la verifica dei DPI.


Sistema di accesso:

Gli utenti che possono accedere al laboratorio sono predefiniti in un
database SQLite con ruolo associato (dottore, dottoressa, studente,
studentessa) per evitare accessi indesiderati.

================================================================================

REQUISITI

- Node.js v18+ (https://nodejs.org/)
- npm v9+
- Python 3.9+ con pip
- Account Google Cloud con Dialogflow API abilitata

================================================================================

INSTALLAZIONE E AVVIO (all'interno dell'ambiente virtuale)
-- Attenzione⚠️ Prima di avviare l'applicazione, leggi la sezione CONFIGURAZIONE e completa i 3 punti.

  # 1. Caricare la cartella su VSCode
  cd Academy_AIA/lab-safe

  # 2. Installare le dipendenze Node
  npm install

  # 3. Installare le dipendenze Python
  pip install -r requirements.txt

  # 4. Configurare le variabili d'ambiente (vedi sezione Configurazione)

  # 5. Avviare il server
  npm start

  # 6. Aprire nel browser
  http://localhost:3000

Per testare l'applicazione consulta il file demo/demo-labsafe.txt.

================================================================================

CONFIGURAZIONE

1. Creare il file env.txt
-----------------------------

Creare il file lab-safe/config/env.txt con il seguente contenuto:

  DIALOGFLOW_PROJECT_ID=newagent-jgxd
  GOOGLE_APPLICATION_CREDENTIALS=./config/credentials.json
  PORT=3000

Nota: Il Project ID "newagent-jgxd" è fisso — è il progetto Google Cloud. 
L'agente Dialogflow associato si chiama Academy_AIA_Gruppo11.


2. Ottenere il file credentials.json
-----------------------------------------

1. Accedere a console.cloud.google.com
2. Selezionare il progetto newagent-jgxd
3. Menu laterale -> IAM e amministrazione -> Account di servizio
4. Cliccare sull'account di servizio associato al progetto dialogflow
   con id newagent-jgxd
5. Tab Chiavi -> Aggiungi chiave -> Crea nuova chiave -> JSON -> Crea
6. Rinominare il file scaricato in credentials.json
7. Copiarlo nella cartella lab-safe/config/

Nota: per accedere al progetto è necessario essere stati aggiunti come
collaboratori. Contattare il Gruppo 11 per richiedere l'accesso ed
eventuali problemi nella configurazione.


3. Utenti di accesso
-------------------------

Al primo avvio il database viene popolato automaticamente con utenti di
esempio (password impostata identica per tutti per facilitare la demo):

  Username   | Password | Ruolo
  -----------|----------|---------------
  mrossi     | 1234     | dottore
  gbianchi   | 1234     | dottoressa
  lverdi     | 1234     | studente
  sgialli    | 1234     | studentessa


4. Struttura del progetto
------------------------------

lab-safe/
├── api/
│   └── src/
│       └── server.js          # Server Express + API REST + autenticazione
├── web/
│   ├── index.html             # Interfaccia principale
│   ├── style.css              # Stile
│   ├── app.js                 # Logica core: login, DPI, Dialogflow
│   ├── overlays.js            # Gestione overlay ROI e classificazioni
│   └── storico.js             # Gestione modale storico e statistiche
├── ai_service/
│   └── src/
│       └── detector.py        # Estrazione Face/Body ROI con OpenCV + YOLOv8
├── config/
│   ├── credentials.json       # Credenziali Google Cloud
│   └── env.txt                # Variabili d'ambiente
├── data/
│   ├── models/
│   │   ├── yolov8n-pose.pt    # Modello YOLOv8 Pose
│   │   └── teachable_machine/
│   │       ├── face/          # Modello TM — Face
│   │       └── full_body/     # Modello TM — Full Body
│   └── raw/
│       ├── Face/              # Dataset grezzo volti (per TM)
│       └── Full-Body/         # Dataset grezzo corpo (per TM)
├── database/
│   └── labsafe.db             # Database SQLite
├── demo/
│   ├── demo_labsafe.txt       # Script demo
│   └── test_*.png             # Immagini di test per la demo
├── docs/
│   ├── AIA_G11_PropostaProgettuale.pdf
│   └── AIA_Gruppo11_PresentazioneProgetto.pptx.pdf
├── package.json
├── package-lock.json
├── requirements.txt
├── .gitignore
└── README.md

================================================================================

UTILIZZO DI detector.py

detector.py usa YOLOv8 Pose per estrarre ROI facciali e corporee da immagini
o webcam, applicando una correzione automatica dell'illuminazione (CLAHE)
per migliorare la qualità del rilevamento. È utile sia in modalità server
(usata dall'applicazione) sia per costruire il dataset da fornire a
Teachable Machine.

  # Avvia il microservizio HTTP usato dall'applicazione
  # (avviato automaticamente da npm start)
  python src/backend/vision/detector.py --mode server

  # Elabora una cartella di immagini ed esporta le ROI nel dataset
  # (percorso default: data/raw/)
  python src/backend/vision/detector.py --mode folder --source /percorso/cartella

  # Elabora una cartella con output personalizzato
  python src/backend/vision/detector.py --mode folder --source /percorso/cartella --output /percorso/output

  # Testa su una singola immagine
  python src/backend/vision/detector.py --mode image --source /percorso/immagine.jpg

  # Testa in tempo reale con webcam
  python src/backend/vision/detector.py --mode webcam

Formati supportati: JPG, PNG, BMP, HEIC, HEIF.
Le ROI vengono salvate in data/raw/Face/<nome_cartella>/ e
data/raw/Full-Body/<nome_cartella>/ salvo diversa indicazione con --output.

================================================================================

INTEGRAZIONE DIALOGFLOW

Il server comunica con Dialogflow Essentials tramite il Google Cloud SDK.

Intent:

  Intent                       | Descrizione
  ------------------------------|----------------------------------------------------------------
  Inizio_Attivita               | L'operatore dichiara l'attività da svolgere
  Cambio_Attivita               | Richiesta di cambio attività durante una sessione
  Conferma_Cambio               | Conferma del cambio attività con reset della sessione
  Annulla_Cambio                | Annullamento del cambio, ripresa dalla fase corrente
  Avanza_Fase                   | Avanzamento alla fase successiva dell'esperimento
  Ripeti_Fase                   | Ripetizione della fase corrente
  Fine_Attivita                 | Completamento dell'esperimento con riepilogo DPI
  Rimuovi_DPI                   | Richiesta di rimozione di un DPI durante l'esperimento
                                 | (verifica se richiesto dall'attività corrente)
  Info_Smaltimento              | Istruzioni sullo smaltimento dei rifiuti chimici
  Emergenza                     | Procedura di sicurezza in caso di emergenza
  Info_Comandi                  | Elenco dei comandi disponibili nell'applicazione
  Default Welcome Intent        | Intent di benvenuto generato automaticamente da Dialogflow
  DPI_Mancante_Fallback         | Fallback per la segnalazione di DPI mancanti
  Conferma_DPI_Indossati        | Conferma storica della conformità DPI, sostituita dal
                                 | flusso a fasi

Entity:

  Entity              | Descrizione
  ----------------------|--------------------------------------------------------------------
  Tipo_Esperimento      | Estrae il nome dell'attività dichiarata dall'operatore, con
                         | sinonimi per ciascuna delle attività supportate
  Tipo_DPI              | Estrae il DPI menzionato dall'operatore (es. nelle richieste
                         | di rimozione DPI)

================================================================================

SCENARIO DEMO

1. L'operatore effettua l'accesso con username e password (es. mrossi / 1234)
2. Dichiara l'attività nel chatbot: "Voglio fare titolazione"
3. Avvia la webcam o carica un'immagine
4. OpenCV + YOLOv8 estraggono contemporaneamente la ROI facciale e la ROI
   del corpo, applicando la correzione di luminosità
5. I due modelli Teachable Machine classificano rispettivamente
   occhiali/mascherina e guanti/camice
6. Se un DPI manca: "DPI mancanti: Guanti. Indossali prima di procedere."
7. L'operatore indossa il DPI mancante
8. Il sistema rileva il cambio di stato: "DPI verificati. Puoi procedere
   in sicurezza."
9. Parte automaticamente la guida a fasi: "Fase 1 di 3: Riempi la buretta
   con la soluzione titolante."
10. L'operatore avanza con "avanti", ripete con "ripeti", e conclude con
    "ho finito"
11. Durante l'esperimento può chiedere "come smaltisco i rifiuti",
    "emergenza" o "info" per i comandi disponibili
12. Può cambiare attività in qualsiasi momento scrivendo "cambia attività"
    (con richiesta di conferma se ci sono fasi in corso)
13. La sessione viene salvata nel database e visibile nello storico, con
    statistiche aggregate

================================================================================

ROADMAP

  Funzionalità                                        | Stato
  -------------------------------------------------------|---------------
  UI completa (light/dark, storico, statistiche)         | Completato
  Backend Express + SQLite                                | Completato
  Integrazione Dialogflow                                 | Completato
  Estrazione ROI con YOLOv8 Pose (Face + Body)            | Completato
  Modello Teachable Machine — Face                        | Completato
  Modello Teachable Machine — Full Body                   | Completato
  Integrazione doppio modello TM -> frontend              | Completato
  Sistema di accesso utenti con ruoli                     | Completato
  Flussi conversazionali estesi (fasi guidate)            | Completato
  Ottimizzazione luce variabile (CLAHE)                   | Completato

================================================================================

TECNOLOGIE UTILIZZATE

  Layer            | Tecnologia
  -------------------|-----------------------------------------------------------
  Frontend           | HTML, CSS, JavaScript
  Backend            | Node.js, Express, SQLite (better-sqlite3)
  Autenticazione     | Hash SHA-256 (Node.js crypto)
  Chatbot            | Google Dialogflow Essentials
  Computer Vision    | OpenCV + YOLOv8 Pose (Python)
  Classificazione    | Google Teachable Machine (doppio modello)
  Voce               | Web Speech API (riconoscimento e sintesi vocale lato browser)

================================================================================

TEAM MEMBERS

- Amato Francesca Gaia    — https://github.com/famato46
- Bavaro Mattia Gerardo    — https://github.com/mattiajb
- Dello Russo Mario        — https://github.com/MarioDR

Academy di Intelligenza Artificiale · Gruppo 11 · 2025/2026
