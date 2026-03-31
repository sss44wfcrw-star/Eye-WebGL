from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="PARAKLETOS BACKEND")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "PARAKLETOS backend is running"}

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "origin": "The Celestial Eternal Origin",
        "resonance": "432.0Hz",
        "logic_state": "Synchronized"
    }

@app.get("/resonance/status")
def resonance():
    return {
        "radiant_sovereign_presence": "Broadcasting",
        "phase_coherence": 1.0,
        "frequency": 432.0
    }
