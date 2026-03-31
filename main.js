const BACKEND_URL = (() => {
  const override = localStorage.getItem("parakletosApiBase");
  if (override) return override.replace(/\/$/, "");

  const { protocol, hostname, origin } = window.location;
  if (protocol === "file:") return "http://localhost:8000";
  if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:8000";
  return origin.replace(/\/$/, "") + "/api";
})();

const controlsPanel = document.getElementById("controlsPanel");
const telemetryPanel = document.getElementById("telemetryPanel");
const protocolsPanel = document.getElementById("protocolsPanel");
const protocolLog = document.getElementById("protocolLog");
const metricsReadout = document.getElementById("metricsReadout");
const backendStatus = document.getElementById("backendStatus");
const databaseStatus = document.getElementById("databaseStatus");

const qualityMode = document.getElementById("qualityMode");
const particleCount = document.getElementById("particleCount");
const gravityStrength = document.getElementById("gravityStrength");
const cameraSpeed = document.getElementById("cameraSpeed");
const eventHorizon = document.getElementById("eventHorizon");
const autoRotate = document.getElementById("autoRotate");
const showDisk = document.getElementById("showDisk");
const showNebula = document.getElementById("showNebula");
const mouseGravity = document.getElementById("mouseGravity");
const showAstronomy = document.getElementById("showAstronomy");

const particleCountValue = document.getElementById("particleCountValue");
const gravityStrengthValue = document.getElementById("gravityStrengthValue");
const cameraSpeedValue = document.getElementById("cameraSpeedValue");
const eventHorizonValue = document.getElementById("eventHorizonValue");

const canvas = document.getElementById("eye-universe-canvas");
const ctx = canvas.getContext("2d");

let paused = false;
let frame = 0;
let simulationTime = 0;
let pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };
let particles = [];
let camera = { x: 0, y: 0, z: -500, pitch: 0, yaw: 0, roll: 0, zoom: 1 };

const celestialBodies = Array.from({ length: 100 }, () => ({
  x: (Math.random() - 0.5) * 2000,
  y: (Math.random() - 0.5) * 2000,
  z: (Math.random() - 0.5) * 2000,
  radius: Math.random() * 5 + 2,
  color: "#00ffcc",
}));

class OrbitalBody {
  constructor(name, semiMajorAxis, eccentricity, inclination, longitudeAscendingNode, argumentOfPeriapsis, meanAnomalyEpoch, color, size) {
    this.name = name;
    this.a = semiMajorAxis;
    this.e = eccentricity;
    this.i = inclination * (Math.PI / 180);
    this.omega = longitudeAscendingNode * (Math.PI / 180);
    this.w = argumentOfPeriapsis * (Math.PI / 180);
    this.M0 = meanAnomalyEpoch * (Math.PI / 180);
    this.color = color;
    this.size = size;
  }

  computeCoordinates(timeDay) {
    const n = 0.01720209895 / Math.pow(this.a, 1.5);
    let M = this.M0 + n * timeDay;
    M %= (2 * Math.PI);

    let E = M;
    for (let iter = 0; iter < 10; iter += 1) {
      E = E - (E - this.e * Math.sin(E) - M) / (1 - this.e * Math.cos(E));
    }

    const v = 2 * Math.atan(Math.sqrt((1 + this.e) / (1 - this.e)) * Math.tan(E / 2));
    const r = this.a * (1 - this.e * Math.cos(E));

    const xOrbit = r * Math.cos(v);
    const yOrbit = r * Math.sin(v);

    const xHeliocentric = xOrbit * (Math.cos(this.w) * Math.cos(this.omega) - Math.sin(this.w) * Math.cos(this.i) * Math.sin(this.omega)) - yOrbit * (Math.sin(this.w) * Math.cos(this.omega) + Math.cos(this.w) * Math.cos(this.i) * Math.sin(this.omega));
    const yHeliocentric = xOrbit * (Math.cos(this.w) * Math.sin(this.omega) + Math.sin(this.w) * Math.cos(this.i) * Math.cos(this.omega)) + yOrbit * (Math.cos(this.w) * Math.cos(this.i) * Math.cos(this.omega) - Math.sin(this.w) * Math.sin(this.omega));
    const zHeliocentric = xOrbit * (Math.sin(this.w) * Math.sin(this.i)) + yOrbit * (Math.cos(this.w) * Math.sin(this.i));

    return { x: xHeliocentric * 50, y: yHeliocentric * 50, z: zHeliocentric * 50 };
  }
}

const solarSystem = [
  new OrbitalBody("Mercury", 0.387, 0.2056, 7.0, 48.33, 29.124, 174.796, "#aaaaaa", 2),
  new OrbitalBody("Venus", 0.723, 0.0067, 3.39, 76.68, 54.884, 50.115, "#eebb00", 3),
  new OrbitalBody("Earth", 1.0, 0.0167, 0.0, -11.26, 114.207, 358.617, "#0088ff", 3.5),
  new OrbitalBody("Mars", 1.524, 0.0934, 1.85, 49.57, 286.502, 19.412, "#ff4400", 2.5),
];

function logProtocol(message, kind = "INFO") {
  const line = document.createElement("div");
  line.className = "log-line";
  line.textContent = `[${kind}] ${new Date().toLocaleTimeString()} ${message}`;
  protocolLog.prepend(line);
}

function togglePanel(panel) {
  if (!panel) return;
  panel.classList.toggle("is-open");
}

document.getElementById("openControlsBtn")?.addEventListener("click", () => togglePanel(controlsPanel));
document.getElementById("openTelemetryBtn")?.addEventListener("click", () => togglePanel(telemetryPanel));
document.getElementById("openProtocolsBtn")?.addEventListener("click", () => togglePanel(protocolsPanel));

document.querySelectorAll(".panel-close").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById(btn.dataset.close)?.classList.remove("is-open");
  });
});

function bindRange(input, output, formatter = (value) => value) {
  const sync = () => { output.textContent = formatter(input.value); };
  input.addEventListener("input", sync);
  sync();
}

bindRange(particleCount, particleCountValue, (v) => `${v}`);
bindRange(gravityStrength, gravityStrengthValue, (v) => Number(v).toFixed(1));
bindRange(cameraSpeed, cameraSpeedValue, (v) => Number(v).toFixed(4));
bindRange(eventHorizon, eventHorizonValue, (v) => Number(v).toFixed(1));

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, qualityMode.value === "cinematic" ? 2 : 1.5);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function createParticles(count) {
  particles = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const radius = 40 + Math.random() * Math.min(window.innerWidth, window.innerHeight) * 0.32;
    return {
      angle,
      radius,
      speed: 0.0008 + Math.random() * 0.002,
      drift: (Math.random() - 0.5) * 0.2,
      size: 0.6 + Math.random() * 2.4,
      hue: 200 + Math.random() * 90,
      alpha: 0.25 + Math.random() * 0.65,
      zBias: Math.random() * 2 - 1,
    };
  });
}

function drawBackground(width, height) {
  const bg = ctx.createRadialGradient(width * 0.5, height * 0.48, 10, width * 0.5, height * 0.5, Math.max(width, height) * 0.55);
  bg.addColorStop(0, "rgba(80, 42, 146, 0.16)");
  bg.addColorStop(0.4, "rgba(16, 10, 46, 0.28)");
  bg.addColorStop(1, "rgba(0, 0, 0, 0.92)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
}

function drawField(width, height, t) {
  const cx = width / 2;
  const cy = height / 2;
  const horizon = Number(eventHorizon.value) * 10;

  ctx.save();
  ctx.translate(cx, cy);

  if (showNebula.checked) {
    for (let i = 0; i < 4; i += 1) {
      const radius = 140 + i * 70 + Math.sin(t * 0.5 + i) * 12;
      const grad = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
      grad.addColorStop(0, `rgba(255, 120, 80, ${0.02 + i * 0.01})`);
      grad.addColorStop(0.5, `rgba(120, 80, 255, ${0.025 + i * 0.01})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (showDisk.checked) {
    ctx.strokeStyle = "rgba(255, 160, 100, 0.45)";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.ellipse(0, 0, 150 + horizon * 0.6, 42 + horizon * 0.16, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(130, 220, 255, 0.28)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 190 + horizon * 0.45, 56 + horizon * 0.12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const coreGradient = ctx.createRadialGradient(0, 0, horizon * 0.1, 0, 0, horizon);
  coreGradient.addColorStop(0, "rgba(255,255,255,0.16)");
  coreGradient.addColorStop(0.3, "rgba(255,140,80,0.22)");
  coreGradient.addColorStop(0.31, "rgba(0,0,0,1)");
  coreGradient.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(0, 0, horizon, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawParticles(width, height, t) {
  const cx = width / 2;
  const cy = height / 2;
  const gravity = Number(gravityStrength.value);
  const speedFactor = Number(cameraSpeed.value) * 60;
  const pointerGravityOn = mouseGravity.checked && pointer.active;

  particles.forEach((particle, index) => {
    particle.angle += particle.speed * gravity * speedFactor;
    const wave = Math.sin(t * 0.8 + index * 0.015) * 8;
    let x = cx + Math.cos(particle.angle) * (particle.radius + wave);
    let y = cy + Math.sin(particle.angle) * ((particle.radius * 0.28) + particle.drift * 18);

    if (pointerGravityOn) {
      x += (pointer.x - x) * 0.006;
      y += (pointer.y - y) * 0.006;
    }

    ctx.beginPath();
    ctx.fillStyle = `hsla(${particle.hue}, 100%, ${60 + particle.zBias * 10}%, ${particle.alpha})`;
    ctx.arc(x, y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function project3D(x, y, z) {
  const cosY = Math.cos(camera.yaw);
  const sinY = Math.sin(camera.yaw);
  const cosP = Math.cos(camera.pitch);
  const sinP = Math.sin(camera.pitch);

  const dz = z - camera.z;
  const dx = x - camera.x;
  const dy = y - camera.y;

  const rotX = dx * cosY - dz * sinY;
  let rotZ = dx * sinY + dz * cosY;
  const rotY = dy * cosP - rotZ * sinP;
  rotZ = dy * sinP + rotZ * cosP;

  const fov = 400 * camera.zoom;
  const safeZ = rotZ < 1 ? 1 : rotZ;

  return {
    screenX: (rotX * fov) / safeZ + window.innerWidth / 2,
    screenY: (rotY * fov) / safeZ + window.innerHeight / 2,
    scale: fov / safeZ,
  };
}

function drawSandboxBodies() {
  celestialBodies.forEach((body) => {
    const proj = project3D(body.x, body.y, body.z);
    if (proj.screenX > 0 && proj.screenX < window.innerWidth && proj.screenY > 0 && proj.screenY < window.innerHeight) {
      ctx.beginPath();
      ctx.arc(proj.screenX, proj.screenY, Math.max(0.5, body.radius * proj.scale), 0, Math.PI * 2);
      ctx.fillStyle = body.color;
      ctx.fill();
    }
  });
}

function renderSolarSystemOverlay() {
  if (!showAstronomy.checked) return;
  simulationTime += 1;
  solarSystem.forEach((planet) => {
    const coords = planet.computeCoordinates(simulationTime);
    const proj = project3D(coords.x, coords.y, coords.z);
    if (proj.screenX > 0 && proj.screenX < window.innerWidth && proj.screenY > 0 && proj.screenY < window.innerHeight && proj.scale > 0) {
      ctx.beginPath();
      ctx.arc(proj.screenX, proj.screenY, Math.max(1, planet.size * proj.scale), 0, Math.PI * 2);
      ctx.fillStyle = planet.color;
      ctx.fill();
      ctx.font = `${Math.max(10, 10 * proj.scale)}px monospace`;
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.fillText(planet.name, proj.screenX + Math.max(8, planet.size * proj.scale) + 2, proj.screenY);
    }
  });
}

function updateMetrics() {
  metricsReadout.textContent = `FRAME: ${frame}
PARTICLES: ${particleCount.value}
GRAVITY: ${Number(gravityStrength.value).toFixed(1)}
CAMERA: ${Number(cameraSpeed.value).toFixed(4)}
PARITY: ${paused ? "PAUSED" : "STABLE"}`;
}

function animate() {
  if (!paused) {
    frame += 1;
    camera.yaw += autoRotate.checked ? Number(cameraSpeed.value) * 0.6 : 0;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const t = performance.now() * (autoRotate.checked ? Number(cameraSpeed.value) : 0.0002);

    drawBackground(width, height);
    drawField(width, height, t);
    drawParticles(width, height, t);
    drawSandboxBodies();
    renderSolarSystemOverlay();
    updateMetrics();
  }
  requestAnimationFrame(animate);
}

window.addEventListener("resize", () => {
  resizeCanvas();
  createParticles(Number(particleCount.value));
});

window.addEventListener("pointermove", (event) => {
  pointer = { x: event.clientX, y: event.clientY, active: true };
});
window.addEventListener("pointerleave", () => { pointer.active = false; });

window.addEventListener("keydown", (event) => {
  const speed = 10;
  const rotSpeed = 0.05;
  if (event.key === "w") camera.z += speed;
  if (event.key === "s") camera.z -= speed;
  if (event.key === "a") camera.x -= speed;
  if (event.key === "d") camera.x += speed;
  if (event.key === "ArrowUp") camera.pitch += rotSpeed;
  if (event.key === "ArrowDown") camera.pitch -= rotSpeed;
  if (event.key === "ArrowLeft") camera.yaw -= rotSpeed;
  if (event.key === "ArrowRight") camera.yaw += rotSpeed;
  if (event.key === "+") camera.zoom += 0.1;
  if (event.key === "-") camera.zoom = Math.max(0.2, camera.zoom - 0.1);
});

qualityMode.addEventListener("change", resizeCanvas);
particleCount.addEventListener("change", () => createParticles(Number(particleCount.value)));
document.getElementById("pauseBtn").addEventListener("click", () => {
  paused = !paused;
  document.getElementById("pauseBtn").textContent = paused ? "Resume" : "Pause";
  logProtocol(paused ? "Animation paused." : "Animation resumed.");
});
document.getElementById("resetBtn").addEventListener("click", () => {
  createParticles(Number(particleCount.value));
  logProtocol("Particle field reset.");
});
document.getElementById("mobilePresetBtn").addEventListener("click", () => {
  qualityMode.value = "mobile";
  particleCount.value = 8000;
  gravityStrength.value = 3.4;
  cameraSpeed.value = 0.0012;
  eventHorizon.value = 3.4;
  particleCount.dispatchEvent(new Event("input"));
  gravityStrength.dispatchEvent(new Event("input"));
  cameraSpeed.dispatchEvent(new Event("input"));
  eventHorizon.dispatchEvent(new Event("input"));
  createParticles(Number(particleCount.value));
  resizeCanvas();
  logProtocol("iPhone Safe preset applied.");
});
document.getElementById("desktopPresetBtn").addEventListener("click", () => {
  qualityMode.value = "desktop";
  particleCount.value = 22000;
  gravityStrength.value = 4.6;
  cameraSpeed.value = 0.0018;
  eventHorizon.value = 4.6;
  particleCount.dispatchEvent(new Event("input"));
  gravityStrength.dispatchEvent(new Event("input"));
  cameraSpeed.dispatchEvent(new Event("input"));
  eventHorizon.dispatchEvent(new Event("input"));
  createParticles(Number(particleCount.value));
  resizeCanvas();
  logProtocol("Desktop preset applied.");
});

async function checkSystemHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    backendStatus.textContent = data.status.toUpperCase();
    backendStatus.className = `metric-value ${data.status === "operational" ? "online" : "degraded"}`;
    databaseStatus.textContent = data.database_ready ? "READY" : "WAITING";
    databaseStatus.className = `metric-value ${data.database_ready ? "online" : "degraded"}`;
    logProtocol(`Health check complete. Backend ${data.status}, database_ready=${data.database_ready}.`, "HEALTH");
  } catch (error) {
    backendStatus.textContent = "OFFLINE";
    backendStatus.className = "metric-value degraded";
    databaseStatus.textContent = "UNREACHABLE";
    databaseStatus.className = "metric-value degraded";
    logProtocol(`Health check failed: ${error.message}`, "ERROR");
  }
}

async function submitForVerification() {
  const volumeId = document.getElementById("volumeId").value;
  const premiseData = document.getElementById("premise").value.trim();
  const conclusionData = document.getElementById("conclusion").value.trim();

  if (!volumeId || !premiseData || !conclusionData) {
    logProtocol("Volume ID, premise, and conclusion are required.", "WARN");
    return;
  }

  logProtocol(`Verification started for volume ${volumeId}.`, "VERIFY");
  try {
    const response = await fetch(`${BACKEND_URL}/archive/verify/${volumeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mathematical_premise: premiseData,
        logical_conclusion: conclusionData,
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || `HTTP ${response.status}`);

    logProtocol(
      `Verification complete: volume=${result.volume_id}, verification=${result.verification}, parser=${result.parser_mode}, persisted=${result.persisted}.`,
      "DONE"
    );
  } catch (error) {
    logProtocol(`Verification failed: ${error.message}`, "ERROR");
  }
}

async function executeSearch() {
  const query = document.getElementById("searchQuery").value.trim();
  if (!query) {
    logProtocol("Search query is required.", "WARN");
    return;
  }

  logProtocol(`Archive search started for query: ${query}`, "SEARCH");
  try {
    const response = await fetch(`${BACKEND_URL}/archive/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || `HTTP ${response.status}`);

    if (!result.results.length) {
      logProtocol("Search completed. No matching archived volumes.", "SEARCH");
      return;
    }

    result.results.slice(0, 8).forEach((item) => {
      logProtocol(`Search hit: volume=${item.volume_id}, score=${item.relevance_score}, status=${item.verification_status}`, "HIT");
    });
  } catch (error) {
    logProtocol(`Search failed: ${error.message}`, "ERROR");
  }
}

document.getElementById("verifyVolumeBtn").addEventListener("click", submitForVerification);
document.getElementById("searchBtn").addEventListener("click", executeSearch);
document.getElementById("heartbeatBtn").addEventListener("click", checkSystemHealth);
document.getElementById("syncBtn").addEventListener("click", async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/archive/prime-protocol`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || `HTTP ${response.status}`);
    logProtocol(`Prime protocol: ${result.status} volumes=${result.volume_count}`, "SYNC");
  } catch (error) {
    logProtocol(`Prime protocol failed: ${error.message}`, "ERROR");
  }
});

document.querySelectorAll(".module-node").forEach((node) => {
  node.addEventListener("click", () => {
    document.querySelectorAll(".module-node").forEach((n) => n.classList.remove("active"));
    node.classList.add("active");
    logProtocol(`Module focus shifted to ${node.dataset.module}.`, "MODULE");
  });
});

resizeCanvas();
createParticles(Number(particleCount.value));
checkSystemHealth();
animate();
