const BACKEND_URL = "https://parakletos-backend-2.onrender.com";

const cycleEl = document.getElementById("cycle");
const logBody = document.getElementById("system-log");
const canvas = document.getElementById("webgl-canvas");
const ctx = canvas.getContext("2d");
const commandInput = document.querySelector(".input-line input");
const navItems = document.querySelectorAll(".nav-item");
const gridOverlay = document.getElementById("gridOverlay");

const backendValue = document.querySelector(".telemetry-readout .tel-point:nth-child(1) .val");
const solverValue = document.querySelector(".telemetry-readout .tel-point:nth-child(2) .val");
const fpsCounter = document.getElementById("fps-counter");
const statusBadge = document.querySelector(".lock-badge .bigtxt");

for (let i = 0; i < 200; i++) {
  const cell = document.createElement("div");
  gridOverlay.appendChild(cell);
}

let cycle = 0;
let frameCount = 0;
let fps = 0;
let lastFpsTime = performance.now();
let mode = "sandbox";
let currentHealth = null;

const state = {
  stars: [],
  particles: [],
  rings: [],
  planets: [
    { name: "Mercury", radius: 90, speed: 0.020, size: 2, color: "#a3a3a3", angle: Math.random() * Math.PI * 2 },
    { name: "Venus", radius: 125, speed: 0.015, size: 3, color: "#f59e0b", angle: Math.random() * Math.PI * 2 },
    { name: "Earth", radius: 165, speed: 0.010, size: 3.5, color: "#38bdf8", angle: Math.random() * Math.PI * 2 },
    { name: "Mars", radius: 205, speed: 0.008, size: 2.5, color: "#ef4444", angle: Math.random() * Math.PI * 2 }
  ]
};

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rectWidth = canvas.clientWidth || 600;
  const rectHeight = canvas.clientHeight || 400;
  canvas.width = Math.floor(rectWidth * dpr);
  canvas.height = Math.floor(rectHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function initScene() {
  state.stars = Array.from({ length: 220 }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 2 + 0.5,
    alpha: Math.random() * 0.6 + 0.15
  }));

  state.particles = Array.from({ length: 140 }, (_, i) => ({
    angle: (Math.PI * 2 * i) / 140,
    orbit: 65 + Math.random() * 110,
    speed: 0.002 + Math.random() * 0.006,
    size: Math.random() * 2.2 + 0.8,
    alpha: Math.random() * 0.5 + 0.15
  }));

  state.rings = [70, 110, 155, 210, 270];
}

function log(message, kind = "SYS") {
  const line = document.createElement("div");
  line.className = "entry";
  line.textContent = `[${kind}] ${message}`;
  logBody.appendChild(line);
  logBody.scrollTop = logBody.scrollHeight;
}

function setUnlocked(unlocked) {
  if (unlocked) {
    statusBadge.textContent = "UNLOCKED";
    statusBadge.style.color = "#22c55e";
  } else {
    statusBadge.textContent = "LOCKED";
    statusBadge.style.color = "#f59e0b";
  }
}

async function fetchHealth() {
  backendValue.textContent = "PINGING...";
  solverValue.textContent = "CHECKING";
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    currentHealth = data;

    backendValue.textContent = data.status?.toUpperCase() || "ONLINE";
    solverValue.textContent = data.logic_state?.toUpperCase() || "ACTIVE";
    setUnlocked(data.status === "healthy");

    log(`Health OK. status=${data.status} resonance=${data.resonance} logic=${data.logic_state}`, "OK");
  } catch (err) {
    backendValue.textContent = "OFFLINE";
    solverValue.textContent = "ERROR";
    setUnlocked(false);
    log(`Health check failed: ${err.message}`, "ERR");
  }
}

async function fetchResonance() {
  try {
    const res = await fetch(`${BACKEND_URL}/resonance/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    log(`RSP=${data.radiant_sovereign_presence} coherence=${data.phase_coherence} frequency=${data.frequency}`, "PRIME");
  } catch (err) {
    log(`Resonance check failed: ${err.message}`, "ERR");
  }
}

async function fetchEngineStatus() {
  try {
    const res = await fetch(`${BACKEND_URL}/engine/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    log(`Engine active=${data.active} mapped_volumes=${data.mapped_volumes} uptime=${data.uptime_seconds}s`, "ENGINE");
  } catch (err) {
    log(`Engine status failed: ${err.message}`, "ERR");
  }
}

async function integrityCheck() {
  try {
    const res = await fetch(`${BACKEND_URL}/engine/integrity`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    log(`${data.message} mapped=${data.mapped_volumes} events=${data.verification_events}`, "CHECK");
  } catch (err) {
    log(`Integrity check failed: ${err.message}`, "ERR");
  }
}

async function processDemoVolume() {
  try {
    const res = await fetch(`${BACKEND_URL}/engine/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        volume_id: 1,
        title: "The Geometry of Truth",
        text: "The Celestial Eternal Origin provides the geometry for all logical structures."
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);

    log(
      `Volume ${data.volume_id} mapped. resonance=${data.projection.resonance.toFixed(3)} vector=${data.projection.presence_vector.join(",")}`,
      "ARCHIVE"
    );
  } catch (err) {
    log(`Process volume failed: ${err.message}`, "ERR");
  }
}

function drawBackground(w, h, t) {
  const bg = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h) * 0.55);
  bg.addColorStop(0, "rgba(20, 255, 220, 0.14)");
  bg.addColorStop(0.25, "rgba(45, 20, 90, 0.22)");
  bg.addColorStop(0.65, "rgba(10, 10, 18, 0.72)");
  bg.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  for (const s of state.stars) {
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(80,255,240,${s.alpha})`;
    ctx.fill();
  }

  const pulse = (Math.sin(t * 0.0015) + 1) / 2;
  const cx = w / 2;
  const cy = h / 2;

  for (let i = 0; i < state.rings.length; i++) {
    const r = state.rings[i] + pulse * (8 + i * 2);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(245,158,11,${0.06 - i * 0.008})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawUniverse(w, h, t) {
  const cx = w / 2;
  const cy = h / 2;

  const core = ctx.createRadialGradient(cx, cy, 10, cx, cy, 120);
  core.addColorStop(0, "rgba(30,255,220,0.85)");
  core.addColorStop(0.2, "rgba(20,240,210,0.35)");
  core.addColorStop(0.55, "rgba(120,80,255,0.14)");
  core.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(56,189,248,0.45)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 190, 70, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy, 125, 42, 0, 0, Math.PI * 2);
  ctx.stroke();

  for (const p of state.particles) {
    p.angle += p.speed * (mode === "sandbox" ? 2 : 1);
    const x = cx + Math.cos(p.angle) * p.orbit;
    const y = cy + Math.sin(p.angle) * (p.orbit * 0.38);
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(20,255,220,${p.alpha})`;
    ctx.fill();
  }

  for (const planet of state.planets) {
    planet.angle += planet.speed;
    const x = cx + Math.cos(planet.angle) * planet.radius;
    const y = cy + Math.sin(planet.angle) * (planet.radius * 0.36);
    ctx.beginPath();
    ctx.arc(x, y, planet.size, 0, Math.PI * 2);
    ctx.fillStyle = planet.color;
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "10px monospace";
    ctx.fillText(planet.name, x + 8, y);
  }

  if (mode === "archive") {
    ctx.fillStyle = "rgba(245,158,11,0.8)";
    ctx.font = "bold 14px monospace";
    ctx.fillText("ARCHIVE FIELD ONLINE", 22, 28);
  } else if (mode === "verifier") {
    ctx.fillStyle = "rgba(34,197,94,0.8)";
    ctx.font = "bold 14px monospace";
    ctx.fillText("VERIFIER ACTIVE", 22, 28);
  } else if (mode === "search") {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "bold 14px monospace";
    ctx.fillText("SEARCH LAYER ACTIVE", 22, 28);
  } else if (mode === "registry") {
    ctx.fillStyle = "rgba(245,158,11,0.8)";
    ctx.font = "bold 14px monospace";
    ctx.fillText("REGISTRY VIEW ACTIVE", 22, 28);
  }
}

function render(time) {
  const w = canvas.clientWidth || 600;
  const h = canvas.clientHeight || 400;

  drawBackground(w, h, time);
  drawUniverse(w, h, time);

  frameCount += 1;
  if (time - lastFpsTime > 1000) {
    fps = frameCount;
    frameCount = 0;
    lastFpsTime = time;
    fpsCounter.textContent = String(fps);
  }

  requestAnimationFrame(render);
}

function handleCommand(text) {
  const value = text.trim();
  const lower = value.toLowerCase();

  if (!value) return;

  log(`> ${value}`, "CMD");

  if (lower === "health") return fetchHealth();
  if (lower === "prime" || lower === "resonance") return fetchResonance();
  if (lower === "engine") return fetchEngineStatus();
  if (lower === "integrity") return integrityCheck();
  if (lower === "process") return processDemoVolume();
  if (lower === "reset") {
    initScene();
    log("Universe reset.", "SYS");
    return;
  }
  if (lower === "clear") {
    logBody.innerHTML = "";
    log("Console cleared.", "SYS");
    return;
  }

  log(`Unknown command: ${value}`, "WARN");
}

commandInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handleCommand(commandInput.value);
    commandInput.value = "";
  }
});

navItems.forEach((btn) => {
  btn.addEventListener("click", async () => {
    navItems.forEach((n) => n.classList.remove("active"));
    btn.classList.add("active");
    mode = btn.dataset.module;
    log(`Module switched to ${mode}.`, "MODULE");

    if (mode === "archive") await processDemoVolume();
    if (mode === "verifier") await integrityCheck();
    if (mode === "registry") await fetchEngineStatus();
    if (mode === "search") await fetchResonance();
  });
});

window.addEventListener("resize", resizeCanvas);

setInterval(() => {
  cycle += 1;
  cycleEl.textContent = cycle.toLocaleString();
}, 3000);

resizeCanvas();
initScene();
document.querySelector('.nav-item[data-module="sandbox"]')?.classList.add("active");
log("Omni-core initialized.", "BOOT");
log("Mirror Node manifold waiting for input.", "READY");
requestAnimationFrame(render);

fetchHealth();
fetchEngineStatus();
setInterval(fetchHealth, 5000);
