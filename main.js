const BACKEND_URL = "https://parakletos-backend-2.onrender.com";

const logBody = document.getElementById("system-log");
const statusEl = document.querySelector(".lock-badge .bigtxt");
const cycleEl = document.getElementById("cycle");
const canvas = document.getElementById("webgl-canvas");
const ctx = canvas.getContext("2d");

let cycle = 0;

function log(msg, type = "SYS") {
  if (!logBody) return;
  const line = document.createElement("div");
  line.className = "entry";
  line.textContent = `[${type}] ${msg}`;
  logBody.appendChild(line);
  logBody.scrollTop = logBody.scrollHeight;
}

async function checkHealth() {
  try {
    log("Checking backend health...", "REQ");

    const res = await fetch(`${BACKEND_URL}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    log(`Health OK. status=${data.status} resonance=${data.resonance} logic=${data.logic_state}`, "OK");

    if (statusEl) {
      if (data.status === "healthy") {
        statusEl.textContent = "UNLOCKED";
        statusEl.style.color = "#22c55e";
      } else {
        statusEl.textContent = "LOCKED";
        statusEl.style.color = "#f59e0b";
      }
    }
  } catch (err) {
    log(`Health failed: ${err.message}`, "ERR");
    if (statusEl) {
      statusEl.textContent = "LOCKED";
      statusEl.style.color = "#f59e0b";
    }
  }
}

function draw() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const time = Date.now() * 0.0005;
  const centerX = w / 2;
  const centerY = h / 2;

  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    const r = ((time * 100 + i * 50) % 250);
    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(245, 158, 11, ${Math.max(0, 1 - r / 250) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 60, 0);
    ctx.lineTo(i * 60, 400);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * 40);
    ctx.lineTo(600, i * 40);
    ctx.stroke();
  }

  requestAnimationFrame(draw);
}

setInterval(() => {
  cycle += 1;
  if (cycleEl) cycleEl.textContent = cycle.toLocaleString();
}, 3000);

checkHealth();
setInterval(checkHealth, 5000);
draw();
