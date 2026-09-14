function getParentArea(isVideo) {
  return isVideo ? document.getElementById('webcamArea') : document.getElementById('uploadArea');
}

function renderBars(predictions) {
  var classi = predictions.slice().sort(function(a, b) { return b.probability - a.probability; });
  return classi.map(function(p) {
    var pct = Math.round(p.probability * 100);
    var isTop = p === classi[0];
    return '<div class="class-bar-row">' +
      '<div class="class-bar-top">' +
      '<span class="class-bar-label">' + p.className + '</span>' +
      '<span class="class-bar-value ' + (isTop ? 'top' : 'rest') + '">' + pct + '%</span></div>' +
      '<div class="class-bar-track">' +
      '<div class="class-bar-fill ' + (isTop ? 'top' : 'rest') + '" style="width:' + pct + '%"></div></div></div>';
  }).join('');
}

function mostraRoiOverlay(parentArea, imgSrc) {
  var overlay = document.getElementById('roiOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'roiOverlay';
    overlay.className = 'roi-overlay face-roi';
    overlay.innerHTML = '<img id="roiImageDisplay" /><div class="roi-label">FACE ROI</div>';
  }
  if (overlay.parentNode !== parentArea) parentArea.appendChild(overlay);
  overlay.style.display = 'block';
  document.getElementById('roiImageDisplay').src = imgSrc;
}

function nascondiRoiOverlay() {
  var overlay = document.getElementById('roiOverlay');
  if (overlay) overlay.style.display = 'none';
}

function mostraBodyRoiOverlay(parentArea, imgSrc) {
  var overlay = document.getElementById('bodyRoiOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'bodyRoiOverlay';
    overlay.className = 'roi-overlay body-roi';
    overlay.innerHTML = '<img id="bodyRoiImageDisplay" /><div class="roi-label">FULL-BODY ROI</div>';
  }
  if (overlay.parentNode !== parentArea) parentArea.appendChild(overlay);
  overlay.style.display = 'block';
  document.getElementById('bodyRoiImageDisplay').src = imgSrc;
}

function nascondiBodyRoiOverlay() {
  var overlay = document.getElementById('bodyRoiOverlay');
  if (overlay) overlay.style.display = 'none';
}

function mostraClassOverlay(parentArea, predictions) {
  var overlay = document.getElementById('classOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'classOverlay';
    overlay.className = 'class-overlay face-class';
    overlay.innerHTML = '<div class="class-overlay-header"><i class="ti ti-shield-check"></i><div><div class="class-overlay-title">Classificazione</div><div class="class-overlay-subtitle">Face Model</div></div></div><div id="classOverlayBars"></div>';
    parentArea.appendChild(overlay);
  } else if (overlay.parentNode !== parentArea) {
    parentArea.appendChild(overlay);
  }
  document.getElementById('classOverlayBars').innerHTML = renderBars(predictions);
  overlay.style.display = 'block';
}

function nascondiClassOverlay() {
  var overlay = document.getElementById('classOverlay');
  if (overlay) overlay.style.display = 'none';
}

function mostraClassOverlayFB(parentArea, predictions) {
  var overlay = document.getElementById('classOverlayFB');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'classOverlayFB';
    overlay.className = 'class-overlay body-class';
    overlay.innerHTML = '<div class="class-overlay-header"><i class="ti ti-shield-check"></i><div><div class="class-overlay-title">Classificazione</div><div class="class-overlay-subtitle">Full-Body Model</div></div></div><div id="classOverlayBarsFB"></div>';
    parentArea.appendChild(overlay);
  } else if (overlay.parentNode !== parentArea) {
    parentArea.appendChild(overlay);
  }
  document.getElementById('classOverlayBarsFB').innerHTML = renderBars(predictions);
  overlay.style.display = 'block';
}

function nascondiClassOverlayFB() {
  var overlay = document.getElementById('classOverlayFB');
  if (overlay) overlay.style.display = 'none';
}

function mostraFaseOverlay(parentArea, numFase, totFasi, testoFase) {
  if (!parentArea) return;
  var overlay = document.getElementById('faseOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'faseOverlay';
    overlay.className = 'fase-overlay';
    parentArea.appendChild(overlay);
  } else if (overlay.parentNode !== parentArea) {
    parentArea.appendChild(overlay);
  }
  overlay.innerHTML = '<div class="fase-overlay-num">FASE ' + numFase + ' DI ' + totFasi + '</div>' +
    '<div class="fase-overlay-text">' + testoFase + '</div>';
  overlay.style.display = 'block';
}

function nascondiFaseOverlay() {
  var overlay = document.getElementById('faseOverlay');
  if (overlay) overlay.style.display = 'none';
}

function nascondiTuttiGliOverlay() {
  nascondiRoiOverlay();
  nascondiClassOverlay();
  nascondiBodyRoiOverlay();
  nascondiClassOverlayFB();
  nascondiFaseOverlay();
}