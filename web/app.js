/**
 * @file app.js
 * @description Logica frontend. Gestisce UI, login, integrazione Teachable Machine e Dialogflow.
 */

var DPI_RICHIESTI = {
  pesatura_reagenti:    ['mascherina'],
  lettura_pH:           ['occhiali'],
  preparazione_tamponi: ['occhiali', 'mascherina'],
  campionamento:        ['occhiali', 'mascherina'],
  miscelazione_acidi:   ['occhiali', 'guanti', 'camice', 'mascherina'],
  uso_fiamme:           ['occhiali', 'guanti', 'camice'],
  uso_solventi:         ['occhiali', 'guanti', 'mascherina'],
  titolazione:          ['occhiali', 'guanti'],
  sterilizzazione:      ['guanti', 'camice'],
  pipettaggio:          ['guanti'],
  briefing_laboratorio: ['camice'],
};

var RISCHIO_LABEL = {
  pesatura_reagenti:    'Basso · pesatura reagenti',
  lettura_pH:           'Basso · lettura pH',
  preparazione_tamponi: 'Medio · preparazione tamponi',
  campionamento:        'Medio · campionamento',
  miscelazione_acidi:   'Alto · miscelazione acidi',
  uso_fiamme:           'Alto · uso fiamme libere',
  uso_solventi:         'Medio · uso solventi',
  titolazione:          'Medio · titolazione',
  sterilizzazione:      'Medio · sterilizzazione',
  pipettaggio:          'Basso · pipettaggio',
  briefing_laboratorio: 'Basso · briefing laboratorio',
};

var DPI_FRASE_NON_RICHIESTO = {
  guanti: 'I guanti non sono richiesti per questa attività, puoi toglierli se necessario.',
  mascherina: 'La mascherina non è richiesta per questa attività, puoi toglierla se necessario.',
  occhiali: 'Gli occhiali non sono richiesti per questa attività, puoi toglierli se necessario.',
  camice: 'Il camice non è richiesto per questa attività, puoi toglierlo se necessario.',
};

var DPI_FRASE_RICHIESTO = {
  guanti: 'Non rimuovere i guanti durante l\'esperimento, sono richiesti per questa attività.',
  mascherina: 'Non rimuovere la mascherina durante l\'esperimento, è richiesta per questa attività.',
  occhiali: 'Non rimuovere gli occhiali durante l\'esperimento, sono richiesti per questa attività.',
  camice: 'Non rimuovere il camice durante l\'esperimento, è richiesto per questa attività.',
};

var FASI_ATTIVITA = {
  pesatura_reagenti:    ['Tara la bilancia.', 'Pesa il reagente e registra il peso.'],
  lettura_pH:           ['Calibra il pH-metro.', 'Immergi l\'elettrodo nel campione e leggi il valore.'],
  preparazione_tamponi: ['Dissolvi i componenti in acqua distillata.', 'Aggiusta il pH.', 'Porta a volume finale con matraccio.'],
  campionamento:        ['Etichetta il contenitore.', 'Preleva il campione con la siringa sterile.', 'Conserva alla temperatura indicata.'],
  miscelazione_acidi:   ['Versa lentamente l\'acido nell\'acqua sotto cappa.', 'Mescola con cautela.', 'Verifica concentrazione finale.'],
  uso_fiamme:           ['Accendi il bunsen e regola la fiamma blu.', 'Riscalda il campione con movimento circolare.', 'Spegni e lascia raffreddare su reticella.'],
  uso_solventi:         ['Attiva la cappa aspirante.', 'Preleva il solvente in piccole quantità.', 'Chiudi immediatamente i contenitori.'],
  titolazione:          ['Riempi la buretta con la soluzione titolante.', 'Aggiungi goccia a goccia fino al viraggio.', 'Registra il volume utilizzato.'],
  sterilizzazione:      ['Posiziona il materiale in autoclave.', 'Imposta ciclo 121°C per 20 minuti.'],
  pipettaggio:          ['Calibra la micropipetta sul volume desiderato.', 'Aspira e trasferisci il liquido nel contenitore.'],
  briefing_laboratorio: ['Prendi nota delle istruzioni operative ricevute.', 'Conferma la presa visione al responsabile di laboratorio.'],
};

var classificaInCorso = false;
var tmModel = null;
var tmModelFB = null;
var tmModelFBURL = '/models/full_body/';
var tmModelURL = '/models/face/';
var sessioneSalvata = false;
var speechOutputEnabled = true;
var operatoreCorrente = 'Operatore';
var ruoloCorrente = null;
var salutoCorrente = 'Operatore';
var currentTheme    = 'light';
var streamActive    = false;
var currentActivity = null;
var dpiState        = { occhiali: null, guanti: null, mascherina: null, camice: null };
var statoStabile = { occhiali: null, mascherina: null, guanti: null, camice: null };
var contatoreStabile = { occhiali: 0, mascherina: 0, guanti: 0, camice: 0 };
var SOGLIA_STABILITA = 3;
var faseCorrente = 0;
var fasiAttive = false;
var attesaCambioAttivita = false;
var attesaFineAttivita = false;
var esperimentoCompletato = false;

function updateClock() {
  var now = new Date();
  var d = now.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  var t = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('topbarTime').textContent = d + ' · ' + t;
}

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.body.className = currentTheme;
  document.getElementById('toggleIcon').className = currentTheme === 'dark' ? 'ti ti-sun' : 'ti ti-moon';
  document.getElementById('toggleLabel').textContent = currentTheme === 'dark' ? 'Light' : 'Dark';
}

function switchTab(tab) {
  if (tab === 'webcam') {
    document.getElementById('webcamArea').style.display = '';
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('tabWebcam').classList.add('active');
    document.getElementById('tabUpload').classList.remove('active');
    document.getElementById('streamBadge').textContent = 'Webcam live';
    var uploadPreview = document.getElementById('uploadPreview');
    if (uploadPreview) { uploadPreview.removeAttribute('src'); uploadPreview.style.display = 'none'; }
    document.getElementById('fileInput').value = '';
  } else {
    document.getElementById('uploadArea').style.display = '';
    document.getElementById('webcamArea').style.display = 'none';
    document.getElementById('tabUpload').classList.add('active');
    document.getElementById('tabWebcam').classList.remove('active');
    document.getElementById('streamBadge').textContent = 'Upload';
    stopWebcam();
    nascondiTuttiGliOverlay();
  }
}

function startWebcam() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(function(stream) {
      var video = document.getElementById('videoFeed');
      video.srcObject = stream;
      video.style.display = 'block';
      document.getElementById('webcamPlaceholder').style.display = 'none';
      streamActive = true;
      document.getElementById('livePip').style.visibility = 'visible';
      avviaLoopTM();
      document.getElementById('streamBar').style.width = '90%';
      document.getElementById('streamVal').textContent = 'attivo';
      document.getElementById('streamVal').style.color = '#34c759';
      if (currentActivity) {
        setTimeout(function() { classificaConTM(); }, 1200);
      } else {
        addMessage('bot', 'Stream avviato. Quale attività vuoi svolgere?');
      }
    })
    .catch(function() {
      addMessage('bot', 'Impossibile accedere alla webcam. Controlla i permessi del browser.');
    });
}

function stopWebcam() {
  var video = document.getElementById('videoFeed');
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(function(t) { t.stop(); });
    video.srcObject = null;
  }
  video.style.display = 'none';
  document.getElementById('webcamPlaceholder').style.display = 'flex';
  streamActive = false;
  document.getElementById('livePip').style.visibility = 'hidden';
  fermaLoopTM();
  document.getElementById('streamBar').style.width = '0%';
  document.getElementById('streamVal').textContent = 'inattivo';
  document.getElementById('streamVal').style.color = '#ff3b30';
}

function handleUpload(event) {
  var file = event.target.files[0];
  if (!file) return;
  var preview = document.getElementById('uploadPreview');
  
  preview.onload = function() {
    if (!currentActivity) {
      addMessage('bot', 'Immagine caricata. Dimmi prima quale attività vuoi svolgere.');
      return;
    }
    sessioneSalvata = false;
    setDPIIdle();
    addMessage('bot', 'Immagine caricata. Avvio analisi DPI…');
    classificaConTM();
  };

  preview.onerror = function() {
    addMessage('bot', 'Errore: Formato immagine non supportato dal browser. Prova con un JPG o PNG.');
  };

  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
  event.target.value = '';
}

function updateDPI(dpiKey, present, skipCheck) {
  dpiState[dpiKey] = present;
  var item = document.getElementById('dpi-' + dpiKey);
  if (!item) return;
  if (present === null) {
    item.className = 'dpi-item idle';
    item.querySelector('.pulse-wrap').className = 'pulse-wrap pw-idle';
    item.querySelector('.dpi-status').textContent = '—';
  } else {
    item.className = 'dpi-item ' + (present ? 'ok' : 'warn');
    item.querySelector('.pulse-wrap').className = 'pulse-wrap ' + (present ? 'pw-ok' : 'pw-warn');
    item.querySelector('.dpi-status').textContent = present ? 'OK' : '!';
  }
  if (!skipCheck) checkCompliance();
}

var ultimoEsitoCheck = null;
var analisiAvviata = false;

function checkCompliance() {
  if (!currentActivity) return;
  if (!analisiAvviata) return;
  if (esperimentoCompletato) return;
  var richiesti = DPI_RICHIESTI[currentActivity] || [];
  var mancanti = richiesti.filter(function(d) { return dpiState[d] !== true; });
  var badge     = document.getElementById('dpiBadge');
  var esitoAttuale = mancanti.length === 0 ? 'conforme' : mancanti.join(',');

  if (esitoAttuale === ultimoEsitoCheck) return;
  ultimoEsitoCheck = esitoAttuale;

  if (mancanti.length === 0) {
    badge.textContent = 'Tutti OK';
    badge.className   = 'panel-badge ok';
    addMessage('success', '✓ DPI verificati. Puoi procedere in sicurezza.');
    salvaSessione('conforme');
    sessioneSalvata = true;
    if (!fasiAttive && !attesaFineAttivita && !esperimentoCompletato) {
      setTimeout(function() { avviaFasi(); }, 800);
    }
  } else {
    badge.textContent = mancanti.length + (mancanti.length > 1 ? ' mancanti' : ' mancante');
    badge.className   = 'panel-badge warn';
    var lista = mancanti.map(function(d) { return d.charAt(0).toUpperCase() + d.slice(1); }).join(', ');
    addMessage('alert', 'DPI mancanti: ' + lista + '. Indossali prima di procedere.');
    if (!sessioneSalvata) { salvaSessione('non conforme'); sessioneSalvata = true; }
    if (fasiAttive) {
      addMessage('alert', 'Fasi sospese: reindossa i DPI mancanti per riprendere dalla fase ' + (faseCorrente + 1) + '.');
    }
  }
}

function avviaFasi() {
  var fasi = FASI_ATTIVITA[currentActivity];
  if (!fasi || fasi.length === 0) return;
  fasiAttive = true;
  faseCorrente = 0;
  addMessage('bot', 'Inizia l\'esperimento. Durante le fasi puoi dire: "avanti" o "fatto" per procedere, "ripeti" per rivedere la fase corrente, "ho finito" quando hai completato tutto. Non rimuovere i DPI richiesti. Fase 1 di ' + fasi.length + ': ' + fasi[0]);
  aggiornaOverlayFase();
}

function aggiornaOverlayFase() {
  var parentArea = getParentArea(streamActive);
  if (!fasiAttive || !currentActivity) {
    nascondiFaseOverlay();
    return;
  }
  var fasi = FASI_ATTIVITA[currentActivity] || [];
  mostraFaseOverlay(parentArea, faseCorrente + 1, fasi.length, fasi[faseCorrente]);
}

function setDPIIdle() {
  sessioneSalvata = false;
  ultimoEsitoCheck = null;
  analisiAvviata = false;
  classificaInCorso = false;
  statoStabile = { occhiali: null, mascherina: null, guanti: null, camice: null };
  contatoreStabile = { occhiali: 0, mascherina: 0, guanti: 0, camice: 0 };
  fasiAttive = false;
  faseCorrente = 0;
  attesaCambioAttivita = false;
  attesaFineAttivita = false;
  esperimentoCompletato = false;
  ['occhiali','guanti','mascherina','camice'].forEach(function(k) {
    dpiState[k] = null;
    var item = document.getElementById('dpi-' + k);
    if (!item) return;
    item.className = 'dpi-item idle';
    item.querySelector('.pulse-wrap').className = 'pulse-wrap pw-idle';
    item.querySelector('.dpi-status').textContent = '—';
  });
  document.getElementById('dpiBadge').textContent = 'in attesa';
  document.getElementById('dpiBadge').className   = 'panel-badge';
  ['occhiali','guanti','mascherina','camice'].forEach(function(k) {
    var item = document.getElementById('dpi-' + k);
    if (item) item.classList.remove('dpi-inactive');
  });
  nascondiClassOverlay();
  nascondiFaseOverlay();
}

function setDPIPending(activityKey) {
  var richiesti = DPI_RICHIESTI[activityKey] || [];
  richiesti.forEach(function(k) {
    var item = document.getElementById('dpi-' + k);
    if (!item) return;
    item.className = 'dpi-item pending';
    item.querySelector('.pulse-wrap').className = 'pulse-wrap pw-pending';
    item.querySelector('.dpi-status').textContent = '?';
  });
}

function aggiornaDPIVisibility(activityKey) {
  ['occhiali', 'guanti', 'mascherina', 'camice'].forEach(function(k) {
    var item = document.getElementById('dpi-' + k);
    if (!item) return;
    item.classList.remove('dpi-inactive');
  });
}

function updateConfidence(value) {
  document.getElementById('confBar').style.width = Math.round(value) + '%';
  document.getElementById('confVal').textContent  = Math.round(value) + '%';
}

function showAnalyzing(show) {
  var area = document.getElementById('webcamPlaceholder');
  var existing = document.getElementById('analyzingIndicator');
  if (show) {
    if (existing) return;
    var ind = document.createElement('div');
    ind.id = 'analyzingIndicator';
    ind.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:10px;';
    ind.innerHTML = '<div style="display:flex;gap:6px;align-items:center;">' +
      '<span class="analyzing-dot"></span>' +
      '<span class="analyzing-dot"></span>' +
      '<span class="analyzing-dot"></span>' +
      '</div>' +
      '<span style="font-size:12px;font-weight:500;color:#007aff;">Analisi in corso…</span>';
    area.appendChild(ind);
  } else {
    if (existing) existing.remove();
  }
}

function updateRisk(activityKey) {
  var val  = document.getElementById('riskVal');
  var icon = document.getElementById('riskStrip').querySelector('.risk-icon');
  if (!activityKey) {
    val.textContent = 'Nessuna attività selezionata';
    icon.className  = 'ti ti-flask risk-icon';
    return;
  }
  val.textContent = RISCHIO_LABEL[activityKey] || activityKey;
  icon.className  = (activityKey === 'miscelazione_acidi' || activityKey === 'uso_fiamme')
    ? 'ti ti-alert-triangle risk-icon'
    : 'ti ti-alert-circle risk-icon';
}

function salvaSessione(esito) {
  if (!currentActivity) return;
  var richiesti     = DPI_RICHIESTI[currentActivity] || [];
  var dpiMancanti   = richiesti.filter(function(k) { return dpiState[k] === false; });
  var dpiVerificati = richiesti.filter(function(k) { return dpiState[k] === true; });
  fetch('/api/sessioni', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operatore:      operatoreCorrente,
      attivita:       currentActivity,
      dpi_mancanti:   dpiMancanti,
      dpi_verificati: dpiVerificati,
      esito:          esito,
      inizio:         new Date().toISOString(),
      fine:           new Date().toISOString()
    })
  });
}

function addMessage(type, text) {
  var container = document.getElementById('chatMessages');
  var div    = document.createElement('div');
  div.className = 'msg ' + type;
  var sender = document.createElement('div');
  sender.className = 'msg-sender';
  sender.textContent = type === 'user' ? operatoreCorrente : type === 'alert' ? 'Alert' : 'Lab-Safe';
  div.appendChild(sender);
  var testoSpan = document.createElement('span');
  testoSpan.innerHTML = text.replace(/\n/g, '<br>');
  div.appendChild(testoSpan);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  if (speechOutputEnabled && (type === 'bot' || type === 'success' || type === 'alert')) {
    leggiRisposta(text);
  }
}

function sendMessage() {
  var input = document.getElementById('chatInput');
  var text  = input.value.trim();
  if (!text) return;
  input.value = '';
  addMessage('user', text);
  processUserMessage(text.toLowerCase());
}

function sendQuickReply(text) {
  document.getElementById('quickReplies').style.display = 'none';
  addMessage('user', text);
  processUserMessage(text);
}

function processUserMessage(text) {
  var dpiRilevati = Object.keys(dpiState).filter(function(k) { return dpiState[k] === true; });
  fetch('/api/dialogflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message:     text,
      sessionId: operatoreCorrente.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now(),
      dpiRilevati: dpiRilevati,
      attivita:    currentActivity,
    }),
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {

    if (data.intent === 'Conferma_Cambio') {
      if (attesaCambioAttivita) {
        attesaCambioAttivita = false;
        currentActivity = null;
        updateRisk(null);
        setDPIIdle();
        sessioneSalvata = false;
        document.getElementById('quickReplies').style.display = '';
        addMessage('bot', 'Attività resettata. Quale attività vuoi svolgere?');
        if (streamActive) avviaLoopTM();
      }
      return;
    }

    if (data.intent === 'Annulla_Cambio') {
      if (attesaCambioAttivita) {
        attesaCambioAttivita = false;
        if (streamActive) avviaLoopTM();
        var fasi = FASI_ATTIVITA[currentActivity] || [];
        addMessage('bot', 'Ok, continuiamo. Fase ' + (faseCorrente + 1) + ' di ' + fasi.length + ': ' + fasi[faseCorrente]);
      }
      return;
    }

    if (data.intent === 'Avanza_Fase') {
      if (!fasiAttive || !analisiAvviata) {
        addMessage('bot', 'Nessun esperimento in corso con DPI verificati. Dichiara prima un\'attività e verifica i DPI.');
      } else {
        var fasi = FASI_ATTIVITA[currentActivity] || [];
        if (faseCorrente < fasi.length - 1) {
          faseCorrente++;
          addMessage('bot', 'Fase ' + (faseCorrente + 1) + ' di ' + fasi.length + ': ' + fasi[faseCorrente]);
          aggiornaOverlayFase();
        } else if (!attesaFineAttivita) {
          attesaFineAttivita = true;
          addMessage('bot', 'Hai completato tutte le fasi. Quando hai finito di sistemare dì "ho finito".');
          aggiornaOverlayFase();
        } else {
          addMessage('bot', 'Hai già completato tutte le fasi. Dì "ho finito" per concludere.');
        }
      }
      return;
    }

    if (data.intent === 'Ripeti_Fase') {
      if (!fasiAttive) {
        addMessage('bot', 'Nessun esperimento in corso.');
      } else {
        var fasi = FASI_ATTIVITA[currentActivity] || [];
        addMessage('bot', 'Fase ' + (faseCorrente + 1) + ' di ' + fasi.length + ': ' + fasi[faseCorrente]);
      }
      return;
    }

    if (data.intent === 'Fine_Attivita') {
      var fasi = FASI_ATTIVITA[currentActivity] || [];
      if (!fasiAttive && !attesaFineAttivita) {
        addMessage('bot', 'Nessun esperimento in corso.');
      } else if (attesaFineAttivita || faseCorrente === fasi.length - 1) {
        var richiesti = DPI_RICHIESTI[currentActivity] || [];
        addMessage('success', '✓ Esperimento completato. DPI indossati: ' + richiesti.join(', ') + '. Ricorda di smaltire correttamente i rifiuti e riporre i DPI.');
        fasiAttive = false;
        attesaFineAttivita = false;
        esperimentoCompletato = true;
        var faseOverlay = document.getElementById('faseOverlay');
        if (faseOverlay) faseOverlay.style.display = 'none';
        salvaSessione('conforme');
      } else {
        addMessage('bot', 'Non hai ancora completato tutte le fasi.');
      }
      return;
    }

    if (data.intent === 'Rimuovi_DPI') {
      var richiesti = DPI_RICHIESTI[currentActivity] || [];
      var dpiMenzionato = null;
      if (/guant/.test(text)) dpiMenzionato = 'guanti';
      else if (/mascherin/.test(text)) dpiMenzionato = 'mascherina';
      else if (/occhial/.test(text)) dpiMenzionato = 'occhiali';
      else if (/camice/.test(text)) dpiMenzionato = 'camice';

      if (dpiMenzionato && richiesti.indexOf(dpiMenzionato) === -1) {
        addMessage('bot', DPI_FRASE_NON_RICHIESTO[dpiMenzionato]);
      } else if (dpiMenzionato) {
        addMessage('alert', DPI_FRASE_RICHIESTO[dpiMenzionato]);
      } else {
        addMessage('alert', 'Non rimuovere i DPI richiesti durante l\'esperimento. Sono necessari per la tua sicurezza.');
      }
      return;
    }

    if (data.intent === 'Emergenza') {
      addMessage('alert', 'EMERGENZA: Allontanati immediatamente dall\'area e avvisa il responsabile di laboratorio. Consulta la scheda di sicurezza (SDS) della sostanza coinvolta e segui il protocollo di emergenza specifico. Non agire senza istruzioni certe.');
      return;
    }

    if (data.intent === 'Cambio_Attivita') {
      if (fasiAttive) {
        attesaCambioAttivita = true;
        fermaLoopTM();
        addMessage('bot', 'Sei sicuro di voler cambiare attività? La sessione corrente verrà resettata. Rispondi "confermo" o "annulla".');
        return;
      }
      currentActivity = null;
      updateRisk(null);
      setDPIIdle();
      sessioneSalvata = false;
      fermaLoopTM();
      document.getElementById('quickReplies').style.display = '';
      return;
    }

    if (data.attivita && data.attivita !== currentActivity) {
      currentActivity = data.attivita;
      updateRisk(currentActivity);
      setDPIIdle();
      aggiornaDPIVisibility(currentActivity);
      if (streamActive) {
        setTimeout(function() { classificaConTM(); }, 1200);
      } else if (document.getElementById('uploadPreview').style.display !== 'none') {
        setTimeout(function() { classificaConTM(); }, 1200);
      } else {
        setDPIPending(currentActivity);
        addMessage('bot', 'Attività registrata. Avvia la webcam o carica un\'immagine per analizzare i DPI.');
      }
    }

    if (data.reply) {
      var tipo = 'bot';
      var testo = data.reply;
      if (data.intent === 'Default Fallback Intent') {
        tipo = 'alert';
      }
      if (data.intent === 'Default Welcome Intent') {
        testo = 'Salve ' + salutoCorrente + '! Sono Lab-Safe, il tuo assistente per la sicurezza in laboratorio. Quale attività vuoi svolgere oggi?';
      }
      if (data.intent !== 'Inizio_Attivita') {
        addMessage(tipo, testo);
      }
    }

    if (!data.attivita && !currentActivity && (!data.intent || data.intent === 'Default Fallback Intent')) {
      addMessage('bot', 'Attività non riconosciuta. Prova con: pesatura reagenti, lettura pH, preparazione tamponi, campionamento, miscelazione acidi, uso fiamme, uso solventi, titolazione, sterilizzazione, pipettaggio o briefing.');
    }
  })
  .catch(function() {
    addMessage('bot', 'Errore di connessione al server. Riprova.');
  });
}

async function caricaModelloTM() {
  try {
    var modelURL    = tmModelURL + 'model.json';
    var metadataURL = tmModelURL + 'metadata.json';
    tmModel = await tmImage.load(modelURL, metadataURL);
    console.log('[TM] Modello caricato.');
  } catch(e) {
    console.error('[TM] Errore caricamento modello:', e);
  }
}

async function caricaModelloFB() {
  try {
    tmModelFB = await tmImage.load(tmModelFBURL + 'model.json', tmModelFBURL + 'metadata.json');
    console.log('[TM] Modello Full Body caricato.');
  } catch(e) {
    console.error('[TM] Errore caricamento modello FB:', e);
  }
}

async function classificaConTM() {
  if (!tmModel) return;
  if (!currentActivity) return;
  if (classificaInCorso) return; 
  classificaInCorso = true;     
  var source = null;
  var isVideo = false;
  if (streamActive) {
    var video = document.getElementById('videoFeed');
    if (!video || video.readyState < 2) { classificaInCorso = false; return; }
    source = video;
    isVideo = true;
  } else {
    var preview = document.getElementById('uploadPreview');
    if (!preview || preview.style.display === 'none' || !preview.src) { classificaInCorso = false; return; }
    source = preview;
  }

  try {
    var canvas = document.createElement('canvas');
    if (isVideo) {
      canvas.width = source.videoWidth;
      canvas.height = source.videoHeight;
    } else {
      canvas.width = source.naturalWidth;
      canvas.height = source.naturalHeight;
    }
    var ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    var base64Img = canvas.toDataURL('image/jpeg', 0.8);
    showAnalyzing(true);
    var res = await fetch('/api/process-frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Img })
    });
    var data = await res.json();
    showAnalyzing(false);

    if (data.status !== 'ok' || !data.face_rois || data.face_rois.length === 0) {
      console.warn('[TM] Nessun volto rilevato da YOLOv8 o errore:', data.message);
      nascondiRoiOverlay();
      nascondiClassOverlay();
      nascondiBodyRoiOverlay();
      nascondiClassOverlayFB();
      classificaInCorso = false;
      return;
    }
    var parentArea = getParentArea(isVideo);
    if (parentArea) parentArea.style.position = 'relative';

    mostraRoiOverlay(parentArea, data.face_rois[0]);

    if (data.body_rois && data.body_rois.length > 0) {
      mostraBodyRoiOverlay(parentArea, data.body_rois[0]);
    } else {
      nascondiBodyRoiOverlay();
    }

    var roiImg = new Image();
    roiImg.onload = async function() {
      var predictions = await tmModel.predict(roiImg);
      mostraClassOverlay(parentArea, predictions);

      var occhiali   = false;
      var mascherina = false;
      var maxConf    = 0;

      predictions.forEach(function(p) {
        if (p.probability > maxConf) maxConf = p.probability;
        var cls = p.className.toLowerCase();
        if (cls === 'occhiali'   && p.probability > 0.6) occhiali   = true;
        if (cls === 'mascherina' && p.probability > 0.6) mascherina = true;
        if (cls === 'entrambi'   && p.probability > 0.6) { occhiali = true; mascherina = true; }
      });

      var richiesti = DPI_RICHIESTI[currentActivity] || [];

      ['occhiali', 'mascherina'].forEach(function(dpi) {
        if (richiesti.indexOf(dpi) === -1) return;
        var nuovoStato = dpi === 'occhiali' ? occhiali : mascherina;
        var sogliaAttuale = isVideo ? SOGLIA_STABILITA : 1;
        if (nuovoStato === statoStabile[dpi]) {
          contatoreStabile[dpi] = 0;
        } else {
          contatoreStabile[dpi]++;
          if (contatoreStabile[dpi] >= sogliaAttuale) {
            statoStabile[dpi] = nuovoStato;
            contatoreStabile[dpi] = 0;
            updateDPI(dpi, nuovoStato, true);
          }
        }
      });
      updateConfidence(Math.round(maxConf * 100));
      if (tmModelFB && data.body_rois && data.body_rois.length > 0) {
        var bodyImg = new Image();
        bodyImg.onload = async function() {
          var predFB = await tmModelFB.predict(bodyImg);
          var guanti = false;
          var camice = false;
          predFB.forEach(function(p) {
            var cls = p.className.toLowerCase();
            if (cls === 'guanti'   && p.probability > 0.6) guanti = true;
            if (cls === 'camice'   && p.probability > 0.6) camice = true;
            if (cls === 'entrambi' && p.probability > 0.6) { guanti = true; camice = true; }
          });
          
          mostraClassOverlayFB(parentArea, predFB);

          var richiesti = DPI_RICHIESTI[currentActivity] || [];
          ['guanti', 'camice'].forEach(function(dpi) {
            if (richiesti.indexOf(dpi) === -1) return;
            var nuovoStato = dpi === 'guanti' ? guanti : camice;
            var sogliaAttuale = isVideo ? SOGLIA_STABILITA : 1;
            if (nuovoStato === statoStabile[dpi]) {
              contatoreStabile[dpi] = 0;
            } else {
              contatoreStabile[dpi]++;
              if (contatoreStabile[dpi] >= sogliaAttuale) {
                statoStabile[dpi] = nuovoStato;
                contatoreStabile[dpi] = 0;
                updateDPI(dpi, nuovoStato, true);
              }
            }
          });
          analisiAvviata = true;
          checkCompliance();
          classificaInCorso = false;
        };
        bodyImg.src = data.body_rois[0];
      } else {
        nascondiClassOverlayFB();
        updateDPI('guanti', null, true);
        updateDPI('camice', null, true);
        analisiAvviata = true;
        checkCompliance();
        classificaInCorso = false;
      }
    };
    roiImg.src = data.face_rois[0];

  } catch(e) {
    showAnalyzing(false);
    classificaInCorso = false;
    console.error('[TM] Errore classificazione:', e);
  }
}

var tmInterval = null;

function avviaLoopTM() {
  if (tmInterval) clearInterval(tmInterval);
  tmInterval = setInterval(function() {
    if (streamActive && currentActivity && tmModel) {
      classificaConTM();
    }
  }, 2000);
}

function fermaLoopTM() {
  if (tmInterval) { clearInterval(tmInterval); tmInterval = null; }
}

var recognition = null;
var speechEnabled = false;

function inizializzaVoce() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'it-IT';
  recognition.continuous = false;
  recognition.interimResults = false;
  speechEnabled = true;

  recognition.onresult = function(event) {
    var testo = event.results[0][0].transcript;
    document.getElementById('micBtn').classList.remove('listening');
    document.getElementById('micIcon').className = 'ti ti-microphone';
    addMessage('user', testo);
    processUserMessage(testo.toLowerCase());
  };

  recognition.onend = function() {
    document.getElementById('micBtn').classList.remove('listening');
    document.getElementById('micIcon').className = 'ti ti-microphone';
  };

  recognition.onerror = function() {
    document.getElementById('micBtn').classList.remove('listening');
    document.getElementById('micIcon').className = 'ti ti-microphone';
  };
}

function toggleMic() {
  if (!speechEnabled) {
    addMessage('bot', 'Il riconoscimento vocale non è supportato su questo browser. Usa Chrome o Edge.');
    return;
  }
  var btn = document.getElementById('micBtn');
  if (btn.classList.contains('listening')) {
    recognition.stop();
    btn.classList.remove('listening');
    document.getElementById('micIcon').className = 'ti ti-microphone';
  } else {
    recognition.start();
    btn.classList.add('listening');
    document.getElementById('micIcon').className = 'ti ti-microphone-off';
  }
}

function leggiRisposta(testo) {
  if (!('speechSynthesis' in window)) return;
  var utterance = new SpeechSynthesisUtterance(testo);
  utterance.lang = 'it-IT';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  var voci = window.speechSynthesis.getVoices();
  var alice = voci.find(function(v) { return v.name === 'Alice'; });
  if (alice) utterance.voice = alice;
  window.speechSynthesis.speak(utterance);
}

document.addEventListener('DOMContentLoaded', function() {
  updateClock();
  document.getElementById('streamVal').style.color = '#ff3b30';
  setInterval(updateClock, 10000);
  fetch('/api/attivita')
    .then(function(r) { return r.json(); })
    .then(function(rows) {
      rows.forEach(function(row) {
        DPI_RICHIESTI[row.attivita] = JSON.parse(row.dpi);
        RISCHIO_LABEL[row.attivita] = row.rischio + ' · ' + row.attivita.replace(/_/g, ' ');
      });
    });

  document.getElementById('loginPassword').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('startAppBtn').click();
  });

  document.getElementById('speakerBtn').addEventListener('click', function() {
    speechOutputEnabled = !speechOutputEnabled;
    var icon = document.getElementById('speakerIcon');
    icon.className = speechOutputEnabled ? 'ti ti-volume' : 'ti ti-volume-off';
    if (!speechOutputEnabled) {
      window.speechSynthesis.cancel();
    }
  });
  inizializzaVoce();
  document.getElementById('micBtn').addEventListener('click', toggleMic);  
  document.getElementById('storicoBtn').addEventListener('click', apriStorico);
  document.getElementById('modalClose').addEventListener('click', chiudiStorico);
  document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) chiudiStorico();
  });
  document.getElementById('tabAccessi').addEventListener('click', function() { switchModalTab('accessi'); });
  document.getElementById('tabStatistiche').addEventListener('click', function() { switchModalTab('statistiche'); });
  document.getElementById('toggleBtn').addEventListener('click', toggleTheme);
  document.getElementById('tabWebcam').addEventListener('click', function() { switchTab('webcam'); });
  document.getElementById('tabUpload').addEventListener('click', function() { switchTab('upload'); });
  document.getElementById('startBtn').addEventListener('click', startWebcam);
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('chooseFileBtn').addEventListener('click', function() {
    document.getElementById('fileInput').click();
  });
  document.getElementById('fileInput').addEventListener('change', handleUpload);
  document.getElementById('chatInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendMessage();
  });

  document.getElementById('welcomeToggle').addEventListener('click', function() {
    toggleTheme();
    var icon  = document.getElementById('welcomeToggleIcon');
    var label = document.getElementById('welcomeToggleLabel');
    icon.className    = currentTheme === 'dark' ? 'ti ti-sun'  : 'ti ti-moon';
    label.textContent = currentTheme === 'dark' ? 'Light' : 'Dark';
  });

  document.getElementById('startAppBtn').addEventListener('click', function() {
    var username = document.getElementById('loginUsername').value.trim();
    var password = document.getElementById('loginPassword').value;
    var errorBox = document.getElementById('loginError');
    if (!username || !password) {
      document.getElementById('loginUsername').style.border = '2px solid #ff453a';
      document.getElementById('loginPassword').style.border = '2px solid #ff453a';
      return;
    }
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    })
    .then(function(res) { return res.json().then(function(data) { return { status: res.status, data: data }; }); })
    .then(function(result) {
      if (result.status !== 200) {
        errorBox.textContent = result.data.message || 'Accesso non riuscito.';
        errorBox.style.display = 'block';
        return;
      }
      operatoreCorrente = result.data.operatore;
      ruoloCorrente = result.data.ruolo;
      salutoCorrente = result.data.saluto;
      document.getElementById('welcomeScreen').classList.add('hidden');
      addMessage('bot', 'Salve ' + salutoCorrente + '! Sono Lab-Safe, il tuo assistente per la sicurezza in laboratorio. Quale attività vuoi svolgere oggi?');
    })
    .catch(function() {
      errorBox.textContent = 'Errore di connessione al server.';
      errorBox.style.display = 'block';
    });
  });
  caricaModelloTM();
  caricaModelloFB();
});