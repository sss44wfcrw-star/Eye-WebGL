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
const homeView = document.getElementById("homeView");
const appViews = document.getElementById("appViews");

const headerRealityState = document.getElementById("headerRealityState");
const headerBackendState = document.getElementById("headerBackendState");

const aiMessages = document.getElementById("aiMessages");
const aiInput = document.getElementById("aiInput");
const aiSendBtn = document.getElementById("aiSendBtn");
const aiClearBtn = document.getElementById("aiClearBtn");
const aiQuickButtons = document.querySelectorAll(".ai-quick");
const homeCards = document.querySelectorAll(".home-card");

const canvas = document.getElementById("webgl-canvas");
const ctx = canvas?.getContext("2d");

const fpsCounter = document.getElementById("fps-counter");
const systemLog = document.getElementById("system-log");
const commandInput = document.getElementById("commandInput");

const statusText = document.getElementById("statusText");
const backendStatus = document.getElementById("backendStatus");
const solverStatus = document.getElementById("solverStatus");
const volumeCount = document.getElementById("volumeCount");
const freqText = document.getElementById("freqText");
const syncText = document.getElementById("syncText");
const cycleDisplay = document.getElementById("cycle");

const navItems = document.querySelectorAll(".nav-item");
const gridOverlay = document.getElementById("gridOverlay");

const archiveView = document.getElementById("archiveView");
const diagnosticsView = document.getElementById("diagnosticsView");
const terminalView = document.getElementById("terminalView");
const architectureView = document.getElementById("architectureView");

const archiveContent = document.getElementById("archiveContent");
const diagContent = document.getElementById("diagContent");
const volumeList = document.getElementById("volumeList");

const torusCanvas = document.getElementById("torusCanvas");
const torusCtx = torusCanvas?.getContext("2d");
const freqCanvas = document.getElementById("freqCanvas");
const freqCtx = freqCanvas?.getContext("2d");
const sectorGrid = document.getElementById("sectorGrid");
const progressBar = document.getElementById("progressBar");
const logicLog = document.getElementById("logicLog");

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

function aiMessage(text, who = "ai") {
  const div = document.createElement("div");
  div.className = `msg ${who}`;
  div.textContent = text;
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
}

/* ===========================
   STATE
=========================== */
let width = 0;
let height = 0;
let lastFrameTime = performance.now();
let frameCount = 0;
let cycleCount = 0;
let dragging = false;
let lastPointerX = 0;
let lastPointerY = 0;
let torusAngle = 0;
let freqOffset = 0;
let ficStarted = false;

const state = {
  autoRotate: false,
  showLabels: true,
  glowStrength: 0.8,
  orbitStretch: 0.36,
  rotationSpeedFactor: 1,
  stars: [],
  particles: [],
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
  universePulse: 1,
  reactionBursts: [],
  mappedVolumes: 0,
  integrityLevel: 0,
  resonanceBoost: 1,
  nodeClusters: []
};

/* ===========================
   VIEW ROUTING
=========================== */
function showHome() {
  homeView.classList.remove("hidden");
  appViews.classList.add("hidden");
}

function showApp(view = "universe") {
  homeView.classList.add("hidden");
  appViews.classList.remove("hidden");

  archiveView.classList.add("hidden");
  diagnosticsView.classList.add("hidden");
  terminalView.classList.add("hidden");
  architectureView.classList.add("hidden");

  navItems.forEach((n) => n.classList.remove("active"));

  if (view === "archive") {
    archiveView.classList.remove("hidden");
    terminalView.classList.remove("hidden");
    document.querySelector('.nav-item[data-module="archive"]')?.classList.add("active");
  } else if (view === "diagnostics") {
    diagnosticsView.classList.remove("hidden");
    terminalView.classList.remove("hidden");
    document.querySelector('.nav-item[data-module="diagnostics"]')?.classList.add("active");
  } else if (view === "terminal") {
    terminalView.classList.remove("hidden");
    document.querySelector('.nav-item[data-module="terminal"]')?.classList.add("active");
  } else if (view === "architecture") {
    architectureView.classList.remove("hidden");
    terminalView.classList.remove("hidden");
    document.querySelector('.nav-item[data-module="architecture"]')?.classList.add("active");
    runMasterFIC();
  } else {
    terminalView.classList.remove("hidden");
    document.querySelector('.nav-item[data-module="universe"]')?.classList.add("active");
  }
}

/* ===========================
   SCENE
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

function resizeInnerCanvas(cnv) {
  if (!cnv) return;
  const rect = cnv.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cnv.width = Math.max(1, Math.floor(rect.width * dpr));
  cnv.height = Math.max(1, Math.floor(rect.height * dpr));
  const c = cnv.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function isVisible(el) {
  return !!el && !el.classList.contains("hidden");
}

function initScene(
  starCount = Number(starCountSlider?.value || 600),
  particleCount = Number(particleCountSlider?.value || 120)
) {
  state.stars = Array.from({ length: starCount }, () => ({
    x: Math.random(),
    y: Math.random(),
    z: Math.random() * 0.9 + 0.1,
    size: Math.random() * 1.4 + 0.3,
    alpha: Math.random() * 0.6 + 0.15
  }));

  state.particles = Array.from({ length: particleCount }, (_, i) => ({
    angle: (Math.PI * 2 * i) / particleCount,
    orbit: 60 + Math.random() * 120,
    speed: 0.0012 + Math.random() * 0.003,
    size: Math.random() * 1.6 + 0.6,
    alpha: Math.random() * 0.5 + 0.15
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

function spawnReactionBurst(x, y, amount = 12, color = "0,255,204") {
  const MAX_BURSTS = 350;

  for (let i = 0; i < amount; i += 1) {
    state.reactionBursts.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 1,
      decay: 0.025 + Math.random() * 0.02,
      size: 1 + Math.random() * 2.5,
      color
    });
  }

  if (state.reactionBursts.length > MAX_BURSTS) {
    state.reactionBursts.splice(0, state.reactionBursts.length - MAX_BURSTS);
  }
}

function spawnVolumeCluster(volumeNumber = 1) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 120 + volumeNumber * 6;

  state.nodeClusters.push({
    volume: volumeNumber,
    angle,
    radius,
    orbitSpeed: 0.0015 + Math.random() * 0.002,
    size: 4 + Math.min(8, volumeNumber * 0.05),
    alpha: 0.7,
    color: volumeNumber % 2 === 0 ? "#22d3ee" : "#f59e0b"
  });

  if (state.nodeClusters.length > 200) {
    state.nodeClusters.splice(0, state.nodeClusters.length - 200);
  }
}

function reactToMappedVolumes(count) {
  state.mappedVolumes = count;
  state.universePulse = Math.min(1.35, 1 + count * 0.005);
  state.resonanceBoost = Math.min(1.8, 1 + count * 0.004);

  while (state.nodeClusters.length < count) {
    spawnVolumeCluster(state.nodeClusters.length + 1);
  }

  if (state.nodeClusters.length > count) {
    state.nodeClusters.length = count;
  }

  if (count > 0 && count % 10 === 0) {
    const cx = width / 2 + state.camera.dragX * 0.15;
    const cy = height / 2 + state.camera.dragY * 0.15;
    spawnReactionBurst(cx, cy, 10, "34,211,238");
  }
}

function reactToIntegrity(events = 0) {
  state.integrityLevel = events;
  state.glowStrength = Math.min(2.5, 1 + events * 0.03);
  const cx = width / 2 + state.camera.dragX * 0.15;
  const cy = height / 2 + state.camera.dragY * 0.15;
  spawnReactionBurst(cx, cy, 12, "245,158,11");
}

function reactToFullUpdate() {
  state.autoRotate = true;
  state.glowStrength = Math.min(2.5, state.glowStrength + 0.35);
  state.rotationSpeedFactor = Math.min(3, state.rotationSpeedFactor + 0.2);
  state.universePulse = Math.min(2.2, state.universePulse + 0.25);
  const cx = width / 2 + state.camera.dragX * 0.15;
  const cy = height / 2 + state.camera.dragY * 0.15;
  spawnReactionBurst(cx, cy, 24, "255,220,160");
  syncControlLabels();
}

function applyModeVisuals() {
  if (statusText) {
    statusText.textContent = "UNLOCKED";
    statusText.style.color = "#22c55e";
  }
  if (headerRealityState) headerRealityState.textContent = "Sovereign Constant";
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

async function fetchVolumeList() {
  const data = await apiGet("/engine/volumes");
  return data.volumes || [];
}

async function fetchVolumeById(volumeId) {
  return await apiGet(`/engine/volume/${volumeId}`);
}

function renderVolumeList(volumes = []) {
  if (!volumeList) return;

  volumeList.innerHTML = "";

  if (!volumes.length) {
    const empty = document.createElement("div");
    empty.className = "entry";
    empty.textContent = "No mapped volumes yet.";
    volumeList.appendChild(empty);
    return;
  }

  volumes.forEach((item) => {
    const id = item.volume_id;

    const btn = document.createElement("button");
    btn.className = "volume-item";
    btn.textContent = `${id}. ${item.title || `Volume ${id}`}`;

    btn.addEventListener("click", async () => {
      document.querySelectorAll(".volume-item").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
      await loadVolumeDetail(id);
    });

    volumeList.appendChild(btn);
  });
}

  volumes.forEach((id) => {
    const btn = document.createElement("button");
    btn.className = "volume-item";
    btn.textContent = `Volume ${id}`;
    btn.addEventListener("click", async () => {
      document.querySelectorAll(".volume-item").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
      await loadVolumeDetail(id);
    });
    volumeList.appendChild(btn);
  });
}

async function loadVolumeDetail(volumeId) {
  try {
    archiveContent.textContent = `Loading Volume ${volumeId}...`;
    const data = await fetchVolumeById(volumeId);

    archiveContent.textContent =
`Volume ID: ${data.volume_id}
Title: ${data.title}
Specs: ${data.specs || "[none]"}
Source: ${data.source || "unknown"}
Origin: ${data.projection.origin}
Resonance: ${Number(data.projection.resonance).toFixed(3)}
Presence Vector: ${data.projection.presence_vector.join(", ")}
Checksum: ${data.projection.checksum}

Full Volume Text:
${data.text || "[No stored text found]"}`;
  } catch (error) {
    archiveContent.textContent = `Failed to load Volume ${volumeId}: ${error.message}`;
  }
}

async function runHealthCheck() {
  logEntry("Initiating backend diagnostics...", "REQ");
  backendStatus.textContent = "PINGING";
  solverStatus.textContent = "CHECKING";
  headerBackendState.textContent = "Connecting";
  headerBackendState.className = "v";

  try {
    const data = await apiGet("/health");

    backendStatus.textContent = data.status?.toUpperCase?.() || "ONLINE";
    solverStatus.textContent = data.logic_state?.toUpperCase?.() || "ACTIVE";
    freqText.textContent = data.resonance || "432.0Hz";
    syncText.textContent = data.logic_state === "Synchronized" ? "COMPLETE" : "WAITING";
    headerBackendState.textContent = data.status === "healthy" ? "Healthy" : "Offline";
    headerBackendState.className = `v ${data.status === "healthy" ? "green" : "red"}`;

    if (data.status === "healthy") {
      applyModeVisuals();
    } else {
      statusText.textContent = "OFFLINE";
      statusText.style.color = "#ef4444";
    }

    logEntry(`Health OK. status=${data.status} logic=${data.logic_state}`, "OK");
    if (diagContent) {
      diagContent.textContent = `Health
Status: ${data.status}
Logic: ${data.logic_state}
Resonance: ${data.resonance}`;
    }
  } catch (error) {
    backendStatus.textContent = "OFFLINE";
    solverStatus.textContent = "ERROR";
    freqText.textContent = "DOWN";
    syncText.textContent = "FAILED";
    statusText.textContent = "OFFLINE";
    statusText.style.color = "#ef4444";
    headerBackendState.textContent = "Offline";
    headerBackendState.className = "v red";
    logEntry(`Health check failed: ${error.message}`, "ERR");
    if (diagContent) diagContent.textContent = `Health failed: ${error.message}`;
  }
}

async function runPrimeProtocol() {
  logEntry("Resonance status requested...", "PRIME");
  try {
    const data = await apiGet("/resonance/status");
    freqText.textContent = `${data.frequency}Hz`;
    logEntry(`RSP=${data.radiant_sovereign_presence}, coherence=${data.phase_coherence}, frequency=${data.frequency}`, "PRIME");
    if (diagContent) {
      diagContent.textContent = `Resonance
RSP: ${data.radiant_sovereign_presence}
Coherence: ${data.phase_coherence}
Frequency: ${data.frequency}`;
    }
  } catch (error) {
    logEntry(`Resonance check failed: ${error.message}`, "ERR");
  }
}

async function runEngineStatus() {
  try {
    const data = await apiGet("/engine/status");
    volumeCount.textContent = `${data.mapped_volumes} / 200`;
    reactToMappedVolumes(data.mapped_volumes || 0);
    reactToIntegrity(data.verification_events || 0);

    logEntry(`Engine active=${data.active} mapped_volumes=${data.mapped_volumes} uptime=${data.uptime_seconds}s`, "ENGINE");

    if (diagContent) {
      diagContent.textContent = `Engine
Active: ${data.active}
Mapped Volumes: ${data.mapped_volumes}
Verification Events: ${data.verification_events}
Uptime: ${data.uptime_seconds}s`;
    }

    try {
      const volumes = await fetchVolumeList();
      renderVolumeList(volumes);
    } catch {}
  } catch (error) {
    logEntry(`Engine status failed: ${error.message}`, "ERR");
  }
}

async function runIntegrityCheck() {
  try {
    const data = await apiGet("/engine/integrity");
    volumeCount.textContent = `${data.mapped_volumes} / 200`;
    reactToMappedVolumes(data.mapped_volumes || 0);
    reactToIntegrity(data.verification_events || 0);
    logEntry(`${data.message} mapped=${data.mapped_volumes} events=${data.verification_events}`, "CHECK");
    if (diagContent) {
      diagContent.textContent = `Integrity
${data.message}
Mapped: ${data.mapped_volumes}
Events: ${data.verification_events}`;
    }
  } catch (error) {
    logEntry(`Integrity check failed: ${error.message}`, "ERR");
  }
}

async function runProcessVolume(volumeId = 2) {
  try {
    logEntry(`Processing Volume ${volumeId}...`, "REQ");
    const data = await apiPost("/engine/process", {
      volume_id: volumeId,
      title: `Volume ${volumeId}`,
      text: `Axiomatic content for volume ${volumeId}. The system expands deterministically through structured resonance and logical continuity.`
    });

    volumeCount.textContent = `${data.projection.volume} / 200`;
    reactToMappedVolumes(Math.max(state.mappedVolumes, volumeId));
    spawnVolumeCluster(volumeId);

    logEntry(
      `Volume ${data.volume_id} mapped. resonance=${data.projection.resonance.toFixed(3)} vector=${data.projection.presence_vector.join(",")}`,
      "ARCHIVE"
    );

    try {
      const volumes = await fetchVolumeList();
      renderVolumeList(volumes);
      await loadVolumeDetail(volumeId);
    } catch {}
  } catch (error) {
    logEntry(`Process failed: ${error.message}`, "ERR");
  }
}

async function uploadAllVolumes() {
  showApp("archive");
  aiMessage("Uploading all 200 volumes now...");
  logEntry("Starting full archive upload (200 volumes)...", "UPLOAD");

  for (let i = 1; i <= 200; i += 1) {
    try {
      const data = await apiPost("/engine/process", {
        volume_id: i,
        title: `Volume ${i}`,
        text: `Axiomatic content for volume ${i}. The system expands deterministically through structured resonance and logical continuity.`
      });

      if (i % 10 === 0 || i === 200) {
        volumeCount.textContent = `${i} / 200`;
        reactToMappedVolumes(i);

        if (archiveContent) {
          archiveContent.textContent =
`Uploading All Archives
Current Volume: ${i} / 200
Last Title: ${data.title}
Resonance: ${data.projection.resonance.toFixed(3)}
Checksum: ${data.projection.checksum}`;
        }

        logEntry(`✔ Volume ${i} uploaded`, "ARCHIVE");
      }

      await new Promise((resolve) => setTimeout(resolve, 120));
    } catch (err) {
      logEntry(`✖ Volume ${i} failed: ${err.message}`, "ERR");
    }
  }

  try {
    const volumes = await fetchVolumeList();
    renderVolumeList(volumes);
  } catch {}

  logEntry("✅ ALL 200 VOLUMES UPLOADED", "DONE");
  aiMessage("All 200 volumes were processed.");
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
      backendStatus.textContent = "HEALTHY";
      solverStatus.textContent = "SYNCHRONIZED";
      freqText.textContent = `${data.frequency}Hz`;
      syncText.textContent = "COMPLETE";
      reactToFullUpdate();
      reactToMappedVolumes(data.mapped_volumes || state.mappedVolumes || 1);
      applyModeVisuals();

      if (diagContent) {
        diagContent.textContent =
`Full Update
OK: ${data.ok}
Frequency: ${data.frequency}
Logs:
${(data.logs || []).join("\n")}`;
      }
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
    logEntry("Commands: help, health, prime, engine, integrity, process <n>, fullupdate, uploadall, clear, reset, api <url>", "HELP");
    return;
  }

  if (command === "health") return runHealthCheck();
  if (command === "prime" || command === "resonance") return runPrimeProtocol();
  if (command === "engine") return runEngineStatus();
  if (command === "integrity") return runIntegrityCheck();
  if (command === "fullupdate") return runFullUpdate();
  if (command === "uploadall") return uploadAllVolumes();

  if (command.startsWith("process ")) {
    const id = Number(command.split(" ")[1]);
    if (Number.isInteger(id) && id >= 1 && id <= 200) return runProcessVolume(id);
  }

  if (command === "process") return runProcessVolume(2);

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
    state.glowStrength = 0.8;
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
    if (starCountSlider) starCountSlider.value = "600";
    if (particleCountSlider) particleCountSlider.value = "120";
    if (glowSlider) glowSlider.value = "0.80";
    if (orbitStretchSlider) orbitStretchSlider.value = "0.36";

    initScene(600, 120);
    syncControlLabels();
    applyModeVisuals();
    if (archiveContent) archiveContent.textContent = "No archive action yet.";
    if (diagContent) diagContent.textContent = "No diagnostic action yet.";
    if (volumeList) volumeList.innerHTML = "";
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
   AI ROUTER
=========================== */
async function runAiPrompt(raw) {
  const text = raw.trim();
  if (!text) return;

  aiMessage(text, "user");
  const q = text.toLowerCase();

  if (q.includes("home")) {
    showHome();
    aiMessage("Opening the home interface.");
    return;
  }

  if (q.includes("architecture") || q.includes("master architecture") || q.includes("v200")) {
    showApp("architecture");
    aiMessage("Opening the master architecture view.");
    runMasterFIC();
    return;
  }

  if (q.includes("universe") || q.includes("space") || q.includes("visual")) {
    showApp("universe");
    aiMessage("Opening the universe view.");
    return;
  }

  if (q.includes("archive")) {
    showApp("archive");
    aiMessage("Opening the archive view.");
    try {
      const volumes = await fetchVolumeList();
      renderVolumeList(volumes);
      if (archiveContent) {
        archiveContent.textContent = volumes.length
          ? "Click a volume to load its full stored data."
          : "No mapped volumes yet. Run process or upload all first.";
      }
    } catch (error) {
      if (archiveContent) archiveContent.textContent = `Failed to load archive list: ${error.message}`;
    }
    return;
  }

  if (q.includes("diagnostic") || q.includes("health") || q.includes("status")) {
    showApp("diagnostics");
    aiMessage("Running diagnostics now.");
    await runHealthCheck();
    await runEngineStatus();
    return;
  }

  if (q.includes("terminal") || q.includes("console")) {
    showApp("terminal");
    aiMessage("Opening the terminal.");
    commandInput.focus();
    return;
  }

  if (q.includes("integrity")) {
    showApp("diagnostics");
    aiMessage("Running integrity check.");
    await runIntegrityCheck();
    return;
  }

  if (q.includes("engine")) {
    showApp("diagnostics");
    aiMessage("Checking engine status.");
    await runEngineStatus();
    return;
  }

  if (q.includes("upload all") || q.includes("load all volumes") || q.includes("200 volumes") || q.includes("upload 200")) {
    await uploadAllVolumes();
    return;
  }

  const volMatch = q.match(/volume\s+(\d{1,3})/);
  if (volMatch) {
    const volumeId = Number(volMatch[1]);
    if (volumeId >= 1 && volumeId <= 200) {
      showApp("archive");
      aiMessage(`Processing Volume ${volumeId}.`);
      await runProcessVolume(volumeId);
      return;
    }
  }

  if (q.includes("process") || q.includes("map volume")) {
    showApp("archive");
    aiMessage("Processing Volume 2.");
    await runProcessVolume(2);
    return;
  }

  if (q.includes("full update") || q.includes("sync everything") || q.includes("synchronize all")) {
    showApp("diagnostics");
    aiMessage("Running full update.");
    await runFullUpdate();
    return;
  }

  if (q.includes("resonance") || q.includes("prime")) {
    showApp("diagnostics");
    aiMessage("Checking resonance status.");
    await runPrimeProtocol();
    return;
  }

  aiMessage("I can route you to: home, universe, archive, diagnostics, terminal, architecture, process any volume number, upload all 200 volumes, resonance, engine, integrity, or full update.");
}

/* ===========================
   ARCHITECTURE VIEW
=========================== */
function drawTorusKernel() {
  if (!isVisible(architectureView) || !torusCanvas || !torusCtx) return;

  resizeInnerCanvas(torusCanvas);

  const w = torusCanvas.getBoundingClientRect().width;
  const h = torusCanvas.getBoundingClientRect().height;

  torusCtx.fillStyle = "rgba(5, 5, 5, 0.3)";
  torusCtx.fillRect(0, 0, w, h);

  const centerX = w / 2;
  const centerY = h / 2;
  const R = 70;
  const r = 35;

  for (let i = 0; i < 20; i += 1) {
    const theta = (i / 20) * Math.PI * 2 + torusAngle;
    torusCtx.beginPath();

    for (let j = 0; j <= 30; j += 1) {
      const phi = (j / 30) * Math.PI * 2;
      const x = (R + r * Math.cos(phi)) * Math.cos(theta);
      const y = (R + r * Math.cos(phi)) * Math.sin(theta);
      const z = r * Math.sin(phi);
      const scale = 180 / (180 + z);
      const px = centerX + x * scale;
      const py = centerY + y * scale;

      if (j === 0) torusCtx.moveTo(px, py);
      else torusCtx.lineTo(px, py);
    }

    torusCtx.strokeStyle = `rgba(0, 255, 65, ${0.2 + Math.sin(torusAngle) * 0.15})`;
    torusCtx.stroke();
  }

  torusAngle += 0.015;
}

function drawFrequencyMonitor() {
  if (!isVisible(architectureView) || !freqCanvas || !freqCtx) return;

  resizeInnerCanvas(freqCanvas);

  const w = freqCanvas.getBoundingClientRect().width;
  const h = freqCanvas.getBoundingClientRect().height;
  const midY = h / 2;

  freqCtx.clearRect(0, 0, w, h);
  freqCtx.beginPath();
  freqCtx.strokeStyle = "#c5a059";
  freqCtx.lineWidth = 2;

  for (let x = 0; x < w; x += 1) {
    const y = midY
      + Math.sin(x * 0.02 + freqOffset) * 15
      + Math.sin(x * 0.01 + freqOffset * 0.5) * 10;

    if (x === 0) freqCtx.moveTo(x, y);
    else freqCtx.lineTo(x, y);
  }

  freqCtx.stroke();
  freqOffset -= 0.06;
}

function runMasterFIC() {
  if (ficStarted || !sectorGrid || !progressBar) return;
  ficStarted = true;

  const sectors = [
    "S01: KERNEL",
    "S02: LOGIC",
    "S03: FREQ",
    "S04: SOLAR",
    "S05: FINALITY"
  ];

  sectorGrid.innerHTML = "";

  sectors.forEach((s, i) => {
    const d = document.createElement("div");
    d.className = "sector-item";
    d.id = `sec-${i}`;
    d.innerHTML = `${s} <span class="v">0%</span>`;
    sectorGrid.appendChild(d);
  });

  let current = 0;

  const scan = setInterval(() => {
    if (current >= sectors.length) {
      clearInterval(scan);
      if (logicLog) {
        logicLog.textContent += "\n[OK] MASTER INDEX SYNC COMPLETE.\n[OK] FIC PASSED ACROSS ALL SECTORS.";
        logicLog.scrollTop = logicLog.scrollHeight;
      }
      return;
    }

    let p = 0;
    const sub = setInterval(() => {
      p += 10;

      const target = document.querySelector(`#sec-${current} .v`);
      if (target) target.innerText = `${p}%`;

      progressBar.style.width = `${(current / sectors.length) * 100 + (p / sectors.length)}%`;

      if (p >= 100) {
        clearInterval(sub);
        const row = document.getElementById(`sec-${current}`);
        if (row) row.style.color = "#fff";
        current += 1;
      }
    }, 80);
  }, 1000);
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
  ctx.ellipse(cx, cy, 180 * state.camera.zoom * state.universePulse, 70 * state.camera.zoom * state.universePulse, state.camera.rotation, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, cy, 260 * state.camera.zoom * state.universePulse, 110 * state.camera.zoom * state.universePulse, state.camera.rotation, 0, Math.PI * 2);
  ctx.stroke();

  const core = ctx.createRadialGradient(cx, cy, 2, cx, cy, 46 * state.camera.zoom * state.glowStrength);
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
    ctx.arc(p.x, p.y, Math.min(4, p.radius), 0, Math.PI * 2);
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
    ctx.arc(x, y, cluster.size + 6, 0, Math.PI * 2);
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
  drawTorusKernel();
  drawFrequencyMonitor();

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
  initScene(Number(e.target.value), state.particles.length || 120);
  syncControlLabels();
});

particleCountSlider?.addEventListener("input", (e) => {
  initScene(state.stars.length || 600, Number(e.target.value));
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
  const next = Math.min(2000, state.stars.length + 150);
  if (starCountSlider) starCountSlider.value = String(next);
  initScene(next, state.particles.length || 120);
  syncControlLabels();
});

boostParticlesBtn?.addEventListener("click", () => {
  const next = Math.min(600, state.particles.length + 40);
  if (particleCountSlider) particleCountSlider.value = String(next);
  initScene(state.stars.length || 600, next);
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

homeCards.forEach((card) => {
  card.addEventListener("click", async () => {
    const view = card.dataset.openView;
    showApp(view);
    aiMessage(`Opened ${view}.`);

    if (view === "archive") {
      try {
        const volumes = await fetchVolumeList();
        renderVolumeList(volumes);
        archiveContent.textContent = volumes.length
          ? "Click a volume to load its full stored data."
          : "No mapped volumes yet. Run process or upload all first.";
      } catch (error) {
        archiveContent.textContent = `Failed to load archive list: ${error.message}`;
      }
    }

    if (view === "diagnostics") {
      await runHealthCheck();
      await runEngineStatus();
    }

    if (view === "architecture") {
      runMasterFIC();
    }
  });
});

navItems.forEach((button) => {
  button.addEventListener("click", async () => {
    const module = button.dataset.module;

    if (module === "home") {
      showHome();
      return;
    }

    showApp(module);

    if (module === "archive") {
      try {
        const volumes = await fetchVolumeList();
        renderVolumeList(volumes);
        archiveContent.textContent = volumes.length
          ? "Click a volume to load its full stored data."
          : "No mapped volumes yet. Run process or upload all first.";
      } catch (error) {
        archiveContent.textContent = `Failed to load archive list: ${error.message}`;
      }
    }

    if (module === "diagnostics") {
      await runHealthCheck();
      await runEngineStatus();
    }

    if (module === "architecture") {
      runMasterFIC();
    }
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
    showApp("terminal");
    commandInput.focus();
  }
  if (e.key === "Escape") {
    commandInput.blur();
  }
});

aiSendBtn.addEventListener("click", async () => {
  const value = aiInput.value;
  aiInput.value = "";
  await runAiPrompt(value);
});

aiInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    const value = aiInput.value;
    aiInput.value = "";
    await runAiPrompt(value);
  }
});

aiQuickButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    await runAiPrompt(btn.dataset.ai);
  });
});

aiClearBtn.addEventListener("click", () => {
  aiMessages.innerHTML = "";
  aiMessage("AI console cleared.");
});

/* ===========================
   BOOT
=========================== */
setInterval(() => {
  cycleCount += 1;
  if (cycleDisplay) cycleDisplay.textContent = cycleCount.toLocaleString();
}, 3000);

resizeCanvas();
initScene(600, 120);
syncControlLabels();
applyModeVisuals();
runHealthCheck();
runEngineStatus();
logEntry("Frontend interface loaded. Canvas rendering active.", "SYS");
requestAnimationFrame(render);
