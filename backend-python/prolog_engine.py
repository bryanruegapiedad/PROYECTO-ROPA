"""
prolog_engine.py — Motor de inferencia Prolog para NOVA Studio
Consulta las reglas de logic-prolog/recomendador.pl usando pyswip.
Si pyswip no está disponible, usa reglas Python equivalentes como fallback.
"""

import os
import sys
from pathlib import Path

PROLOG_FILE = Path(__file__).parent.parent / "logic-prolog" / "recomendador.pl"

# ─── Intentar importar pyswip (SWI-Prolog binding) ──────────────────────────
try:
    from pyswip import Prolog as SWIProlog
    _prolog = SWIProlog()
    _prolog.consult(str(PROLOG_FILE))
    PROLOG_DISPONIBLE = True
    print("[prolog_engine] ✅ SWI-Prolog cargado correctamente.")
except Exception as e:
    _prolog = None
    PROLOG_DISPONIBLE = False
    print(f"[prolog_engine] ⚠️  SWI-Prolog no disponible ({e}). Usando reglas Python.")


# ─── Reglas Python de respaldo (mirror de recomendador.pl) ──────────────────
TALLAS_MUJER = {
    'XS': ('148-154 cm', 'Talla XS ideal para silueta delgada y altura petite.'),
    'S':  ('155-160 cm', 'Talla S: ajuste slim, perfecto para looks elegantes y definidos.'),
    'M':  ('160-166 cm', 'Talla M: balance perfecto entre comodidad y estilo.'),
    'L':  ('166-172 cm', 'Talla L: holgura cómoda sin perder la silueta.'),
    'XL': ('172-178 cm', 'Talla XL: maximalismo con estilo, perfecta para looks oversize.'),
}
TALLAS_HOMBRE = {
    'XS': ('155-162 cm', 'Talla XS: corte entallado para silueta atlética y delgada.'),
    'S':  ('162-168 cm', 'Talla S: ajuste clásico y versátil para cualquier ocasión.'),
    'M':  ('168-174 cm', 'Talla M: la talla más popular, cómoda y estilizada.'),
    'L':  ('174-180 cm', 'Talla L: espacio extra sin sacrificar el look.'),
    'XL': ('180-188 cm', 'Talla XL: ideal para complexión grande con estilo definido.'),
}
ESTILOS = {
    'Prendas superiores': 'El negro es siempre una elección segura y elegante para el día a día.',
    'Vestidos':           'El vestido negro es un clásico atemporal para eventos nocturnos.',
    'Pantalones':         'El beige arena combina con prácticamente cualquier prenda superior.',
    'Calzado':            'El calzado blanco amplifica visualmente la silueta y aporta frescura.',
    'Sets':               'Los tonos pastel son ideales para looks coordenados y femeninos.',
    'Faldas':             'El terracota aporta calidez y es una de las apuestas de la temporada.',
}
COMBINACIONES = {
    'Negro':        'Combina con pantalones beige, jeans claros o faldas blancas.',
    'Blanco hueso': 'Perfecto con jeans oscuros, pantalones camel o faldas negras.',
    'Verde oliva':  'Combina con pantalones beige, jeans straight o botines marrones.',
    'Beige arena':  'Combina con blusas blancas, tops negros o camisas de colores suaves.',
    'Terracota':    'Combina con blusas blancas, tops crema o chaquetas de lino natural.',
    'Rosado pastel':'El conjunto monocromático es tendencia; añade zapatillas blancas.',
    'Camel':        'El camel es neutro cálido; combina con negro, marfil o burdeos.',
    'Blanco':       'El blanco en calzado funciona con cualquier outfit y amplía visualmente.',
    'Indigo':       'Versátil: combina con camisetas básicas, blusas de seda o blazers.',
}


def recomendar(categoria: str, talla: str, color: str, genero: str) -> dict:
    """
    Punto de entrada principal. Intenta usar Prolog; si no está disponible,
    usa las reglas Python de respaldo.
    """
    if PROLOG_DISPONIBLE:
        return _recomendar_con_prolog(categoria, talla, color, genero)
    return _recomendar_sin_prolog(categoria, talla, color, genero)


def _recomendar_con_prolog(categoria: str, talla: str, color: str, genero: str) -> dict:
    """Consulta las reglas Prolog reales."""
    resultado = {
        "talla_recomendada": talla,
        "consejo_talla": "",
        "consejo_estilo": "",
        "combinacion": "",
        "motor": "SWI-Prolog",
    }
    try:
        # Consultar talla
        genero_pl = _normalizar_genero(genero)
        query_talla = list(_prolog.query(
            f"recomendar_talla({genero_pl}, '{talla}', Altura, _, Consejo)"
        ))
        if query_talla:
            resultado["consejo_talla"] = str(query_talla[0]["Consejo"])
            resultado["altura_referencia"] = str(query_talla[0]["Altura"])

        # Consultar estilo por categoría y color
        query_comb = list(_prolog.query(
            f"estilo_por_categoria('{color}', '{categoria}', Combinacion)"
        ))
        if query_comb:
            resultado["combinacion"] = str(query_comb[0]["Combinacion"])

        # Consejo de estilo general
        query_estilo = list(_prolog.query(
            f"recomendar_estilo('{categoria}', casual, _, Consejo)"
        ))
        if query_estilo:
            resultado["consejo_estilo"] = str(query_estilo[0]["Consejo"])

    except Exception as e:
        print(f"[prolog_engine] Error consultando Prolog: {e}")
        return _recomendar_sin_prolog(categoria, talla, color, genero)

    return resultado


def _recomendar_sin_prolog(categoria: str, talla: str, color: str, genero: str) -> dict:
    """Reglas Python de respaldo, equivalentes a las de Prolog."""
    genero_norm = _normalizar_genero(genero)

    tabla = TALLAS_MUJER if genero_norm in ('mujer', 'niña') else TALLAS_HOMBRE
    info_talla = tabla.get(talla, (None, 'Elige la talla que mejor se adapte a tu cuerpo.'))

    consejo_talla = info_talla[1]
    altura_ref = info_talla[0] or "—"

    consejo_estilo = ESTILOS.get(categoria, 'Elige el estilo que mejor exprese tu personalidad.')
    combinacion = COMBINACIONES.get(color, f'El color {color} combina con tonos neutros y complementarios.')

    return {
        "talla_recomendada": talla,
        "altura_referencia": altura_ref,
        "consejo_talla": consejo_talla,
        "consejo_estilo": consejo_estilo,
        "combinacion": combinacion,
        "motor": "Python (fallback)",
    }


def _normalizar_genero(genero: str) -> str:
    g = genero.lower().strip()
    if g in ('mujer', 'mujeres', 'female', 'f'):
        return 'mujer'
    if g in ('hombre', 'varones', 'male', 'm'):
        return 'hombre'
    if g in ('niña', 'niñas', 'girl'):
        return 'niña'
    if g in ('niño', 'niños', 'boy'):
        return 'niño'
    return 'unisex'
