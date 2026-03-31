/**
 * PARAKLETOS v.6.0.0 // Sovereign Logic Engine
 * Live Frontend Controller
 */

const BACKEND_URL = "https://parakletos-backend-2.onrender.com";

const canvas = document.getElementById("webgl-canvas");
const ctx = canvas.getContext("2d");
const logContainer = document.getElementById("system-log");
const fpsDisplay = document.getElementById("fps-counter");
const cycleDisplay = document.getElementById("cycle");
const inputField = document.querySelector(".input-line input");
const statusBadge = document.querySelector(".lock-badge .bigtxt");
const backendTelemetry = document.querySelector(".telemetry-readout .tel-point:nth-child(1) .val");
const solverTelemetry = document.querySelector(".telemetry-readout .tel-point:nth-child(2) .val");
const navButtons = document.querySelectorAll(".nav-item");

let frameCount = 0;
let lastFpsTime = performance.now();
let fps = 0;
let cycleCount = 0;
let activeMode = "sandbox";

const scene = {
  stars: [],
  particles: [],
  rings: [70, 110, 155, 210, 270],
  planets: [
    { name: "Mercury", radius: 90, speed: 0.020, size: 2, color: "#a3a3a3", angle: Math.random() * Math.PI * 2 },
    { name: "Venus", radius: 125, speed: 0.015, size: 3, color: "#f59e0b", angle: Math.random() * Math.PI * 2 },
    { name: "Earth", radius: 165, speed: 0.010, size: 3.5, color: "#38bdf8", angle: Math.random() * Math.PI * 2 },
    { name: "Mars", radius: 205, speed: 0.008, size: 2.5, color: "#ef4444", angle: Math.random() * Math.PI * 2 }
  ]
};

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function initScene() {
  scene.stars = Array.from({ length: 220 }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 2 + 0.5,
    alpha: Math.random() * 0.7 + 0.15
  }));

  scene.particles = Array.from({ length: 140 }, (_, i) => ({
    angle: (Math.PI * 2 * i) / 140,
    orbit: 65 + Math.random() * 110,
    speed: 0.002 + Math.random() * 0.006,
    size: Math.random() * 2.2 + 0.8,
    alpha: Math.random() * 0.5 + 0.15
  }));
}

function addLog(text, kind = "SYS") {
  const div = document.createElement("div");
  div.className = "entry";
  div.textContent = `[${kind}] ${text}`;
  logContainer.appendChild(div);
  logContainer.scrollTop = logContainer.scrollHeight;
}

function setLockedState(unlocked) {
  if (unlocked) {
    statusBadge.textContent = "UNLOCKED";
    statusBadge.style.color = "#22c55e";
  } else {
    statusBadge.textContent = "LOCKED";
    statusBadge.style.color = "#f59e0b";
  }
}

async function apiGet(path) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" }
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.detail || `HTTP ${res.status}`);
  }

  return data;
}

async function apiPost(path, body) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.detail || `HTTP ${res.status}`);
  }

  return data;
}

async function runHealth() {
  backendTelemetry.textContent = "PINGING";
  solverTelemetry.textContent = "CHECKING";

  try {
    const data = await apiGet("/health");
    backendTelemetry.textContent = (data.status || "ONLINE").toUpperCase();
    solverTelemetry.textContent = (data.logic_state || "ACTIVE").toUpperCase();
    setLockedState(data.status === "healthy");
    addLog(`Health OK. status=${data.status} resonance=${data.resonance} logic=${data.logic_state}`, "OK");
  } catch (error) {
    backendTelemetry.textContent = "OFFLINE";
    solverTelemetry.textContent = "ERROR";
    setLockedState(false);
    addLog(`Health failed: ${error.message}`, "ERR");
  }
}

async function runPrime() {
  try {
    const data = await apiGet("/resonance/status");
    addLog(
      `RSP=${data.radiant_sovereign_presence} coherence=${data.phase_coherence} frequency=${data.frequency}`,
      "PRIME"
    );
  } catch (error) {
    addLog(`Prime failed: ${error.message}`, "ERR");
  }
}

async function runEngine() {
  try {
    const data = await apiGet("/engine/status");
    addLog(
      `Engine active=${data.active} mapped_volumes=${data.mapped_volumes} uptime=${data.uptime_seconds}s`,
      "ENGINE"
    );
  } catch (error) {
    addLog(`Engine failed: ${error.message}`, "ERR");
  }
}

async function runIntegrity() {
  try {
    const data = await apiGet("/engine/integrity");
    addLog(
      `${data.message} mapped=${data.mapped_volumes} events=${data.verification_events}`,
      "CHECK"
    );
  } catch (error) {
    addLog(`Integrity failed: ${error.message}`, "ERR");
  }
}

async function runProcess() {
  try {
    addLog("Processing Volume 2...", "REQ");

    const data = await apiPost("/engine/process", {
      volume_id: 2,
      title: "Axioms of the Eternal Origin",
      text: "The manifold operates on a deterministic geometric scale where resonance is a function of logical consistency and prime frequency alignment."
    });

    addLog(
      `Volume ${data.volume_id} mapped. resonance=${data.projection.resonance.toFixed(3)} vector=${data.projection.presence_vector.join(",")}`,
      "ARCHIVE"
    );
  } catch (error) {
    addLog(`Process failed: ${error.message}`, "ERR");
  }
}

function handleCommand(raw) {
  const value = raw.trim();
  const cmd = value.toLowerCase();

  if (!cmd) return;
  addLog(`> ${value}`, "CMD");

  if (cmd === "health") return runHealth();
  if (cmd === "prime" || cmd === "resonance") return runPrime();
  if (cmd === "engine") return runEngine();
  if (cmd === "integrity") return runIntegrity();
  if (cmd === "process") return runProcess();

  if (cmd === "reset") {
    initScene();
    addLog("Universe reset.", "SYS");
    return;
  }

  if (cmd === "clear") {
    logContainer.innerHTML = "";
    addLog("Console cleared.", "SYS");
    return;
  }

  addLog("Command outside of Sovereign Logic parameters.", "WARN");
}

function drawBackground(w, h, t) {
  const bg = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h) * 0.55);
  bg.addColorStop(0, "rgba(20,255,220,0.14)");
  bg.addColorStop(0.25, "rgba(45,20,90,0.22)");
  bg.addColorStop(0.65, "rgba(10,10,18,0.72)");
  bg.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  for (const s of scene.stars) {
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(80,255,240,${s.alpha})`;
    ctx.fill();
  }
}

function drawManifold(t) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const cx = w / 2;
  const cy = h / 2;

  drawBackground(w, h, t);

  const pulse = (Math.sin(t * 0.0015) + 1) / 2;

  for (let i = 0; i < scene.rings.length; i++) {
    const r = scene.rings[i] + pulse * (8 + i * 2);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(245,158,11,${0.08 - i * 0.01})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

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

  for (const p of scene.particles) {
    p.angle += p.speed * (activeMode === "sandbox" ? 2 : 1);
    const x = cx + Math.cos(p.angle) * p.orbit;
    const y = cy + Math.sin(p.angle) * (p.orbit * 0.38);

    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(20,255,220,${p.alpha})`;
    ctx.fill();
  }

  for (const planet of scene.planets) {
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

  if (activeMode === "archive") {
    ctx.fillStyle = "rgba(245,158,11,0.85)";
    ctx.font = "bold 14px monospace";
    ctx.fillText("ARCHIVE FIELD ONLINE", 22, 28);
  } else if (activeMode === "verifier") {
    ctx.fillStyle = "rgba(34,197,94,0.85)";
    ctx.font = "bold 14px monospace";
    ctx.fillText("VERIFIER ACTIVE", 22, 28);
  } else if (activeMode === "search") {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 14px monospace";
    ctx.fillText("SEARCH LAYER ACTIVE", 22, 28);
  } else if (activeMode === "registry") {
    ctx.fillStyle = "rgba(245,158,11,0.85)";
    ctx.font = "bold 14px monospace";
    ctx.fillText("REGISTRY VIEW ACTIVE", 22, 28);
  }
}

function animate(time) {
  const now = performance.now();
  frameCount += 1;

  if (now - lastFpsTime >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastFpsTime = now;
    fpsDisplay.textContent = String(fps);
  }

  drawManifold(time);
  requestAnimationFrame(animate);
}

inputField.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handleCommand(inputField.value);
    inputField.value = "";
  }
});

navButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    navButtons.forEach((n) => n.classList.remove("active"));
    btn.classList.add("active");
    activeMode = btn.dataset.module;
    addLog(`Module switched to ${activeMode}.`, "MODULE");

    if (activeMode === "archive") await runProcess();
    if (activeMode === "verifier") await runIntegrity();
    if (activeMode === "search") await runPrime();
    if (activeMode === "registry") await runEngine();
  });
});

window.addEventListener("resize", resizeCanvas);

setInterval(() => {
  cycleCount += 1;
  cycleDisplay.textContent = cycleCount.toLocaleString();
}, 3000);

resizeCanvas();
initScene();
document.querySelector('.nav-item[data-module="sandbox"]')?.classList.add("active");

addLog("Omni-core initialized.", "BOOT");
addLog("Mirror Node manifold waiting for input.", "READY");

requestAnimationFrame(animate);

runHealth();
runEngine();
setInterval(runHealth, 5000);
