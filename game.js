const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= CANVAS ================= */
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

/* ================= LOAD IMAGES ================= */
const playerImg = new Image();
playerImg.src = "assets/ufo.png";

const normalImg = new Image();
normalImg.src = "assets/normal.png";

const zigzagImg = new Image();
zigzagImg.src = "assets/zigzag.png";

const heavyImg = new Image();
heavyImg.src = "assets/heavy.png";

/* ================= LOAD SOUNDS ================= */
const explosionSound = new Audio("assets/explosion.mp3");
explosionSound.volume = 0.3;

/* ================= GAME STATE ================= */
let gameOver = false;
let difficulty = 1;

/* ================= PLAYER ================= */
const player = {
  width: 64,
  height: 64,
  x: canvas.width / 2 - 32,
  y: 0
};

// Mobile touch
canvas.addEventListener("touchmove", (e) => {
  if (gameOver) return;
  const t = e.touches[0];
  player.x = t.clientX - player.width / 2;
  clampPlayer();
});

// Desktop mouse
canvas.addEventListener("mousemove", (e) => {
  if (gameOver) return;
  if (e.buttons === 1) {
    player.x = e.clientX - player.width / 2;
    clampPlayer();
  }
});

function clampPlayer() {
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
}

/* ================= BULLETS ================= */
const bullets = [];
let bulletSpeed = 8;  
let canShoot = true;  
const shootDelay = 160; 

function shootBullet() {
  if (gameOver || !canShoot) return;

  bullets.push({
    x: player.x + player.width / 2 - 3,
    y: player.y,
    w: 6,
    h: 18
  });

  canShoot = false;
  setTimeout(() => { canShoot = true; }, shootDelay);
}

let fireLoop = setInterval(shootBullet, shootDelay);

/* ================= STARS ================= */
const stars = [];
for (let i = 0; i < 150; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 1.5,
    alpha: Math.random(),
    speed: Math.random() * 0.5
  });
}

function drawStars() {
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > canvas.height) s.y = 0;
    ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ================= ENEMIES ================= */
const enemies = [];
let spawnRate = 420;
let baseEnemySpeed = 3.5;

function spawnEnemy() {
  if (gameOver) return;

  const r = Math.random();
  let enemy = {
    x: Math.random() * (canvas.width - 72),
    y: -80,
    w: 72,
    h: 72,
    speed: baseEnemySpeed + Math.random() * 2,
    dx: 0,
    type: "normal",
    img: normalImg
  };

  if (r > 0.6 && r < 0.85) {
    enemy.type = "zigzag";
    enemy.img = zigzagImg;
    enemy.dx = Math.random() > 0.5 ? 2.5 : -2.5;
    enemy.speed += 2;
  }

  if (r >= 0.85) {
    enemy.type = "heavy";
    enemy.img = heavyImg;
    enemy.w = enemy.h = 95; 
    enemy.speed -= 1;
  }

  enemies.push(enemy);
}
let enemySpawner = setInterval(spawnEnemy, spawnRate);

/* ================= EXPLOSIONS ================= */
const explosions = [];

function createExplosion(x, y) {
  explosionSound.currentTime = 0;
  explosionSound.play();

  for (let i = 0; i < 20; i++) {
    explosions.push({
      x,
      y,
      dx: (Math.random() - 0.5) * 9,
      dy: (Math.random() - 0.5) * 9,
      life: 28
    });
  }
}

/* ================= SCORE ================= */
let score = 0;
let highScore = localStorage.getItem("highScoreExtreme") || 0;

/* ================= COLLISION ================= */
function isColliding(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/* ================= DIFFICULTY RAMP ================= */
setInterval(() => {
  if (gameOver) return;

  difficulty++;
  baseEnemySpeed += 0.6;
  bulletSpeed += 0.3;

  if (spawnRate > 160) {
    spawnRate -= 35;
    clearInterval(enemySpawner);
    enemySpawner = setInterval(spawnEnemy, spawnRate);
  }
}, 9000);

/* ================= GAME LOOP ================= */
function gameLoop() {
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#1e0033"); // deep purple top
  gradient.addColorStop(1, "#4b0082"); // violet bottom
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawStars();

  // Player glow
  ctx.shadowColor = "cyan";
  ctx.shadowBlur = 15;
  player.y = canvas.height - player.height - 20;
  ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);

  ctx.shadowBlur = 0; // reset shadow

  // Bullets
  ctx.fillStyle = "red";
  bullets.forEach((b, i) => {
    b.y -= bulletSpeed;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    if (b.y < 0) bullets.splice(i, 1);
  });

  // Enemies
  enemies.forEach((e, i) => {
    e.y += e.speed;

    if (e.type === "zigzag") {
      e.x += e.dx;
      if (e.x < 0 || e.x + e.w > canvas.width) e.dx *= -1;
    }

    // Enemy glow
    ctx.shadowColor = "magenta";
    ctx.shadowBlur = 12;
    ctx.drawImage(e.img, e.x, e.y, e.w, e.h);
    ctx.shadowBlur = 0;

    bullets.forEach((b, bi) => {
      if (isColliding({ ...b, w: b.w, h: b.h }, e)) {
        createExplosion(e.x + e.w / 2, e.y + e.h / 2);
        bullets.splice(bi, 1);
        enemies.splice(i, 1);
        score += e.type === "heavy" ? 30 : 15;
      }
    });

    if (isColliding({ x: player.x, y: player.y, w: player.width, h: player.height }, e)) {
      endGame();
    }
  });

  // Explosions
  explosions.forEach((p, i) => {
    p.x += p.dx;
    p.y += p.dy;
    p.life--;
    ctx.fillStyle = "orange";
    ctx.fillRect(p.x, p.y, 4, 4);
    if (p.life <= 0) explosions.splice(i, 1);
  });

  // HUD
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Score: " + score, 20, 30);
  ctx.textAlign = "right";
  ctx.fillText("High: " + highScore, canvas.width - 20, 30);

  if (gameOver) {
    drawGameOver();
    return;
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();

/* ================= GAME OVER ================= */
function endGame() {
  gameOver = true;
  clearInterval(enemySpawner);
  clearInterval(fireLoop);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScoreExtreme", highScore);
  }
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";

  ctx.font = "bold 52px Arial";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 90);

  ctx.font = "30px Arial";
  ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2 - 20);
  ctx.fillText("High Score: " + highScore, canvas.width / 2, canvas.height / 2 + 25);

  ctx.font = "20px Arial";
  ctx.fillText("Tap to Restart", canvas.width / 2, canvas.height / 2 + 85);
}

/* ================= RESTART ================= */
canvas.addEventListener("click", () => gameOver && location.reload());
canvas.addEventListener("touchstart", () => gameOver && location.reload());

