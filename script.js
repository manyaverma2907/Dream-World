
"use strict";

// DREAM WORLD — CREATED BY MANYA VERMA

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const endScreen = document.getElementById("endScreen");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const livesEl = document.getElementById("lives");
const timerEl = document.getElementById("timer");

const W = canvas.width;
const H = canvas.height;

const GRAVITY = 0.55;
const MOVE_SPEED = 4.2;
const JUMP_POWER = -12.5;

const keys = {};
let player, platforms, stars, spikes, portal;
let level = 0;
let lives = 3;
let score = 0;
let timeLeft = 60;
let running = false;
let lastTime = 0;
let timerAccumulator = 0;
let animationId = null;
let message = "";
let messageTimer = 0;
let particles = [];
let decorativeStars = [];

// Three worlds with different platform layouts.
const worlds = [
  {
    name: "Moonlit Meadows",
    platforms: [
      [0, 445, 180, 55],
      [220, 380, 125, 20],
      [390, 325, 125, 20],
      [555, 270, 125, 20],
      [735, 390, 165, 110]
    ],
    stars: [
      [85, 405], [270, 340], [435, 285],
      [600, 230], [800, 350]
    ],
    spikes: [
      [120, 425, 35]
    ],
    portal: [824, 335]
  },
  {
    name: "Crystal Skies",
    platforms: [
      [0, 445, 125, 55],
      [175, 375, 100, 18],
      [325, 305, 105, 18],
      [475, 365, 100, 18],
      [625, 285, 105, 18],
      [770, 385, 130, 115]
    ],
    stars: [
      [65, 405], [215, 335], [365, 265],
      [515, 325], [675, 245]
    ],
    spikes: [
      [65, 425, 35], [790, 365, 28]
    ],
    portal: [825, 330]
  },
  {
    name: "Starlight Castle",
    platforms: [
      [0, 445, 115, 55],
      [150, 375, 90, 18],
      [285, 310, 90, 18],
      [420, 245, 95, 18],
      [560, 310, 95, 18],
      [700, 365, 85, 18],
      [800, 405, 100, 95]
    ],
    stars: [
      [55, 405], [190, 335], [325, 270],
      [465, 205], [605, 270]
    ],
    spikes: [
      [48, 425, 30], [730, 345, 28]
    ],
    portal: [835, 350]
  }
];

// Random decorative stars in the sky.
for (let i = 0; i < 85; i++) {
  decorativeStars.push({
    x: Math.random() * W,
    y: Math.random() * H * 0.72,
    size: Math.random() * 1.8 + 0.4,
    phase: Math.random() * Math.PI * 2
  });
}

function loadLevel() {
  const world = worlds[level];

  platforms = world.platforms.map(p => ({
    x: p[0], y: p[1], w: p[2], h: p[3]
  }));

  stars = world.stars.map(s => ({
    x: s[0], y: s[1],
    collected: false,
    phase: Math.random() * Math.PI * 2
  }));

  spikes = world.spikes.map(s => ({
    x: s[0], y: s[1], w: s[2]
  }));

  portal = {
    x: world.portal[0],
    y: world.portal[1],
    w: 38,
    h: 58
  };

  player = {
    x: 35, y: 390,
    w: 25, h: 35,
    vx: 0, vy: 0,
    grounded: false,
    facing: 1,
    invincible: 0
  };

  message = world.name;
  messageTimer = 2;
  updateHUD();
}

function updateHUD() {
  scoreEl.textContent = `${score} / 15`;
  levelEl.textContent = `${level + 1} / 3`;
  livesEl.textContent = "♥ ".repeat(lives).trim() || "0";
  timerEl.textContent = Math.ceil(timeLeft);
}

function showEnd(title, description, icon) {
  running = false;
  document.getElementById("endTitle").textContent = title;
  document.getElementById("endMessage").textContent = description;
  document.getElementById("endIcon").textContent = icon;
  endScreen.classList.remove("hidden");
}

function startGame() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  level = 0;
  lives = 3;
  score = 0;
  timeLeft = 60;
  timerAccumulator = 0;
  particles = [];
  messageTimer = 0;

  Object.keys(keys).forEach(k => keys[k] = false);

  loadLevel();
  running = true;
  lastTime = performance.now();

  startScreen.classList.add("hidden");
  endScreen.classList.add("hidden");

  animationId = requestAnimationFrame(gameLoop);
}

function loseLife() {
  if (player.invincible > 0 || !running) return;

  lives--;
  updateHUD();

  if (lives <= 0) {
    showEnd(
      "Dream Over",
      `You collected ${score} of 15 stars. Every dream deserves another try!`,
      "💫"
    );
    return;
  }

  player.x = 35;
  player.y = 390;
  player.vx = 0;
  player.vy = 0;
  player.invincible = 1.5;

  message = "A new chance! Keep going!";
  messageTimer = 1.5;
}

function jump() {
  if (!running) return;
  if (player.grounded) {
    player.vy = JUMP_POWER;
    player.grounded = false;
  }
}

function collides(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

function update(dt) {
  if (!running) return;

  timerAccumulator += dt;

  if (timerAccumulator >= 1) {
    timeLeft -= Math.floor(timerAccumulator);
    timerAccumulator %= 1;
    updateHUD();

    if (timeLeft <= 0) {
      timeLeft = 0;
      updateHUD();
      showEnd(
        "Time's Up!",
        `You collected ${score} of 15 stars. Try again and reach the portal!`,
        "⏳"
      );
      return;
    }
  }

  if (messageTimer > 0) messageTimer -= dt;
  if (player.invincible > 0) player.invincible -= dt;

  // Horizontal movement.
  player.vx = 0;

  if (keys.ArrowLeft || keys.a || keys.A) {
    player.vx = -MOVE_SPEED;
    player.facing = -1;
  }

  if (keys.ArrowRight || keys.d || keys.D) {
    player.vx = MOVE_SPEED;
    player.facing = 1;
  }

  player.x += player.vx;
  player.x = Math.max(0, Math.min(W - player.w, player.x));

  // Gravity and vertical collision.
  const oldY = player.y;
  player.vy += GRAVITY;
  player.vy = Math.min(player.vy, 14);
  player.y += player.vy;
  player.grounded = false;

  for (const p of platforms) {
    const overlapsX =
      player.x + player.w > p.x &&
      player.x < p.x + p.w;

    const wasAbove = oldY + player.h <= p.y;
    const isBelowPlatform = player.y + player.h >= p.y;

    if (overlapsX && wasAbove && isBelowPlatform && player.vy >= 0) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.grounded = true;
    }
  }

  // Falling off the world costs one life.
  if (player.y > H + 30) {
    loseLife();
    return;
  }

  // Collect stars.
  for (const star of stars) {
    if (star.collected) continue;

    const starBox = {
      x: star.x - 11,
      y: star.y - 11,
      w: 22, h: 22
    };

    if (collides(player, starBox)) {
      star.collected = true;
      score++;
      createParticles(star.x, star.y, "#ffe38b");
      updateHUD();
    }
  }

  // Spike collision.
  for (const spike of spikes) {
    const dangerBox = {
      x: spike.x + 4,
      y: spike.y + 5,
      w: spike.w - 8,
      h: 18
    };

    if (collides(player, dangerBox)) {
      loseLife();
      return;
    }
  }

  // Portal: all five stars are required.
  if (collides(player, portal)) {
    const allCollected = stars.every(s => s.collected);

    if (allCollected) {
      createParticles(portal.x + 15, portal.y + 20, "#d8b4fe");

      if (level < worlds.length - 1) {
        level++;
        loadLevel();
      } else {
        showEnd(
          "Dreams Come True!",
          `Amazing! You collected all ${score} stars and conquered all three worlds!`,
          "🏆"
        );
      }
    } else if (messageTimer <= 0) {
      const remaining = stars.filter(s => !s.collected).length;
      message = `Find ${remaining} more star${remaining === 1 ? "" : "s"}!`;
      messageTimer = 1.4;
    }
  }

  updateParticles(dt);
}

// Small magical particles.
function createParticles(x, y, color) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 150,
      vy: (Math.random() - 0.5) * 150,
      life: 0.65,
      color
    });
  }
}

function updateParticles(dt) {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }

  particles = particles.filter(p => p.life > 0);
}

// Draw a glowing rounded rectangle.
function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, "#101744");
  gradient.addColorStop(0.55, "#333b82");
  gradient.addColorStop(1, "#986bc3");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // Twinkling stars.
  const now = performance.now() / 1000;

  for (const s of decorativeStars) {
    const alpha = 0.4 + 0.6 * Math.abs(Math.sin(now + s.phase));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;

  // Moon.
  ctx.shadowColor = "#c4b5fd";
  ctx.shadowBlur = 30;
  ctx.fillStyle = "#f2eaff";
  ctx.beginPath();
  ctx.arc(720, 90, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Distant mountains.
  ctx.fillStyle = "#29356e";
  ctx.beginPath();
  ctx.moveTo(0, 340);
  ctx.lineTo(110, 220);
  ctx.lineTo(215, 340);
  ctx.lineTo(360, 195);
  ctx.lineTo(520, 350);
  ctx.lineTo(675, 225);
  ctx.lineTo(830, 345);
  ctx.lineTo(900, 275);
  ctx.lineTo(900, 500);
  ctx.lineTo(0, 500);
  ctx.closePath();
  ctx.fill();

  // Soft distant clouds.
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#e9d5ff";

  for (let i = 0; i < 5; i++) {
    const x = (i * 205 + now * 7) % 1000 - 50;
    ctx.beginPath();
    ctx.ellipse(x, 185 + (i % 2) * 35, 50, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function drawPlatforms() {
  for (const p of platforms) {
    // Shadow underneath each floating island.
    ctx.fillStyle = "#171942";
    roundedRect(p.x, p.y + 8, p.w, p.h, 8);
    ctx.fill();

    const ground = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    ground.addColorStop(0, "#55e6b0");
    ground.addColorStop(0.16, "#348b91");
    ground.addColorStop(1, "#292c63");

    ctx.fillStyle = ground;
    roundedRect(p.x, p.y, p.w, p.h, 8);
    ctx.fill();

    // Bright grass edge.
    ctx.fillStyle = "#a5f3c9";
    roundedRect(p.x, p.y, p.w, 7, 4);
    ctx.fill();

    // Tiny decorative stones.
    ctx.fillStyle = "#8d88c9";

    for (let x = p.x + 15; x < p.x + p.w - 8; x += 29) {
      ctx.beginPath();
      ctx.arc(x, p.y + 23, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStars() {
  const now = performance.now() / 1000;

  for (const s of stars) {
    if (s.collected) continue;

    const bob = Math.sin(now * 3 + s.phase) * 4;

    ctx.save();
    ctx.translate(s.x, s.y + bob);
    ctx.rotate(now * 0.5);

    ctx.shadowColor = "#ffdf80";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#ffe28a";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", 0, 0);

    ctx.restore();
  }
}

function drawSpikes() {
  for (const s of spikes) {
    const count = Math.max(2, Math.floor(s.w / 12));
    const spikeWidth = s.w / count;

    ctx.fillStyle = "#ff8aab";
    ctx.shadowColor = "#fb7185";
    ctx.shadowBlur = 10;

    for (let i = 0; i < count; i++) {
      ctx.beginPath();
      ctx.moveTo(s.x + i * spikeWidth, s.y + 20);
      ctx.lineTo(s.x + i * spikeWidth + spikeWidth / 2, s.y);
      ctx.lineTo(s.x + (i + 1) * spikeWidth, s.y + 20);
      ctx.closePath();
      ctx.fill();
    }

    ctx.shadowBlur = 0;
  }
}

function drawPortal() {
  const active = stars.every(s => s.collected);
  const pulse = Math.sin(performance.now() / 200) * 4;

  ctx.save();

  ctx.shadowColor = active ? "#c4b5fd" : "#7c7da5";
  ctx.shadowBlur = active ? 28 + pulse : 10;

  ctx.strokeStyle = active ? "#e9d5ff" : "#8985bd";
  ctx.lineWidth = 5;
  roundedRect(portal.x, portal.y, portal.w, portal.h, 20);
  ctx.stroke();

  const g = ctx.createRadialGradient(
    portal.x + 19, portal.y + 28, 1,
    portal.x + 19, portal.y + 28, 35
  );

  g.addColorStop(0, active ? "#fff7ff" : "#8583b0");
  g.addColorStop(0.4, active ? "#c4b5fd" : "#55577f");
  g.addColorStop(1, "#3b2869");

  ctx.fillStyle = g;
  roundedRect(portal.x + 6, portal.y + 6, portal.w - 12, portal.h - 6, 16);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.font = "23px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(active ? "✦" : "🔒", portal.x + 19, portal.y + 36);

  ctx.restore();
}

function drawPlayer() {
  if (player.invincible > 0 &&
      Math.floor(player.invincible * 12) % 2 === 0) {
    return;
  }

  ctx.save();
  ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
  ctx.scale(player.facing, 1);

  // Shadow.
  ctx.fillStyle = "#17152e77";
  ctx.beginPath();
  ctx.ellipse(0, 20, 15, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs.
  ctx.strokeStyle = "#28284f";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-5, 10);
  ctx.lineTo(-7, 17);
  ctx.moveTo(5, 10);
  ctx.lineTo(8, 17);
  ctx.stroke();

  // Body and cape.
  ctx.fillStyle = "#b69bff";
  ctx.beginPath();
  ctx.moveTo(-9, -5);
  ctx.lineTo(-14, 12);
  ctx.lineTo(0, 7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f0abfc";
  roundedRect(-10, -9, 20, 23, 7);
  ctx.fill();

  // Face.
  ctx.fillStyle = "#ffdfc4";
  ctx.beginPath();
  ctx.arc(0, -12, 11, 0, Math.PI * 2);
  ctx.fill();

  // Hair.
  ctx.fillStyle = "#38305d";
  ctx.beginPath();
  ctx.arc(0, -16, 11, Math.PI, Math.PI * 2);
  ctx.lineTo(11, -10);
  ctx.lineTo(5, -13);
  ctx.lineTo(-10, -7);
  ctx.closePath();
  ctx.fill();

  // Eye.
  ctx.fillStyle = "#282345";
  ctx.beginPath();
  ctx.arc(4, -12, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / 0.65);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function drawMessage() {
  if (messageTimer <= 0 || !message) return;

  ctx.save();
  ctx.font = "bold 17px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const width = ctx.measureText(message).width + 34;
  const x = W / 2 - width / 2;

  ctx.fillStyle = "#11142bdd";
  roundedRect(x, 20, width, 38, 12);
  ctx.fill();

  ctx.fillStyle = "#f5e8ff";
  ctx.fillText(message, W / 2, 39);
  ctx.restore();
}

function render() {
  drawBackground();
  drawPlatforms();
  drawStars();
  drawSpikes();
  drawPortal();
  drawPlayer();
  drawParticles();
  drawMessage();
}

function gameLoop(timestamp) {
  if (!running) {
    animationId = null;
    return;
  }

  const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;

  update(dt);
  render();

  if (running) {
    animationId = requestAnimationFrame(gameLoop);
  } else {
    animationId = null;
  }
}

// Keyboard controls.
window.addEventListener("keydown", event => {
  if ([
    "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "
  ].includes(event.key)) {
    event.preventDefault();
  }

  const key = event.key === " " ? "Space" : event.key;
  const wasDown = !!keys[key];
  keys[key] = true;

  if (!wasDown && (
    key === "Space" || key === "ArrowUp" || key === "w" || key === "W"
  )) {
    jump();
  }
});

window.addEventListener("keyup", event => {
  const key = event.key === " " ? "Space" : event.key;
  keys[key] = false;
});

// Create touch controls for phones and tablets.
const touchControls = document.createElement("div");
touchControls.className = "touch-controls";
touchControls.innerHTML = `
  <button type="button" data-key="ArrowLeft" aria-label="Move left">◀</button>
  <button type="button" data-key="ArrowRight" aria-label="Move right">▶</button>
  <button type="button" class="jump-control" data-key="Space">JUMP ⤴</button>
`;

document.querySelector(".game-card").appendChild(touchControls);

touchControls.querySelectorAll("button").forEach(button => {
  const key = button.dataset.key;

  button.addEventListener("pointerdown", event => {
    event.preventDefault();

    if (key === "Space") {
      jump();
    } else {
      keys[key] = true;
    }

    button.setPointerCapture(event.pointerId);
  });

  const release = event => {
    event.preventDefault();
    keys[key] = false;
  };

  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", () => {
    keys[key] = false;
  });
});

window.addEventListener("blur", () => {
  Object.keys(keys).forEach(key => keys[key] = false);
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

// Show the world behind the opening screen.
loadLevel();
render();
