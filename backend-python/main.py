"""
main.py — Integrador / Orquestador Python de NOVA Studio
Puerto: 8083

Arquitectura:
                USUARIO (Angular)
                      |
           [Python Flask :8083]  <-- este archivo
            /                 \
    [Scala :8081]        [Prolog: recomendador.pl]
     datos/productos       reglas de inferencia
            \                 /
        respuesta unificada al frontend
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS   # pip install flask-cors (incluido en requirements)
from dotenv import load_dotenv

from prolog_engine import recomendar, PROLOG_DISPONIBLE
from scala_client import scala_disponible, get_productos, get_producto

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

PORT = int(os.getenv("PYTHON_PORT", 8083))


# ─── Health ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return jsonify({
        "ok": True,
        "servicio": "NOVA Python Integrator",
        "puerto": PORT,
        "prolog": "SWI-Prolog" if PROLOG_DISPONIBLE else "Python-fallback",
        "scala": "conectado" if scala_disponible() else "no disponible (modo local)",
    })


# ─── Recomendador de tallas / estilos ───────────────────────────────────────

@app.post("/recomendar")
def recomendar_endpoint():
    """
    Recibe: { categoria, talla, color, genero }
    Devuelve: { talla_recomendada, consejo_talla, consejo_estilo,
                combinacion, altura_referencia, motor }

    Usado por el Checkout de Angular para sugerir talla correcta.
    """
    datos = request.get_json(silent=True) or {}
    categoria = str(datos.get("categoria", "Prendas superiores")).strip()
    talla     = str(datos.get("talla", "M")).strip().upper()
    color     = str(datos.get("color", "Negro")).strip()
    genero    = str(datos.get("genero", "unisex")).strip()

    if not categoria or not talla:
        return jsonify({"error": "categoria y talla son requeridos"}), 400

    resultado = recomendar(categoria, talla, color, genero)
    return jsonify(resultado)


@app.get("/recomendar")
def recomendar_get():
    """Versión GET del recomendador (compatible con Angular HttpClient params)."""
    categoria = request.args.get("categoria", "Prendas superiores")
    talla     = request.args.get("talla", "M").upper()
    color     = request.args.get("color", "Negro")
    genero    = request.args.get("genero", "unisex")

    resultado = recomendar(categoria, talla, color, genero)
    return jsonify(resultado)


# ─── Proxy de productos (orquesta Scala → Node fallback) ────────────────────

@app.get("/productos")
def productos():
    """
    Intenta obtener productos desde Scala.
    Si Scala no está disponible, responde con error descriptivo.
    """
    data = get_productos()
    if data is None:
        return jsonify({
            "error": "Scala no disponible. Usa directamente Node.js en :8082.",
            "fallback_url": "http://localhost:8082/productos"
        }), 503
    return jsonify(data)


@app.get("/productos/<int:id>")
def producto_detalle(id: int):
    data = get_producto(id)
    if data is None:
        return jsonify({
            "error": f"Producto {id} no disponible desde Scala.",
            "fallback_url": f"http://localhost:8082/productos/{id}"
        }), 503
    return jsonify(data)


# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"[NOVA Integrator] Iniciando en http://localhost:{PORT}")
    print(f"[NOVA Integrator] Motor Prolog: {'SWI-Prolog' if PROLOG_DISPONIBLE else 'Python fallback'}")
    print(f"[NOVA Integrator] Scala API:    {'conectado' if scala_disponible() else 'no disponible (OK para desarrollo)'}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
