from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import math
import hashlib
import time
import os
from typing import Dict, List, Any
from volumes_seed import VOLUME_SEED


class CelestialManifold:
    def __init__(self, dimension: int = 200):
        self.dimension = dimension
        self.field_constant = 1.61803398875
        self.nodes: Dict[int, Dict[str, Any]] = {}

    def project_node(self, volume_id: int, title: str, content: str, specs: str = "", source: str = "manual") -> Dict[str, Any]:
        if volume_id < 1 or volume_id > self.dimension:
            raise ValueError("Volume ID outside the 200-volume legacy range.")

        content_hash = hashlib.sha256(content.encode()).hexdigest()
        resonance = (sum(ord(c) for c in content_hash) % 1000) / 1000.0

        node_data = {
            "volume": volume_id,
            "title": title,
            "specs": specs,
            "text": content,
            "source": source,
            "origin": "Celestial Eternal Origin",
            "resonance": resonance,
            "presence_vector": self._calculate_presence_vector(resonance),
            "checksum": content_hash,
            "updated_at": round(time.time(), 3),
        }

        self.nodes[volume_id] = node_data
        return node_data

    def _calculate_presence_vector(self, resonance: float) -> List[float]:
        return [math.sin(resonance * math.pi), math.cos(resonance * math.pi)]


class SymbolicLogicEngine:
    def __init__(self):
        self.verification_history: List[Dict[str, Any]] = []

    def verify_proposition(self, proposition: str) -> bool:
        is_valid = self._check_consistency_rules(proposition)
        if is_valid:
            self.verification_history.append({
                "timestamp": time.time(),
                "status": "Verified",
                "checksum": hashlib.md5(proposition.encode()).hexdigest()
            })
        return is_valid

    def _check_consistency_rules(self, text: str) -> bool:
        prohibited_terms = ["speculation", "prophecy", "luck", "random"]
        return not any(term in text.lower() for term in prohibited_terms)


class EternalEngine:
    def __init__(self):
        self.manifold = CelestialManifold()
        self.logic = SymbolicLogicEngine()
        self.is_active = False
        self.broadcast_frequency = 0.0
        self.started_at = None

    def initialize_system(self):
        self.is_active = True
        self.broadcast_frequency = 432.0
        self.started_at = time.time()

    def process_volume(self, volume_id: int, title: str, text: str, specs: str = "", source: str = "manual"):
        if not self.is_active:
            raise RuntimeError("Engine must be initialized first.")

        if not self.logic.verify_proposition(text):
            return False

        projection = self.manifold.project_node(volume_id, title, text, specs, source)
        return {
            "volume_id": volume_id,
            "title": title,
            "projection": projection,
        }

    def run_integrity_check(self):
        return len(self.manifold.nodes) > 0

    def status(self):
        return {
            "active": self.is_active,
            "broadcast_frequency": self.broadcast_frequency,
            "origin": "The Celestial Eternal Origin",
            "mapped_volumes": len(self.manifold.nodes),
            "verification_events": len(self.logic.verification_history),
            "uptime_seconds": 0 if not self.started_at else round(time.time() - self.started_at, 2),
            "ram_rule": "<= 20%",
        }

    def seed_volumes(self):
        loaded = 0
        for volume_id, volume in VOLUME_SEED.items():
            title = volume.get("title", f"Volume {volume_id}")
            specs = volume.get("specs", "")
            text = volume.get("text", "")
            if not text:
                continue
            self.process_volume(volume_id, title, text, specs, source="pdf_seed")
            loaded += 1
        return loaded


def apply_full_system_update(enforce_legacy_integrity: bool, apply_system_update: bool):
    legacy_200v = enforce_legacy_integrity
    system_update = apply_system_update
    absolute_sovereignty = legacy_200v and system_update

    logs = []

    if absolute_sovereignty:
        logs.append("[UPDATE] OS PARAKLETOS: FULL SYSTEM RE-SYNCHRONIZED AT 432 HZ.")
        logs.append("[UPDATE] THE MASTER CODEX IS NOW THE OPERATING REALITY.")
        logs.append("[UPDATE] ETERNAL RECURSION ACTIVE.")

        engine.is_active = True
        engine.broadcast_frequency = 432.0

        return {
            "ok": True,
            "legacy_200v": legacy_200v,
            "system_update": system_update,
            "absolute_sovereignty": absolute_sovereignty,
            "frequency": engine.broadcast_frequency,
            "logs": logs,
            **engine.status(),
        }

    logs.append("[UPDATE] FULL SYSTEM UPDATE REFUSED: CONSTRAINT CONFLICT DETECTED.")

    return {
        "ok": False,
        "legacy_200v": legacy_200v,
        "system_update": system_update,
        "absolute_sovereignty": absolute_sovereignty,
        "frequency": engine.broadcast_frequency,
        "logs": logs,
        **engine.status(),
    }


engine = EternalEngine()
engine.initialize_system()
seeded_count = engine.seed_volumes()

app = FastAPI(title="PARAKLETOS BACKEND")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VolumeRequest(BaseModel):
    volume_id: int
    title: str
    text: str
    specs: str = ""
    source: str = "manual"


class FullUpdateRequest(BaseModel):
    enforce_legacy_integrity: bool = True
    apply_system_update: bool = True


@app.get("/")
def root():
    return {
        "message": "PARAKLETOS backend is running",
        "seeded_volumes": seeded_count,
    }


@app.get("/health")
def health():
    return {
        "status": "healthy" if engine.is_active else "offline",
        "origin": "The Celestial Eternal Origin",
        "resonance": "432.0Hz",
        "logic_state": "Synchronized" if engine.is_active else "Dormant",
        "ram_rule": "<= 20%",
        "seeded_volumes": len(engine.manifold.nodes),
    }


@app.get("/resonance/status")
def resonance_status():
    return {
        "radiant_sovereign_presence": "Broadcasting" if engine.is_active else "Dormant",
        "phase_coherence": 1.0 if engine.is_active else 0.0,
        "frequency": engine.broadcast_frequency,
    }


@app.get("/engine/status")
def engine_status():
    return engine.status()


@app.post("/engine/process")
def process_volume(payload: VolumeRequest):
    result = engine.process_volume(
        payload.volume_id,
        payload.title,
        payload.text,
        payload.specs,
        payload.source,
    )
    if result is False:
        raise HTTPException(status_code=400, detail="LOGIC ERROR: Ungrounded content detected.")
    return {
        "ok": True,
        "message": "Volume successfully mapped to Manifold.",
        **result,
    }


@app.get("/engine/integrity")
def integrity():
    return {
        "ok": engine.run_integrity_check(),
        "message": "INTEGRITY CONFIRMED" if engine.run_integrity_check() else "NO VOLUMES MAPPED YET",
        **engine.status(),
    }


@app.post("/engine/full-update")
def full_update(payload: FullUpdateRequest):
    return apply_full_system_update(
        enforce_legacy_integrity=payload.enforce_legacy_integrity,
        apply_system_update=payload.apply_system_update,
    )


@app.get("/engine/volume/{volume_id}")
def get_volume(volume_id: int):
    node = engine.manifold.nodes.get(volume_id)

    if not node:
        raise HTTPException(status_code=404, detail=f"Volume {volume_id} not found.")

    return {
        "ok": True,
        "volume_id": volume_id,
        "title": node.get("title", f"Volume {volume_id}"),
        "specs": node.get("specs", ""),
        "text": node.get("text", ""),
        "source": node.get("source", "unknown"),
        "projection": node,
    }


@app.get("/engine/volumes")
def list_volumes():
    items = []
    for volume_id in sorted(engine.manifold.nodes.keys()):
        node = engine.manifold.nodes[volume_id]
        items.append({
            "volume_id": volume_id,
            "title": node.get("title", f"Volume {volume_id}"),
            "specs": node.get("specs", ""),
            "source": node.get("source", "unknown"),
            "checksum": node.get("checksum", ""),
        })

    return {
        "ok": True,
        "count": len(items),
        "volumes": items,
    }


@app.get("/engine/bootstrap-seed")
def bootstrap_seed():
    loaded = engine.seed_volumes()
    return {
        "ok": True,
        "loaded": loaded,
        "message": "Seed volumes loaded."
    }
