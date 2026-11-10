# NOVA Python Integrator

Orquestador/integrador que actúa como **puente** entre el frontend Angular y los motores Scala + Prolog.

```
USUARIO (Angular :4200)
         |
[Python Flask :8083]  ← este módulo
   /           \
[Scala :8081]  [Prolog: logic-prolog/recomendador.pl]
   datos          reglas de inferencia
         \     /
     respuesta unificada
```

## Requisitos

- Python 3.10+
- SWI-Prolog instalado (opcional — hay fallback Python si no está)

## Instalación

```bash
cd backend-python
pip install -r requirements.txt
```

## Ejecución

```bash
python main.py
```

Levanta en `http://localhost:8083`

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/health` | Estado del integrador, Prolog y Scala |
| `GET`  | `/recomendar?categoria=&talla=&color=&genero=` | Recomendación de talla/estilo (desde Angular) |
| `POST` | `/recomendar` | Mismo, con body JSON |
| `GET`  | `/productos` | Proxy hacia Scala API |
| `GET`  | `/productos/:id` | Proxy hacia Scala API |

## Motor de Prolog

Si tienes **SWI-Prolog** instalado y `pyswip` funciona, el motor usará las reglas reales del archivo:
```
logic-prolog/recomendador.pl
```

Si no, automáticamente usará las **reglas Python equivalentes** (mismo resultado, sin dependencia de SWI).

## Variables de entorno (.env)

```env
PYTHON_PORT=8083
```
