/* ============================================
   FRAMES MODULE
   Definisi semua frame + rendering functions
   ============================================ */

// Cache untuk Nailong images (dimuat dari /images/nailong1.png .. nailong4.png)
window.NAILONG_IMAGES = [];

function loadNailongImages() {
  const promises = [];
  for (let i = 1; i <= 4; i++) {
    promises.push(new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null); // gracefully skip missing
      img.src = `images/nailong${i}.png`;
    }));
  }
  return Promise.all(promises).then(imgs => {
    window.NAILONG_IMAGES = imgs.filter(Boolean);
    return window.NAILONG_IMAGES;
  });
}

// ============ DRAWING UTILS ============
function drawEmoji(ctx, emoji, x, y, size) {
  ctx.font = `${size}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
}

function drawTape(ctx, cx, cy, w, h, angle, color) {
  ctx.save();
  ctx.translate(cx + w / 2, cy + h / 2);
  ctx.rotate(angle * Math.PI / 180);
  ctx.fillStyle = color + 'cc';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  for (let i = -w / 2; i < w / 2; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, -h / 2);
    ctx.lineTo(i, h / 2);
    ctx.stroke();
  }
  ctx.restore();
}

// ============ FRAME RENDERERS ============

function drawBorderEmojis(ctx, x, y, w, h, frame, opts = {}) {
  const size = opts.size || 50;
  const e = frame.overlay;
  const cols = 5;
  for (let i = 0; i < cols; i++) {
    const px = x + (w / (cols + 1)) * (i + 1);
    drawEmoji(ctx, e[i % e.length], px, y + size * 0.5, size);
    drawEmoji(ctx, e[(i + 3) % e.length], px, y + h - size * 0.5, size);
  }
  const rows = 3;
  for (let i = 0; i < rows; i++) {
    const py = y + (h / (rows + 1)) * (i + 1);
    drawEmoji(ctx, e[(i + 1) % e.length], x + size * 0.5, py, size);
    drawEmoji(ctx, e[(i + 4) % e.length], x + w - size * 0.5, py, size);
  }
}

function drawSceneFrame(ctx, x, y, w, h, frame, opts = {}) {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, frame.bg[0] + 'aa');
  grad.addColorStop(0.5, 'transparent');
  grad.addColorStop(1, frame.bg[2] + 'aa');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  const size = opts.size || 55;
  const e = frame.overlay;
  drawEmoji(ctx, e[0], x + size * 0.7, y + size * 0.7, size);
  drawEmoji(ctx, e[1], x + w - size * 0.7, y + size * 0.7, size);
  drawEmoji(ctx, e[2], x + size * 0.7, y + h - size * 0.7, size);
  drawEmoji(ctx, e[3], x + w - size * 0.7, y + h - size * 0.7, size);
  drawEmoji(ctx, e[4], x + w * 0.5, y + size * 0.5, size * 0.7);
  drawEmoji(ctx, e[5], x + w * 0.5, y + h - size * 0.5, size * 0.7);
}

function drawCornerCharacters(ctx, x, y, w, h, frame, opts = {}) {
  const size = opts.size || 70;
  const e = frame.overlay;
  const positions = [
    { x: x + size * 0.7, y: y + size * 0.7 },
    { x: x + w - size * 0.7, y: y + size * 0.7 },
    { x: x + size * 0.7, y: y + h - size * 0.7 },
    { x: x + w - size * 0.7, y: y + h - size * 0.7 }
  ];
  positions.forEach((p, i) => drawEmoji(ctx, e[i % e.length], p.x, p.y, size));
}

function drawNailongFrame(ctx, x, y, w, h, frame, opts = {}) {
  const size = opts.size || 90;
  const imgs = window.NAILONG_IMAGES;

  if (imgs && imgs.length > 0) {
    const positions = [
      { x: x + 8, y: y + 8 },
      { x: x + w - size - 8, y: y + 8 },
      { x: x + 8, y: y + h - size - 8 },
      { x: x + w - size - 8, y: y + h - size - 8 }
    ];
    positions.forEach((p, i) => {
      const img = imgs[i % imgs.length];
      ctx.drawImage(img, p.x, p.y, size, size);
    });
  } else {
    const positions = [
      { x: x + size * 0.6, y: y + size * 0.6 },
      { x: x + w - size * 0.6, y: y + size * 0.6 },
      { x: x + size * 0.6, y: y + h - size * 0.6 },
      { x: x + w - size * 0.6, y: y + h - size * 0.6 }
    ];
    positions.forEach(p => drawEmoji(ctx, '🐲', p.x, p.y, size));
  }

  drawEmoji(ctx, '✨', x + w * 0.5, y + size * 0.4, size * 0.4);
  drawEmoji(ctx, '✨', x + w * 0.5, y + h - size * 0.4, size * 0.4);
}

function drawWashiTape(ctx, x, y, w, h, frame, opts = {}) {
  const tapeW = opts.tapeW || 140;
  const tapeH = opts.tapeH || 32;
  const colors = ['#ff8fb1', '#ffd23f', '#b8e0d2', '#c8b6ff'];
  drawTape(ctx, x - 20, y - 5, tapeW, tapeH, -20, colors[0]);
  drawTape(ctx, x + w - tapeW + 20, y - 5, tapeW, tapeH, 20, colors[1]);
  drawTape(ctx, x - 20, y + h - tapeH + 5, tapeW, tapeH, 15, colors[2]);
  drawTape(ctx, x + w - tapeW + 20, y + h - tapeH + 5, tapeW, tapeH, -15, colors[3]);
}

function drawPolaroid(ctx, x, y, w, h, frame, opts = {}) {
  const size = opts.size || 40;
  const stickers = ['📷', '💌', '🌟', '💖'];
  drawEmoji(ctx, stickers[0], x + size * 0.9, y + size * 0.9, size);
  drawEmoji(ctx, stickers[1], x + w - size * 0.9, y + size * 0.9, size);
  drawEmoji(ctx, stickers[2], x + size * 0.9, y + h - size * 0.9, size);
  drawEmoji(ctx, stickers[3], x + w - size * 0.9, y + h - size * 0.9, size);
}

function drawDoodleFrame(ctx, x, y, w, h, frame, opts = {}) {
  ctx.save();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(x + 12, y + 12, w - 24, h - 24);
  ctx.setLineDash([]);
  const size = opts.size || 45;
  const e = frame.overlay;
  drawEmoji(ctx, e[0], x + size * 0.7, y + size * 0.7, size);
  drawEmoji(ctx, e[1], x + w - size * 0.7, y + size * 0.7, size);
  drawEmoji(ctx, e[2], x + size * 0.7, y + h - size * 0.7, size);
  drawEmoji(ctx, e[3], x + w - size * 0.7, y + h - size * 0.7, size);
  drawEmoji(ctx, e[4], x + w * 0.5, y + size * 0.5, size);
  drawEmoji(ctx, e[5], x + w * 0.5, y + h - size * 0.5, size);
  ctx.restore();
}

function drawTapeStars(ctx, x, y, w, h, frame, opts = {}) {
  const tapeW = opts.tapeW || 160;
  const tapeH = opts.tapeH || 28;
  drawTape(ctx, x + w / 2 - tapeW / 2, y - 10, tapeW, tapeH, -3, '#ffd23f');
  drawTape(ctx, x + w / 2 - tapeW / 2, y + h - tapeH + 8, tapeW, tapeH, 3, '#ff8fb1');
  const size = opts.size || 50;
  const e = frame.overlay;
  drawEmoji(ctx, e[0], x + size * 0.8, y + size, size);
  drawEmoji(ctx, e[1], x + w - size * 0.8, y + size, size);
  drawEmoji(ctx, e[2], x + size * 0.8, y + h - size, size);
  drawEmoji(ctx, e[3], x + w - size * 0.8, y + h - size, size);
}

function drawFilmFrame(ctx, x, y, w, h, frame, opts = {}) {
  ctx.save();
  ctx.fillStyle = '#1a1a1a';
  const stripW = Math.max(20, w * 0.04);
  const holeW = stripW * 0.5;
  const holeH = stripW * 0.65;
  const gap = stripW * 0.45;
  ctx.fillRect(x, y, stripW, h);
  ctx.fillRect(x + w - stripW, y, stripW, h);
  ctx.fillStyle = '#fffdf5';
  const totalH = holeH + gap;
  const rows = Math.floor((h - gap) / totalH);
  const startY = y + (h - rows * totalH + gap) / 2;
  for (let i = 0; i < rows; i++) {
    const py = startY + i * totalH;
    ctx.fillRect(x + (stripW - holeW) / 2, py, holeW, holeH);
    ctx.fillRect(x + w - stripW + (stripW - holeW) / 2, py, holeW, holeH);
  }
  ctx.restore();
}

function drawStickerExplosion(ctx, x, y, w, h, frame, opts = {}) {
  const e = frame.overlay;
  const positions = [
    { x: 0.08, y: 0.12, s: 1.2 },
    { x: 0.92, y: 0.15, s: 0.9 },
    { x: 0.15, y: 0.88, s: 1.0 },
    { x: 0.88, y: 0.85, s: 1.1 },
    { x: 0.5, y: 0.08, s: 0.8 },
    { x: 0.05, y: 0.5, s: 0.85 },
    { x: 0.95, y: 0.5, s: 0.95 }
  ];
  const baseSize = opts.size || 50;
  positions.forEach((p, i) => {
    drawEmoji(ctx, e[i % e.length], x + p.x * w, y + p.y * h, baseSize * p.s);
  });
}

// ============ FRAMES DEFINITION ============
window.FRAMES = [
  // === BORDER ===
  { id: 'border-flowers', cat: 'border', label: 'Flowers', overlay: ['🌸','🌺','🌷','🌹','💐','🌻'], render: drawBorderEmojis },
  { id: 'border-stars', cat: 'border', label: 'Stars', overlay: ['⭐','✨','🌟','💫','⭐','✨'], render: drawBorderEmojis },
  { id: 'border-hearts', cat: 'border', label: 'Hearts', overlay: ['💖','💕','💗','💓','💝','❤️'], render: drawBorderEmojis },
  { id: 'border-clouds', cat: 'border', label: 'Clouds', overlay: ['☁️','⛅','🌤️','☁️','⛅','☁️'], render: drawBorderEmojis },
  { id: 'border-party', cat: 'border', label: 'Party', overlay: ['🎉','🎊','🎈','🥳','🪩','🎁'], render: drawBorderEmojis },
  { id: 'border-food', cat: 'border', label: 'Sweet', overlay: ['🍩','🧁','🍰','🍭','🍪','🍬'], render: drawBorderEmojis },

  // === SCENE ===
  { id: 'scene-sunset', cat: 'scene', label: 'Sunset', bg: ['#ff9a8b','#ffc8a2','#ffd86f'], overlay: ['☀️','🌴','🌴','🦩','🌅','✨'], render: drawSceneFrame },
  { id: 'scene-ocean', cat: 'scene', label: 'Ocean', bg: ['#48cae4','#90e0ef','#caf0f8'], overlay: ['🌊','🐠','🐚','🐬','🏝️','🌊'], render: drawSceneFrame },
  { id: 'scene-forest', cat: 'scene', label: 'Forest', bg: ['#52b788','#74c69d','#b7e4c7'], overlay: ['🌳','🍄','🦌','🌿','🦋','🌲'], render: drawSceneFrame },
  { id: 'scene-space', cat: 'scene', label: 'Space', bg: ['#1e1b4b','#4338ca','#7c3aed'], overlay: ['🚀','🌙','⭐','🪐','👽','🛸'], render: drawSceneFrame },
  { id: 'scene-sakura', cat: 'scene', label: 'Sakura', bg: ['#fce7f3','#fbcfe8','#f9a8d4'], overlay: ['🌸','🌸','🦋','🌸','🌸','🌸'], render: drawSceneFrame },
  { id: 'scene-city', cat: 'scene', label: 'City Night', bg: ['#1f2937','#374151','#6b7280'], overlay: ['🌃','🏙️','🌆','💡','🚕','🏢'], render: drawSceneFrame },
  { id: 'scene-pastel', cat: 'scene', label: 'Pastel', bg: ['#c8b6ff','#fdcce5','#fcf6bd'], overlay: ['🌈','☁️','✨','💫','🦄','⭐'], render: drawSceneFrame },

  // === CHARACTER ===
  { id: 'char-nailong', cat: 'character', label: 'Nailong', nailongFrame: true, render: drawNailongFrame },
  { id: 'char-bears', cat: 'character', label: 'Bears', overlay: ['🐻','🧸','🐻‍❄️','🐨'], render: drawCornerCharacters },
  { id: 'char-cats', cat: 'character', label: 'Kitty', overlay: ['🐱','😺','😸','🐈'], render: drawCornerCharacters },
  { id: 'char-bunny', cat: 'character', label: 'Bunny', overlay: ['🐰','🐇','🥕','🐰'], render: drawCornerCharacters },
  { id: 'char-puppy', cat: 'character', label: 'Puppy', overlay: ['🐶','🐕','🦴','🐩'], render: drawCornerCharacters },
  { id: 'char-frog', cat: 'character', label: 'Frog', overlay: ['🐸','🐸','🍃','🐸'], render: drawCornerCharacters },
  { id: 'char-zoo', cat: 'character', label: 'Zoo', overlay: ['🐼','🦁','🐯','🐵'], render: drawCornerCharacters },

  // === SCRAPBOOK ===
  { id: 'scrap-washi', cat: 'scrapbook', label: 'Washi', render: drawWashiTape },
  { id: 'scrap-polaroid', cat: 'scrapbook', label: 'Polaroid', render: drawPolaroid },
  { id: 'scrap-doodle', cat: 'scrapbook', label: 'Doodle', overlay: ['✏️','💭','⚡','💖','✨','📌'], render: drawDoodleFrame },
  { id: 'scrap-tape-stars', cat: 'scrapbook', label: 'Tape Star', overlay: ['⭐','🌟','✨','💫'], render: drawTapeStars },
  { id: 'scrap-film', cat: 'scrapbook', label: 'Film', render: drawFilmFrame },
  { id: 'scrap-sticker', cat: 'scrapbook', label: 'Sticker', overlay: ['🌈','⭐','💕','🦋','🌟','🎀'], render: drawStickerExplosion }
];

// Render thumbnail preview for sidebar
window.renderFramePreview = function(canvas, frame) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width = 160;
  const H = canvas.height = 120;
  if (frame.cat === 'scene' && frame.bg) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, frame.bg[0]);
    grad.addColorStop(0.5, frame.bg[1]);
    grad.addColorStop(1, frame.bg[2]);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = '#e8e8e8';
  }
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(20, 20, W - 40, H - 40);
  frame.render(ctx, 0, 0, W, H, frame, { size: 22, tapeW: 60, tapeH: 14 });
};

window.loadNailongImages = loadNailongImages;
