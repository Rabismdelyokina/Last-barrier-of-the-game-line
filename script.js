
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");
const fullscreenButton = document.getElementById("fullscreenButton");

fullscreenButton.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await canvas.requestFullscreen();
    }
  } catch (error) {
    statusText.textContent = "Mode layar penuh tidak didukung browser ini.";
  }
});

document.addEventListener("fullscreenchange", () => {
  fullscreenButton.textContent = document.fullscreenElement
    ? "Keluar layar penuh"
    : "Layar penuh";
});

const W = canvas.width;
const H = canvas.height;

// Boss settings.
const BOSS_SETTINGS = {
  imageSize: 100,
  hitboxRadius: 15,
  color: "#ff4fa3",
  health: 1945,
  movement: "idle", // "idle", "horizontal", or "vertical"
  speed: 1.5
};

// Pergerakan boss.
const BOSS_PHASE_SETTINGS = {
  moveDuration: 180, 
  transitionDuration: 30, 
  idleDuration: 180, 
  movementSpeed: 3
};

// Player settings.
const PLAYER_SETTINGS = {
  speed: 5,
  slowSpeed: 2,
  health: 20,
  bombs: 3,
  imageSize: 50,
  hitboxRadius: 5,
  color: "#79eaff"
};

const BOMB_REDIRECT_DURATION = 180;
const ENRAGED_BOMB_REDIRECT_DURATION = 30; // Nyawa boss 25%

// Peluru
const PLAYER_BULLET_SETTINGS = {
  speed: 10,
  radius: 3,
  width: 4,
  height: 12,
  cooldown: 9,
  count: 5,
  spreadDegrees: 7,
  color: "#7df9ff"
};

// Bayangan boss
const BOSS_APPEARANCE = {
  size: 500,
  opacity: 0.85,
  duration: 240,
  midSlowdown: 0.8, 
  fadeStart: 0.55 
};

// Pola serangan boss
const BULLET_SETTINGS = {
  circleInterval: 20, 
  circleCount: 35,
  circleSpeed: 2,
  circleRadius: 5,
  circleRotationSpeed: 100, 
  circleRotationAcceleration: 0.0001, 
  spiralInterval: 3,
  spiralArms: 5, 
  spiralSpeed: 2.5,
  spiralRadius: 5,
  spiralRotationSpeed: 0.04,
  spiralRotationAcceleration: 0.00005,
  aimedInterval: 15, 
  aimedCount: 5,
  aimedSpread: 0.1, 
  aimedSpeed: 5,
  aimedRadius: 6,
  fanInterval: 5, 
  fanCount: 10,
  fanArms: 5, 
  fanSpread: 1.2, 
  fanSpeed: 2.5,
  fanRadius: 5,
  color:"#cdd620"
};

// Perubahan pola serangan
const RANDOM_BOSS_BULLET_PATTERN = {
  enabled: true,
  changeInterval: 300 
};

// Serangan laser
const LASER_SETTINGS = {
  healthThreshold: 0.5,
  volleySize: 6,
  spawnInterval: 30,
  warningDuration: 45,
  activeDuration: 18,
  cooldown: 450,
  warningWidth: 0.75,
  activeWidth: 5
};

const BOSS_BULLET_PATTERNS = ["circle", "aimed", "fan", "spiral", "tolls"];

const backgroundImage = new Image();
backgroundImage.src = "https://uploads.onecompiler.io/44xe3pjkf/456wfymut/Tak%20berjudul42_20261022100605.png";

// Gambar boss.
const bossImage = new Image();
bossImage.src = "https://uploads.onecompiler.io/44xe3pjkf/456wfymut/Tak%20berjudul43_20261024172643.png";

// Animasi boss.
const bossMovingImage = new Image();
bossMovingImage.src = "https://uploads.onecompiler.io/44xe3pjkf/456wfymut/Tak%20berjudul43_20261024172643.png"; // Moving animation image.

const bossTransitionImage = new Image();
bossTransitionImage.src = "https://uploads.onecompiler.io/44xe3pjkf/456wfymut/Easytechball_20261115191604.png"; // Transition animation image, played after moving.

const bossAttackingImage = new Image();
bossAttackingImage.src = "https://uploads.onecompiler.io/44xe3pjkf/456wfymut/Easytechball_20261115192517.png"; // Attacking animation image.

// Gambar pemain.
const playerImage = new Image();
playerImage.src = "https://uploads.onecompiler.io/44xe3pjkf/456wfymut/sem.png";

const keys = {};
let audioContext;

function unlockAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!audioContext && AudioContextClass) {
    audioContext = new AudioContextClass();
  }
  if (audioContext?.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
}

function playBossFireSound() {
  if (!audioContext || audioContext.state !== "running") return;

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(900, now);
  oscillator.frequency.exponentialRampToValueAtTime(420, now + 0.09);
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.09);
}

function playLaserSound() {
  if (!audioContext || audioContext.state !== "running") return;

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  const duration = 0.25;

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(1200, now);
  oscillator.frequency.exponentialRampToValueAtTime(180, now + duration);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

let player = {
  x: W / 2,
  y: H - 70,
  r: PLAYER_SETTINGS.hitboxRadius,
  speed: PLAYER_SETTINGS.speed,
  hp: PLAYER_SETTINGS.health,
  cooldown: 0,
  invincible: 0
};

let boss = {
  x: W / 2,
  y: 90,
  r: BOSS_SETTINGS.hitboxRadius,
  hp: BOSS_SETTINGS.health,
  maxHp: BOSS_SETTINGS.health,
  dir: 1
};

let bossPhase = "move";
let bossPhaseFrame = 0;
let transitionTarget = "idle";
let bossTarget = {
  x: 40 + Math.random() * (W - 80),
  y: 40 + Math.random() * (H * 0.4 - 40)
};
let bossBulletPattern = BOSS_BULLET_PATTERNS[0];
let fanBulletIndex = 0;
let fanBulletDirection = 1;

let bullets = [];
let shots = [];
let lasers = [];
let laserVolleyRemaining = 0;
let laserSpawnTimer = 0;
let laserCooldown = 0;
let particles = [];

let score = 0;
let bombsUsed = 0;
let bombsRemaining = PLAYER_SETTINGS.bombs;
let victoryStatsFrame = 0;
let frame = 0;
let bossAppearanceFrame = 0;
let enragedAppearancePlayed = false;
let bombFlash = 0;
let bombRedirectTimer = 0;
let enragedBombActive = false;
let failedMessageTimer = 0;
let gameOver = false;
let victory = false;

// Membolehkan tombol Shift dan ;' ditekan bersamaan.
function getControlKey(e) {
  if (e.code === "Semicolon") return ";";
  if (e.code === "Quote") return "'";
  return e.key.toLowerCase();
}

// Input.
document.addEventListener("keydown", e => {
  unlockAudio();
  const k = getControlKey(e);

  if (["p", "l", ";", "'", "z", "x"].includes(k)) {
    e.preventDefault();
  }

  keys[k] = true;

  if (k === "x" && !e.repeat && !gameOver && !victory) {
    useBomb();
  }

  if ((gameOver || victory) && k === "enter") {
    restart();
  }
});

document.addEventListener("keyup", e => {
  keys[getControlKey(e)] = false;
});

// Use a bomb.
function useBomb() {
  if (bombsRemaining <= 0) return;

  enragedBombActive = boss.hp < boss.maxHp * 0.25;
  bombRedirectTimer = enragedBombActive
    ? ENRAGED_BOMB_REDIRECT_DURATION
    : BOMB_REDIRECT_DURATION;
  failedMessageTimer = 0;
  bombsRemaining--;
  bombsUsed++;
  score -= 100;
  bombFlash = 12;
}

// Restart.
function restart() {
  player.x = W / 2;
  player.y = H - 70;
  player.hp = PLAYER_SETTINGS.health;
  player.speed = PLAYER_SETTINGS.speed;
  player.r = PLAYER_SETTINGS.hitboxRadius;
  player.cooldown = 0;
  player.invincible = 0;

  boss.x = W / 2;
  boss.y = 90;
  boss.hp = boss.maxHp;
  boss.dir = 1;
  bossPhase = "move";
  bossPhaseFrame = 0;
  transitionTarget = "idle";
  bossTarget = {
    x: 40 + Math.random() * (W - 80),
    y: 40 + Math.random() * (H * 0.4 - 40)
  };
  bossBulletPattern = BOSS_BULLET_PATTERNS[0];
  fanBulletIndex = 0;
  fanBulletDirection = 1;

  bullets = [];
  shots = [];
  lasers = [];
  laserVolleyRemaining = 0;
  laserSpawnTimer = 0;
  laserCooldown = 0;
  particles = [];

  score = 0;
  bombsUsed = 0;
  bombsRemaining = PLAYER_SETTINGS.bombs;
  victoryStatsFrame = 0;
  frame = 0;
  bossAppearanceFrame = 0;
  enragedAppearancePlayed = false;
  bombFlash = 0;
  bombRedirectTimer = 0;
  enragedBombActive = false;
  failedMessageTimer = 0;
  gameOver = false;
  victory = false;
}

// Serangan boss.
function bossAttack() {
  if (bossBulletPattern === "spiral") {
    if (BULLET_SETTINGS.spiralInterval <= 0 || frame % BULLET_SETTINGS.spiralInterval !== 0) {
      return;
    }

    playBossFireSound();
    const rotation =
      BULLET_SETTINGS.spiralRotationSpeed * frame +
      BULLET_SETTINGS.spiralRotationAcceleration * frame * (frame - 1) / 2;

    const armCount = Math.max(1, Math.floor(BULLET_SETTINGS.spiralArms));
    for (let arm = 0; arm < armCount; arm++) {
      const angle = rotation + (Math.PI * 2 * arm) / armCount;
      bullets.push({
        x: boss.x,
        y: boss.y,
        vx: Math.cos(angle) * BULLET_SETTINGS.spiralSpeed,
        vy: Math.sin(angle) * BULLET_SETTINGS.spiralSpeed,
        r: BULLET_SETTINGS.spiralRadius
      });
    }
    return;
  }

  if (bossBulletPattern === "circle") {
    if (
      BULLET_SETTINGS.circleCount > 0 &&
      BULLET_SETTINGS.circleInterval > 0 &&
      frame % BULLET_SETTINGS.circleInterval === 0
    ) {
      playBossFireSound();
      for (let i = 0; i < BULLET_SETTINGS.circleCount; i++) 
      {
        const rotation =
          BULLET_SETTINGS.circleRotationSpeed * frame +
          BULLET_SETTINGS.circleRotationAcceleration * frame * (frame - 1) / 2;
        const angle = (Math.PI * 2 * i) / BULLET_SETTINGS.circleCount + rotation;

        bullets.push({
          x: boss.x,
          y: boss.y,
          vx: Math.cos(angle) * BULLET_SETTINGS.circleSpeed,
          vy: Math.sin(angle) * BULLET_SETTINGS.circleSpeed,
          r: BULLET_SETTINGS.circleRadius
        });
      }
    }
    return;
  }

  const isAimed = bossBulletPattern === "aimed";
  const count = isAimed ? BULLET_SETTINGS.aimedCount : BULLET_SETTINGS.fanCount;
  const interval = isAimed ? BULLET_SETTINGS.aimedInterval : BULLET_SETTINGS.fanInterval;
  const spread = isAimed ? BULLET_SETTINGS.aimedSpread : BULLET_SETTINGS.fanSpread;
  const speed = isAimed ? BULLET_SETTINGS.aimedSpeed : BULLET_SETTINGS.fanSpeed;
  const radius = isAimed ? BULLET_SETTINGS.aimedRadius : BULLET_SETTINGS.fanRadius;

  if (count <= 0 || interval <= 0 || frame % interval !== 0) return;

  playBossFireSound();
  const angle = Math.atan2(player.y - boss.y, player.x - boss.x);

  if (!isAimed) {
    const step = count > 1 ? spread / (count - 1) : 0;
    const armCount = Math.max(1, Math.floor(BULLET_SETTINGS.fanArms));
    const fanAngle = angle - spread / 2 + fanBulletIndex * step;

    for (let arm = 0; arm < armCount; arm++) {
      const a = fanAngle + (Math.PI * 2 * arm) / armCount;
      bullets.push({
        x: boss.x,
        y: boss.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        r: radius
      });
    }

    if (count > 1) {
      fanBulletIndex += fanBulletDirection;
      if (fanBulletIndex >= count - 1 || fanBulletIndex <= 0) {
        fanBulletDirection *= -1;
      }
    }
    return;
  }

  const step = count > 1 ? spread / (count - 1) : 0;

  for (let i = 0; i < count; i++) {
    const a = angle - spread / 2 + i * step;
    bullets.push({
      x: boss.x,
      y: boss.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      r: radius
    });
  }
}

// Jarak 2 objek.
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Pengecekan dan pembaruan layar.
function update() {
  if (bossAppearanceFrame < BOSS_APPEARANCE.duration) {
    bossAppearanceFrame++;
  }

  if (gameOver || victory) {
    if (victory) victoryStatsFrame++;
    return;
  }

  if (!enragedAppearancePlayed && boss.hp < boss.maxHp * 0.25) {
    bossAppearanceFrame = 0;
    enragedAppearancePlayed = true;
  }

  frame++;

  // Tahan tombol SHIFT untuk perlambat gerakan.
  const movementSpeed = keys["shift"]
    ? PLAYER_SETTINGS.slowSpeed
    : player.speed;

  // Pergerakan pemain.
  if (keys["p"]) player.y -= movementSpeed;
  if (keys[";"]) player.y += movementSpeed;
  if (keys["l"]) player.x -= movementSpeed;
  if (keys["'"]) player.x += movementSpeed;

  player.x = Math.max(12, Math.min(W - 12, player.x));
  player.y = Math.max(12, Math.min(H - 12, player.y));

  // Tembak dengan Z.
  if (player.cooldown > 0) player.cooldown--;

  if (keys["z"] && player.cooldown === 0) {
    const shotCount = Math.max(1, Math.floor(PLAYER_BULLET_SETTINGS.count));
    const spread = PLAYER_BULLET_SETTINGS.spreadDegrees * Math.PI / 180;

    for (let i = 0; i < shotCount; i++) {
      const offset = shotCount > 1
        ? -spread / 2 + (spread * i) / (shotCount - 1)
        : 0;
      const angle = -Math.PI / 2 + offset;

      shots.push({
        x: player.x,
        y: player.y - 10,
        vx: Math.cos(angle) * PLAYER_BULLET_SETTINGS.speed,
        vy: Math.sin(angle) * PLAYER_BULLET_SETTINGS.speed,
        r: PLAYER_BULLET_SETTINGS.radius
      });
    }

    player.cooldown = PLAYER_BULLET_SETTINGS.cooldown;
  }

  if (player.invincible > 0) player.invincible--;

  // Pergerakan boss.
  bossPhaseFrame++;
  if (bossPhase === "move") {
    const dx = bossTarget.x - boss.x;
    const dy = bossTarget.y - boss.y;
    const distanceToTarget = Math.hypot(dx, dy);
    const step = BOSS_PHASE_SETTINGS.movementSpeed;

    if (distanceToTarget > step) {
      boss.x += (dx / distanceToTarget) * step;
      boss.y += (dy / distanceToTarget) * step;
    } else {
      boss.x = bossTarget.x;
      boss.y = bossTarget.y;
    }

    if (bossPhaseFrame >= BOSS_PHASE_SETTINGS.moveDuration) {
      bossPhase = "transition";
      transitionTarget = "idle";
      bossPhaseFrame = 0;
    }
  } else if (
    bossPhase === "transition" &&
    bossPhaseFrame >= BOSS_PHASE_SETTINGS.transitionDuration
  ) {
    bossPhase = transitionTarget;
    bossPhaseFrame = 0;
  } else if (
    bossPhase === "idle" &&
    bossPhaseFrame >= BOSS_PHASE_SETTINGS.idleDuration
  ) {
    bossPhase = "transition";
    transitionTarget = "move";
    bossPhaseFrame = 0;
    bossTarget = {
      x: 40 + Math.random() * (W - 80),
      y: 40 + Math.random() * (H * 0.4 - 40)
    };
  }

  if (
    RANDOM_BOSS_BULLET_PATTERN.enabled &&
    RANDOM_BOSS_BULLET_PATTERN.changeInterval > 0 &&
    frame % RANDOM_BOSS_BULLET_PATTERN.changeInterval === 0 &&
    BOSS_BULLET_PATTERNS.length > 1
  ) {
    const alternatives = BOSS_BULLET_PATTERNS.filter(
      pattern => pattern !== bossBulletPattern
    );
    bossBulletPattern = alternatives[Math.floor(Math.random() * alternatives.length)];
  }

  if (bossPhase === "idle" || boss.hp < boss.maxHp * 0.25) {
    bossAttack();
  }

  // Laser.
  if (laserCooldown > 0) laserCooldown--;
  if (
    boss.hp <= boss.maxHp * LASER_SETTINGS.healthThreshold &&
    laserVolleyRemaining === 0 &&
    lasers.length === 0 &&
    laserCooldown === 0
  ) {
    laserVolleyRemaining = LASER_SETTINGS.volleySize;
    laserSpawnTimer = 0;
  }

  if (laserVolleyRemaining > 0) {
    if (laserSpawnTimer <= 0) {
      const angles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4];
      lasers.push({
        x: player.x,
        y: player.y,
        angle: angles[Math.floor(Math.random() * angles.length)],
        frame: 0
      });
      laserVolleyRemaining--;
      laserSpawnTimer = LASER_SETTINGS.spawnInterval;
    } else {
      laserSpawnTimer--;
    }
  }

  for (const laser of lasers) {
    laser.frame++;
    if (laser.frame === LASER_SETTINGS.warningDuration) {
      playLaserSound();
    }
  }
  lasers = lasers.filter(
    laser => laser.frame < LASER_SETTINGS.warningDuration + LASER_SETTINGS.activeDuration
  );
  if (
    boss.hp <= boss.maxHp * LASER_SETTINGS.healthThreshold &&
    laserVolleyRemaining === 0 &&
    lasers.length === 0 &&
    laserCooldown === 0
  ) {
    laserCooldown = boss.hp < boss.maxHp * 0.25
      ? LASER_SETTINGS.cooldown * 2
      : LASER_SETTINGS.cooldown;
  }

  // Efek bomb ke laser.
  if (bombRedirectTimer > 0) {
    for (const b of bullets) {
      if (!b.bombOriginalVelocity) {
        b.bombOriginalVelocity = { vx: b.vx, vy: b.vy };
      }
      b.bombRedirected = true;
      const speed = Math.hypot(b.vx, b.vy) || 2;
      const angle = Math.atan2(boss.y - b.y, boss.x - b.x);
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed;
    }

    for (const laser of lasers) {
      if (laser.bombOriginalAngle === undefined) {
        laser.bombOriginalAngle = laser.angle;
      }
      laser.bombRedirected = true;
      laser.angle = Math.atan2(boss.y - laser.y, boss.x - laser.x);
    }
  } else {
    for (const b of bullets) {
      if (b.bombOriginalVelocity) {
        b.vx = b.bombOriginalVelocity.vx;
        b.vy = b.bombOriginalVelocity.vy;
        delete b.bombOriginalVelocity;
      }
      b.bombRedirected = false;
    }

    for (const laser of lasers) {
      if (laser.bombOriginalAngle !== undefined) {
        laser.angle = laser.bombOriginalAngle;
        delete laser.bombOriginalAngle;
      }
      laser.bombRedirected = false;
    }
  }

  // Pergerakan peluru boss.
  for (const b of bullets) {
    b.x += b.vx;
    b.y += b.vy;
    if (bombRedirectTimer > 0 && distance(b, boss) < b.r + boss.r) {
      b.hit = true;
      boss.hp = Math.max(0, boss.hp - 1);
      score += 10;
      if (boss.hp === 0) victory = true;
    }
  }

  // Laser untuk boss.
  if (bombRedirectTimer > 0 && !victory) {
    for (const laser of lasers) {
      if (
        laser.bombRedirected &&
        laser.frame >= LASER_SETTINGS.warningDuration &&
        Math.abs(
          (boss.x - laser.x) * Math.sin(laser.angle) -
          (boss.y - laser.y) * Math.cos(laser.angle)
        ) < boss.r + LASER_SETTINGS.activeWidth / 2
      ) {
        boss.hp = Math.max(0, boss.hp - 1);
        score += 10;
        if (boss.hp === 0) {
          victory = true;
          break;
        }
      }
    }
  }

  // Peluru pemain.
  for (const s of shots) {
    s.x += s.vx;
    s.y += s.vy;
  }

  // Pengecekan tembakan ke boss.
  for (const s of shots) {
    if (
      s.y >= 0 &&
      distance(s, boss) < s.r + boss.r
    ) {
      boss.hp -= 1;
      score += 10;
      s.y = -20;

      if (boss.hp <= 0) {
        boss.hp = 0;
        victory = true;
      }
    }
  }

  // Pengecekan peluru ke pemain.
  if (player.invincible === 0) {
    for (const b of bullets) {
      if (!b.bombRedirected && !b.hit && distance(b, player) < b.r + player.r) {
        player.hp--;
        score -= 100;
        player.invincible = 70;
        player.x = W / 2;
        player.y = H - 70;
        bullets = [];
        lasers = [];
        laserVolleyRemaining = 0;
        bombFlash = 12;

        if (player.hp <= 0) {
          player.hp = 0;
          gameOver = true;
        }

        break;
      }
    }

    if (player.invincible === 0) {
      for (const laser of lasers) {
        if (
          !laser.bombRedirected &&
          laser.frame >= LASER_SETTINGS.warningDuration &&
          Math.abs(
            (player.x - laser.x) * Math.sin(laser.angle) -
            (player.y - laser.y) * Math.cos(laser.angle)
          ) < player.r + LASER_SETTINGS.activeWidth / 2
        ) {
          player.hp--;
          score -= 100;
          player.invincible = 70;
          player.x = W / 2;
          player.y = H - 70;
          bullets = [];
          lasers = [];
          laserVolleyRemaining = 0;
  
          if (player.hp <= 0) {
            player.hp = 0;
            gameOver = true;
          }
          break;
        }
      }
    }
  }

  // Penghapusan objek luar layar.
  bullets = bullets.filter(
    b => !b.hit && b.x > -20 && b.x < W + 20 &&
      b.y > -20 && b.y < H + 20
  );

  shots = shots.filter(s => s.y > -20);

  if (bombFlash > 0) bombFlash--;
  if (bombRedirectTimer > 0) {
    bombRedirectTimer--;
    if (bombRedirectTimer === 0 && enragedBombActive) {
      failedMessageTimer = 120;
      enragedBombActive = false;
    }
  }
  if (failedMessageTimer > 0) failedMessageTimer--;

  statusText.textContent =
    `HP: ${player.hp} | Bomb tersisa: ${bombsRemaining} | Boss HP: ${boss.hp} | Skor: ${score}`;
}

// Gambar pemain.
function drawPlayer() {
  if (
    player.invincible > 0 &&
    Math.floor(frame / 5) % 2 === 0
  ) return;

  if (playerImage.complete && playerImage.naturalWidth > 0) {
    drawImageContained(playerImage, player.x, player.y, PLAYER_SETTINGS.imageSize);
  } else {
    const sizeScale = PLAYER_SETTINGS.imageSize / 32;
    ctx.fillStyle = PLAYER_SETTINGS.color;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 12 * sizeScale);
    ctx.lineTo(player.x - 10 * sizeScale, player.y + 10 * sizeScale);
    ctx.lineTo(player.x, player.y + 5 * sizeScale);
    ctx.lineTo(player.x + 10 * sizeScale, player.y + 10 * sizeScale);
    ctx.closePath();
    ctx.fill();
  }

  if (keys["shift"]) {
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Gambar tidak ter-distorsi
function drawImageContained(image, centerX, centerY, maxSize) {
  const scale = Math.min(maxSize / image.naturalWidth, maxSize / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, centerX - width / 2, centerY - height / 2, width, height);
}

// Boss dan health barnya
function drawBoss() {
  const phaseImage = boss.hp < boss.maxHp * 0.25
    ? bossAttackingImage
    : bossPhase === "move"
      ? bossMovingImage
      : bossPhase === "transition"
        ? bossTransitionImage
        : bossAttackingImage;
  const image = phaseImage.complete && phaseImage.naturalWidth > 0
    ? phaseImage
    : bossImage;

  const isEnraged = boss.hp < boss.maxHp * 0.25;
  ctx.save();
  if (isEnraged) {
    ctx.shadowColor = "#ff4fa3";
    ctx.shadowBlur = 18 + 12 * (0.5 + 0.5 * Math.sin(frame * 0.2));
  }

  if (image.complete && image.naturalWidth > 0) {
    drawImageContained(image, boss.x, boss.y, BOSS_SETTINGS.imageSize);
  } else {
    ctx.fillStyle = BOSS_SETTINGS.color;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, BOSS_SETTINGS.imageSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = "#4b2944";
  ctx.fillRect(40, 20, W - 80, 10);

  ctx.fillStyle = "#ff4fa3";
  ctx.fillRect(
    40, 20,
    (W - 80) * (boss.hp / boss.maxHp),
    10
  );
}

// Bayangan boss
function drawBossAppearance() {
  const duration = Math.max(1, BOSS_APPEARANCE.duration);
  if (!bossImage.complete || bossImage.naturalWidth === 0 || bossAppearanceFrame >= duration) {
    return;
  }

  const t = Math.max(0, bossAppearanceFrame / duration);
  const slowdown = Math.max(0, Math.min(0.99, BOSS_APPEARANCE.midSlowdown));
  const progress = t + slowdown * Math.sin(2 * Math.PI * t) / (2 * Math.PI);
  const size = BOSS_APPEARANCE.size;
  const y = H + size / 2 - progress * (H + size);
  const fadeStart = Math.max(0, Math.min(1, BOSS_APPEARANCE.fadeStart));
  const fade = t <= fadeStart ? 1 : 1 - (t - fadeStart) / (1 - fadeStart);

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, BOSS_APPEARANCE.opacity)) * fade;
  drawImageContained(bossImage, W / 2, y, size);
  ctx.restore();
}

// Penggambaran seluruh game
function draw() {
  if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
    // Fill the canvas without stretching the background.
    const scale = Math.max(W / backgroundImage.width, H / backgroundImage.height);
    const imageWidth = backgroundImage.width * scale;
    const imageHeight = backgroundImage.height * scale;
    ctx.drawImage(
      backgroundImage,
      (W - imageWidth) / 2,
      (H - imageHeight) / 2,
      imageWidth,
      imageHeight
    );
    ctx.fillStyle = "rgba(16, 13, 32, 0.3)";
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = "#17132c";
    ctx.fillRect(0, 0, W, H);
  }

  // Efek background.
  ctx.fillStyle = "#777099";

  for (let i = 0; i < 35; i++) {
    const x = (i * 83) % W;
    const y = (i * 127 + frame * 0.5) % H;

    ctx.fillRect(x, y, 2, 2);
  }

  drawBoss();

  // Persiapan laser.
  for (const laser of lasers) {
    const active = laser.frame >= LASER_SETTINGS.warningDuration;
    ctx.save();
    ctx.strokeStyle = active ? "#ffffff" : "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = active ? LASER_SETTINGS.activeWidth : LASER_SETTINGS.warningWidth;
    if (active) {
      ctx.shadowColor = "#ff4fa3";
      ctx.shadowBlur = 12;
    }
    const lineLength = Math.hypot(W, H);
    const dx = Math.cos(laser.angle) * lineLength;
    const dy = Math.sin(laser.angle) * lineLength;
    ctx.beginPath();
    ctx.moveTo(laser.x - dx, laser.y - dy);
    ctx.lineTo(laser.x + dx, laser.y + dy);
    ctx.stroke();
    ctx.restore();
  }

  // Gambar peluru.
  for (const b of bullets) {
    ctx.fillStyle = BULLET_SETTINGS.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPlayer();

  // Gambar peluru pemain.
  ctx.fillStyle = PLAYER_BULLET_SETTINGS.color;

  for (const s of shots) {
    ctx.fillRect(
      s.x - PLAYER_BULLET_SETTINGS.width / 2,
      s.y - PLAYER_BULLET_SETTINGS.height / 2,
      PLAYER_BULLET_SETTINGS.width,
      PLAYER_BULLET_SETTINGS.height
    );
  }

  if (bombFlash > 0) {
    ctx.fillStyle = `rgba(160, 100, 255, ${bombFlash / 20})`;
    ctx.fillRect(0, 0, W, H);
  }

  drawBossAppearance();

  if (failedMessageTimer > 0) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 64px Arial";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#350016";
    ctx.fillStyle = "#ff365e";
    ctx.strokeText("FAILED", W / 2, H / 2);
    ctx.fillText("FAILED", W / 2, H / 2);
    ctx.restore();
  }

  // Menunjukan nyawa dan bom tersisa.
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(12, 38, 145, 42);
  ctx.textAlign = "left";
  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.fillText(`Lives: ${player.hp}`, 20, 56);
  ctx.fillText(`Bombs: ${bombsRemaining}`, 20, 74);

  if (gameOver || victory) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = victory ? "#7dffbd" : "#ff7799";
    ctx.font = "bold 32px Arial";

    ctx.fillText(
      victory ? "YOU WIN!" : "GAME OVER",
      W / 2,
      H / 2
    );

    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    if (victory) {
      const livesLost = PLAYER_SETTINGS.health - player.hp;
      if (victoryStatsFrame >= 20) {
        ctx.fillText(`Nyawa hilang: ${livesLost}`, W / 2, H / 2 + 35);
      }
      if (victoryStatsFrame >= 50) {
        ctx.fillText(`Bomb digunakan: ${bombsUsed}`, W / 2, H / 2 + 60);
      }
      if (victoryStatsFrame >= 80) {
        ctx.fillText(`Total skor: ${score}`, W / 2, H / 2 + 85);
      }
      if (victoryStatsFrame >= 110) {
        ctx.fillText("Tekan ENTER untuk mengulang", W / 2, H / 2 + 120);
      }
    } else {
      ctx.fillText("Tekan ENTER untuk mengulang", W / 2, H / 2 + 35);
    }
  }
}

// Restart.
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
50