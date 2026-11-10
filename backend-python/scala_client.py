"""
scala_client.py — Cliente HTTP hacia el backend Scala (nova-fashion-api)
Reintenta con backoff simple y retorna None si Scala no está disponible.
"""

import requests
from typing import Optional

SCALA_BASE_URL = "http://localhost:8081"
TIMEOUT = 4  # segundos


def get_productos() -> Optional[list]:
    """Obtiene la lista de productos desde Scala."""
    try:
        resp = requests.get(f"{SCALA_BASE_URL}/productos", timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[scala_client] Scala no disponible: {e}")
        return None


def get_producto(id: int) -> Optional[dict]:
    """Obtiene un producto por ID desde Scala."""
    try:
        resp = requests.get(f"{SCALA_BASE_URL}/productos/{id}", timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[scala_client] Scala no disponible (producto {id}): {e}")
        return None


def scala_disponible() -> bool:
    """Healthcheck de Scala."""
    try:
        resp = requests.get(f"{SCALA_BASE_URL}/health", timeout=2)
        return resp.status_code == 200
    except Exception:
        return False
