/* ============================================
   NAILONG PHOTOBOOTH - Main App Logic
   ============================================ */

const state = {
  // Camera
  stream: null,
  devices: [],
  currentDeviceId: null,
  facingMode: 'user',
  cameraTested: false,

  // Wizard
  currentStep: 0,
  confirmedSteps: { camera: false, layout: false, color: false, frame: false },

  // Settings
  gridCount: 3,
  selectedFrame: 'border-flowers',
  stripColor: '#fffdf5',
  frameCategory: 'border',

  // Photos: array of { dataURL, retakeCount }
  capturedPhotos: [],
  currentSlot: 0, // which slot are we filling
  isCapturing: false,

  // Video
  mediaRecorder: null,
  videoChunks: [],
  isRecording: false,
  recordStart: 0,
  recordTimer: null,

  // Last result for output options
  lastStripCanvas: null,
  lastVideoBlob: null,
  lastGifBlob: null,
  lastBoomerangBlob: null
};

const MAX_RETAKES = 3; // max 3 attempts per photo slot
const COUNTDOWN_SECONDS = 5;

const STRIP_COLORS = [
  '#fffdf5', '#ffe066', '#ff8fb1', '#ffd23f',
  '#b8e0d2', '#c8b6ff', '#ff4081', '#1a1a1a',
  '#a0d8ff', '#f4a261'
];

const STEPS_INFO = [
  { num: 0, text: 'Welcome! Klik tombol di bawah untuk mulai 🐲' },
  { num: 1, text: 'Step 1: Pilih kamera yang mau dipakai, lalu test & confirm' },
  { num: 2, text: 'Step 2: Pilih layout (3 atau 4 grid) → Confirm Layout' },
  { num: 3, text: 'Step 3: Pilih warna strip → Confirm Color' },
  { num: 4, text: 'Step 4: Pilih frame → Confirm Frame' },
  { num: 5, text: 'Semua siap! Klik 📷 Take Photos untuk mulai' }
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

// ============ CAMERA MANAGEMENT ============
async function enumerateCameras() {
  try {
    // Need to request permission first to get device labels
    const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    tempStream.getTracks().forEach(t => t.stop());
  } catch (e) {
    // ignore — will fall through
  }
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
  // Stop any existing stream first (release the device lock)
  if (state.stream) {
    state.stream.getTracks().forEach(t => t.stop());
    state.stream = null;
    // Tiny pause so Windows can release the device
    await new Promise(r => setTimeout(r, 200));
  }

  // Try a sequence of constraint configurations, from "best" to "anything works"
  const attempts = [];
  if (deviceId) {
    // 1. Exact device + HD
    attempts.push({ video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
    // 2. Exact device + lower res
    attempts.push({ video: { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: true });
    // 3. Exact device, no resolution constraint
    attempts.push({ video: { deviceId: { exact: deviceId } }, audio: true });
    // 4. Exact device, no audio (some webcams expose only video)
    attempts.push({ video: { deviceId: { exact: deviceId } }, audio: false });
    // 5. Soft device match (not exact)
    attempts.push({ video: { deviceId: deviceId }, audio: false });
  } else {
    attempts.push({ video: { facingMode: state.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
    attempts.push({ video: { facingMode: state.facingMode }, audio: true });
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
        const hasAudio = state.stream.getAudioTracks().length > 0;
        statusEl.innerHTML = `✓ Camera connected${res}${hasAudio ? '' : ' (no audio)'}`;
        statusEl.className = 'camera-status ok';
      }
      return true;
    } catch (err) {
      lastErr = err;
      console.warn('Camera attempt failed:', constraints, err.name, err.message);
      // For NotAllowedError, stop trying — user explicitly denied
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') break;
    }
  }

  // All attempts failed
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

  // Map common error names to helpful Indonesian explanations
  let title = 'Camera Error 😢';
  let causes = [];
  let solutions = [];

  if (name === 'NotReadableError' || name === 'TrackStartError' || /could not start/i.test(message)) {
    title = 'Kamera Lagi Dipakai Aplikasi Lain 🔒';
    causes = [
      'Kamera lagi dibuka oleh Zoom, Teams, OBS, Discord, atau Camera app Windows',
      'Tab browser lain juga lagi pakai kamera ini',
      'Driver kamera nyangkut (perlu restart)'
    ];
    solutions = [
      '<strong>Tutup semua aplikasi yang pakai kamera</strong> (cek system tray pojok kanan bawah)',
      'Tutup tab browser lain yang punya akses kamera',
      'Buka <strong>Windows Camera app</strong> — kalau di sana juga error, restart laptop',
      'Cabut & colok ulang kabel USB kamera (kalau external)'
    ];
  } else if (name === 'NotAllowedError' || name === 'SecurityError') {
    title = 'Akses Kamera Ditolak 🚫';
    causes = [
      'Kamu klik "Block" pas browser nanya izin kamera',
      'Windows Privacy Settings blok akses kamera untuk browser'
    ];
    solutions = [
      'Klik icon <strong>🔒 gembok</strong> di address bar → izinkan Camera',
      'Buka <code>chrome://settings/content/camera</code> → cari URL ini, set Allow',
      'Windows: <code>Win + I</code> → Privacy → Camera → On untuk Chrome'
    ];
  } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    title = 'Kamera Tidak Ditemukan 📷';
    causes = ['Tidak ada webcam yang nyambung', 'Driver kamera belum terinstall'];
    solutions = [
      'Cek koneksi kabel USB kamera',
      'Restart laptop',
      'Update driver di Device Manager → Cameras'
    ];
  } else if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    title = 'Kamera Tidak Support Setting Ini ⚙️';
    causes = ['Resolution yang diminta tidak didukung kamera'];
    solutions = ['Coba reload halaman — saya udah tambah fallback otomatis'];
  } else {
    causes = ['Penyebab tidak diketahui'];
    solutions = ['Reload halaman', 'Coba browser lain (Chrome/Edge)', 'Restart laptop'];
  }

  let bodyHTML = `
    <p style="text-align:left; font-size:14px;">
      <strong>Error:</strong> <code style="background:#eee;padding:2px 6px;border-radius:4px;font-size:12px">${name}</code><br>
      <span style="opacity:0.7">${message}</span>
    </p>

    <div style="background:#fff5d6; border:2px solid #1a1a1a; border-radius:12px; padding:14px; margin:14px 0; text-align:left;">
      <div style="font-family:'DM Mono',monospace; font-size:11px; text-transform:uppercase; opacity:0.6; margin-bottom:6px;">Kemungkinan penyebab:</div>
      <ul style="margin:0; padding-left:20px; font-size:13px;">
        ${causes.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>

    <div style="background:#b8e0d2; border:2px solid #1a1a1a; border-radius:12px; padding:14px; margin:14px 0; text-align:left;">
      <div style="font-family:'DM Mono',monospace; font-size:11px; text-transform:uppercase; opacity:0.7; margin-bottom:6px;">Yang bisa kamu coba:</div>
      <ol style="margin:0; padding-left:20px; font-size:13px;">
        ${solutions.map(s => `<li style="margin-bottom:4px">${s}</li>`).join('')}
      </ol>
    </div>
  `;

  openModal({
    title,
    body: bodyHTML,
    mascot: false,
    wide: true,
    buttons: [
      { label: '🔄 Coba Lagi (Retry)', class: 'btn-primary', onClick: async () => {
        closeModal();
        const select = document.getElementById('cameraSelect');
        const id = select && select.value ? select.value : (state.devices[0] && state.devices[0].deviceId);
        await startCamera(id);
      }},
      { label: '↻ Reload Halaman', class: 'btn-secondary', onClick: () => location.reload() },
      { label: 'Tutup', class: 'btn-ghost', onClick: closeModal }
    ]
  });
}

async function testCamera() {
  const statusEl = document.getElementById('cameraStatus');
  statusEl.textContent = '⏳ Testing camera...';
  statusEl.className = 'camera-status testing';
  const select = document.getElementById('cameraSelect');
  const deviceId = select.value;
  state.currentDeviceId = deviceId;
  const ok = await startCamera(deviceId);
  if (ok) {
    state.cameraTested = true;
    document.getElementById('cameraConfirmBtn').disabled = false;
    showHelp('Kamera oke! Lihat preview di atas. Kalau udah pas, klik Confirm Camera.');
  }
}

// ============ LIVE PREVIEW (frame overlay) ============
function updateLivePreview() {
  const overlay = document.getElementById('frameOverlay');
  // Saat masih di wizard step <4 (sebelum confirm frame), tidak tampilkan frame
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

  if (frame.cat === 'scene' && frame.bg) {
    const grad = ctx.createLinearGradient(0, 0, 0, vh);
    grad.addColorStop(0, frame.bg[0] + '55');
    grad.addColorStop(1, frame.bg[2] + '55');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vw, vh);
  }
  frame.render(ctx, 0, 0, vw, vh, frame, { size: vh / 12, tapeW: vw * 0.2, tapeH: vh / 25 });
  overlay.appendChild(c);
}

// ============ UI INIT ============
function initUI() {
  // Colors
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

  // Grid options
  document.querySelectorAll('.grid-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      if (state.currentStep < 2) return;
      document.querySelectorAll('.grid-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      state.gridCount = parseInt(opt.dataset.grid);
    });
  });

  // Frame tabs
  document.querySelectorAll('.frame-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.frame-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.frameCategory = tab.dataset.cat;
      renderFramesGrid();
    });
  });

  renderFramesGrid();

  // Camera selector
  document.getElementById('cameraSelect').addEventListener('change', () => {
    state.cameraTested = false;
    document.getElementById('cameraConfirmBtn').disabled = true;
    const statusEl = document.getElementById('cameraStatus');
    statusEl.textContent = '⚠ Click "Test Camera" untuk preview';
    statusEl.className = 'camera-status testing';
  });

  document.getElementById('cameraTestBtn').addEventListener('click', testCamera);

  // Confirm buttons
  document.querySelectorAll('.panel-confirm').forEach(btn => {
    btn.addEventListener('click', () => handleConfirm(btn.dataset.confirm, btn));
  });

  // Main buttons
  document.getElementById('snapBtn').addEventListener('click', confirmStartPhotoSession);
  document.getElementById('videoBtn').addEventListener('click', confirmToggleVideo);
  document.getElementById('resetBtn').addEventListener('click', confirmReset);

  // Help bubble close
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
    if (!state.cameraTested) {
      showHelp('Test kamera dulu sebelum confirm!');
      return;
    }
    openModal({
      title: 'Confirm Camera?',
      body: 'Kamera ini akan dipake untuk semua foto & video. Lanjut?',
      summary: {
        Camera: state.devices.find(d => d.deviceId === state.currentDeviceId)?.label || 'Default'
      },
      buttons: [
        { label: '✓ Yes, Use This', class: 'btn-primary', onClick: () => {
          state.confirmedSteps.camera = true;
          btn.classList.add('confirmed');
          btn.textContent = 'Camera Locked';
          closeModal();
          setStep(2);
          showHelp('Camera locked! Sekarang pilih layout (3 atau 4 grid)');
        }},
        { label: 'Cancel', class: 'btn-ghost', onClick: closeModal }
      ]
    });
  } else if (type === 'layout') {
    openModal({
      title: 'Confirm Layout?',
      body: `Kamu pilih <strong>${state.gridCount} Grid</strong>. Yakin?`,
      summary: { Layout: `${state.gridCount} foto`, 'Max retake': `${MAX_RETAKES}x per foto` },
      buttons: [
        { label: '✓ Lock Layout', class: 'btn-primary', onClick: () => {
          state.confirmedSteps.layout = true;
          btn.classList.add('confirmed');
          btn.textContent = 'Layout Locked';
          closeModal();
          setStep(3);
          showHelp('Layout oke! Sekarang pilih warna strip 🎨');
        }},
        { label: 'Cancel', class: 'btn-ghost', onClick: closeModal }
      ]
    });
  } else if (type === 'color') {
    openModal({
      title: 'Confirm Strip Color?',
      body: 'Warna ini jadi background photo strip kamu.',
      previewHTML: `<div style="width:90px;height:140px;background:${state.stripColor};border:3px solid var(--ink);border-radius:8px;margin:0 auto"></div>`,
      buttons: [
        { label: '✓ Looks Good!', class: 'btn-primary', onClick: () => {
          state.confirmedSteps.color = true;
          btn.classList.add('confirmed');
          btn.textContent = 'Color Locked';
          closeModal();
          setStep(4);
          updateLivePreview();
          showHelp('Warna oke! Sekarang pilih frame favoritmu 🖼️');
        }},
        { label: 'Cancel', class: 'btn-ghost', onClick: closeModal }
      ]
    });
  } else if (type === 'frame') {
    const frame = window.FRAMES.find(f => f.id === state.selectedFrame);
    openModal({
      title: 'Confirm Frame?',
      body: `Frame "<strong>${frame.label}</strong>" akan dipake di semua foto.`,
      summary: { Frame: frame.label, Category: frame.cat },
      buttons: [
        { label: '✓ Confirm Frame', class: 'btn-primary', onClick: () => {
          state.confirmedSteps.frame = true;
          btn.classList.add('confirmed');
          btn.textContent = 'Frame Locked';
          closeModal();
          setStep(5);
          showHelp('All set! 🎉 Klik 📷 Take Photos untuk mulai sesi foto');
        }},
        { label: 'Cancel', class: 'btn-ghost', onClick: closeModal }
      ]
    });
  }
}

function confirmReset() {
  openModal({
    title: 'Restart Wizard? ↺',
    body: 'Semua pilihan akan di-reset ke awal. Yakin?',
    buttons: [
      { label: '✓ Yes, Restart', class: 'btn-primary', onClick: () => {
        closeModal();
        resetWizard();
      }},
      { label: 'No, Keep Going', class: 'btn-ghost', onClick: closeModal }
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
  showHelp('Wizard di-reset. Mulai dari Step 1 (kamera)');
}

// ============ STRIP PREVIEW (thumbnails of captured photos) ============
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
    title: 'Ready to Pose? 📸',
    body: `${state.gridCount} foto akan diambil. Setiap foto ada countdown <strong>${COUNTDOWN_SECONDS} detik</strong>, dan kamu bisa retake sampai <strong>${MAX_RETAKES} kali</strong> per foto.`,
    summary: {
      Layout: `${state.gridCount} Grid`,
      'Countdown': `${COUNTDOWN_SECONDS} detik`,
      'Max Retake': `${MAX_RETAKES}x`,
      Frame: frame.label
    },
    buttons: [
      { label: '🎬 Let\'s Go!', class: 'btn-primary', onClick: () => {
        closeModal();
        startPhotoSession();
      }},
      { label: 'Wait, Edit', class: 'btn-ghost', onClick: closeModal }
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
  ctx.scale(-1, 1); // mirror selfie
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
    // Update UI badges
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

    // Countdown
    await countdown(COUNTDOWN_SECONDS);
    const dataURL = capturePhoto();

    // Save temporarily
    state.capturedPhotos[slotIndex] = { dataURL, retakeCount };
    renderStripPreview();

    // Ask: keep or retake?
    const canRetake = retakeCount < MAX_RETAKES;
    const userChoice = await askKeepOrRetake(slotIndex, dataURL, retakeCount, canRetake);

    if (userChoice === 'keep') {
      return;
    }
    // retake
    retakeCount++;
  }
}

function askKeepOrRetake(slotIndex, dataURL, retakeCount, canRetake) {
  return new Promise(resolve => {
    const remainingRetakes = MAX_RETAKES - retakeCount;
    const summary = {
      Slot: `Foto ${slotIndex + 1} dari ${state.gridCount}`,
      'Retake used': `${retakeCount} / ${MAX_RETAKES}`
    };

    const buttons = [
      { label: '✓ Pakai Foto Ini', class: 'btn-primary', onClick: () => {
        closeModal();
        resolve('keep');
      }}
    ];

    if (canRetake) {
      buttons.push({
        label: `↻ Retake (sisa ${remainingRetakes})`,
        class: 'btn-secondary',
        onClick: () => {
          closeModal();
          resolve('retake');
        }
      });
    }

    openModal({
      title: canRetake ? `Foto ${slotIndex + 1} — Pilih?` : `Foto ${slotIndex + 1} — Retake habis`,
      body: canRetake
        ? 'Mau pakai foto ini atau retake?'
        : 'Sudah pakai semua retake. Pakai foto ini ya!',
      previewHTML: `<img src="${dataURL}" alt="Photo ${slotIndex + 1}" style="max-height:45vh;border-radius:12px;border:3px solid var(--ink)">`,
      summary,
      buttons,
      allowClose: false
    });
  });
}

// ============ BUILD PHOTO STRIP ============
function buildPhotoStrip() {
  const canvas = document.getElementById('stripCanvas');
  const photos = state.capturedPhotos;
  const n = photos.length;
  const photoW = 700;
  const photoH = 525;
  const padding = 35;
  const gap = 22;
  const footerH = 140;
  const stripW = photoW + padding * 2;
  const stripH = padding * 2 + n * photoH + (n - 1) * gap + footerH;

  canvas.width = stripW;
  canvas.height = stripH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = state.stripColor;
  ctx.fillRect(0, 0, stripW, stripH);

  const isDark = isColorDark(state.stripColor);
  const textColor = isDark ? '#fffdf5' : '#1a1a1a';

  const imgs = photos.map(p => { const img = new Image(); img.src = p.dataURL; return img; });
  let loaded = 0;
  imgs.forEach(img => {
    if (img.complete) { loaded++; if (loaded === n) drawStrip(); }
    else img.onload = () => { loaded++; if (loaded === n) drawStrip(); };
  });

  function drawStrip() {
    const frame = window.FRAMES.find(f => f.id === state.selectedFrame);
    imgs.forEach((img, i) => {
      const y = padding + i * (photoH + gap);
      const x = padding;
      drawCover(ctx, img, x, y, photoW, photoH);
      ctx.strokeStyle = textColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, photoW, photoH);
      frame.render(ctx, x, y, photoW, photoH, frame, { size: 65, tapeW: 140, tapeH: 32 });
    });

    ctx.fillStyle = textColor;
    ctx.font = 'bold 42px Sniglet, cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Nailong Photobooth 🐲', stripW / 2, stripH - footerH / 2 - 30);

    ctx.font = '500 16px DM Mono, monospace';
    const date = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(date, stripW / 2, stripH - footerH / 2 + 5);
    ctx.font = 'italic 16px Fraunces, serif';
    ctx.fillText('made with ♥ by Syafrizal', stripW / 2, stripH - footerH / 2 + 35);

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

// ============ RESULT MODAL ============
function showResultModal() {
  const canvas = state.lastStripCanvas;
  const imgURL = canvas.toDataURL('image/png');
  const frame = window.FRAMES.find(f => f.id === state.selectedFrame);

  openModal({
    title: '🎉 Photo Strip Selesai!',
    body: 'Mau diapain hasilnya? Pilih opsi di bawah:',
    previewHTML: `<img src="${imgURL}" alt="Photo strip">`,
    summary: {
      Photos: state.gridCount,
      Frame: frame.label,
      Date: new Date().toLocaleDateString('id-ID')
    },
    buttons: [
      { label: '⬇ Download PNG', class: 'btn-primary', onClick: downloadStrip },
      { label: '📧 Kirim ke Email', class: 'btn-mint', onClick: showEmailModalForPhoto },
      { label: '🎞 Buat GIF', class: 'btn-secondary', onClick: makeGifFromStrip },
      { label: '📷 Take Again', class: 'btn-ghost', onClick: () => { closeModal(); showHelp('Klik 📷 Take Photos untuk sesi baru'); }}
    ],
    wide: true
  });
}

// ============ DOWNLOAD ============
function downloadStrip() {
  const canvas = state.lastStripCanvas;
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `nailong-photostrip-${Date.now()}.png`;
  a.click();
  showHelp('Tersimpan! 🎉 Cek folder Downloads.');
}

// ============ GIF FROM STRIP (animate through photos) ============
async function makeGifFromStrip() {
  if (state.capturedPhotos.length === 0) return;

  // Show loading
  openModal({
    title: 'Bikin GIF... 🎞',
    body: 'Sebentar ya, lagi convert semua foto jadi animasi GIF',
    previewHTML: '<div class="spinner"></div>',
    buttons: [],
    allowClose: false
  });

  // Wait a frame so modal shows
  await new Promise(r => setTimeout(r, 50));

  try {
    const W = 400, H = 300;
    const frame = window.FRAMES.find(f => f.id === state.selectedFrame);

    // Build canvas frames
    const canvases = [];
    for (const photo of state.capturedPhotos) {
      const img = await loadImage(photo.dataURL);
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const cx = c.getContext('2d');
      cx.fillStyle = state.stripColor;
      cx.fillRect(0, 0, W, H);
      drawCover(cx, img, 0, 0, W, H);
      frame.render(cx, 0, 0, W, H, frame, { size: 28, tapeW: 70, tapeH: 16 });
      canvases.push(c);
    }

    const blob = await window.createGifBlob(canvases, 700);
    state.lastGifBlob = blob;
    showGifResult(blob);
  } catch (err) {
    console.error('GIF error', err);
    openModal({
      title: 'GIF Error 😢',
      body: err.message,
      buttons: [{ label: 'OK', class: 'btn-primary', onClick: showResultModal }]
    });
  }
}

function showGifResult(blob) {
  const url = URL.createObjectURL(blob);
  openModal({
    title: 'GIF Done! 🎞',
    body: 'Animated GIF dari foto kamu:',
    previewHTML: `<img src="${url}" alt="GIF">`,
    buttons: [
      { label: '⬇ Download GIF', class: 'btn-primary', onClick: () => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `nailong-gif-${Date.now()}.gif`;
        a.click();
        showHelp('GIF tersimpan!');
      }},
      { label: '📧 Kirim ke Email', class: 'btn-mint', onClick: () => showEmailModalForGif(blob) },
      { label: '← Back', class: 'btn-ghost', onClick: showResultModal }
    ]
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ============ VIDEO RECORDING ============
function confirmToggleVideo() {
  if (state.isCapturing) return;
  if (state.isRecording) {
    stopVideoRecording();
    return;
  }
  openModal({
    title: 'Mulai Rekam Video? 🎥',
    body: 'Video direkam dengan audio sampai kamu klik Stop. Setelah selesai bisa di-download atau di-kirim ke email.',
    buttons: [
      { label: '🔴 Start Recording', class: 'btn-primary', onClick: () => { closeModal(); startVideoRecording(); }},
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
    body: 'Preview dulu, lalu pilih opsi:',
    previewHTML: `<video src="${url}" controls autoplay></video>`,
    buttons: [
      { label: '⬇ Download Video', class: 'btn-primary', onClick: () => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `nailong-video-${Date.now()}.webm`;
        a.click();
        showHelp('Video tersimpan!');
      }},
      { label: '📧 Kirim ke Email', class: 'btn-mint', onClick: () => showEmailModalForVideo(blob) },
      { label: '🔄 Bikin Boomerang', class: 'btn-secondary', onClick: () => makeBoomerang(blob) },
      { label: '🎥 Rekam Lagi', class: 'btn-ghost', onClick: closeModal }
    ]
  });
}

// ============ BOOMERANG (play forward + reverse) ============
async function makeBoomerang(videoBlob) {
  openModal({
    title: 'Bikin Boomerang... 🔄',
    body: 'Sebentar, lagi extract frames dari video',
    previewHTML: '<div class="spinner"></div>',
    buttons: [],
    allowClose: false
  });

  try {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
    });

    const duration = Math.min(video.duration, 3); // max 3 sec
    const fps = 8;
    const totalFrames = Math.floor(duration * fps);
    const W = 400;
    const H = Math.floor(W * (video.videoHeight / video.videoWidth));

    const canvases = [];
    for (let i = 0; i < totalFrames; i++) {
      const t = (i / totalFrames) * duration;
      video.currentTime = t;
      await new Promise(r => video.onseeked = r);
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const cx = c.getContext('2d');
      cx.drawImage(video, 0, 0, W, H);
      canvases.push(c);
    }

    // Reverse (excluding last frame to avoid duplicate)
    const reversed = canvases.slice(0, -1).reverse();
    const boomerangFrames = [...canvases, ...reversed];

    const blob = await window.createGifBlob(boomerangFrames, 1000 / fps);
    state.lastBoomerangBlob = blob;

    const url = URL.createObjectURL(blob);
    openModal({
      title: 'Boomerang Done! 🔄',
      body: 'Maju mundur ala Instagram:',
      previewHTML: `<img src="${url}" alt="Boomerang">`,
      buttons: [
        { label: '⬇ Download Boomerang', class: 'btn-primary', onClick: () => {
          const a = document.createElement('a');
          a.href = url;
          a.download = `nailong-boomerang-${Date.now()}.gif`;
          a.click();
        }},
        { label: '📧 Kirim ke Email', class: 'btn-mint', onClick: () => showEmailModalForGif(blob) },
        { label: '← Back', class: 'btn-ghost', onClick: () => showVideoResult(videoBlob) }
      ]
    });
  } catch (err) {
    openModal({
      title: 'Boomerang Error',
      body: err.message,
      buttons: [{ label: 'OK', class: 'btn-primary', onClick: () => showVideoResult(videoBlob) }]
    });
  }
}

// ============ EMAIL ============
function showEmailModalForPhoto() {
  const blob = dataURLtoBlob(state.lastStripCanvas.toDataURL('image/png'));
  showEmailModal(blob, 'image/png', 'photostrip.png', 'Photo Strip');
}

function showEmailModalForVideo(blob) {
  showEmailModal(blob, blob.type, 'video.webm', 'Video');
}

function showEmailModalForGif(blob) {
  showEmailModal(blob, 'image/gif', 'animation.gif', 'GIF');
}

function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

function showEmailModal(blob, mimeType, filename, kind) {
  const formHTML = `
    <div class="email-form">
      <label for="emailTo">Email Penerima</label>
      <input type="email" id="emailTo" placeholder="contoh@email.com" required>
      <div class="input-error" id="emailToError">Email tidak valid</div>

      <label for="emailName">Nama Penerima (opsional)</label>
      <input type="text" id="emailName" placeholder="Nama si penerima">

      <label for="emailMessage">Pesan (opsional)</label>
      <textarea id="emailMessage" rows="3" placeholder="Halo! Ini foto kita di Nailong Photobooth 🐲"></textarea>
    </div>
  `;

  openModal({
    title: `📧 Kirim ${kind} ke Email`,
    body: 'Isi data berikut, foto akan dikirim sebagai lampiran.',
    formHTML,
    buttons: [
      { label: '📤 Send Email', class: 'btn-primary', id: 'sendEmailBtn', onClick: () => sendEmail(blob, mimeType, filename, kind) },
      { label: 'Cancel', class: 'btn-ghost', onClick: closeModal }
    ]
  });
}

async function sendEmail(blob, mimeType, filename, kind) {
  const to = document.getElementById('emailTo').value.trim();
  const name = document.getElementById('emailName').value.trim();
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
    // Convert blob to base64
    const base64 = await blobToBase64(blob);

    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        name,
        message,
        kind,
        filename,
        attachment: base64,
        mimeType
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to send');
    }

    openModal({
      title: '✓ Email Terkirim!',
      body: `${kind} berhasil dikirim ke <strong>${to}</strong>. Cek inbox-nya ya!`,
      buttons: [{ label: 'Mantap!', class: 'btn-primary', onClick: closeModal }]
    });
  } catch (err) {
    openModal({
      title: 'Email Gagal 😢',
      body: 'Gagal kirim email: ' + err.message + '<br><br>Pastikan backend server jalan & API key sudah diisi di .env',
      buttons: [
        { label: 'Try Again', class: 'btn-primary', onClick: () => showEmailModal(blob, mimeType, filename, kind) },
        { label: 'Cancel', class: 'btn-ghost', onClick: closeModal }
      ]
    });
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataURL = reader.result;
      // Strip the "data:mime/type;base64," prefix
      const base64 = dataURL.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ============ WELCOME ============
function showWelcome() {
  openModal({
    title: 'Hai! Welcome to Nailong Photobooth 🐲',
    body: 'Bikin photo strip lucu dengan wizard interaktif. Ada 4 step: pilih <strong>kamera</strong> → <strong>layout</strong> → <strong>warna</strong> → <strong>frame</strong>. Setiap foto bisa di-retake max 3x kalau gak suka hasilnya.',
    buttons: [
      { label: '✨ Start Wizard', class: 'btn-primary btn-big', onClick: () => {
        closeModal();
        setStep(1);
        showHelp('Step 1: Pilih kamera, klik Test Camera, lalu Confirm Camera');
      }}
    ],
    allowClose: false
  });
}

// ============ BOOTSTRAP ============
async function bootstrap() {
  initUI();

  // Try to load Nailong images first
  await window.loadNailongImages();

  // Initial camera permission + enumerate
  await enumerateCameras();
  populateCameraSelect();

  // Try to start a default camera silently, so welcome page has a preview.
  // If it fails here, DON'T pop the error modal — let user trigger via "Test Camera" instead.
  // This avoids the annoying error popup before user even gets to read Welcome.
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
      // Don't mark cameraTested true — user still needs to confirm in wizard
    } catch (err) {
      // Silently fail. User will see "Click Test Camera" in step 1.
      console.warn('Initial preview failed (this is OK):', err.name, err.message);
      const statusEl = document.getElementById('cameraStatus');
      if (statusEl) {
        statusEl.innerHTML = `⚠ Preview gagal (<code>${err.name}</code>) — coba "Test Camera" setelah tutup app lain yang pake webcam`;
        statusEl.className = 'camera-status testing';
      }
    }
  }

  setStep(0);
  setTimeout(showWelcome, 600);
}

bootstrap();
