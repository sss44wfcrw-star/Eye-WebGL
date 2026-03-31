const BACKEND_URL = "https://parakletos-backend-2.onrender.com";

const logBody = document.getElementById("logBody");

function log(msg) {
  const line = document.createElement("div");
  line.className = "log-line";
  line.innerHTML = `<span class="arrow">&gt;</span><span>${msg}</span>`;
  logBody.appendChild(line);
  logBody.scrollTop = logBody.scrollHeight;
}

async function checkHealth() {
  try {
    log("[REQ] Checking backend health...");

    const res = await fetch(`${BACKEND_URL}/health`);
    const data = await res.json();

    log(`[OK] status=${data.status}`);
    log(`[SYNC] resonance=${data.resonance}`);
    log(`[SYNC] logic=${data.logic_state}`);

    updateUI(data);

  } catch (err) {
    log("[ERROR] Backend unreachable");
  }
}

function updateUI(data) {
  const statusEl = document.querySelector(".lock-badge .bigtxt");

  if (data.status === "healthy") {
    statusEl.innerText = "UNLOCKED";
    statusEl.style.color = "#22c55e";
  } else {
    statusEl.innerText = "LOCKED";
    statusEl.style.color = "#f59e0b";
  }
}

// 🔁 REAL-TIME LOOP (this is the missing piece)
setInterval(() => {
  checkHealth();
}, 5000);

// first run instantly
checkHealth();
