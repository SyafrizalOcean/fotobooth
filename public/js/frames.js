/* ============================================
   FRAMES MODULE v2
   Frame yang jauh lebih kaya & mencolok
   Setiap frame: background tebal + multi-layer decorations
   ============================================ */

window.NAILONG_IMAGES = [];

function loadNailongImages() {
  const promises = [];
  for (let i = 1; i <= 4; i++) {
    promises.push(new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `images/nailong${i}.png`;
    }));
  }
  return Promise.all(promises).then(imgs => {
    window.NAILONG_IMAGES = imgs.filter(Boolean);
    return window.NAILONG_IMAGES;
  });
}

// ============ UTILS ============
function drawEmoji(ctx, emoji, x, y, size, rotation = 0) {
  ctx.save();
  ctx.font = `${size}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (rotation) {
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.fillText(emoji, 0, 0);
  } else {
    ctx.fillText(emoji, x, y);
  }
  ctx.restore();
}

function drawTape(ctx, cx, cy, w, h, angle, color) {
  ctx.save();
  ctx.translate(cx + w / 2, cy + h / 2);
  ctx.rotate(angle * Math.PI / 180);
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(-w / 2 + 2, -h / 2 + 3, w, h);
  // Tape body
  ctx.fillStyle = color + 'dd';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // Stripes
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  for (let i = -w / 2; i < w / 2; i += 7) {
    ctx.beginPath();
    ctx.moveTo(i, -h / 2);
    ctx.lineTo(i, h / 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStar(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? size : size * 0.4;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, size * 0.3);
  ctx.bezierCurveTo(-size, -size * 0.5, -size * 1.4, size * 0.3, 0, size);
  ctx.bezierCurveTo(size * 1.4, size * 0.3, size, -size * 0.5, 0, size * 0.3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawCloud(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-size * 0.5, 0, size * 0.5, Math.PI, 0);
  ctx.arc(0, -size * 0.3, size * 0.55, Math.PI, 0);
  ctx.arc(size * 0.55, 0, size * 0.5, Math.PI, 0);
  ctx.lineTo(size, size * 0.3);
  ctx.lineTo(-size, size * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCircle(ctx, x, y, r, color, strokeColor = null) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// ============ FRAME RENDERERS ============

// === BORDER FAT (tebal, banyak hiasan di seluruh pinggir) ===
function drawFatBorderFlowers(ctx, x, y, w, h, frame, opts = {}) {
  const size = opts.size || 70;
  const emojis = frame.overlay;
  // Top row - banyak
  const topCount = Math.max(6, Math.floor(w / (size * 0.9)));
  for (let i = 0; i < topCount; i++) {
    const px = x + (w / topCount) * i + (w / topCount) / 2;
    const rotation = (i % 2) * 15 - 7;
    drawEmoji(ctx, emojis[i % emojis.length], px, y + size * 0.5, size, rotation);
  }
  // Bottom row
  for (let i = 0; i < topCount; i++) {
    const px = x + (w / topCount) * i + (w / topCount) / 2;
    const rotation = (i % 2) * -15 + 7;
    drawEmoji(ctx, emojis[(i + 2) % emojis.length], px, y + h - size * 0.5, size, rotation);
  }
  // Left col
  const sideCount = Math.max(4, Math.floor(h / (size * 1.1)));
  for (let i = 1; i < sideCount - 1; i++) {
    const py = y + (h / sideCount) * i + (h / sideCount) / 2;
    drawEmoji(ctx, emojis[(i + 1) % emojis.length], x + size * 0.5, py, size * 0.85);
    drawEmoji(ctx, emojis[(i + 3) % emojis.length], x + w - size * 0.5, py, size * 0.85);
  }
}

// === SCENE FULL — background tebal seperti pemandangan ===
function drawFullScene(ctx, x, y, w, h, frame, opts = {}) {
  // Background gradient yang TEBAL — menutup pinggir
  const borderW = opts.borderW || Math.min(w, h) * 0.12;

  // Outer scene area
  ctx.save();
  // Top band
  let grad = ctx.createLinearGradient(x, y, x, y + borderW);
  grad.addColorStop(0, frame.bg[0]);
  grad.addColorStop(1, frame.bg[0] + '00');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, borderW);
  // Bottom band
  grad = ctx.createLinearGradient(x, y + h - borderW, x, y + h);
  grad.addColorStop(0, frame.bg[2] + '00');
  grad.addColorStop(1, frame.bg[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y + h - borderW, w, borderW);
  // Left
  grad = ctx.createLinearGradient(x, y, x + borderW, y);
  grad.addColorStop(0, frame.bg[1]);
  grad.addColorStop(1, frame.bg[1] + '00');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, borderW, h);
  // Right
  grad = ctx.createLinearGradient(x + w - borderW, y, x + w, y);
  grad.addColorStop(0, frame.bg[1] + '00');
  grad.addColorStop(1, frame.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(x + w - borderW, y, borderW, h);
  ctx.restore();

  const size = opts.size || 75;
  const e = frame.overlay;

  // Corner decorations BESAR
  drawEmoji(ctx, e[0], x + size * 0.7, y + size * 0.7, size * 1.2, -15);
  drawEmoji(ctx, e[1], x + w - size * 0.7, y + size * 0.7, size * 1.2, 15);
  drawEmoji(ctx, e[2], x + size * 0.7, y + h - size * 0.7, size * 1.2, 15);
  drawEmoji(ctx, e[3], x + w - size * 0.7, y + h - size * 0.7, size * 1.2, -15);

  // Mid edge decorations
  drawEmoji(ctx, e[4], x + w * 0.5, y + size * 0.4, size * 0.9);
  drawEmoji(ctx, e[5], x + w * 0.5, y + h - size * 0.4, size * 0.9);
  drawEmoji(ctx, e[6] || e[0], x + size * 0.4, y + h * 0.5, size * 0.8);
  drawEmoji(ctx, e[7] || e[1], x + w - size * 0.4, y + h * 0.5, size * 0.8);
}

// === LAYERED — multi-layer (background warna + tape + corner + sparkles) ===
function drawLayeredFrame(ctx, x, y, w, h, frame, opts = {}) {
  const borderColor = frame.borderColor || '#ff8fb1';
  const accentColor = frame.accentColor || '#ffd23f';
  const size = opts.size || 65;

  // Layer 1: Tebal solid border luar
  const borderW = Math.min(w, h) * 0.07;
  ctx.fillStyle = borderColor;
  ctx.fillRect(x, y, w, borderW); // top
  ctx.fillRect(x, y + h - borderW, w, borderW); // bottom
  ctx.fillRect(x, y, borderW, h); // left
  ctx.fillRect(x + w - borderW, y, borderW, h); // right

  // Layer 2: Inner accent line
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(x + borderW, y + borderW, w - borderW * 2, h - borderW * 2);

  // Layer 3: Washi tape di 4 sudut
  drawTape(ctx, x - 25, y - 8, 160, 36, -22, accentColor);
  drawTape(ctx, x + w - 135, y - 8, 160, 36, 22, borderColor);
  drawTape(ctx, x - 25, y + h - 28, 160, 36, 18, accentColor);
  drawTape(ctx, x + w - 135, y + h - 28, 160, 36, -18, borderColor);

  // Layer 4: Corner stickers besar
  const e = frame.overlay;
  drawEmoji(ctx, e[0], x + 50, y + 50, size, -10);
  drawEmoji(ctx, e[1], x + w - 50, y + 50, size, 10);
  drawEmoji(ctx, e[2], x + 50, y + h - 50, size, 10);
  drawEmoji(ctx, e[3], x + w - 50, y + h - 50, size, -10);

  // Layer 5: Random small sparkles & dots
  ctx.save();
  for (let i = 0; i < 15; i++) {
    const px = x + Math.random() * w;
    const py = y + Math.random() * h;
    const ix = (px - x) / w;
    const iy = (py - y) / h;
    // skip middle area
    if (ix > 0.2 && ix < 0.8 && iy > 0.2 && iy < 0.8) continue;
    drawCircle(ctx, px, py, 4 + Math.random() * 4, accentColor + 'cc');
  }
  ctx.restore();
}

// === CAFE THEME — full theme dengan elements yang detail ===
function drawCafeTheme(ctx, x, y, w, h, frame, opts = {}) {
  // Background: wood texture vibe
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(x, y, w, h);
  // Wood lines
  ctx.strokeStyle = '#5a3818';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(x, y + (h / 8) * i + Math.random() * 5);
    ctx.lineTo(x + w, y + (h / 8) * i + Math.random() * 5);
    ctx.stroke();
  }

  // Inner cream "menu paper" area
  const pad = Math.min(w, h) * 0.08;
  ctx.fillStyle = '#fff5e1';
  ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2);
  ctx.strokeStyle = '#8b6f47';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 5]);
  ctx.strokeRect(x + pad, y + pad, w - pad * 2, h - pad * 2);
  ctx.setLineDash([]);

  // Coffee elements
  const size = opts.size || 70;
  drawEmoji(ctx, '☕', x + size * 0.7, y + size * 0.7, size * 1.3, -10);
  drawEmoji(ctx, '🥐', x + w - size * 0.7, y + size * 0.7, size * 1.3, 10);
  drawEmoji(ctx, '🍰', x + size * 0.7, y + h - size * 0.7, size * 1.3);
  drawEmoji(ctx, '🍪', x + w - size * 0.7, y + h - size * 0.7, size * 1.3);
  drawEmoji(ctx, '☁️', x + w * 0.5, y + size * 0.4, size);
  // "Coffee shop" text-like decorations
  ctx.fillStyle = '#5a3818';
  ctx.font = 'italic bold 28px Fraunces, serif';
  ctx.textAlign = 'center';
  ctx.fillText('☕ Cafe ☕', x + w * 0.5, y + h - 25);
}

// === SUMMER / TROPICAL FULL ===
function drawTropicalTheme(ctx, x, y, w, h, frame, opts = {}) {
  // Sky → sand gradient
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#87ceeb');
  grad.addColorStop(0.4, '#90e0ef');
  grad.addColorStop(0.7, '#ffd6a5');
  grad.addColorStop(1, '#fec89a');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Sun
  drawCircle(ctx, x + w * 0.85, y + h * 0.15, 35, '#ffd23f', '#1a1a1a');
  // Sun rays
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.85 + Math.cos(angle) * 40, y + h * 0.15 + Math.sin(angle) * 40);
    ctx.lineTo(x + w * 0.85 + Math.cos(angle) * 55, y + h * 0.15 + Math.sin(angle) * 55);
    ctx.stroke();
  }

  // Palm trees on sides
  const size = opts.size || 90;
  drawEmoji(ctx, '🌴', x + size * 0.5, y + h * 0.4, size * 1.5);
  drawEmoji(ctx, '🌴', x + w - size * 0.5, y + h * 0.55, size * 1.5);
  // Tropical fruits & elements
  drawEmoji(ctx, '🍍', x + size * 0.7, y + h - size * 0.7, size * 1.1, -8);
  drawEmoji(ctx, '🥥', x + w - size * 0.7, y + h - size * 0.7, size * 1.1, 8);
  drawEmoji(ctx, '🦩', x + w * 0.5, y + h - 60, size * 0.9);
  drawEmoji(ctx, '🌺', x + size * 0.7, y + size * 0.7, size * 0.85);

  // Clouds
  drawCloud(ctx, x + w * 0.3, y + 40, 25, '#fff');
  drawCloud(ctx, x + w * 0.55, y + 25, 22, '#fff');
}

// === BIRTHDAY PARTY FULL ===
function drawBirthdayTheme(ctx, x, y, w, h, frame, opts = {}) {
  // Pink-purple gradient bg
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#ffafcc');
  grad.addColorStop(0.5, '#ffc8dd');
  grad.addColorStop(1, '#cdb4db');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Confetti bg
  for (let i = 0; i < 30; i++) {
    const px = x + Math.random() * w;
    const py = y + Math.random() * h;
    const ix = (px - x) / w;
    const iy = (py - y) / h;
    if (ix > 0.25 && ix < 0.75 && iy > 0.25 && iy < 0.75) continue;
    const colors = ['#ffd23f', '#ff4081', '#7b2cbf', '#06d6a0'];
    ctx.fillStyle = colors[i % colors.length];
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.random() * Math.PI);
    ctx.fillRect(-4, -8, 8, 16);
    ctx.restore();
  }

  // Stars on background
  for (let i = 0; i < 8; i++) {
    drawStar(ctx, x + Math.random() * w * 0.2, y + Math.random() * h, 15, '#ffd23f');
    drawStar(ctx, x + w - Math.random() * w * 0.2, y + Math.random() * h, 15, '#ff4081');
  }

  const size = opts.size || 95;
  // Big corner emojis
  drawEmoji(ctx, '🎂', x + size * 0.65, y + size * 0.65, size * 1.4, -12);
  drawEmoji(ctx, '🎉', x + w - size * 0.65, y + size * 0.65, size * 1.4, 12);
  drawEmoji(ctx, '🎈', x + size * 0.65, y + h - size * 0.65, size * 1.4, 8);
  drawEmoji(ctx, '🎁', x + w - size * 0.65, y + h - size * 0.65, size * 1.4, -8);
  // Top mid
  drawEmoji(ctx, '🥳', x + w * 0.5, y + size * 0.5, size * 1.1);
  drawEmoji(ctx, '🪩', x + w * 0.5, y + h - size * 0.5, size * 1.1);
}

// === SPACE GALAXY ===
function drawGalaxyTheme(ctx, x, y, w, h, frame, opts = {}) {
  // Deep space gradient
  const grad = ctx.createRadialGradient(x + w * 0.5, y + h * 0.5, 0, x + w * 0.5, y + h * 0.5, w);
  grad.addColorStop(0, '#3a0ca3');
  grad.addColorStop(0.5, '#240046');
  grad.addColorStop(1, '#10002b');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Stars (lots)
  for (let i = 0; i < 100; i++) {
    const px = x + Math.random() * w;
    const py = y + Math.random() * h;
    const ix = (px - x) / w;
    const iy = (py - y) / h;
    if (ix > 0.2 && ix < 0.8 && iy > 0.2 && iy < 0.8) continue;
    ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.7})`;
    ctx.beginPath();
    ctx.arc(px, py, Math.random() * 2 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Big stars
  for (let i = 0; i < 6; i++) {
    drawStar(ctx, x + Math.random() * w * 0.15, y + Math.random() * h, 12, '#fff');
    drawStar(ctx, x + w - Math.random() * w * 0.15, y + Math.random() * h, 12, '#ffd23f');
  }

  const size = opts.size || 90;
  drawEmoji(ctx, '🚀', x + size * 0.7, y + size * 0.7, size * 1.4, -25);
  drawEmoji(ctx, '🌙', x + w - size * 0.7, y + size * 0.7, size * 1.4);
  drawEmoji(ctx, '🪐', x + size * 0.7, y + h - size * 0.7, size * 1.4, 15);
  drawEmoji(ctx, '🛸', x + w - size * 0.7, y + h - size * 0.7, size * 1.4);
  drawEmoji(ctx, '👽', x + w * 0.5, y + h - size * 0.5, size * 1.1);
  drawEmoji(ctx, '⭐', x + w * 0.5, y + size * 0.5, size);
}

// === KAWAII PINK ===
function drawKawaiiTheme(ctx, x, y, w, h, frame, opts = {}) {
  // Pink check pattern bg
  ctx.fillStyle = '#ffe5ec';
  ctx.fillRect(x, y, w, h);
  // Check pattern
  ctx.fillStyle = '#ffc8dd';
  const cs = 30;
  for (let i = 0; i < w / cs; i++) {
    for (let j = 0; j < h / cs; j++) {
      if ((i + j) % 2 === 0) ctx.fillRect(x + i * cs, y + j * cs, cs, cs);
    }
  }

  // Pink heart border
  for (let i = 0; i < 8; i++) {
    drawHeart(ctx, x + (w / 8) * i + (w / 16), y + 30, 14, '#ff8fb1');
    drawHeart(ctx, x + (w / 8) * i + (w / 16), y + h - 30, 14, '#ff4081');
  }
  for (let i = 1; i < 5; i++) {
    drawHeart(ctx, x + 25, y + (h / 5) * i, 14, '#ff8fb1');
    drawHeart(ctx, x + w - 25, y + (h / 5) * i, 14, '#ff8fb1');
  }

  // Inner solid bg patch (where photo will be)
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(x + 65, y + 65, w - 130, h - 130);

  const size = opts.size || 75;
  drawEmoji(ctx, '🐰', x + size * 0.7, y + size * 0.7, size * 1.4, -15);
  drawEmoji(ctx, '🍓', x + w - size * 0.7, y + size * 0.7, size * 1.3, 15);
  drawEmoji(ctx, '🧸', x + size * 0.7, y + h - size * 0.7, size * 1.3);
  drawEmoji(ctx, '🎀', x + w - size * 0.7, y + h - size * 0.7, size * 1.4, 10);
  drawEmoji(ctx, '💕', x + w * 0.5, y + 35, size * 0.9);
  drawEmoji(ctx, '🍡', x + w * 0.5, y + h - 35, size * 0.9);
}

// === RETRO 90s ===
function drawRetroTheme(ctx, x, y, w, h, frame, opts = {}) {
  // Memphis style geometric bg
  ctx.fillStyle = '#fff5d6';
  ctx.fillRect(x, y, w, h);

  // Colorful shapes
  const shapes = [
    { c: '#ff4081', x: 0.1, y: 0.1, r: 30 },
    { c: '#06d6a0', x: 0.92, y: 0.12, r: 25 },
    { c: '#ffd23f', x: 0.08, y: 0.92, r: 28 },
    { c: '#7b2cbf', x: 0.95, y: 0.88, r: 30 }
  ];
  shapes.forEach(s => drawCircle(ctx, x + s.x * w, y + s.y * h, s.r, s.c, '#1a1a1a'));

  // Squiggle borders
  ctx.strokeStyle = '#7b2cbf';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i < w; i += 8) {
    const py = y + 25 + Math.sin(i * 0.1) * 8;
    if (i === 0) ctx.moveTo(x + i, py);
    else ctx.lineTo(x + i, py);
  }
  ctx.stroke();
  ctx.strokeStyle = '#ff4081';
  ctx.beginPath();
  for (let i = 0; i < w; i += 8) {
    const py = y + h - 25 + Math.sin(i * 0.1) * 8;
    if (i === 0) ctx.moveTo(x + i, py);
    else ctx.lineTo(x + i, py);
  }
  ctx.stroke();

  // Triangle patterns at sides
  for (let i = 0; i < 6; i++) {
    const py = y + 70 + (h - 140) * (i / 5);
    // Left triangle
    ctx.fillStyle = ['#ffd23f', '#06d6a0', '#ff4081'][i % 3];
    ctx.beginPath();
    ctx.moveTo(x + 8, py);
    ctx.lineTo(x + 22, py - 10);
    ctx.lineTo(x + 22, py + 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Right
    ctx.fillStyle = ['#7b2cbf', '#ffd23f', '#06d6a0'][i % 3];
    ctx.beginPath();
    ctx.moveTo(x + w - 8, py);
    ctx.lineTo(x + w - 22, py - 10);
    ctx.lineTo(x + w - 22, py + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  const size = opts.size || 65;
  drawEmoji(ctx, '✨', x + 80, y + 80, size);
  drawEmoji(ctx, '💿', x + w - 80, y + 80, size * 1.3);
  drawEmoji(ctx, '📼', x + 80, y + h - 80, size * 1.3);
  drawEmoji(ctx, '🎮', x + w - 80, y + h - 80, size * 1.3);
}

// === NAILONG SPECIAL — pakai gambar Anda + frame mencolok ===
function drawNailongFrame(ctx, x, y, w, h, frame, opts = {}) {
  // Yellow background tipis
  ctx.fillStyle = '#fff8c5';
  ctx.fillRect(x, y, w, h);

  // Yellow border tebal
  const borderW = Math.min(w, h) * 0.08;
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(x, y, w, borderW);
  ctx.fillRect(x, y + h - borderW, w, borderW);
  ctx.fillRect(x, y, borderW, h);
  ctx.fillRect(x + w - borderW, y, borderW, h);

  // Inner border outline
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 4;
  ctx.strokeRect(x + borderW, y + borderW, w - borderW * 2, h - borderW * 2);

  // Nailong images at 4 corners (BESAR)
  const imgs = window.NAILONG_IMAGES;
  const size = opts.size || Math.min(w, h) * 0.18;
  if (imgs && imgs.length > 0) {
    const positions = [
      { x: x + 10, y: y + 10 },
      { x: x + w - size - 10, y: y + 10 },
      { x: x + 10, y: y + h - size - 10 },
      { x: x + w - size - 10, y: y + h - size - 10 }
    ];
    positions.forEach((p, i) => {
      const img = imgs[i % imgs.length];
      ctx.drawImage(img, p.x, p.y, size, size);
    });
  } else {
    drawEmoji(ctx, '🐲', x + size * 0.55, y + size * 0.55, size * 0.9);
    drawEmoji(ctx, '🐲', x + w - size * 0.55, y + size * 0.55, size * 0.9);
    drawEmoji(ctx, '🐲', x + size * 0.55, y + h - size * 0.55, size * 0.9);
    drawEmoji(ctx, '🐲', x + w - size * 0.55, y + h - size * 0.55, size * 0.9);
  }

  // Sparkles around
  for (let i = 0; i < 12; i++) {
    const px = x + Math.random() * w;
    const py = y + Math.random() * h;
    const ix = (px - x) / w;
    const iy = (py - y) / h;
    if (ix > 0.25 && ix < 0.75 && iy > 0.25 && iy < 0.75) continue;
    drawEmoji(ctx, '✨', px, py, 25 + Math.random() * 15);
  }
}

// === RAINBOW DREAM ===
function drawRainbowTheme(ctx, x, y, w, h, frame, opts = {}) {
  // Pastel rainbow gradient
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#ffadad');
  grad.addColorStop(0.2, '#ffd6a5');
  grad.addColorStop(0.4, '#fdffb6');
  grad.addColorStop(0.6, '#caffbf');
  grad.addColorStop(0.8, '#9bf6ff');
  grad.addColorStop(1, '#bdb2ff');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Clouds at top
  drawCloud(ctx, x + w * 0.15, y + 50, 32, '#fff');
  drawCloud(ctx, x + w * 0.85, y + 45, 28, '#fff');
  drawCloud(ctx, x + w * 0.5, y + 30, 25, '#fff');

  // Rainbow arc
  const rainbow = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'];
  ctx.save();
  ctx.lineWidth = 14;
  rainbow.forEach((color, i) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(x + w * 0.5, y + h + 100, h * 0.85 + i * 16, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  });
  ctx.restore();

  const size = opts.size || 80;
  drawEmoji(ctx, '🌈', x + w * 0.5, y + size * 0.5, size * 1.2);
  drawEmoji(ctx, '🦄', x + size * 0.7, y + h - size * 0.7, size * 1.4, -10);
  drawEmoji(ctx, '⭐', x + w - size * 0.7, y + h - size * 0.7, size * 1.3, 10);
  drawEmoji(ctx, '🦋', x + size * 0.7, y + size * 1.5, size, 15);
  drawEmoji(ctx, '💫', x + w - size * 0.7, y + size * 1.5, size, -15);
}

// === Y2K / CYBER ===
function drawY2KTheme(ctx, x, y, w, h, frame, opts = {}) {
  // Cyber gradient bg
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#ff006e');
  grad.addColorStop(0.5, '#8338ec');
  grad.addColorStop(1, '#3a86ff');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Grid pattern (cyber)
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  const gs = 30;
  for (let i = 0; i < w / gs; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * gs, y);
    ctx.lineTo(x + i * gs, y + h);
    ctx.stroke();
  }
  for (let i = 0; i < h / gs; i++) {
    ctx.beginPath();
    ctx.moveTo(x, y + i * gs);
    ctx.lineTo(x + w, y + i * gs);
    ctx.stroke();
  }

  // Cyber corner brackets
  ctx.strokeStyle = '#00f5ff';
  ctx.lineWidth = 6;
  const cs = 60;
  // TL
  ctx.beginPath();
  ctx.moveTo(x + 20, y + 20 + cs);
  ctx.lineTo(x + 20, y + 20);
  ctx.lineTo(x + 20 + cs, y + 20);
  ctx.stroke();
  // TR
  ctx.beginPath();
  ctx.moveTo(x + w - 20 - cs, y + 20);
  ctx.lineTo(x + w - 20, y + 20);
  ctx.lineTo(x + w - 20, y + 20 + cs);
  ctx.stroke();
  // BL
  ctx.beginPath();
  ctx.moveTo(x + 20, y + h - 20 - cs);
  ctx.lineTo(x + 20, y + h - 20);
  ctx.lineTo(x + 20 + cs, y + h - 20);
  ctx.stroke();
  // BR
  ctx.beginPath();
  ctx.moveTo(x + w - 20 - cs, y + h - 20);
  ctx.lineTo(x + w - 20, y + h - 20);
  ctx.lineTo(x + w - 20, y + h - 20 - cs);
  ctx.stroke();

  const size = opts.size || 75;
  drawEmoji(ctx, '💖', x + 60, y + 60, size * 1.2);
  drawEmoji(ctx, '⚡', x + w - 60, y + 60, size * 1.2, 15);
  drawEmoji(ctx, '🦋', x + 60, y + h - 60, size * 1.2);
  drawEmoji(ctx, '✨', x + w - 60, y + h - 60, size * 1.2);
}

// === SAKURA JAPAN ===
function drawSakuraTheme(ctx, x, y, w, h, frame, opts = {}) {
  // Pink gradient
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#ffe0ec');
  grad.addColorStop(0.5, '#ffc8dd');
  grad.addColorStop(1, '#fbb1d0');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Falling sakura petals (banyak!)
  for (let i = 0; i < 25; i++) {
    const px = x + Math.random() * w;
    const py = y + Math.random() * h;
    const ix = (px - x) / w;
    const iy = (py - y) / h;
    if (ix > 0.22 && ix < 0.78 && iy > 0.22 && iy < 0.78) continue;
    drawEmoji(ctx, '🌸', px, py, 25 + Math.random() * 20, Math.random() * 60 - 30);
  }

  // Big corner sakura branches
  const size = opts.size || 85;
  drawEmoji(ctx, '🌸', x + size * 0.6, y + size * 0.6, size * 1.5, -10);
  drawEmoji(ctx, '🌸', x + w - size * 0.6, y + size * 0.6, size * 1.5, 10);
  drawEmoji(ctx, '🌸', x + size * 0.6, y + h - size * 0.6, size * 1.5, 8);
  drawEmoji(ctx, '🌸', x + w - size * 0.6, y + h - size * 0.6, size * 1.5, -8);
  drawEmoji(ctx, '🎋', x + w * 0.5, y + size * 0.5, size);
  drawEmoji(ctx, '⛩️', x + w * 0.5, y + h - size * 0.5, size);
}

// ============ FRAMES DEFINITION ============
window.FRAMES = [
  // === BORDER FAT (tebal & banyak) ===
  { id: 'border-flowers', cat: 'border', label: 'Flower Garden', overlay: ['🌸','🌺','🌷','🌹','💐','🌻'], render: drawFatBorderFlowers },
  { id: 'border-stars', cat: 'border', label: 'Star Shower', overlay: ['⭐','✨','🌟','💫','⭐','✨'], render: drawFatBorderFlowers },
  { id: 'border-hearts', cat: 'border', label: 'Love Letter', overlay: ['💖','💕','💗','💓','💝','❤️'], render: drawFatBorderFlowers },
  { id: 'border-party', cat: 'border', label: 'Party Vibe', overlay: ['🎉','🎊','🎈','🥳','🪩','🎁'], render: drawFatBorderFlowers },
  { id: 'border-food', cat: 'border', label: 'Sweet Tooth', overlay: ['🍩','🧁','🍰','🍭','🍪','🍬'], render: drawFatBorderFlowers },
  { id: 'border-clouds', cat: 'border', label: 'Dreamy Sky', overlay: ['☁️','⛅','🌤️','☁️','⛅','🌥️'], render: drawFatBorderFlowers },

  // === SCENE FULL (background pemandangan tebal) ===
  { id: 'scene-sunset', cat: 'scene', label: 'Golden Sunset', bg: ['#ff9a8b','#ffc8a2','#ffd86f'], overlay: ['☀️','🌴','🌴','🦩','🌅','✨','🏖️','🌊'], render: drawFullScene },
  { id: 'scene-ocean', cat: 'scene', label: 'Deep Ocean', bg: ['#48cae4','#90e0ef','#caf0f8'], overlay: ['🌊','🐠','🐚','🐬','🏝️','🐢','🦀','🐙'], render: drawFullScene },
  { id: 'scene-forest', cat: 'scene', label: 'Magic Forest', bg: ['#52b788','#74c69d','#b7e4c7'], overlay: ['🌳','🍄','🦌','🌿','🦋','🌲','🐿️','🍃'], render: drawFullScene },
  { id: 'scene-city', cat: 'scene', label: 'Neon City', bg: ['#1e1b4b','#4a4e69','#22223b'], overlay: ['🌃','🏙️','🌆','💡','🚕','🏢','🌉','🌌'], render: drawFullScene },
  { id: 'scene-tropical', cat: 'scene', label: 'Tropical Beach', render: drawTropicalTheme },

  // === LAYERED FRAMES (multi-layer mencolok) ===
  { id: 'layer-pink-gold', cat: 'layered', label: 'Pink & Gold', borderColor: '#ff8fb1', accentColor: '#ffd23f', overlay: ['🌸','✨','💖','🌟'], render: drawLayeredFrame },
  { id: 'layer-mint-coral', cat: 'layered', label: 'Mint Coral', borderColor: '#06d6a0', accentColor: '#ff6b6b', overlay: ['🌿','🌺','🍃','💕'], render: drawLayeredFrame },
  { id: 'layer-purple-yellow', cat: 'layered', label: 'Purple Sun', borderColor: '#9775fa', accentColor: '#ffd43b', overlay: ['🪻','⭐','💜','✨'], render: drawLayeredFrame },
  { id: 'layer-sky-pink', cat: 'layered', label: 'Sky Candy', borderColor: '#74c0fc', accentColor: '#ff8fb1', overlay: ['☁️','💗','🦋','🌸'], render: drawLayeredFrame },
  { id: 'layer-black-gold', cat: 'layered', label: 'Black & Gold', borderColor: '#1a1a1a', accentColor: '#ffd700', overlay: ['⭐','✨','🌟','💫'], render: drawLayeredFrame },

  // === THEMED (kayak fotobooth cafe/mall) ===
  { id: 'theme-cafe', cat: 'themed', label: 'Coffee Shop', render: drawCafeTheme },
  { id: 'theme-tropical', cat: 'themed', label: 'Tropical Vibe', render: drawTropicalTheme },
  { id: 'theme-birthday', cat: 'themed', label: 'Birthday Bash', render: drawBirthdayTheme },
  { id: 'theme-galaxy', cat: 'themed', label: 'Space Galaxy', render: drawGalaxyTheme },
  { id: 'theme-kawaii', cat: 'themed', label: 'Kawaii Pink', render: drawKawaiiTheme },
  { id: 'theme-retro', cat: 'themed', label: 'Retro 90s', render: drawRetroTheme },
  { id: 'theme-rainbow', cat: 'themed', label: 'Rainbow Dream', render: drawRainbowTheme },
  { id: 'theme-y2k', cat: 'themed', label: 'Y2K Cyber', render: drawY2KTheme },
  { id: 'theme-sakura', cat: 'themed', label: 'Sakura Japan', render: drawSakuraTheme },
  { id: 'theme-nailong', cat: 'themed', label: 'Nailong VIP', render: drawNailongFrame }
];

// Render thumbnail preview for sidebar
window.renderFramePreview = function(canvas, frame) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width = 200;
  const H = canvas.height = 150;

  // Step 1: Draw frame at full size (background)
  try {
    frame.render(ctx, 0, 0, W, H, frame, { size: 26, tapeW: 60, tapeH: 14, borderW: 12 });
  } catch (e) {
    console.error('Preview error', frame.id, e);
  }

  // Step 2: Draw photo placeholder on top, inset to center (sama seperti final strip)
  const inset = 0.15;
  const px = W * inset;
  const py = H * inset;
  const iw = W * (1 - inset * 2);
  const ih = H * (1 - inset * 2);
  // White paper backing
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px - 3, py - 3, iw + 6, ih + 6);
  // Photo placeholder (gray gradient to look like a "photo")
  const g = ctx.createLinearGradient(px, py, px + iw, py + ih);
  g.addColorStop(0, '#cccccc');
  g.addColorStop(1, '#999999');
  ctx.fillStyle = g;
  ctx.fillRect(px, py, iw, ih);
  // Photo border
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, iw, ih);
};

window.loadNailongImages = loadNailongImages;
