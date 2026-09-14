function apriStorico() {
  document.getElementById('modalOverlay').classList.add('open');
  caricaStorico();
}

function chiudiStorico() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function switchModalTab(tab) {
  var accessi      = document.getElementById('contentAccessi');
  var statistiche  = document.getElementById('contentStatistiche');
  var tabA         = document.getElementById('tabAccessi');
  var tabS         = document.getElementById('tabStatistiche');
  if (tab === 'accessi') {
    accessi.style.display     = '';
    statistiche.style.display = 'none';
    tabA.classList.add('active');
    tabS.classList.remove('active');
  } else {
    accessi.style.display     = 'none';
    statistiche.style.display = '';
    tabS.classList.add('active');
    tabA.classList.remove('active');
    disegnaStatistiche();
  }
}

function caricaStorico() {
  fetch('/api/sessioni')
    .then(function(r) { return r.json(); })
    .then(function(rows) {
      var list = document.getElementById('logList');
      list.innerHTML = '';
      if (rows.length === 0) {
        list.innerHTML = '<p style="font-size:12px;color:#8e8e93;text-align:center;padding:16px">Nessuna sessione registrata</p>';
        return;
      }
      rows.forEach(function(row) {
        var initials = row.operatore.split(' ').filter(function(w) { return w.length > 0; }).map(function(w) { return w[0]; }).join('').toUpperCase();
        var isOk     = row.esito === 'conforme';
        var orario   = new Date(row.fine).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        var attivita = (row.attivita || '').replace(/_/g, ' ');
        var mancanti = JSON.parse(row.dpi_mancanti || '[]');
        var dettaglio = isOk ? attivita : attivita + (mancanti.length ? ' · DPI mancanti: ' + mancanti.join(', ') : '');
        var item = document.createElement('div');
        item.className = 'log-item';
        item.innerHTML =
          '<div class="log-avatar">' + initials + '</div>' +
          '<div><div class="log-name">' + row.operatore + '</div><div class="log-detail">' + dettaglio + '</div></div>' +
          '<span class="log-badge ' + (isOk ? 'ok' : 'warn') + '">' + (isOk ? 'Conforme' : 'Violazione') + '</span>' +
          '<span class="log-time">' + orario + '</span>' +
          '<button class="log-delete" data-id="' + row.id + '"><i class="ti ti-trash"></i></button>';
        list.appendChild(item);
        item.querySelector('.log-delete').addEventListener('click', function() {
          var id = this.getAttribute('data-id');
          fetch('/api/sessioni/' + id, { method: 'DELETE' })
            .then(function() { caricaStorico(); });
        });
      });
    });

  fetch('/api/statistiche')
    .then(function(r) { return r.json(); })
    .then(function(s) {
      document.getElementById('statTotale').textContent    = s.totale;
      document.getElementById('statConformi').textContent  = s.conformi;
      document.getElementById('statViolazioni').textContent = s.violazioni;
      disegnaLinea(s.ultimi7);
    });
}

function disegnaLinea(dati) {
  var svg  = document.getElementById('lineChart');
  var oggi = new Date();
  var nomiGiorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  var giorni = [];
  var punti  = [];
  for (var i = 6; i >= 0; i--) {
    var d   = new Date(oggi); d.setDate(oggi.getDate() - i);
    giorni.push(nomiGiorni[d.getDay()]);
    var key = d.toISOString().slice(0, 10);
    var row = dati.find(function(r) { return r.giorno === key; });
    punti.push(row ? row.n : 0);
  }
  var max  = Math.max.apply(null, punti) || 1;
  var W    = 460; var H = 60; var pad = 5;
  var coords = punti.map(function(v, i) {
    return { x: Math.round(i * (W / 6)), y: Math.round(H - pad - (v / max) * (H - pad * 2)) };
  });
  var isDark  = document.body.classList.contains('dark');
  var lineCol = isDark ? '#0a84ff' : '#007aff';
  var textCol = isDark ? '#636366' : '#8e8e93';
  var pathD   = coords.map(function(c, i) { return (i === 0 ? 'M' : 'L') + c.x + ',' + c.y; }).join(' ');
  var areaD   = pathD + ' L' + coords[coords.length-1].x + ',70 L0,70 Z';
  svg.innerHTML =
    '<defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + lineCol + '" stop-opacity="0.15"/><stop offset="100%" stop-color="' + lineCol + '" stop-opacity="0"/></linearGradient></defs>' +
    '<path d="' + areaD + '" fill="url(#lg)"/>' +
    '<polyline points="' + coords.map(function(c) { return c.x + ',' + c.y; }).join(' ') + '" fill="none" stroke="' + lineCol + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    coords.map(function(c) { return '<circle cx="' + c.x + '" cy="' + c.y + '" r="3.5" fill="' + lineCol + '"/>'; }).join('') +
    giorni.map(function(g, i) {
      var x = Math.round(i * (W / 6));
      return '<text x="' + x + '" y="78" text-anchor="middle" font-size="9" fill="' + textCol + '">' + g + '</text>';
    }).join('');
}

function disegnaStatistiche() {
  fetch('/api/statistiche')
    .then(function(r) { return r.json(); })
    .then(function(s) {
      var isDark  = document.body.classList.contains('dark');
      var bgCirc  = isDark ? '#2c2c2e' : '#f2f2f7';

      var tot  = s.totale || 1;
      var perc = Math.round((s.conformi / tot) * 100);
      var circ = 2 * Math.PI * 28;
      var okArc = (s.conformi / tot) * circ;
      var svg  = document.getElementById('donutChart');
      svg.innerHTML =
        '<circle cx="40" cy="40" r="28" fill="none" stroke="' + bgCirc + '" stroke-width="11"/>' +
        '<circle cx="40" cy="40" r="28" fill="none" stroke="#34c759" stroke-width="11" stroke-dasharray="' + okArc.toFixed(1) + ' ' + (circ - okArc).toFixed(1) + '" stroke-dashoffset="0" stroke-linecap="round" transform="rotate(-90 40 40)"/>' +
        '<circle cx="40" cy="40" r="28" fill="none" stroke="#ff3b30" stroke-width="11" stroke-dasharray="' + (circ - okArc).toFixed(1) + ' ' + okArc.toFixed(1) + '" stroke-dashoffset="-' + okArc.toFixed(1) + '" stroke-linecap="round" transform="rotate(-90 40 40)"/>' +
        '<text x="40" y="36" text-anchor="middle" font-size="13" font-weight="500" fill="' + (isDark ? '#f2f2f7' : '#1c1c1e') + '">' + perc + '%</text>' +
        '<text x="40" y="49" text-anchor="middle" font-size="7" fill="' + (isDark ? '#636366' : '#8e8e93') + '">conformi</text>';

      var legend = document.getElementById('donutLegend');
      legend.innerHTML =
        '<div class="donut-legend-item"><div class="donut-dot" style="background:#34c759"></div>OK · ' + s.conformi + '</div>' +
        '<div class="donut-legend-item"><div class="donut-dot" style="background:#ff3b30"></div>Viol. · ' + s.violazioni + '</div>';

      var dpiList = document.getElementById('dpiBarList');
      dpiList.innerHTML = '';
      var dpi    = s.dpi_mancanti || {};
      var maxDPI = Math.max.apply(null, Object.values(dpi).concat([1]));
      ['mascherina','camice','guanti','occhiali'].forEach(function(k) {
        var n   = dpi[k] || 0;
        var pct = Math.round((n / maxDPI) * 100);
        dpiList.innerHTML +=
          '<div class="dpi-bar-row">' +
          '<span class="dpi-bar-label">' + k.charAt(0).toUpperCase() + k.slice(1) + '</span>' +
          '<div class="dpi-bar-track"><div class="dpi-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<span class="dpi-bar-count">' + n + '</span></div>';
      });

      var bubbleWrap = document.getElementById('bubbleWrap');
      bubbleWrap.innerHTML = '';
      var colori = ['#007aff','#34c759','#ff9500','#ff3b30'];
      var maxN   = Math.max.apply(null, s.per_attivita.map(function(r) { return r.n; }).concat([1]));
      s.per_attivita.slice(0, 4).forEach(function(row, i) {
        var size = Math.round(28 + (row.n / maxN) * 42);
        var label = row.attivita.replace(/_/g, ' ').replace(' ', '<br>');
        bubbleWrap.innerHTML +=
          '<div class="bubble-col">' +
          '<div class="bubble" style="width:' + size + 'px;height:' + size + 'px;background:' + colori[i] + '">' + row.n + '</div>' +
          '<div class="bubble-lbl">' + label + '</div></div>';
      });
    });
}