const BACKEND_URL = (() => {
  const override = localStorage.getItem("parakletosApiBase");
  if (override) return override.replace(/\/$/, "");

  return "https://parakletos-backend-2.onrender.com";
})();

/* ===========================
   DOM
=========================== */
const canvas = document.getElementById("webgl-canvas");
const ctx = canvas?.getContext("2d");

const fpsCounter = document.getElementById("fps-counter");
const systemLog = document.getElementById("system-log");
const commandInput = document.querySelector(".input-line input");
const navItems = document.querySelectorAll(".nav-item");

const backendValue = document.querySelector(".telemetry-readout .tel-point:nth-child(1) .val");
const solverValue = document.querySelector(".telemetry-readout .tel-point:nth-child(2) .val");

if (!canvas || !ctx || !fpsCounter || !systemLog || !commandInput) {
  throw new Error("Required DOM elements are missing.");
}

/* ===========================
   LOGGING
=========================== */
function logEntry(message, kind = "INFO") {
  const line = document.createElement("div");
  line.className = "entry";
  line.textContent = `[${kind}] ${message}`;
  systemLog.appendChild(line);
  systemLog.scrollTop = systemLog.scrollHeight;
}

/* ===========================
   CANVAS / CAMERA
=========================== */
let width = 0;
let height = 0;
let lastFrameTime = performance.now();
let frameCount = 0;

const camera = {
  x: 0,
  y: 0,
  z: -900,
  pitch: 0,
  yaw: 0,
  zoom: 1
};

const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  "+": false,
  "=": false,
  "-": false,
  "_": false
};

const stars = [];
const STAR_COUNT = 320;

const planets = [
  { name: "Mercury", a: 90, speed: 0.020, size: 2, color: "#aaaaaa", phase: Math.random() * Math.PI * 2 },
  { name: "Venus",   a: 130, speed: 0.015, size: 3, color: "#eebb00", phase: Math.random() * Math.PI * 2 },
  { name: "Earth",   a: 180, speed: 0.010, size: 3.5, color: "#0088ff", phase: Math.random() * Math.PI * 2 },
  { name: "Mars",    a: 245, speed: 0.008, size: 2.5, color: "#ff4400", phase: Math.random() * Math.PI * 2 }
];

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function initializeStars() {
  stars.length = 0;
  for (let i = 0; i < STAR_COUNT; i += 1) {
    stars.push({
      x: (Math.random() - 0.5) * 4200,
      y: (Math.random() - 0.5) * 4200,
      z: (Math.random() - 0.5) * 4200,
      radius: Math.random() * 2 + 0.8,
      phase: Math.random() * Math.PI * 2
    });
  }
}

function project3D(x, y, z) {
  const dx = x - camera.x;
  const dy = y - camera.y;
  const dz = z - camera.z;

  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const x1 = dx * cosYaw - dz * sinYaw;
  const z1 = dx * sinYaw + dz * cosYaw;

  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const y2 = dy * cosPitch - z1 * sinPitch;
  let z2 = dy * sinPitch + z1 * cosPitch;

  if (z2 <= 1) z2 = 1;

  const fov = 920 * camera.zoom;
  const scale = fov / z2;

  return {
    x: x1 * scale + width / 2,
    y: y2 * scale + height / 2,
    scale,
    depth: z2
  };
}

function updateCamera() {
  const speed = 14 / camera.zoom;
  const rotSpeed = 0.018;

  if (keys.w) camera.z += speed * Math.cos(camera.yaw);
  if (keys.s) camera.z -= speed * Math.cos(camera.yaw);
  if (keys.a) camera.x -= speed;
  if (keys.d) camera.x += speed;

  if (keys.ArrowUp) camera.pitch -= rotSpeed;
  if (keys.ArrowDown) camera.pitch += rotSpeed;
  if (keys.ArrowLeft) camera.yaw -= rotSpeed;
  if (keys.ArrowRight) camera.yaw += rotSpeed;

  if (keys["+"] || keys["="]) camera.zoom *= 1.015;
  if (keys["-"] || keys["_"]) camera.zoom /= 1.015;

  camera.zoom = Math.max(0.18, Math.min(camera.zoom, 4));
}

function drawBackground() {
  const bg = ctx.createRadialGradient(
    width * 0.5, height * 0.45, 20,
    width * 0.5, height * 0.5, Math.max(width, height) * 0.6
  );
  bg.addColorStop(0, "rgba(0, 255, 204, 0.10)");
  bg.addColorStop(0.28, "rgba(70, 35, 130, 0.16)");
  bg.addColorStop(0.65, "rgba(8, 10, 18, 0.72)");
  bg.addColorStop(1, "rgba(5, 5, 5, 1)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
}

function drawCore(time) {
  const cx = width / 2;
  const cy = height / 2;

  for (let i = 0; i < 4; i += 1) {
    const radius = 90 + i * 42 + Math.sin(time * 0.001 + i) * 7;
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius);
    grad.addColorStop(0, `rgba(255, 220, 160, ${0.08 - i * 0.012})`);
    grad.addColorStop(0.45, `rgba(0, 255, 204, ${0.06 - i * 0.010})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(0,255,204,0.22)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 180, 70, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, cy, 260, 110, 0, 0, Math.PI * 2);
  ctx.stroke();

  const core = ctx.createRadialGradient(cx, cy, 2, cx, cy, 46);
  core.addColorStop(0, "rgba(255,255,255,0.98)");
  core.addColorStop(0.2, "rgba(255,220,160,0.86)");
  core.addColorStop(0.55, "rgba(0,255,204,0.18)");
  core.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, 46, 0, Math.PI * 2);
  ctx.fill();
}

function drawStars(time) {
  const projected = [];

  for (const star of stars) {
    star.phase += 0.01;
    const p = project3D(star.x, star.y, star.z);
    if (p.x >= -50 && p.x <= width + 50 && p.y >= -50 && p.y <= height + 50) {
      projected.push({
        ...p,
        radius: Math.max(0.5, star.radius * p.scale),
        phase: star.phase
      });
    }
  }

  projected.sort((a, b) => b.depth - a.depth);

  for (const p of projected) {
    const alpha = Math.max(0.08, Math.min(0.95, p.scale * 1.3));
    const flicker = (Math.sin(time * 0.002 + p.phase) + 1) / 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.min(5, p.radius), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 255, 204, ${alpha * flicker})`;
    ctx.fill();
  }
}

function drawPlanets(time) {
  const cx = width / 2;
  const cy = height / 2;

  for (const planet of planets) {
    const angle = time * 0.001 * planet.speed * 60 + planet.phase;
    const x = cx + Math.cos(angle) * planet.a;
    const y = cy + Math.sin(angle) * (planet.a * 0.35);

    ctx.beginPath();
    ctx.arc(x, y, planet.size, 0, Math.PI * 2);
    ctx.fillStyle = planet.color;
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "11px monospace";
    ctx.fillText(planet.name, x + 8, y - 4);
  }
}

function updateFps(now) {
  frameCount += 1;
  if (now - lastFrameTime >= 1000) {
    fpsCounter.textContent = String(frameCount);
    frameCount = 0;
    lastFrameTime = now;
  }
}

function render(now) {
  updateCamera();
  updateFps(now);
  drawBackground();
  drawCore(now);
  drawStars(now);
  drawPlanets(now);
  requestAnimationFrame(render);
}

/* ===========================
   API
=========================== */
async function runHealthCheck() {
  logEntry("Initiating backend diagnostics...", "REQ");
  backendValue.textContent = "PINGING...";
  solverValue.textContent = "CHECKING";

  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    backendValue.textContent = data.status?.toUpperCase?.() || "ONLINE";
    solverValue.textContent = data.logic_state?.toUpperCase?.() || "ACTIVE";

    logEntry(
      `Health OK. status=${data.status} resonance=${data.resonance} logic=${data.logic_state}`,
      "OK"
    );
  } catch (error) {
    backendValue.textContent = "OFFLINE";
    solverValue.textContent = "LOCAL";
    logEntry(`Health check failed: ${error.message}`, "ERR");
  }
}

async function runPrimeProtocol() {
  logEntry("Resonance status requested...", "PRIME");
  try {
    const response = await fetch(`${BACKEND_URL}/resonance/status`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    logEntry(
      `RSP=${data.radiant_sovereign_presence}, coherence=${data.phase_coherence}, frequency=${data.frequency}`,
      "PRIME"
    );
  } catch (error) {
    logEntry(`Resonance check failed: ${error.message}`, "ERR");
  }
}

/* ===========================
   COMMANDS
=========================== */
function handleCommand(raw) {
  const command = raw.trim();
  const lower = command.toLowerCase();

  if (!lower) return;

  if (lower === "help") {
    logEntry("Commands: help, health, prime, resonance, clear, reset, api <url>", "HELP");
    return;
  }

  if (lower === "health") {
    runHealthCheck();
    return;
  }

  if (lower === "prime" || lower === "resonance") {
    runPrimeProtocol();
    return;
  }

  if (lower === "clear") {
    systemLog.innerHTML = "";
    logEntry("Console cleared.", "SYS");
    return;
  }

  if (lower === "reset") {
    camera.x = 0;
    camera.y = 0;
    camera.z = -900;
    camera.pitch = 0;
    camera.yaw = 0;
    camera.zoom = 1;
    initializeStars();
    logEntry("Camera and star field reset.", "SYS");
    return;
  }

  if (lower.startsWith("api ")) {
    const url = command.slice(4).trim();
    if (!url) {
      logEntry("Usage: api https://your-backend-url", "WARN");
      return;
    }
    localStorage.setItem("parakletosApiBase", url);
    logEntry(`Saved API override: ${url}`, "SYS");
    logEntry("Reload the page to use the new API URL.", "SYS");
    return;
  }

  logEntry(`Unknown command: ${command}`, "WARN");
}

/* ===========================
   EVENTS
=========================== */
window.addEventListener("resize", resize);

window.addEventListener("keydown", (e) => {
  if (document.activeElement === commandInput && e.key !== "Escape") {
    return;
  }

  if (Object.prototype.hasOwnProperty.call(keys, e.key)) {
    keys[e.key] = true;
  }

  if (e.key === "/" && document.activeElement !== commandInput) {
    e.preventDefault();
    commandInput.focus();
  }

  if (e.key === "Escape") {
    commandInput.blur();
  }
});

window.addEventListener("keyup", (e) => {
  if (Object.prototype.hasOwnProperty.call(keys, e.key)) {
    keys[e.key] = false;
  }
});

navItems.forEach((button) => {
  button.addEventListener("click", () => {
    navItems.forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    logEntry(`Module focus shifted to ${button.dataset.module}.`, "MODULE");
  });
});

commandInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const value = commandInput.value;
    logEntry(`> ${value}`, "CMD");
    handleCommand(value);
    commandInput.value = "";
  }
});

/* ===========================
   BOOT
=========================== */
document.querySelector('.nav-item[data-module="sandbox"]')?.classList.add("active");
resize();
initializeStars();
logEntry("Frontend interface loaded. Canvas rendering active.", "SYS");
requestAnimationFrame(render);
runHealthCheck();
