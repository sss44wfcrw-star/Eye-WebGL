const BACKEND_URL = window.PARAKLETOS_CONFIG?.BACKEND_URL || "http://localhost:8000";

/* ===========================
   DOM REFERENCES
=========================== */
const output = document.getElementById("output");
const protocolLog = document.getElementById("protocolLog");
const searchOutput = document.getElementById("searchOutput");

const backendStatus = document.getElementById("backendStatus");
const dbStatus = document.getElementById("dbStatus");
const primeStatus = document.getElementById("primeStatus");

const volumeIdInput = document.getElementById("volumeId");
const premiseInput = document.getElementById("premise");
const conclusionInput = document.getElementById("conclusion");
const searchInput = document.getElementById("searchQuery");

/* ===========================
   UTIL
=========================== */
function log(message, type = "info") {
  const line = document.createElement("div");
  line.className = "log-line";
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  protocolLog.prepend(line);
}

function setStatus(el, text, cls = "") {
  if (!el) return;
  el.textContent = text;
  el.className = "metric-value " + cls;
}

/* ===========================
   HEALTH CHECK
=========================== */
async function checkHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    const data = await res.json();

    if (res.ok) {
      setStatus(backendStatus, "ONLINE", "good");
      setStatus(dbStatus, "CONNECTED", "good");
      log("Backend health confirmed.");
    } else {
      throw new Error("Bad response");
    }
  } catch (err) {
    setStatus(backendStatus, "OFFLINE", "bad");
    setStatus(dbStatus, "UNKNOWN", "bad");
    log("Backend unreachable.");
  }
}

/* ===========================
   VERIFY
=========================== */
async function runVerification() {
  const volumeId = volumeIdInput.value;
  const premise = premiseInput.value;
  const conclusion = conclusionInput.value;

  if (!volumeId || !premise || !conclusion) {
    output.textContent = "Error: All inputs required.";
    return;
  }

  output.textContent = "Running verification...";

  try {
    const res = await fetch(`${BACKEND_URL}/archive/verify/${volumeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mathematical_premise: premise,
        logical_conclusion: conclusion
      })
    });

    const data = await res.json();

    if (res.ok) {
      output.innerHTML = `
Verification Complete
---------------------
Volume: ${data.volume_id}
Status: ${data.status}
Result: <strong>${data.verification.toUpperCase()}</strong>
      `;
      log(`Verified volume ${volumeId} → ${data.verification}`);
    } else {
      output.textContent = "Verification failed.";
    }
  } catch (err) {
    output.textContent = "Network error.";
    log("Verification request failed.");
  }
}

/* ===========================
   SEARCH
=========================== */
async function runSearch() {
  const query = searchInput.value;
  if (!query) return;

  searchOutput.innerHTML = `<div class="result-card">Searching...</div>`;

  try {
    const res = await fetch(`${BACKEND_URL}/archive/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });

    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      searchOutput.innerHTML = `<div class="result-card">No results found.</div>`;
      return;
    }

    searchOutput.innerHTML = "";

    data.results.forEach(r => {
      const el = document.createElement("div");
      el.className = "result-card";
      el.innerHTML = `
        <strong>Volume ${r.volume_id}</strong><br/>
        Score: ${r.relevance_score.toFixed(3)}<br/>
        Status: ${r.verification_status}
      `;
      searchOutput.appendChild(el);
    });

    log(`Search completed: ${data.results.length} results`);
  } catch (err) {
    searchOutput.innerHTML = `<div class="result-card">Search error.</div>`;
    log("Search failed.");
  }
}

/* ===========================
   PRIME PROTOCOL
=========================== */
async function runPrimeProtocol() {
  setStatus(primeStatus, "RUNNING...", "accent-text");

  try {
    const res = await fetch(`${BACKEND_URL}/archive/prime-protocol`, {
      method: "POST"
    });

    const data = await res.json();

    if (res.ok) {
      setStatus(primeStatus, "CONSISTENT", "good");
      log(data.message || "Prime protocol success.");
    } else {
      setStatus(primeStatus, "FAILED", "bad");
      log("Prime protocol failed.");
    }
  } catch (err) {
    setStatus(primeStatus, "ERROR", "bad");
    log("Prime protocol error.");
  }
}

/* ===========================
   EVENT BINDINGS
=========================== */
document.getElementById("verifyBtn")?.addEventListener("click", runVerification);
document.getElementById("searchBtn")?.addEventListener("click", runSearch);

document.getElementById("healthCheckBtn")?.addEventListener("click", checkHealth);
document.getElementById("primeProtocolBtn")?.addEventListener("click", runPrimeProtocol);

document.getElementById("logHealthBtn")?.addEventListener("click", checkHealth);
document.getElementById("logPrimeBtn")?.addEventListener("click", runPrimeProtocol);

document.getElementById("clearLogBtn")?.addEventListener("click", () => {
  protocolLog.innerHTML = "";
});

/* ===========================
   AUTO INIT
=========================== */
checkHealth();
log("System initialized.");
