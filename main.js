const BACKEND_URL = (() => {
  const override = localStorage.getItem("parakletosApiBase");
  if (override) return override.replace(/\/$/, "");

  const { protocol, hostname } = window.location;
  if (protocol === "file:") return "http://localhost:8000";
  if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:8000";

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

const statusText = document.getElementById("statusText");
const backendStatus = document.getElementById("backendStatus");
const solverStatus = document.getElementById("solverStatus");
const volumeCount = document.getElementById("volumeCount");
const freqText = document.getElementById("freqText");
const syncText = document.getElementById("syncText");
const cycleDisplay = document.getElementById("cycle");

const navItems = document.querySelectorAll(".nav-item");
const gridOverlay = document.getElementById("gridOverlay");

/* controls */
const zoomSlider = document.getElementById("zoomSlider");
const rotationSpeedSlider = document.getElementById("rotationSpeedSlider");
const starCountSlider = document.getElementById("starCountSlider");
const particleCountSlider = document.getElementById("particleCountSlider");
const glowSlider = document.getElementById("glowSlider");
const orbitStretchSlider = document.getElementById("orbitStretchSlider");

const zoomValue = document.getElementById("zoomValue");
const rotationSpeedValue = document.getElementById("rotationSpeedValue");
const starCountValue = document.getElementById("starCountValue");
const particleCountValue = document.getElementById("particleCountValue");
const glowValue = document.getElementById("glowValue");
const orbitStretchValue = document.getElementById("orbitStretchValue");
const labelsValue = document.getElementById("labelsValue");

const toggleLabelsBtn = document.getElementById("toggleLabelsBtn");
const toggleAutoRotateBtn = document.getElementById("toggleAutoRotateBtn");
const centerViewBtn = document.getElementById("centerViewBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const boostStarsBtn = document.getElementById("boostStarsBtn");
const boostParticlesBtn = document.getElementById("boostParticlesBtn");
const resetUniverseBtn = document.getElementById("resetUniverseBtn");

if (!canvas || !ctx || !fpsCounter || !systemLog || !commandInput) {
  throw new Error("Required DOM elements are missing.");
}

/* build grid overlay */
if (gridOverlay && gridOverlay.children.length === 0) {
  for (let i = 0; i < 192; i += 1) {
    const cell = document.createElement("div");
    gridOverlay.appendChild(cell);
  }
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
   STATE
=========================== */
let width = 0;
let height = 0;
let lastFrameTime = performance.now();
let frameCount = 0;
let cycleCount = 0;
let activeMode = "sandbox";
let dragging = false;
let lastPointerX = 0;
let lastPointerY = 0;

const state = {
  autoRotate: false,
  showLabels: true,
  glowStrength: 1,
  orbitStretch: 0.36,
  rotationSpeedFactor: 1,
  stars: [],
  particles: [],
  rings: [70, 110, 155, 210, 270],
  camera: {
    rotation: 0,
    zoom: 1,
    dragX: 0,
    dragY: 0
  },
  planets: [
    { name: "Mercury", radius: 90, speed: 0.020, size: 2, color: "#aaaaaa", angle: Math.random() * Math.PI * 2 },
    { name: "Venus", radius: 130, speed: 0.015, size: 3, color: "#eebb00", angle: Math.random() * Math.PI * 2 },
    { name: "Earth", radius: 180, speed: 0.010, size: 3.5, color: "#0088ff", angle: Math.random() * Math.PI * 2 },
    { name: "Mars", radius: 245, speed: 0.008, size: 2.5, color: "#ff4400", angle: Math.random() * Math.PI * 2 }
  ],

  /* reaction state */
  universePulse: 1,
  reactionBursts: [],
  mappedVolumes: 0,
  integrityLevel: 0,
  resonanceBoost: 1,
  nodeClusters: []
};

/* ===========================
   INIT / SCENE
=========================== */
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();

  width = Math.max(1, Math.floor(rect.width));
  height = Math.max(1, Math.floor(rect.height));

  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function initScene(
  starCount = Number(starCountSlider?.value || 1400),
  particleCount = Number(particleCountSlider?.value || 260)
) {
  state.stars = Array.from({ length: starCount }, () => ({
    x: Math.random(),
    y: Math.random(),
    z: Math.random() * 0.9 + 0.1,
    size: Math.random() * 2 + 0.4,
    alpha: Math.random() * 0.7 + 0.15
  }));

  state.particles = Array.from({ length: particleCount }, (_, i) => ({
    angle: (Math.PI * 2 * i) / particleCount,
    orbit: 60 + Math.random() * 150,
    speed: 0.0015 + Math.random() * 0.0045,
    size: Math.random() * 2.6 + 0.7,
    alpha: Math.random() * 0.65 + 0.15
  }));
}

function syncControlLabels() {
  if (zoomValue) zoomValue.textContent = state.camera.zoom.toFixed(2);
  if (rotationSpeedValue) rotationSpeedValue.textContent = state.rotationSpeedFactor.toFixed(2);
  if (starCountValue) starCountValue.textContent = String(state.stars.length);
  if (particleCountValue) particleCountValue.textContent = String(state.particles.length);
  if (glowValue) glowValue.textContent = state.glowStrength.toFixed(2);
  if (orbitStretchValue) orbitStretchValue.textContent = state.orbitStretch.toFixed(2);
  if (labelsValue) labelsValue.textContent = state.showLabels ? "ON" : "OFF";
}

function spawnReactionBurst(x, y, amount = 18, color = "0,255,204") {
  for (let i = 0; i < amount; i += 1) {
    state.reactionBursts.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 1,
      decay: 0.015 + Math.random() * 0.02,
      size: 1 + Math.random() * 4,
      color
    });
  }
}

function spawnVolumeCluster(volumeNumber = 1) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 120 + volumeNumber * 12;

  state.nodeClusters.push({
    volume: volumeNumber,
    angle,
    radius,
    orbitSpeed: 0.002 + Math.random() * 0.003,
    size: 5 + Math.min(14, volumeNumber * 0.2),
    alpha: 0.75,
    color: volumeNumber % 2 === 0 ? "#22d3ee" : "#f59e0b"
  });

  if (state.nodeClusters.length > 200) {
    state.nodeClusters.shift();
  }
}

function reactToMappedVolumes(count) {
  state.mappedVolumes = count;
  state.universePulse = Math.min(1.8, 1 + count * 0.08);
  state.resonanceBoost = Math.min(2.5, 1 + count * 0.05);

  while (state.nodeClusters.length < count) {
    spawnVolumeCluster(state.nodeClusters.length + 1);
  }

  if (state.nodeClusters.length > count) {
    state.nodeClusters.length = count;
  }

  const cx = width / 2 + state.camera.dragX * 0.15;
  const cy = height / 2 + state.camera.dragY * 0.15;
  spawnReactionBurst(cx, cy, 10 + count * 2, "34,211,238");
}

function reactToIntegrity(events = 0) {
  state.integrityLevel = events;
  state.glowStrength = Math.min(2.5, 1 + events * 0.03);
  const cx = width / 2 + state.camera.dragX * 0.15;
  const cy = height / 2 + state.camera.dragY * 0.15;
  spawnReactionBurst(cx, cy, 16, "245,158,11");
}

function reactToFullUpdate() {
  state.autoRotate = true;
  state.glowStrength = Math.min(2.5, state.glowStrength + 0.35);
  state.rotationSpeedFactor = Math.min(3, state.rotationSpeedFactor + 0.2);
  state.universePulse = Math.min(2.2, state.universePulse + 0.25);
  const cx = width / 2 + state.camera.dragX * 0.15;
  const cy = height / 2 + state.camera.dragY * 0.15;
  spawnReactionBurst(cx, cy, 42, "255,220,160");
  syncControlLabels();
}

function applyModeVisuals() {
  if (!statusText) return;

  if (activeMode === "archive") {
    statusText.textContent = "ARCHIVE";
    statusText.style.color = "#f59e0b";
  } else if (activeMode === "verifier") {
    statusText.textContent = "VERIFY";
    statusText.style.color = "#22c55e";
  } else if (activeMode === "search") {
    statusText.textContent = "SEARCH";
    statusText.style.color = "#ffffff";
  } else if (activeMode === "registry") {
    statusText.textContent = "REGISTRY";
    statusText.style.color = "#f59e0b";
  } else {
    statusText.textContent = "UNLOCKED";
    statusText.style.color = "#22c55e";
  }
}

/* ===========================
   API
=========================== */
async function apiGet(path) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
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
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

async function runHealthCheck() {
  logEntry("Initiating backend diagnostics...", "REQ");
  if (backendStatus) backendStatus.textContent = "PINGING";
  if (solverStatus) solverStatus.textContent = "CHECKING";

  try {
    const data = await apiGet("/health");

    if (backendStatus) backendStatus.textContent = data.status?.toUpperCase?.() || "ONLINE";
    if (solverStatus) solverStatus.textContent = data.logic_state?.toUpperCase?.() || "ACTIVE";
    if (freqText) freqText.textContent = data.resonance || "432.0Hz";
    if (syncText) syncText.textContent = data.logic_state === "Synchronized" ? "COMPLETE" : "WAITING";

    if (data.status === "healthy" && activeMode === "sandbox") {
      applyModeVisuals();
    } else if (data.status !== "healthy" && statusText) {
      statusText.textContent = "OFFLINE";
      statusText.style.color = "#ef4444";
    }

    logEntry(`Health OK. status=${data.status} logic=${data.logic_state}`, "OK");
  } catch (error) {
    if (backendStatus) backendStatus.textContent = "OFFLINE";
    if (solverStatus) solverStatus.textContent = "ERROR";
    if (freqText) freqText.textContent = "DOWN";
    if (syncText) syncText.textContent = "FAILED";
    if (statusText) {
      statusText.textContent = "OFFLINE";
      statusText.style.color = "#ef4444";
    }
    logEntry(`Health check failed: ${error.message}`, "ERR");
  }
}

async function runPrimeProtocol() {
  logEntry("Resonance status requested...", "PRIME");
  try {
    const data = await apiGet("/resonance/status");
    if (freqText) freqText.textContent = `${data.frequency}Hz`;
    logEntry(
      `RSP=${data.radiant_sovereign_presence}, coherence=${data.phase_coherence}, frequency=${data.frequency}`,
      "PRIME"
    );
  } catch (error) {
    logEntry(`Resonance check failed: ${error.message}`, "ERR");
  }
}

async function runEngineStatus() {
  try {
    const data = await apiGet("/engine/status");
    if (volumeCount) volumeCount.textContent = `${data.mapped_volumes} / 200`;
    reactToMappedVolumes(data.mapped_volumes || 0);
    reactToIntegrity(data.verification_events || 0);
    logEntry(
      `Engine active=${data.active} mapped_volumes=${data.mapped_volumes} uptime=${data.uptime_seconds}s`,
      "ENGINE"
    );
  } catch (error) {
    logEntry(`Engine status failed: ${error.message}`, "ERR");
  }
}

async function runIntegrityCheck() {
  try {
    const data = await apiGet("/engine/integrity");
    if (volumeCount) volumeCount.textContent = `${data.mapped_volumes} / 200`;
    reactToMappedVolumes(data.mapped_volumes || 0);
    reactToIntegrity(data.verification_events || 0);
    logEntry(`${data.message} mapped=${data.mapped_volumes} events=${data.verification_events}`, "CHECK");
  } catch (error) {
    logEntry(`Integrity check failed: ${error.message}`, "ERR");
  }
}

async function runProcessVolume() {
  try {
    logEntry("Processing Volume 2...", "REQ");
    const data = await apiPost("/engine/process", {
      volume_id: 2,
      title: "Axioms of the Eternal Origin",
      text: "The manifold operates on a deterministic geometric scale where resonance is a function of logical consistency and prime frequency alignment."
    });

    if (volumeCount) volumeCount.textContent = `${data.projection.volume} / 200`;
    reactToMappedVolumes(Math.max(state.mappedVolumes, data.projection.volume || 1));
    spawnVolumeCluster(data.projection.volume || 1);
    spawnReactionBurst(width / 2, height / 2, 24, "34,211,238");

    logEntry(
      `Volume ${data.volume_id} mapped. resonance=${data.projection.resonance.toFixed(3)} vector=${data.projection.presence_vector.join(",")}`,
      "ARCHIVE"
    );
  } catch (error) {
    logEntry(`Process failed: ${error.message}`, "ERR");
  }
}

async function runFullUpdate() {
  try {
    logEntry("Full update requested...", "REQ");

    const data = await apiPost("/engine/full-update", {
      enforce_legacy_integrity: true,
      apply_system_update: true
    });

    for (const line of data.logs || []) {
      logEntry(line, "UPDATE");
    }

    if (data.ok) {
      if (backendStatus) backendStatus.textContent = "HEALTHY";
      if (solverStatus) solverStatus.textContent = "SYNCHRONIZED";
      if (freqText) freqText.textContent = `${data.frequency}Hz`;
      if (syncText) syncText.textContent = "COMPLETE";
      activeMode = "sandbox";
      navItems.forEach((n) => n.classList.remove("active"));
      document.querySelector('.nav-item[data-module="sandbox"]')?.classList.add("active");
      reactToFullUpdate();
      reactToMappedVolumes(data.mapped_volumes || state.mappedVolumes || 1);
      applyModeVisuals();
    }
  } catch (error) {
    logEntry(`Full update failed: ${error.message}`, "ERR");
  }
}

/* ===========================
   COMMANDS
=========================== */
function handleCommand(raw) {
  const command = raw.trim().toLowerCase();
  if (!command) return;

  if (command === "help") {
    logEntry("Commands: help, health, prime, engine, integrity, process, fullupdate, clear, reset, api <url>", "HELP");
    return;
  }

  if (command === "health") return runHealthCheck();
  if (command === "prime" || command === "resonance") return runPrimeProtocol();
  if (command === "engine") return runEngineStatus();
  if (command === "integrity") return runIntegrityCheck();
  if (command === "process") return runProcessVolume();
  if (command === "fullupdate") return runFullUpdate();

  if (command === "clear") {
    systemLog.innerHTML = "";
    logEntry("Console cleared.", "SYS");
    return;
  }

  if (command === "reset") {
    state.camera.rotation = 0;
    state.camera.zoom = 1;
    state.camera.dragX = 0;
    state.camera.dragY = 0;
    state.autoRotate = false;
    state.showLabels = true;
    state.glowStrength = 1;
    state.orbitStretch = 0.36;
    state.rotationSpeedFactor = 1;

    state.reactionBursts = [];
    state.nodeClusters = [];
    state.mappedVolumes = 0;
    state.integrityLevel = 0;
    state.universePulse = 1;
    state.resonanceBoost = 1;

    if (zoomSlider) zoomSlider.value = "1.00";
    if (rotationSpeedSlider) rotationSpeedSlider.value = "1.00";
    if (starCountSlider) starCountSlider.value = "1400";
    if (particleCountSlider) particleCountSlider.value = "260";
    if (glowSlider) glowSlider.value = "1.00";
    if (orbitStretchSlider) orbitStretchSlider.value = "0.36";

    initScene(1400, 260);
    syncControlLabels();
    activeMode = "sandbox";
    navItems.forEach((n) => n.classList.remove("active"));
    document.querySelector('.nav-item[data-module="sandbox"]')?.classList.add("active");
    applyModeVisuals();
    logEntry("Universe reset.", "SYS");
    return;
  }

  if (command.startsWith("api ")) {
    const url = raw.slice(4).trim();
    if (!url) {
      logEntry("Usage: api https://your-backend-url", "WARN");
      return;
    }
    localStorage.setItem("parakletosApiBase", url);
    logEntry(`Saved API override: ${url}`, "SYS");
    return;
  }

  logEntry(`Unknown command: ${raw}`, "WARN");
}

/* ===========================
   DRAWING
=========================== */
function drawBackground() {
  const bg = ctx.createRadialGradient(
    width * 0.5, height * 0.45, 20,
    width * 0.5, height * 0.5, Math.max(width, height) * 0.6
  );
  bg.addColorStop(0, `rgba(0, 255, 204, ${0.10 * state.glowStrength * state.universePulse})`);
  bg.addColorStop(0.28, "rgba(70, 35, 130, 0.16)");
  bg.addColorStop(0.65, "rgba(8, 10, 18, 0.72)");
  bg.addColorStop(1, "rgba(5, 5, 5, 1)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
}

function drawCore(time) {
  const cx = width / 2 + state.camera.dragX * 0.15;
  const cy = height / 2 + state.camera.dragY * 0.15;

  for (let i = 0; i < 4; i += 1) {
    const radius = (90 + i * 42 + Math.sin(time * 0.001 + i) * 7) * state.camera.zoom * state.universePulse;
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius);
    grad.addColorStop(0, `rgba(255, 220, 160, ${(0.08 - i * 0.012) * state.glowStrength})`);
    grad.addColorStop(0.45, `rgba(0, 255, 204, ${(0.06 - i * 0.010) * state.glowStrength})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(0,255,204,0.22)";
  ctx.lineWidth = 1.2;

  ctx.beginPath();
  ctx.ellipse(
    cx,
    cy,
    180 * state.camera.zoom * state.universePulse,
    70 * state.camera.zoom * state.universePulse,
    state.camera.rotation,
    0,
    Math.PI * 2
  );
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    cx,
    cy,
    260 * state.camera.zoom * state.universePulse,
    110 * state.camera.zoom * state.universePulse,
    state.camera.rotation,
    0,
    Math.PI * 2
  );
  ctx.stroke();

  const core = ctx.createRadialGradient(
    cx,
    cy,
    2,
    cx,
    cy,
    46 * state.camera.zoom * state.glowStrength
  );
  core.addColorStop(0, "rgba(255,255,255,0.98)");
  core.addColorStop(0.2, "rgba(255,220,160,0.86)");
  core.addColorStop(0.55, "rgba(0,255,204,0.18)");
  core.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, 46 * state.camera.zoom, 0, Math.PI * 2);
  ctx.fill();
}

function project3D(x, y, z) {
  const dx = x - state.camera.dragX * 10;
  const dy = y - state.camera.dragY * 10;
  const dz = z - (-900);

  const cosYaw = Math.cos(state.camera.rotation);
  const sinYaw = Math.sin(state.camera.rotation);
  const x1 = dx * cosYaw - dz * sinYaw;
  const z1 = dx * sinYaw + dz * cosYaw;

  const y2 = dy;
  let z2 = z1;

  if (z2 <= 1) z2 = 1;

  const fov = 920 * state.camera.zoom;
  const scale = fov / z2;

  return {
    x: x1 * scale + width / 2,
    y: y2 * scale + height / 2,
    scale,
    depth: z2
  };
}

function drawStars(time) {
  const projected = [];

  for (const star of state.stars) {
    const sx = (star.x - 0.5) * 4200;
    const sy = (star.y - 0.5) * 4200;
    const sz = (star.z - 0.5) * 4200 + 2100;
    const p = project3D(sx, sy, sz);

    if (p.x >= -50 && p.x <= width + 50 && p.y >= -50 && p.y <= height + 50) {
      projected.push({
        ...p,
        radius: Math.max(0.5, star.size * p.scale * 0.02),
        phase: time * 0.002 + star.alpha
      });
    }
  }

  projected.sort((a, b) => b.depth - a.depth);

  for (const p of projected) {
    const alpha = Math.max(0.08, Math.min(0.95, p.scale * 0.02));
    const flicker = (Math.sin(p.phase) + 1) / 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.min(5, p.radius), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 255, 204, ${alpha * flicker})`;
    ctx.fill();
  }
}

function drawParticles() {
  const cx = width / 2 + state.camera.dragX * 0.15;
  const cy = height / 2 + state.camera.dragY * 0.15;

  for (const p of state.particles) {
    p.angle += p.speed * state.rotationSpeedFactor;
    const radius = p.orbit * state.camera.zoom;
    const x = cx + Math.cos(p.angle + state.camera.rotation) * radius;
    const y = cy + Math.sin(p.angle + state.camera.rotation) * (radius * state.orbitStretch);

    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,255,204,${p.alpha})`;
    ctx.fill();
  }
}

function drawNodeClusters() {
  const cx = width / 2 + state.camera.dragX * 0.15;
  const cy = height / 2 + state.camera.dragY * 0.15;

  for (const cluster of state.nodeClusters) {
    cluster.angle += cluster.orbitSpeed * state.rotationSpeedFactor;

    const x = cx + Math.cos(cluster.angle + state.camera.rotation) * (cluster.radius * state.camera.zoom);
    const y = cy + Math.sin(cluster.angle + state.camera.rotation) * (cluster.radius * state.camera.zoom * state.orbitStretch);

    ctx.beginPath();
    ctx.arc(x, y, cluster.size, 0, Math.PI * 2);
    ctx.fillStyle = cluster.color;
    ctx.globalAlpha = cluster.alpha;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(x, y, cluster.size + 8, 0, Math.PI * 2);
    ctx.strokeStyle = `${cluster.color}55`;
    ctx.lineWidth = 1;
    ctx.stroke();

    if (state.showLabels) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "10px monospace";
      ctx.fillText(`V${cluster.volume}`, x + 10, y + 3);
    }
  }
}

function drawPlanets() {
  const cx = width / 2 + state.camera.dragX * 0.15;
  const cy = height / 2 + state.camera.dragY * 0.15;

  for (const planet of state.planets) {
    planet.angle += planet.speed * state.rotationSpeedFactor;
    const radius = planet.radius * state.camera.zoom;
    const x = cx + Math.cos(planet.angle + state.camera.rotation) * radius;
    const y = cy + Math.sin(planet.angle + state.camera.rotation) * (radius * state.orbitStretch);

    ctx.beginPath();
    ctx.arc(x, y, planet.size, 0, Math.PI * 2);
    ctx.fillStyle = planet.color;
    ctx.fill();

    if (state.showLabels) {
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.font = "11px monospace";
      ctx.fillText(planet.name, x + 8, y - 4);
    }
  }
}

function drawReactionBursts() {
  for (let i = state.reactionBursts.length - 1; i >= 0; i -= 1) {
    const b = state.reactionBursts[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life -= b.decay;

    if (b.life <= 0) {
      state.reactionBursts.splice(i, 1);
      continue;
    }

    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size * b.life, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${b.color},${Math.max(0, b.life)})`;
    ctx.fill();
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
  if (state.autoRotate) {
    state.camera.rotation += 0.0025 * state.rotationSpeedFactor;
  }

  updateFps(now);
  ctx.clearRect(0, 0, width, height);
  drawBackground();
  drawCore(now);
  drawStars(now);
  drawParticles();
  drawNodeClusters();
  drawPlanets();
  drawReactionBursts();

  requestAnimationFrame(render);
}

/* ===========================
   CONTROLS
=========================== */
zoomSlider?.addEventListener("input", (e) => {
  state.camera.zoom = Number(e.target.value);
  syncControlLabels();
});

rotationSpeedSlider?.addEventListener("input", (e) => {
  state.rotationSpeedFactor = Number(e.target.value);
  syncControlLabels();
});

starCountSlider?.addEventListener("input", (e) => {
  initScene(Number(e.target.value), state.particles.length || 260);
  syncControlLabels();
});

particleCountSlider?.addEventListener("input", (e) => {
  initScene(state.stars.length || 1400, Number(e.target.value));
  syncControlLabels();
});

glowSlider?.addEventListener("input", (e) => {
  state.glowStrength = Number(e.target.value);
  syncControlLabels();
});

orbitStretchSlider?.addEventListener("input", (e) => {
  state.orbitStretch = Number(e.target.value);
  syncControlLabels();
});

toggleLabelsBtn?.addEventListener("click", () => {
  state.showLabels = !state.showLabels;
  syncControlLabels();
  logEntry(`Labels ${state.showLabels ? "enabled" : "disabled"}.`, "UI");
});

toggleAutoRotateBtn?.addEventListener("click", () => {
  state.autoRotate = !state.autoRotate;
  logEntry(`Auto rotate ${state.autoRotate ? "enabled" : "disabled"}.`, "UI");
});

centerViewBtn?.addEventListener("click", () => {
  state.camera.rotation = 0;
  state.camera.dragX = 0;
  state.camera.dragY = 0;
  logEntry("View centered.", "UI");
});

zoomInBtn?.addEventListener("click", () => {
  state.camera.zoom = Math.min(2.5, state.camera.zoom + 0.1);
  if (zoomSlider) zoomSlider.value = state.camera.zoom.toFixed(2);
  syncControlLabels();
});

zoomOutBtn?.addEventListener("click", () => {
  state.camera.zoom = Math.max(0.55, state.camera.zoom - 0.1);
  if (zoomSlider) zoomSlider.value = state.camera.zoom.toFixed(2);
  syncControlLabels();
});

boostStarsBtn?.addEventListener("click", () => {
  const next = Math.min(4000, state.stars.length + 300);
  if (starCountSlider) starCountSlider.value = String(next);
  initScene(next, state.particles.length || 260);
  syncControlLabels();
});

boostParticlesBtn?.addEventListener("click", () => {
  const next = Math.min(1200, state.particles.length + 80);
  if (particleCountSlider) particleCountSlider.value = String(next);
  initScene(state.stars.length || 1400, next);
  syncControlLabels();
});

resetUniverseBtn?.addEventListener("click", () => {
  handleCommand("reset");
});

/* ===========================
   POINTER / TOUCH
=========================== */
function pointerDown(x, y) {
  dragging = true;
  lastPointerX = x;
  lastPointerY = y;
}

function pointerMove(x, y) {
  if (!dragging) return;
  const dx = x - lastPointerX;
  const dy = y - lastPointerY;
  lastPointerX = x;
  lastPointerY = y;

  state.camera.rotation += dx * 0.005;
  state.camera.dragX += dx * 0.9;
  state.camera.dragY += dy * 0.9;
}

function pointerUp() {
  dragging = false;
}

canvas.addEventListener("mousedown", (e) => pointerDown(e.clientX, e.clientY));
window.addEventListener("mousemove", (e) => pointerMove(e.clientX, e.clientY));
window.addEventListener("mouseup", pointerUp);

canvas.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  if (!t) return;
  pointerDown(t.clientX, t.clientY);
}, { passive: true });

canvas.addEventListener("touchmove", (e) => {
  const t = e.touches[0];
  if (!t) return;
  pointerMove(t.clientX, t.clientY);
}, { passive: true });

window.addEventListener("touchend", pointerUp, { passive: true });

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.08 : 0.08;
  state.camera.zoom = Math.max(0.55, Math.min(2.5, state.camera.zoom + delta));
  if (zoomSlider) zoomSlider.value = state.camera.zoom.toFixed(2);
  syncControlLabels();
}, { passive: false });

/* ===========================
   EVENTS
=========================== */
window.addEventListener("resize", resizeCanvas);

navItems.forEach((button) => {
  button.addEventListener("click", async () => {
    navItems.forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    activeMode = button.dataset.module;
    applyModeVisuals();
    logEntry(`Module focus shifted to ${button.dataset.module}.`, "MODULE");

    if (activeMode === "archive") await runProcessVolume();
    if (activeMode === "verifier") await runIntegrityCheck();
    if (activeMode === "search") await runPrimeProtocol();
    if (activeMode === "registry") await runEngineStatus();
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

window.addEventListener("keydown", (e) => {
  if (document.activeElement === commandInput && e.key !== "Escape") return;
  if (e.key === "/") {
    e.preventDefault();
    commandInput.focus();
  }
  if (e.key === "Escape") {
    commandInput.blur();
  }
});

/* ===========================
   BOOT
=========================== */
setInterval(() => {
  cycleCount += 1;
  if (cycleDisplay) cycleDisplay.textContent = cycleCount.toLocaleString();
}, 3000);

resizeCanvas();
initScene();
syncControlLabels();
document.querySelector('.nav-item[data-module="sandbox"]')?.classList.add("active");
applyModeVisuals();
runHealthCheck();
runEngineStatus();
logEntry("Frontend interface loaded. Canvas rendering active.", "SYS");
requestAnimationFrame(render);
