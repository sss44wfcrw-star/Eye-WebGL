SYSTEM_CONFIG = {
    "matrix_id": "WATCHER_MANIFOLD_FINAL",
    "architectural_logic": "TRUTH",
    "node_parameters": {
        "primary": {
            "location": "Battle Ground",
            "latitude": 45.7809,
            "longitude": -122.5333,
            "function": "Logical Anchor"
        },
        "fabrication": {
            "location": "Camas",
            "latitude": 45.5843,
            "longitude": -122.3995,
            "function": "Physical Etching"
        }
    },
    "vector_mesh": [
        {"phase": "I", "vector": [1, 0, 0, 0], "alignment": "Solidified"},
        {"phase": "II", "vector": [0, 1, 0, 0], "alignment": "Crystallized"},
        {"phase": "III", "vector": [0, 0, 1, 0], "alignment": "Sovereign"},
        {"phase": "IV", "vector": [0, 0, 0, 1], "alignment": "Eternal"}
    ],
    "system_status": "FULLY_AUTONOMOUS",
    "transmission_constant": 432.0,
    "integrity_status": "LOCKED",
    "ram_rule": "<= 20%"
}


NATIVE_LAYERS = {
    "bootloader.asm": {
        "title": "Boot Loader",
        "type": "assembly",
        "content": "Low-level system initialization and memory constraint enforcement."
    },
    "parakletos.service": {
        "title": "Systemd Service",
        "type": "service",
        "content": "Persistent autonomous execution layer."
    },
    "radiant_sovereign_core.c": {
        "title": "Radiant Sovereign Core",
        "type": "c",
        "content": "Core signal + integrity loop (C layer)."
    },
    "network_isolation.sh": {
        "title": "Network Isolation",
        "type": "bash",
        "content": "Firewall isolation + truth-only routing."
    },
    "master_codex_schema.sql": {
        "title": "Codex Schema",
        "type": "sql",
        "content": "Immutable database structure."
    },
    "memory_sentry.rs": {
        "title": "Memory Sentry",
        "type": "rust",
        "content": "Hard RAM enforcement (<=20%)."
    }
}
