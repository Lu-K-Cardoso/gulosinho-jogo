const cv = document.getElementById('game'), c = cv.getContext('2d');
const W = cv.width, H = cv.height;
const FOODS = ['🍎','🍰','🍉','🍓','🍩','🍔'];
let state = 'menu', keys = {}, best = +(localStorage.getItem('kirbyBest') || 0), last = 0;
let k, items, spits, score, lives, energy, locked, inhaling, wind, windCur, windT, spawnT, power, held, hurt, clouds;

function reset() {
  k = { x: W / 2, y: H - 62, r: 34, vx: 0 };
  items = []; spits = []; score = 0; lives = 3; energy = 100; locked = false;
  wind = 0; windCur = 0; windT = 3; spawnT = 1; hurt = 0;
  power = { magnet: 0, shield: 0 }; held = null;
  clouds = Array.from({ length: 4 }, (_, i) => ({ x: i * 140, y: 40 + i * 70, s: 0.6 + Math.random() }));
}
reset();

// ---------- Entrada ----------
addEventListener('keydown', e => {
  if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'Enter' && state !== 'playing') start();
  if ((e.key === 'ArrowDown' || e.key.toLowerCase() === 's') && state === 'playing' && held) {
    spits.push({ x: k.x, y: k.y - 40, vy: -560 }); held = null;
  }
});
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
cv.addEventListener('click', () => { if (state !== 'playing') start(); });
function start() { reset(); state = 'playing'; }

// ---------- Lógica ----------
function difficulty() { return Math.min(score, 600); }
function spawn() {
  const r = Math.random(); let type = 'food', e = FOODS[Math.random() * FOODS.length | 0];
  if (r > 0.80) { type = 'bomb'; e = '💣'; }
  else if (r > 0.71) { type = 'magnet'; e = '🧲'; }
  else if (r > 0.62) { type = 'shield'; e = '🛡️'; }
  items.push({ x: 30 + Math.random() * (W - 60), y: -30, vy: (130 + difficulty() * 0.5) * (0.8 + Math.random() * 0.5), type, e, r: 20 });
}
function hit() {
  if (power.shield > 0) { power.shield = 0; return; }
  lives--; hurt = 0.8;
  if (lives <= 0) { state = 'over'; if (score > best) { best = score; localStorage.setItem('kirbyBest', best); } }
}
function update(dt) {
  // movimento do Kirby
  const dir = (keys['arrowright'] || keys['d'] ? 1 : 0) - (keys['arrowleft'] || keys['a'] ? 1 : 0);
  k.vx += (dir * 380 - k.vx) * Math.min(1, 12 * dt);
  k.x = Math.max(k.r, Math.min(W - k.r, k.x + k.vx * dt));
  // energia da inalação
  inhaling = !!keys[' '] && !locked && energy > 0;
  if (inhaling) { energy -= 35 * dt; if (energy <= 0) { energy = 0; locked = true; } }
  else { energy = Math.min(100, energy + 22 * dt); if (locked && energy > 30) locked = false; }
  // vento
  windT -= dt;
  if (windT <= 0) { wind = Math.random() < 0.25 ? 0 : (Math.random() * 2 - 1) * (60 + difficulty() * 0.2); windT = 4 + Math.random() * 3; }
  windCur += (wind - windCur) * Math.min(1, 1.5 * dt);
  // spawn
  spawnT -= dt;
  if (spawnT <= 0) { spawn(); spawnT = Math.max(0.35, 1 - difficulty() * 0.0012); }
  // poderes
  power.magnet = Math.max(0, power.magnet - dt); power.shield = Math.max(0, power.shield - dt); hurt = Math.max(0, hurt - dt);
  if (held) { held.t -= dt; if (held.t <= 0) { held = null; hit(); } }
  // itens
  const mx = k.x, my = k.y - 8;
  for (const it of items) {
    it.y += it.vy * dt; it.x = Math.max(it.r, Math.min(W - it.r, it.x + windCur * dt));
    const dx = mx - it.x, dy = my - it.y, d = Math.hypot(dx, dy) || 1;
    const good = it.type !== 'bomb';
    const pulled = (inhaling && d < 180) || (power.magnet > 0 && good && d < 150);
    if (pulled) { it.x += dx / d * 340 * dt; it.y += dy / d * 340 * dt; }
    if (d < k.r + it.r - 8) {
      it.dead = true;
      if (it.type === 'food') score += 10;
      else if (it.type === 'magnet') power.magnet = 6;
      else if (it.type === 'shield') power.shield = 8;
      else if (inhaling && !held) held = { t: 3 };
      else hit();
    }
    if (it.y > H + 30) it.dead = true;
  }
  // cuspes: destroem bombas
  for (const s of spits) {
    s.y += s.vy * dt;
    for (const it of items) if (it.type === 'bomb' && !it.dead && Math.hypot(it.x - s.x, it.y - s.y) < 32) { it.dead = true; s.dead = true; score += 15; }
    if (s.y < -20) s.dead = true;
  }
  items = items.filter(i => !i.dead); spits = spits.filter(s => !s.dead);
  clouds.forEach(cl => { cl.x += 10 * cl.s * dt; if (cl.x > W + 60) cl.x = -80; });
}

// ---------- Desenho ----------
function ell(x, y, rx, ry, color) { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill(); }
function drawKirby() {
  const { x, y, r } = k;
  if (hurt > 0 && Math.floor(hurt * 12) % 2) return;
  if (power.shield > 0) { c.strokeStyle = 'rgba(120,200,255,.8)'; c.lineWidth = 5; c.beginPath(); c.arc(x, y, r + 10, 0, 7); c.stroke(); }
  ell(x - r * 0.55, y + r * 0.85, r * 0.45, r * 0.28, '#d8324f'); ell(x + r * 0.55, y + r * 0.85, r * 0.45, r * 0.28, '#d8324f');
  ell(x - r * 0.95, y + 4, r * 0.3, r * 0.22, '#ff8fb8'); ell(x + r * 0.95, y + 4, r * 0.3, r * 0.22, '#ff8fb8');
  ell(x, y, r, r * 0.95, '#ffaed0');
  ell(x - r * 0.55, y + r * 0.2, r * 0.2, r * 0.12, '#ff6f9f'); ell(x + r * 0.55, y + r * 0.2, r * 0.2, r * 0.12, '#ff6f9f');
  for (const sx of [-1, 1]) { ell(x + sx * r * 0.3, y - r * 0.3, r * 0.12, r * 0.28, '#1b1f4d'); ell(x + sx * r * 0.3, y - r * 0.42, r * 0.07, r * 0.1, '#fff'); }
  if (inhaling) { ell(x, y + r * 0.2, r * 0.28, r * 0.34, '#5a1030'); ell(x, y + r * 0.34, r * 0.17, r * 0.14, '#ff6b81'); }
  else if (held) { ell(x, y + r * 0.25, r * 0.22, r * 0.22, '#5a1030'); c.font = '16px sans-serif'; c.fillText('💣', x, y + r * 0.25); }
  else { c.strokeStyle = '#5a1030'; c.lineWidth = 3; c.beginPath(); c.arc(x, y + r * 0.1, r * 0.18, 0.2, Math.PI - 0.2); c.stroke(); }
}
function drawHUD() {
  c.textAlign = 'left'; c.fillStyle = '#2b2d6e'; c.font = '700 22px Fredoka, sans-serif';
  c.fillText('Pontos ' + score, 14, 30); c.font = '600 14px Nunito, sans-serif'; c.fillText('Recorde ' + best, 14, 50);
  c.textAlign = 'right'; c.font = '22px sans-serif'; c.fillText('❤️'.repeat(Math.max(0, lives)), W - 14, 32);
  // energia
  c.fillStyle = 'rgba(43,45,110,.25)'; c.fillRect(14, 62, 120, 10);
  c.fillStyle = locked ? '#d8324f' : '#ffd23f'; c.fillRect(14, 62, 120 * energy / 100, 10);
  c.textAlign = 'left'; c.font = '600 12px Nunito, sans-serif'; c.fillStyle = '#2b2d6e'; c.fillText(locked ? 'sem fôlego!' : 'fôlego', 142, 71);
  // vento
  const w = Math.round(windCur);
  c.textAlign = 'right'; c.font = '600 14px Nunito, sans-serif';
  c.fillText('vento ' + (Math.abs(w) < 8 ? '·' : w > 0 ? '→'.repeat(1 + (w > 70) + (w > 110)) : '←'.repeat(1 + (w < -70) + (w < -110))), W - 14, 56);
  if (power.magnet > 0) c.fillText('🧲 ' + power.magnet.toFixed(0) + 's', W - 14, 76);
  if (power.shield > 0) c.fillText('🛡️ ' + power.shield.toFixed(0) + 's', W - 14, 96);
  if (held) { c.textAlign = 'center'; c.fillStyle = '#d8324f'; c.font = '700 16px Fredoka, sans-serif'; c.fillText('Cuspa a bomba (↓/S): ' + held.t.toFixed(1) + 's', W / 2, 100); }
}
function overlay(title, lines) {
  c.fillStyle = 'rgba(43,45,110,.55)'; c.fillRect(0, 0, W, H);
  c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = '700 44px Fredoka, sans-serif'; c.fillText(title, W / 2, 200);
  c.font = '600 18px Nunito, sans-serif'; lines.forEach((l, i) => c.fillText(l, W / 2, 250 + i * 28));
}
function draw() {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#8fd3ff'); g.addColorStop(1, '#e6f6ff');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  clouds.forEach(cl => { c.fillStyle = 'rgba(255,255,255,.85)'; [[0, 0, 36], [30, 8, 28], [-30, 10, 26]].forEach(([ox, oy, r]) => { c.beginPath(); c.arc(cl.x + ox * cl.s, cl.y + oy, r * cl.s, 0, 7); c.fill(); }); });
  c.fillStyle = '#6fcf6b'; c.fillRect(0, H - 28, W, 28); c.fillStyle = '#58b857'; c.fillRect(0, H - 28, W, 6);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '38px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
  items.forEach(it => c.fillText(it.e, it.x, it.y));
  spits.forEach(s => c.fillText('⭐', s.x, s.y));
  drawKirby(); c.textBaseline = 'alphabetic'; drawHUD();
  if (state === 'menu') overlay('Kirby Food Drop', ['Inale as comidas e desvie das bombas', '← → mover · Espaço inalar · ↓ cuspir', 'Aperte Enter ou clique para jogar']);
  if (state === 'over') overlay('Game Over', ['Pontos: ' + score + '   Recorde: ' + best, 'Aperte Enter ou clique para tentar de novo']);
}

// ---------- Loop principal ----------
function loop(ts) {
  const dt = Math.min(0.033, (ts - last) / 1000 || 0); last = ts;
  if (state === 'playing') update(dt);
  else clouds.forEach(cl => { cl.x += 10 * cl.s * dt; if (cl.x > W + 60) cl.x = -80; });
  draw(); // o fundo é repintado a cada frame: sem rastros
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
