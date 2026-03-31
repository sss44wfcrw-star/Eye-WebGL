const BACKEND_URL = "https://parakletos-backend-2.onrender.com";

const canvas = document.getElementById("webgl-canvas");
const ctx = canvas.getContext("2d");
const logContainer = document.getElementById("system-log");
const fpsDisplay = document.getElementById("fps-counter");
const cycleDisplay = document.getElementById("cycle");
const inputField = document.querySelector(".input-line input");

const statusText = document.getElementById("statusText");
const backendStatus = document.getElementById("backendStatus");
const solverStatus = document.getElementById("solverStatus");
const volumeCount = document.getElementById("volumeCount");
const freqText = document.getElementById("freqText");
const syncText = document.getElementById("syncText");
const navButtons = document.querySelectorAll(".nav-item");
const gridOverlay = document.getElementById("gridOverlay");

let frameCount = 0;
let fps = 0;
let lastFpsTime = performance.now();
let cycleCount = 0;
let activeMode = "sandbox";

const state = {
  stars: [],
  particles: [],
  planets: [
    { name: "Mercury", radius: 90, speed: 0.020, size: 2, color: "#a3a3a3", angle: Math.random() * Math.PI * 2 },
    { name: "Venus", radius: 125, speed: 0.015, size: 3, color: "#f59e0b", angle: Math.random() * Math.PI * 2 },
    { name: "Earth", radius: 165, speed: 0.010, size: 3.5, color: "#38bdf8", angle: Math.random() * Math.PI * 2 },
    { name: "Mars", radius: 205, speed: 0.008, size: 2.5, color: "#ef4444", angle: Math.random() * Math.PI * 2 }
  ],
  rings: [70, 110, 155, 210, 270],
  camera: {
    rotation: 0,
    zoom: 1,
    dragX: 0,
    dragY: 0
  }
};

for (let i = 0; i < 192; i++) {
  const cell = document.createElement("div");
  gridOverlay.appendChild(cell);
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function initScene() {
  state.stars = Array.from({ length: 1400 }, () => ({
    x: Math.random(),
    y: Math.random(),
    z: Math.random() * 0.9 + 0.1,
    size: Math.random() * 2 + 0.4,
    alpha: Math.random() * 0.7 + 0.15
  }));

  state.particles = Array.from({ length: 260 }, (_, i) => ({
    angle: (Math.PI * 2 * i) / 260,
    orbit: 60 + Math.random() * 150,
    speed: 0.0015 + Math.random() * 0.0045,
    size: Math.random() * 2.6 + 0.7,
    alpha: Math.random() * 0.65 + 0.15
  }));
}

function addLog(text, kind = "SYS") {
  const div = document.createElement("div");
  div.className = "entry";
  div.textContent = `[${kind}] ${text}`;
  logContainer.appendChild(div);
  logContainer.scrollTop = logContainer.scrollHeight;
}

function setStatus(mode, color) {
  statusText.textContent = mode;
  statusText.style.color = color;
}

function applyModeVisuals() {
  if (activeMode === "archive") {
    setStatus("ARCHIVE", "#f59e0b");
  } else if (activeMode === "verifier") {
    setStatus("VERIFY", "#22c55e");
  } else if (activeMode === "search") {
    setStatus("SEARCH", "#ffffff");
  } else if (activeMode === "registry") {
    setStatus("REGISTRY", "#f59e0b");
  } else {
    setStatus("UNLOCKED", "#22c55e");
  }
}

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

async function runHealth() {
  backendStatus.textContent = "PINGING";
  solverStatus.textContent = "CHECKING";

  try {
    const data = await apiGet("/health");
    backendStatus.textContent = (data.status || "ONLINE").toUpperCase();
    solverStatus.textContent = (data.logic_state || "ACTIVE").toUpperCase();
    freqText.textContent = data.resonance || "432.0Hz";
    syncText.textContent = data.logic_state === "Synchronized" ? "COMPLETE" : "WAITING";

    if (data.status === "healthy") {
      if (activeMode === "sandbox") setStatus("UNLOCKED", "#22c55e");
    } else {
      setStatus("OFFLINE", "#ef4444");
    }

    addLog(`Health OK. status=${data.status} resonance=${data.resonance} logic=${data.logic_state}`, "OK");
  } catch (error) {
    backendStatus.textContent = "OFFLINE";
    solverStatus.textContent = "ERROR";
    freqText.textContent = "DOWN";
    syncText.textContent = "FAILED";
    setStatus("OFFLINE", "#ef4444");
    addLog(`Health failed: ${error.message}`, "ERR");
  }
}

async function runPrime() {
  try {
    const data = await apiGet("/resonance/status");
    freqText.textContent = `${data.frequency}Hz`;
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
    volumeCount.textContent = `${data.mapped_volumes} / 200`;
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
    volumeCount.textContent = `${data.mapped_volumes} / 200`;
    addLog(`${data.message} mapped=${data.mapped_volumes} events=${data.verification_events}`, "CHECK");
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

    volumeCount.textContent = `${data.projection.volume} / 200`;
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
    state.camera.rotation = 0;
    state.camera.zoom = 1;
    state.camera.dragX = 0;
    state.camera.dragY = 0;
    activeMode = "sandbox";
    navButtons.forEach((n) => n.classList.remove("active"));
    document.querySelector('.nav-item[data-module="sandbox"]')?.classList.add("active");
    applyModeVisuals();
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

function drawBackground(w, h) {
  const bg = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h) * 0.58);
  bg.addColorStop(0, "rgba(24,255,220,0.16)");
  bg.addColorStop(0.22, "rgba(60,30,120,0.22)");
  bg.addColorStop(0.6, "rgba(8,10,18,0.78)");
  bg.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  for (const s of state.stars) {
    const px = ((s.x - 0.5) * w * s.z * state.camera.zoom) + w / 2 + state.camera.dragX * 0.12;
    const py = ((s.y - 0.5) * h * s.z * state.camera.zoom) + h / 2 + state.camera.dragY * 0.12;

    ctx.beginPath();
    ctx.arc(px, py, s.size * s.z, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(70,255,240,${s.alpha})
