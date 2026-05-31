/* ============================================
   NAILONG PHOTOBOOTH v3 - Main App Logic
   - Strip double + diacak
   - EmailJS (no backend)
   - Mobile responsive
   - Drop GIF & Boomerang
   ============================================ */

// ============ EMAILJS CONFIG ============
// Ganti dengan kredensial dari dashboard EmailJS Anda
const EMAILJS_CONFIG = {
  PUBLIC_KEY: 'K_oHphWl6fECj50Wa',
  SERVICE_ID: 'service_8ufike6',
  TEMPLATE_ID: 'template_pc3aqi6'
};

// Initialize EmailJS
if (window.emailjs) {
  emailjs.init({ publicKey: EMAILJS_CONFIG.PUBLIC_KEY });
}

const state = {
  stream: null,
  devices: [],
  currentDeviceId: null,
  cameraTested: false,

  currentStep: 0,
  confirmedSteps: { camera: false, layout: false, color: false, frame: false },

  gridCount: 3,
  selectedFrame: 'theme-kawaii',
  stripColor: '#fffdf5',
  frameCategory: 'themed',

  capturedPhotos: [],
  currentSlot: 0,
  isCapturing: false,

  mediaRecorder: null,
  videoChunks: [],
  isRecording: false,
  recordStart: 0,
  recordTimer: null,

  lastStripCanvas: null,
  lastVideoBlob: null
};

const MAX_RETAKES = 3;
const COUNTDOWN_SECONDS = 5;

const STRIP_COLORS = [
  '#fffdf5', '#ffe066', '#ff8fb1', '#ffd23f',
  '#b8e0d2', '#c8b6ff', '#ff4081', '#1a1a1a',
  '#a0d8ff', '#f4a261'
];

const STEPS_INFO = [
  { num: 0, text: 'Welcome! Klik tombol di bawah untuk mulai 🐲' },
  { num: 1, text: 'Step 1: Pilih kamera, lalu test & confirm' },
  { num: 2, text: 'Step 2: Pilih layout (3 atau 4 grid) → Confirm Layout' },
  { num: 3, text: 'Step 3: Pilih warna strip → Confirm Color' },
  { num: 4, text: 'Step 4: Pilih frame → Confirm Frame' },
  { num: 5, text: 'All set! Klik 📷 Take Photos untuk mulai' }
];

// ============ STEP MANAGEMENT ============
function setStep(n) {
  state.currentStep = n;
  const info = STEPS_INFO[n] || STEPS_INFO[STEPS_INFO.length - 1];
  document.getElementById('stepNum').textContent = info.num;
  document.getElementById('stepText').textContent = info.text;

  const prog = document.getElementById('stepProgress');
  prog.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const dot = document.createElement('span');
    dot.className = 'dot';
    if (i < n) dot.classList.add('done');
    if (i === n) dot.classList.add('active');
    prog.appendChild(dot);
  }

  const panels = ['panelCamera', 'panelLayout', 'panelColor', 'panelFrame'];
  panels.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('locked', n < idx + 1);
    el.classList.toggle('current', n === idx + 1);
  });

  const ready = n >= 5;
  document.getElementById('snapBtn').disabled = !ready;
  document.getElementById('videoBtn').disabled = !ready;
}

// ============ MODAL ============
function openModal({ title, body, summary, mascot = true, buttons = [], previewHTML = '', formHTML = '', wide = false, allowClose = true }) {
  const content = document.getElementById('modalContent');
  let html = '';
  if (allowClose) html += `<button class="modal-close" id="dynModalClose">✕</button>`;
  if (mascot) html += `<div class="modal-mascot">${getMascotHTML()}</div>`;
  html += `<h2>${title}</h2>`;
  if (body) html += `<p>${body}</p>`;
  if (previewHTML) html += `<div class="result-preview">${previewHTML}</div>`;
  if (formHTML) html += formHTML;
  if (summary) {
    html += `<div class="summary">`;
    Object.keys(summary).forEach(k => {
      html += `<div><span>${k}</span><span>${summary[k]}</span></div>`;
    });
    html += `</div>`;
  }
  if (buttons.length) {
    html += `<div class="modal-actions">`;
    buttons.forEach((b, i) => {
      const disabled = b.disabled ? 'disabled' : '';
      const id = b.id ? `id="${b.id}"` : '';
      html += `<button class="btn ${b.class || ''}" data-mbtn="${i}" ${id} ${disabled}>${b.label}</button>`;
    });
    html += `</div>`;
  }
  content.innerHTML = html;
  content.classList.toggle('wide', wide);

  document.getElementById('modal').classList.add('active');

  if (allowClose) {
    const closeBtn = document.getElementById('dynModalClose');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
  }
  buttons.forEach((b, i) => {
    const el = content.querySelector(`[data-mbtn="${i}"]`);
    if (el && b.onClick) el.addEventListener('click', b.onClick);
  });
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
}

function getMascotHTML() {
  if (window.NAILONG_IMAGES && window.NAILONG_IMAGES.length > 0) {
    return `<img src="${window.NAILONG_IMAGES[0].src}" alt="Nailong">`;
  }
  return '<span class="fallback">🐲</span>';
}

function showHelp(text, duration = 4000) {
  const bubble = document.getElementById('helpBubble');
  document.getElementById('helpText').textContent = text;
  bubble.classList.add('show');
  clearTimeout(showHelp._t);
  showHelp._t = setTimeout(() => bubble.classList.remove('show'), duration);
}

// ============ CAMERA ============
async function enumerateCameras() {
  try {
    const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    tempStream.getTracks().forEach(t => t.stop());
  } catch (e) {}
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    state.devices = devices.filter(d => d.kind === 'videoinput');
    return state.devices;
  } catch (err) {
    console.error('Enumerate failed:', err);
    return [];
  }
}

function populateCameraSelect() {
  const select = document.getElementById('cameraSelect');
  if (!select) return;
  select.innerHTML = '';
  if (state.devices.length === 0) {
    select.innerHTML = '<option>No cameras found</option>';
    return;
  }
  state.devices.forEach((d, i) => {
    const opt = document.createElement('option');
    opt.value = d.deviceId;
    opt.textContent = d.label || `Camera ${i + 1}`;
    select.appendChild(opt);
  });
  if (!state.currentDeviceId) state.currentDeviceId = state.devices[0].deviceId;
  select.value = state.currentDeviceId;
}

async function startCamera(deviceId = null) {
  if (state.stream) {
    state.stream.getTracks().forEach(t => t.stop());
    state.stream = null;
    await new Promise(r => setTimeout(r, 200));
  }

  const attempts = [];
  if (deviceId) {
    attempts.push({ video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
    attempts.push({ video: { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: true });
    attempts.push({ video: { deviceId: { exact: deviceId } }, audio: true });
    attempts.push({ video: { deviceId: { exact: deviceId } }, audio: false });
    attempts.push({ video: { deviceId: deviceId }, audio: false });
  } else {
    attempts.push({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
    attempts.push({ video: { facingMode: 'user' }, audio: true });
    attempts.push({ video: true, audio: true });
    attempts.push({ video: true, audio: false });
  }

  let lastErr = null;
  for (const constraints of attempts) {
    try {
      state.stream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = document.getElementById('video');
      video.srcObject = state.stream;
      video.addEventListener('loadedmetadata', updateLivePreview, { once: true });

      const statusEl = document.getElementById('cameraStatus');
      if (statusEl) {
        const track = state.stream.getVideoTracks()[0];
        const settings = track.getSettings ? track.getSettings() : {};
        const res = (settings.width && settings.height) ? ` @ ${settings.width}×${settings.height}` : '';
        statusEl.innerHTML = `✓ Camera connected${res}`;
        statusEl.className = 'camera-status ok';
      }
      return true;
    } catch (err) {
      lastErr = err;
      console.warn('Camera attempt failed:', err.name, err.message);
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') break;
    }
  }

  const statusEl = document.getElementById('cameraStatus');
  if (statusEl) {
    statusEl.textContent = '✗ ' + (lastErr ? lastErr.message : 'Failed');
    statusEl.className = 'camera-status error';
  }
  showCameraErrorModal(lastErr);
  return false;
}

function showCameraErrorModal(err) {
  const name = err ? err.name : 'Unknown';
  const message = err ? err.message : 'Unknown error';
  let title = 'Camera Error 😢';
  let causes = [], solutions = [];

  if (name === 'NotReadableError' || name === 'TrackStartError' || /could not start/i.test(message)) {
    title = 'Kamera Lagi Dipakai 🔒';
    causes = ['Zoom/Teams/OBS/Camera app sedang aktif', 'Tab browser lain pakai kamera', 'Driver nyangkut'];
    solutions = ['Tutup semua app yang pake kamera', 'Tutup tab browser lain', 'Restart laptop'];
  } else if (name === 'NotAllowedError' || name === 'SecurityError') {
    title = 'Akses Ditolak 🚫';
    causes = ['Browser nge-block akses kamera'];
    solutions = ['Klik 🔒 di address bar → izinkan Camera', 'Reload halaman'];
  } else if (name === 'NotFoundError') {
    title = 'Kamera Tidak Ditemukan 📷';
    causes = ['Tidak ada webcam tersambung'];
    solutions = ['Cek kabel USB', 'Restart laptop'];
  } else {
    causes = ['Error tidak dikenal'];
    solutions = ['Reload halaman', 'Coba browser lain'];
  }

  const bodyHTML = `
    <p style="text-align:left; font-size:13px;">
      <strong>Error:</strong> <code style="background:#eee;padding:2px 6px;border-radius:4px;font-size:11px">${name}</code><br>
      <span style="opacity:0.7;font-size:12px">${message}</span>
    </p>
    <div style="background:#fff5d6; border:2px solid #1a1a1a; border-radius:12px; padding:12px; margin:12px 0; text-align:left;">
      <div style="font-family:'DM Mono',monospace; font-size:10px; text-transform:uppercase; opacity:0.6; margin-bottom:4px;">Penyebab:</div>
      <ul style="margin:0; padding-left:18px; font-size:12px;">${causes.map(c => `<li>${c}</li>`).join('')}</ul>
    </div>
    <div style="background:#b8e0d2; border:2px solid #1a1a1a; border-radius:12px; padding:12px; margin:12px 0; text-align:left;">
      <div style="font-family:'DM Mono',monospace; font-size:10px; text-transform:uppercase; opacity:0.7; margin-bottom:4px;">Solusi:</div>
      <ol style="margin:0; padding-left:18px; font-size:12px;">${solutions.map(s => `<li>${s}</li>`).join('')}</ol>
    </div>
  `;

  openModal({
    title, body: bodyHTML, mascot: false, wide: true,
    buttons: [
      { label: '🔄 Coba Lagi', class: 'btn-primary', onClick: async () => {
        closeModal();
        const select = document.getElementById('cameraSelect');
        const id = select && select.value ? select.value : (state.devices[0] && state.devices[0].deviceId);
        await startCamera(id);
      }},
      { label: '↻ Reload', class: 'btn-secondary', onClick: () => location.reload() }
    ]
  });
}

async function testCamera() {
  const statusEl = document.getElementById('cameraStatus');
  statusEl.textContent = '⏳ Testing...';
  statusEl.className = 'camera-status testing';
  const select = document.getElementById('cameraSelect');
  const deviceId = select.value;
  state.currentDeviceId = deviceId;
  const ok = await startCamera(deviceId);
  if (ok) {
    state.cameraTested = true;
    document.getElementById('cameraConfirmBtn').disabled = false;
    showHelp('Kamera oke! Klik Confirm Camera kalau pas.');
  }
}

// ============ LIVE PREVIEW ============
function updateLivePreview() {
  const overlay = document.getElementById('frameOverlay');
  if (state.currentStep < 4) {
    overlay.innerHTML = '';
    return;
  }
  const frame = window.FRAMES.find(f => f.id === state.selectedFrame);
  overlay.innerHTML = '';
  if (!frame) return;

  const video = document.getElementById('video');
  const vw = video.videoWidth || 800;
  const vh = video.videoHeight || 600;
  const c = document.createElement('canvas');
  c.width = vw;
  c.height = vh;
  const ctx = c.getContext('2d');

  try {
    // Step 1: Draw frame at full size
    frame.render(ctx, 0, 0, vw, vh, frame, {
      size: vh / 10,
      tapeW: vw * 0.2,
      tapeH: vh / 22,
      borderW: Math.min(vw, vh) * 0.08
    });
    // Step 2: Clear center area so video shows through
    const inset = 0.15;
    const px = vw * inset;
    const py = vh * inset;
    const iw = vw * (1 - inset * 2);
    const ih = vh * (1 - inset * 2);
    ctx.clearRect(px, py, iw, ih);
    // Step 3: Draw border around photo area
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 4;
    ctx.strokeRect(px, py, iw, ih);
  } catch (e) {
    console.error('Live preview error', e);
  }
  overlay.appendChild(c);
}

// ============ UI INIT ============
function initUI() {
  const cp = document.getElementById('colorPicker');
  STRIP_COLORS.forEach((c, i) => {
    const el = document.createElement('div');
    el.className = 'color-opt' + (i === 0 ? ' active' : '');
    el.style.background = c;
    el.dataset.color = c;
    el.addEventListener('click', () => {
      if (state.currentStep < 3) return;
      state.stripColor = c;
      document.querySelectorAll('.color-opt').forEach(o => o.classList.remove('active'));
      el.classList.add('active');
    });
    cp.appendChild(el);
  });

  document.querySelectorAll('.grid-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      if (state.currentStep < 2) return;
      document.querySelectorAll('.grid-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      state.gridCount = parseInt(opt.dataset.grid);
    });
  });

  document.querySelectorAll('.frame-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.frame-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.frameCategory = tab.dataset.cat;
      renderFramesGrid();
    });
  });

  renderFramesGrid();

  document.getElementById('cameraSelect').addEventListener('change', () => {
    state.cameraTested = false;
    document.getElementById('cameraConfirmBtn').disabled = true;
    const statusEl = document.getElementById('cameraStatus');
    statusEl.textContent = '⚠ Klik Test Camera untuk preview';
    statusEl.className = 'camera-status testing';
  });

  document.getElementById('cameraTestBtn').addEventListener('click', testCamera);

  document.querySelectorAll('.panel-confirm').forEach(btn => {
    btn.addEventListener('click', () => handleConfirm(btn.dataset.confirm, btn));
  });

  document.getElementById('snapBtn').addEventListener('click', confirmStartPhotoSession);
  document.getElementById('videoBtn').addEventListener('click', confirmToggleVideo);
  document.getElementById('resetBtn').addEventListener('click', confirmReset);
  document.getElementById('helpClose').addEventListener('click', () => {
    document.getElementById('helpBubble').classList.remove('show');
  });
}

function renderFramesGrid() {
  const fg = document.getElementById('framesGrid');
  fg.innerHTML = '';
  const filtered = window.FRAMES.filter(f => f.cat === state.frameCategory);
  filtered.forEach(f => {
    const el = document.createElement('div');
    el.className = 'frame-opt' + (f.id === state.selectedFrame ? ' active' : '');
    el.dataset.frame = f.id;
    const canvas = document.createElement('canvas');
    el.appendChild(canvas);
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = f.label;
    el.appendChild(label);
    el.addEventListener('click', () => selectFrame(f.id));
    fg.appendChild(el);
    window.renderFramePreview(canvas, f);
  });
}

function selectFrame(id) {
  if (state.currentStep < 4) {
    showHelp('Kunci dulu step sebelumnya 🔒');
    return;
  }
  state.selectedFrame = id;
  document.querySelectorAll('.frame-opt').forEach(el => {
    el.classList.toggle('active', el.dataset.frame === id);
  });
  updateLivePreview();
}

// ============ CONFIRM HANDLERS ============
function handleConfirm(type, btn) {
  if (type === 'camera') {
    if (!state.cameraTested) { showHelp('Test kamera dulu!'); return; }
    openModal({
      title: 'Confirm Camera?',
      body: 'Kamera ini akan dipakai untuk semua foto & video.',
      summary: { Camera: state.devices.find(d => d.deviceId === state.currentDeviceId)?.label || 'Default' },
      buttons: [
        { label: '✓ Yes, Use This', class: 'btn-primary', onClick: () => {
          state.confirmedSteps.camera = true;
          btn.classList.add('confirmed');
          btn.textContent = 'Camera Locked';
          closeModal();
          setStep(2);
          showHelp('Camera locked! Pilih layout.');
        }},
        { label: 'Cancel', class: 'btn-ghost', onClick: closeModal }
      ]
    });
  } else if (type === 'layout') {
    const totalShots = state.gridCount;
    const finalPhotos = state.gridCount * 2;
    openModal({
      title: 'Confirm Layout?',
      body: `Kamu akan ambil <strong>${totalShots} foto</strong>, lalu di-duplicate & diacak jadi <strong>${finalPhotos} foto</strong> di strip double.`,
      summary: {
        'Take photos': `${totalShots} foto`,
        'Strip output': `${finalPhotos} foto (2 strip, diacak)`,
        'Max retake': `${MAX_RETAKES}x per foto`
      },
      buttons: [
        { label: '✓ Lock Layout', class: 'btn-primary', onClick: () => {
          state.confirmedSteps.layout = true;
          btn.classList.add('confirmed');
          btn.textContent = 'Layout Locked';
          closeModal();
          setStep(3);
          showHelp('Layout oke! Pilih warna strip.');
        }},
        { label: 'Cancel', class: 'btn-ghost', onClick: closeModal }
      ]
    });
  } else if (type === 'color') {
    openModal({
      title: 'Confirm Color?',
      body: 'Warna ini jadi background photo strip.',
      previewHTML: `<div style="width:90px;height:140px;background:${state.stripColor};border:3px solid var(--ink);border-radius:8px;margin:0 auto"></div>`,
      buttons: [
        { label: '✓ Looks Good!', class: 'btn-primary', onClick: () => {
          state.confirmedSteps.color = true;
          btn.classList.add('confirmed');
          btn.textContent = 'Color Locked';
          closeModal();
          setStep(4);
          updateLivePreview();
          showHelp('Warna oke! Pilih frame.');
        }},
        { label: 'Cancel', class: 'btn-ghost', onClick: closeModal }
      ]
    });
  } else if (type === 'frame') {
    const frame = window.FRAMES.find(f => f.id === state.selectedFrame);
    openModal({
      title: 'Confirm Frame?',
      body: `Frame "<strong>${frame.label}</strong>" akan dipakai.`,
      summary: { Frame: frame.label, Category: frame.cat },
      buttons: [
        { label: '✓ Confirm', class: 'btn-primary', onClick: () => {
          state.confirmedSteps.frame = true;
          btn.classList.add('confirmed');
          btn.textContent = 'Frame Locked';
          closeModal();
          setStep(5);
          showHelp('All set! Klik 📷 Take Photos.');
        }},
        { label: 'Cancel', class: 'btn-ghost', onClick: closeModal }
      ]
    });
  }
}

function confirmReset() {
  openModal({
    title: 'Restart Wizard? ↺',
    body: 'Semua pilihan akan di-reset.',
    buttons: [
      { label: '✓ Yes', class: 'btn-primary', onClick: () => { closeModal(); resetWizard(); }},
      { label: 'No', class: 'btn-ghost', onClick: closeModal }
    ]
  });
}

function resetWizard() {
  state.confirmedSteps = { camera: false, layout: false, color: false, frame: false };
  state.capturedPhotos = [];
  state.currentSlot = 0;
  document.querySelectorAll('.panel-confirm').forEach(b => {
    b.classList.remove('confirmed');
    if (b.dataset.confirm === 'camera') b.textContent = 'Confirm Camera';
    if (b.dataset.confirm === 'layout') b.textContent = 'Confirm Layout';
    if (b.dataset.confirm === 'color') b.textContent = 'Confirm Color';
    if (b.dataset.confirm === 'frame') b.textContent = 'Confirm Frame';
  });
  document.getElementById('cameraConfirmBtn').disabled = true;
  state.cameraTested = false;
  setStep(1);
  renderStripPreview();
}

// ============ STRIP PREVIEW ============
function renderStripPreview() {
  const wrap = document.getElementById('stripPreview');
  wrap.innerHTML = '';
  if (state.capturedPhotos.length === 0 && !state.isCapturing) {
    wrap.classList.add('empty');
    return;
  }
  wrap.classList.remove('empty');
  for (let i = 0; i < state.gridCount; i++) {
    const slot = document.createElement('div');
    slot.className = 'strip-slot';
    if (i === state.currentSlot && state.isCapturing) slot.classList.add('active');
    if (!state.capturedPhotos[i]) slot.classList.add('empty');
    const num = document.createElement('div');
    num.className = 'slot-num';
    num.textContent = i + 1;
    slot.appendChild(num);
    if (state.capturedPhotos[i]) {
      const img = document.createElement('img');
      img.src = state.capturedPhotos[i].dataURL;
      slot.appendChild(img);
      if (state.capturedPhotos[i].retakeCount > 0) {
        const rc = document.createElement('div');
        rc.className = 'retake-count';
        rc.textContent = `${state.capturedPhotos[i].retakeCount}/${MAX_RETAKES}`;
        slot.appendChild(rc);
      }
    }
    wrap.appendChild(slot);
  }
}

// ============ PHOTO SESSION ============
function confirmStartPhotoSession() {
  if (state.isCapturing || state.isRecording) return;
  const frame = window.FRAMES.find(f => f.id === state.selectedFrame);
  openModal({
    title: 'Ready? 📸',
    body: `${state.gridCount} foto akan diambil dengan countdown ${COUNTDOWN_SECONDS} detik tiap foto. Retake max ${MAX_RETAKES}x. Hasil: <strong>strip double ${state.gridCount * 2} foto diacak</strong>.`,
    summary: {
      Take: `${state.gridCount} foto`,
      'Final strip': `${state.gridCount * 2} foto (2 strip)`,
      Frame: frame.label
    },
    buttons: [
      { label: "🎬 Let's Go!", class: 'btn-primary', onClick: () => { closeModal(); startPhotoSession(); }},
      { label: 'Wait', class: 'btn-ghost', onClick: closeModal }
    ]
  });
}

function countdown(seconds) {
  return new Promise(resolve => {
    const el = document.getElementById('countdown');
    const num = document.getElementById('countdownNum');
    el.classList.add('active');
    let n = seconds;
    num.textContent = n;
    num.style.animation = 'none';
    void num.offsetWidth;
    num.style.animation = 'pop 1s ease-out';
    const interval = setInterval(() => {
      n--;
      if (n <= 0) {
        clearInterval(interval);
        el.classList.remove('active');
        const flash = document.getElementById('flash');
        flash.classList.add('active');
        setTimeout(() => flash.classList.remove('active'), 400);
        resolve();
      } else {
        num.textContent = n;
        num.style.animation = 'none';
        void num.offsetWidth;
        num.style.animation = 'pop 1s ease-out';
      }
    }, 1000);
  });
}

function capturePhoto() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('workCanvas');
  const w = video.videoWidth;
  const h = video.videoHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL('image/png');
}

async function startPhotoSession() {
  state.isCapturing = true;
  state.capturedPhotos = [];
  state.currentSlot = 0;
  document.getElementById('snapBtn').disabled = true;
  document.getElementById('videoBtn').disabled = true;
  document.getElementById('frameOverlay').style.display = 'none';

  for (let i = 0; i < state.gridCount; i++) {
    state.currentSlot = i;
    await captureSlot(i);
  }

  document.getElementById('frameOverlay').style.display = '';
  document.getElementById('snapBtn').disabled = false;
  document.getElementById('videoBtn').disabled = false;
  state.isCapturing = false;
  document.getElementById('shotCounter').classList.remove('active');
  document.getElementById('retakeBadge').classList.remove('active');

  buildPhotoStrip();
}

async function captureSlot(slotIndex) {
  let retakeCount = 0;
  while (true) {
    const counter = document.getElementById('shotCounter');
    counter.classList.add('active');
    counter.textContent = `Foto ${slotIndex + 1} / ${state.gridCount}`;
    const retakeBadge = document.getElementById('retakeBadge');
    if (retakeCount > 0) {
      retakeBadge.classList.add('active');
      retakeBadge.textContent = `Retake ${retakeCount}/${MAX_RETAKES}`;
    } else {
      retakeBadge.classList.remove('active');
    }
    renderStripPreview();
    await countdown(COUNTDOWN_SECONDS);
    const dataURL = capturePhoto();
    state.capturedPhotos[slotIndex] = { dataURL, retakeCount };
    renderStripPreview();
    const canRetake = retakeCount < MAX_RETAKES;
    const choice = await askKeepOrRetake(slotIndex, dataURL, retakeCount, canRetake);
    if (choice === 'keep') return;
    retakeCount++;
  }
}

function askKeepOrRetake(slotIndex, dataURL, retakeCount, canRetake) {
  return new Promise(resolve => {
    const remaining = MAX_RETAKES - retakeCount;
    const buttons = [
      { label: '✓ Pakai Foto Ini', class: 'btn-primary', onClick: () => { closeModal(); resolve('keep'); }}
    ];
    if (canRetake) {
      buttons.push({ label: `↻ Retake (sisa ${remaining})`, class: 'btn-secondary', onClick: () => { closeModal(); resolve('retake'); }});
    }
    openModal({
      title: canRetake ? `Foto ${slotIndex + 1} — Pilih?` : `Foto ${slotIndex + 1} — Retake habis`,
      body: canRetake ? 'Pakai foto ini atau retake?' : 'Pakai foto ini ya!',
      previewHTML: `<img src="${dataURL}" style="max-height:40vh;border-radius:12px;border:3px solid var(--ink)">`,
      summary: { Slot: `${slotIndex + 1}/${state.gridCount}`, 'Retake used': `${retakeCount}/${MAX_RETAKES}` },
      buttons, allowClose: false
    });
  });
}

// ============ BUILD PHOTO STRIP (DOUBLE + RANDOMIZED) ============
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildPhotoStrip() {
  const canvas = document.getElementById('stripCanvas');
  const photos = state.capturedPhotos;
  const n = photos.length;

  // STRIP DOUBLE: 2 columns × n rows = n*2 total
  // Each column is a separately-shuffled copy
  const leftOrder = shuffleArray([...Array(n).keys()]);
  const rightOrder = shuffleArray([...Array(n).keys()]);
  // Pastikan dua kolom tidak identik
  if (n > 1 && leftOrder.every((v, i) => v === rightOrder[i])) {
    [rightOrder[0], rightOrder[1]] = [rightOrder[1], rightOrder[0]];
  }

  const photoW = 520;
  const photoH = 390;
  const padding = 30;
  const gap = 16;
  const colGap = 24;
  const footerH = 130;
  const headerH = 70;
  const stripW = padding * 2 + colGap + photoW * 2;
  const stripH = padding * 2 + headerH + n * photoH + (n - 1) * gap + footerH;

  canvas.width = stripW;
  canvas.height = stripH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = state.stripColor;
  ctx.fillRect(0, 0, stripW, stripH);

  const isDark = isColorDark(state.stripColor);
  const textColor = isDark ? '#fffdf5' : '#1a1a1a';

  // Header
  ctx.fillStyle = textColor;
  ctx.font = 'bold 36px Sniglet, cursive';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Nailong Photobooth 🐲', stripW / 2, padding + headerH / 2);

  // Load all images
  const imgs = photos.map(p => { const img = new Image(); img.src = p.dataURL; return img; });
  let loaded = 0;
  imgs.forEach(img => {
    if (img.complete) { loaded++; if (loaded === n) drawStrip(); }
    else img.onload = () => { loaded++; if (loaded === n) drawStrip(); };
  });

  function drawStrip() {
    const frame = window.FRAMES.find(f => f.id === state.selectedFrame);
    const startY = padding + headerH;

    // Inset padding: frame dilukis di area penuh, foto di-shrink ke tengah
    // sehingga frame jadi background border yang terlihat di pinggir foto.
    const insetRatio = 0.15; // 15% inset dari setiap sisi
    const insetX = photoW * insetRatio;
    const insetY = photoH * insetRatio;
    const innerW = photoW - insetX * 2;
    const innerH = photoH - insetY * 2;

    function drawFrameWithPhoto(img, x, y) {
      // Step 1: Draw frame BG covering full area
      try {
        frame.render(ctx, x, y, photoW, photoH, frame, {
          size: 50,
          tapeW: 110,
          tapeH: 26,
          borderW: Math.min(photoW, photoH) * 0.08
        });
      } catch (e) { console.error('Frame render error', e); }

      // Step 2: Draw photo on top, inset into middle area
      const px = x + insetX;
      const py = y + insetY;
      // White paper backing behind photo (so photo "sits on top" of frame)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 6, py - 6, innerW + 12, innerH + 12);
      drawCover(ctx, img, px, py, innerW, innerH);

      // Photo border
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 3;
      ctx.strokeRect(px, py, innerW, innerH);
    }

    // LEFT column
    for (let i = 0; i < n; i++) {
      const photoIdx = leftOrder[i];
      const img = imgs[photoIdx];
      const x = padding;
      const y = startY + i * (photoH + gap);
      drawFrameWithPhoto(img, x, y);
    }

    // RIGHT column
    for (let i = 0; i < n; i++) {
      const photoIdx = rightOrder[i];
      const img = imgs[photoIdx];
      const x = padding + photoW + colGap;
      const y = startY + i * (photoH + gap);
      drawFrameWithPhoto(img, x, y);
    }

    // Footer
    ctx.fillStyle = textColor;
    ctx.font = '500 16px DM Mono, monospace';
    ctx.textAlign = 'center';
    const date = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(date, stripW / 2, stripH - footerH / 2 - 12);
    ctx.font = 'italic 18px Fraunces, serif';
    ctx.fillText('made with ♥ by Syafrizal', stripW / 2, stripH - footerH / 2 + 18);

    state.lastStripCanvas = canvas;
    showResultModal();
  }
}

function drawCover(ctx, img, x, y, w, h) {
  const ir = img.width / img.height;
  const tr = w / h;
  let sx, sy, sw, sh;
  if (ir > tr) { sh = img.height; sw = sh * tr; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / tr; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function isColorDark(hex) {
  const c = hex.replace('#','');
  const r = parseInt(c.substring(0,2), 16);
  const g = parseInt(c.substring(2,4), 16);
  const b = parseInt(c.substring(4,6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
}

// ============ RESULT MODALS ============
function showResultModal() {
  const canvas = state.lastStripCanvas;
  const imgURL = canvas.toDataURL('image/png');
  const frame = window.FRAMES.find(f => f.id === state.selectedFrame);
  openModal({
    title: '🎉 Photo Strip Selesai!',
    body: `Strip double dengan ${state.gridCount * 2} foto diacak. Mau diapain?`,
    previewHTML: `<img src="${imgURL}" alt="Photo strip">`,
    summary: { Photos: state.gridCount * 2, Frame: frame.label, Date: new Date().toLocaleDateString('id-ID') },
    buttons: [
      { label: '⬇ Download PNG', class: 'btn-primary', onClick: downloadStrip },
      { label: '📧 Kirim Email', class: 'btn-mint', onClick: () => showEmailModalForPhoto() },
      { label: '📷 Take Again', class: 'btn-ghost', onClick: () => { closeModal(); showHelp('Klik Take Photos lagi'); }}
    ],
    wide: true
  });
}

function downloadStrip() {
  const canvas = state.lastStripCanvas;
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `nailong-photostrip-${Date.now()}.png`;
  a.click();
  showHelp('Tersimpan! 🎉');
}

// ============ VIDEO RECORDING ============
function confirmToggleVideo() {
  if (state.isCapturing) return;
  if (state.isRecording) { stopVideoRecording(); return; }
  openModal({
    title: 'Mulai Rekam? 🎥',
    body: 'Video direkam sampai kamu klik Stop.',
    buttons: [
      { label: '🔴 Start', class: 'btn-primary', onClick: () => { closeModal(); startVideoRecording(); }},
      { label: 'Cancel', class: 'btn-ghost', onClick: closeModal }
    ]
  });
}

function startVideoRecording() {
  if (!state.stream) return;
  state.videoChunks = [];
  let mimeType = '';
  const candidates = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4'];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) { mimeType = c; break; }
  }
  try {
    state.mediaRecorder = new MediaRecorder(state.stream, mimeType ? { mimeType } : undefined);
  } catch (err) {
    openModal({ title: 'Recording Error', body: err.message, buttons: [{ label: 'OK', class: 'btn-primary', onClick: closeModal }] });
    return;
  }
  state.mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) state.videoChunks.push(e.data); };
  state.mediaRecorder.onstop = () => {
    const blob = new Blob(state.videoChunks, { type: state.mediaRecorder.mimeType || 'video/webm' });
    state.lastVideoBlob = blob;
    showVideoResult(blob);
  };
  state.mediaRecorder.start();
  state.isRecording = true;
  state.recordStart = Date.now();

  const btn = document.getElementById('videoBtn');
  btn.innerHTML = '⏹ Stop Recording';
  btn.classList.remove('btn-video');
  btn.classList.add('btn-primary');
  document.getElementById('snapBtn').disabled = true;
  document.getElementById('recIndicator').classList.add('active');

  state.recordTimer = setInterval(() => {
    const s = Math.floor((Date.now() - state.recordStart) / 1000);
    document.getElementById('recTime').textContent = `REC ${s}s`;
  }, 250);
}

function stopVideoRecording() {
  if (!state.mediaRecorder || !state.isRecording) return;
  state.mediaRecorder.stop();
  state.isRecording = false;
  clearInterval(state.recordTimer);
  const btn = document.getElementById('videoBtn');
  btn.innerHTML = '🎥 Record Video';
  btn.classList.remove('btn-primary');
  btn.classList.add('btn-video');
  document.getElementById('snapBtn').disabled = false;
  document.getElementById('recIndicator').classList.remove('active');
}

function showVideoResult(blob) {
  const url = URL.createObjectURL(blob);
  openModal({
    title: '🎬 Video Selesai!',
    body: 'Preview, lalu pilih opsi:',
    previewHTML: `<video src="${url}" controls autoplay></video>`,
    buttons: [
      { label: '⬇ Download Video', class: 'btn-primary', onClick: () => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `nailong-video-${Date.now()}.webm`;
        a.click();
        showHelp('Video tersimpan!');
      }},
      { label: '🎥 Rekam Lagi', class: 'btn-ghost', onClick: closeModal }
    ]
  });
}

// ============ EMAIL via EmailJS ============
function showEmailModalForPhoto() {
  if (!window.emailjs || EMAILJS_CONFIG.PUBLIC_KEY === 'YOUR_PUBLIC_KEY_HERE') {
    openModal({
      title: 'Email Belum Disetup ⚙️',
      body: 'EmailJS belum dikonfigurasi. Owner perlu setup EmailJS dulu (lihat README).',
      buttons: [{ label: 'OK', class: 'btn-primary', onClick: showResultModal }]
    });
    return;
  }

  const formHTML = `
    <div class="email-form">
      <label for="emailTo">Email Penerima *</label>
      <input type="email" id="emailTo" placeholder="contoh@email.com" required>
      <div class="input-error" id="emailToError">Email tidak valid</div>
      <label for="emailName">Nama Penerima (opsional)</label>
      <input type="text" id="emailName" placeholder="Nama si penerima">
      <label for="emailMessage">Pesan (opsional)</label>
      <textarea id="emailMessage" rows="3" placeholder="Halo! Ini foto kita di Nailong Photobooth 🐲"></textarea>
    </div>
  `;

  openModal({
    title: '📧 Kirim Photo Strip ke Email',
    body: 'Photo strip akan dikirim sebagai link gambar yang bisa langsung dilihat di email.',
    formHTML,
    buttons: [
      { label: '📤 Send Email', class: 'btn-primary', id: 'sendEmailBtn', onClick: sendPhotoEmail },
      { label: 'Cancel', class: 'btn-ghost', onClick: showResultModal }
    ]
  });
}

async function sendPhotoEmail() {
  const to = document.getElementById('emailTo').value.trim();
  const name = document.getElementById('emailName').value.trim() || 'there';
  const message = document.getElementById('emailMessage').value.trim();
  const errEl = document.getElementById('emailToError');

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    errEl.classList.add('show');
    return;
  }
  errEl.classList.remove('show');

  const btn = document.getElementById('sendEmailBtn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    // Convert canvas to base64 image (EmailJS template accepts img tag with base64)
    const imgBase64 = state.lastStripCanvas.toDataURL('image/jpeg', 0.85);

    // Check size — EmailJS has 50KB limit for variables, so big base64 won't work
    // Fallback: kasih link download lewat dataURL temporarily (akan saya pakai workaround upload ke imgbb gratis API)
    const imgUrl = await uploadToImgBB(imgBase64);

    const result = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      {
        to_email: to,
        to_name: name,
        from_name: 'Nailong Photobooth',
        message: message || 'Ini photo strip kamu di Nailong Photobooth!',
        photo_url: imgUrl
      }
    );

    openModal({
      title: '✓ Email Terkirim!',
      body: `Photo strip berhasil dikirim ke <strong>${to}</strong>. Cek inbox & folder spam ya!`,
      buttons: [{ label: 'Mantap!', class: 'btn-primary', onClick: closeModal }]
    });
  } catch (err) {
    console.error('Email error:', err);
    openModal({
      title: 'Email Gagal 😢',
      body: 'Gagal kirim email: ' + (err.text || err.message || 'Unknown error') + '<br><br>Cek koneksi & EmailJS quota.',
      buttons: [
        { label: 'Try Again', class: 'btn-primary', onClick: showEmailModalForPhoto },
        { label: 'Cancel', class: 'btn-ghost', onClick: closeModal }
      ]
    });
  }
}

// Upload base64 image to ImgBB (free image hosting, used for email)
// Get API key gratis di: https://api.imgbb.com/
const IMGBB_API_KEY = '62a99880797f42ab6afda1e21d9c1e4c';

async function uploadToImgBB(base64Image) {
  if (IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY_HERE') {
    throw new Error('IMGBB_API_KEY belum disetup. Daftar gratis di api.imgbb.com');
  }
  // Strip data: prefix
  const base64Data = base64Image.split(',')[1];
  const formData = new FormData();
  formData.append('image', base64Data);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  if (!data.success) throw new Error('ImgBB upload failed');
  return data.data.url;
}

// ============ WELCOME ============
function showWelcome() {
  openModal({
    title: 'Hai! Welcome to Nailong Photobooth 🐲',
    body: 'Bikin photo strip lucu dengan wizard interaktif! Pilih kamera → layout → warna → frame, lalu foto. Hasilnya jadi <strong>strip double dengan foto diacak</strong>.',
    buttons: [
      { label: '✨ Start Wizard', class: 'btn-primary btn-big', onClick: () => {
        closeModal();
        setStep(1);
        showHelp('Step 1: Pilih kamera & test');
      }}
    ],
    allowClose: false
  });
}

// ============ BOOTSTRAP ============
async function bootstrap() {
  initUI();
  await window.loadNailongImages();
  await enumerateCameras();
  populateCameraSelect();

  // Try start camera silently
  if (state.devices.length > 0) {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: state.devices[0].deviceId } },
        audio: false
      });
      state.stream = tempStream;
      const video = document.getElementById('video');
      video.srcObject = tempStream;
      video.addEventListener('loadedmetadata', updateLivePreview, { once: true });
    } catch (err) {
      console.warn('Initial preview failed:', err.name);
      const statusEl = document.getElementById('cameraStatus');
      if (statusEl) {
        statusEl.innerHTML = `⚠ Klik "Test Camera" untuk preview`;
        statusEl.className = 'camera-status testing';
      }
    }
  }

  setStep(0);
  setTimeout(showWelcome, 600);
}

bootstrap();
