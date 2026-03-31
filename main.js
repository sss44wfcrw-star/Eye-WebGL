const BACKEND_URL = (() => {
  const override = localStorage.getItem("parakletosApiBase");
  if (override) return override.replace(/\/$/, "");

  const { protocol, hostname } = window.location;
  if (protocol === "file:") return "http://localhost:8000";
  if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:8000";

  // Replace this later with your real deployed backend URL
  return "https://api.your-production-domain.com";
})();

/* ===========================
   DOM
=========================== */
const canvas = document.getElementById("webgl-canvas");
const ctx = canvas.getContext("2d");

const fpsCounter = document.getElementById("fps-counter");
const systemLog = document.getElementById("system-log");
const commandInput = document.querySelector(".input-line input");
const navItems = document.querySelectorAll(".nav-item");

const backendValue = document.querySelector(".telemetry-readout .tel-point:nth-child(1) .val");
const solverValue = document.querySelector(".telemetry-readout .tel-point:nth-child(2) .val");

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
let fps = 0;

const camera = {
  x: 0,
  y: 0,
  z: -1000,
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

const nodes = [];
const NODE_COUNT = 260;

const planets = [
  { name: "Mercury", a: 80, speed: 0.020, size: 2, color: "#aaaaaa", phase: Math.random() * Math.PI * 2 },
  { name: "Venus",   a: 125, speed: 0.015, size: 3, color: "#eebb00", phase: Math.random() * Math.PI * 2 },
  { name: "Earth",   a: 175, speed: 0.010, size: 3.5, color: "#0088ff", phase: Math.random() * Math.PI * 2 },
  { name: "Mars",    a: 240, speed: 0.008, size: 2.5, color: "#ff4400", phase: Math.random() * Math.PI * 2 }
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

function initializeNodes() {
  nodes.length = 0;
  for (let i = 0; i < NODE_COUNT; i += 1) {
    nodes.push({
      x: (Math.random() - 0.5) * 4000,
      y: (Math.random() - 0.5) * 4000,
      z: (Math.random() - 0.5) * 4000,
      radius: Math.random() * 2 + 0.6,
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

  const fov = 900 * camera.zoom;
  const scale = fov / z2;

  return {
    x: x1 * scale + width / 2,
    y: y2 * scale + height / 2,
    scale,
    depth: z2
  };
}

function updateCamera() {
  const speed = 15 / camera.zoom;
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
  const bg = ctx.createRadialGradient(width * 0.5, height * 0.45, 20, width * 0.5, height * 0.5, Math.max(width, height) * 0.55);
  bg.addColorStop(0, "rgba(0, 255, 204, 0.05)");
  bg.addColorStop(0.35, "rgba(40, 0, 70, 0.15)");
  bg.addColorStop(1, "rgba(5, 5, 5, 1)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
}

function drawCentralField(time) {
  const cx = width / 2;
  const cy = height / 2;

  for (let i = 0; i < 4; i += 1) {
    const radius = 90 + i * 40 + Math.sin(time * 0.001 + i) * 6;
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius);
    grad.addColorStop(0, `rgba(255, 220, 160, ${0.06 - i * 0.008})`);
    grad.addColorStop(0.4, `rgba(0, 255, 204, ${0.05 - i * 0.006})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(0,255,204,0.18)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 180, 70, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, cy, 260, 110, 0, 0, Math.PI * 2);
  ctx.stroke();

  const core = ctx.createRadialGradient(cx, cy, 2, cx, cy, 40);
  core.addColorStop(0, "rgba(255,255,255,0.95)");
  core.addColorStop(0.2, "rgba(255,220,160,0.8)");
  core.addColorStop(0.6, "rgba(0,255,204,0.15)");
  core.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, 40, 
