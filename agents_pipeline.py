"""
RehabPrint IA — Pipeline Multiagente de IA (Opción 3)

Implementa los 7 agentes definidos en 'rehabprint_ia_agentes.md':
1. Agente Orquestador (Coordinador del flujo)
2. Agente Ingestor (Lectura de datos crudos)
3. Agente Normalizador (Limpieza y estandarización)
4. Agente Clasificador (Categorías y contextos clínicos)
5. Agente Priorizador (Sugerencia de prioridad operacional)
6. Agente Resumidor (Resumen clínico de 1-2 líneas)
7. Agente Seguimiento (Alertas y tiempos de espera)
"""

import json
import re
import sys
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# ─── AGENTE INGESTOR ───────────────────────────────────
def agente_ingestor(row_raw, index):
    """Convierte la respuesta cruda del formulario/sheet en un bloque inicial estructurado."""
    piezas = []
    ignore_keys = {"Nombre del funcionario solicitante", "Profesión", "¿A quién va dirigido el producto impreso?", 
                   "Si la respuesta anterior fue UNIDAD indicar: Unidad y Sala o Poli Kine/TO/Fono ",
                   "Si la respuesta anterior fue USUARIO indicar: Nombre, Rut, Servicio(Sala-cama)/Lugar de atención (poli Kine/TO/Fono). ",
                   "Marca temporal", "Solicitud personalizada: describir brevemente el equipamiento/ayuda técnica solicitada", "_row_index", "_ai_agent_analysis"}
    
    for k, v in row_raw.items():
        k_lower = k.lower()
        if k not in ignore_keys and v and "entrega" not in k_lower and "entregado" not in k_lower and "espera" not in k_lower:
            val_str = str(v).strip()
            v_lower = val_str.lower()
            if val_str and v_lower not in ("no", "no requiero", "0", "false"):
                clean_item = k.split("(")[0].strip()
                if v_lower not in ("requiero", "si", "sí", "x", "lo requiero"):
                    clean_item += f" ({val_str.replace('lo requiero', '').strip()})"
                piezas.append(clean_item)

    personalizada = row_raw.get("Solicitud personalizada: describir brevemente el equipamiento/ayuda técnica solicitada", "").strip()
    if personalizada:
        piezas.append(f"Personalizado: {personalizada[:60]}")

    return {
        "id": f"RP-{str(index).zfill(3)}",
        "nombreSolicitante": row_raw.get("Nombre del funcionario solicitante", "—").strip(),
        "profesionSolicitante": row_raw.get("Profesión", "—").strip(),
        "destinoTexto": row_raw.get("¿A quién va dirigido el producto impreso?", "").strip(),
        "unidadTexto": row_raw.get("Si la respuesta anterior fue UNIDAD indicar: Unidad y Sala o Poli Kine/TO/Fono ", "").strip(),
        "usuarioTexto": row_raw.get("Si la respuesta anterior fue USUARIO indicar: Nombre, Rut, Servicio(Sala-cama)/Lugar de atención (poli Kine/TO/Fono). ", "").strip(),
        "personalizadaTexto": personalizada,
        "piezasDetectadas": piezas,
        "fechaMarca": row_raw.get("Marca temporal", datetime.now().strftime("%d/%m/%Y %H:%M:%S"))
    }

# ─── AGENTE NORMALIZADOR ───────────────────────────────
def agente_normalizador(ingested_data):
    """Limpia texto libre, estandariza profesiones, extrae RUT, nombre y unifica nombres de piezas."""
    prof = ingested_data["profesionSolicitante"].lower()
    if "ocupacional" in prof or "to" in prof:
        area = "Terapia Ocupacional"
    elif "kinesi" in prof or "kine" in prof:
        area = "Kinesiología"
    elif "fono" in prof:
        area = "Fonoaudiología"
    else:
        area = "Otra"

    usuario_raw = ingested_data["usuarioTexto"]
    rut = ""
    nombre_user = ""
    ubicacion = ""

    if usuario_raw:
        rut_match = re.search(r'\b\d{1,2}(?:\.\d{3}){2}-?[\dkK]\b|\b\d{7,8}-?[\dkK]\b', usuario_raw)
        if rut_match:
            rut = rut_match.group(0)
            parts = usuario_raw.split(rut)
            nombre_user = parts[0].strip().rstrip("-").rstrip(",")
            if len(parts) > 1:
                ubicacion = parts[1].strip().lstrip("-").lstrip(",")
        else:
            parts = [p.strip() for p in usuario_raw.split(",") if p.strip()]
            if parts:
                nombre_user = parts[0]
            if len(parts) > 1:
                rut = parts[1]
            if len(parts) > 2:
                ubicacion = ", ".join(parts[2:])

    return {
        "areaSolicitante": area,
        "nombreUsuarioNormalizado": nombre_user or "Paciente",
        "rutUsuarioNormalizado": rut,
        "ubicacionNormalizada": ubicacion,
        "solicitudPersonalizada": ingested_data["personalizadaTexto"]
    }

# ─── AGENTE CLASIFICADOR ───────────────────────────────
def agente_clasificador(ingested_data, normalized_data):
    """Determina tipo de destino, contexto de atención y categoría funcional del producto 3D."""
    dest_text = ingested_data["destinoTexto"].lower()
    if "unidad" in dest_text or "stock" in dest_text or "servicio" in dest_text:
        destino_tipo = "Unidad"
    else:
        destino_tipo = "Usuario"

    if "cerrada" in dest_text or "uci" in dest_text or "hospitaliz" in dest_text or "cama" in dest_text:
        contexto = "Unidad cerrada"
    elif "ambulatorio" in dest_text or "poli" in dest_text:
        contexto = "Ambulatorio"
    else:
        contexto = "Hospitalizado"

    # Categoría funcional
    if normalized_data["solicitudPersonalizada"]:
        categoria = "Pieza personalizada"
    elif destino_tipo == "Unidad":
        categoria = "Stock de unidad"
    else:
        categoria = "Ayuda técnica AVD"

    confianza = 0.92 if (destino_tipo and contexto) else 0.70

    return {
        "destinoTipo": destino_tipo,
        "contextoAtencion": contexto,
        "categoriaFuncional": categoria,
        "confianzaClasificacion": confianza
    }

# ─── AGENTE PRIORIZADOR ────────────────────────────────
def agente_priorizador(classified_data, normalized_data):
    """Sugiere nivel de prioridad operativa (Alta, Media, Baja) con justificación técnica."""
    contexto = classified_data["contextoAtencion"]
    tiene_rut = bool(normalized_data["rutUsuarioNormalizado"])

    if contexto == "Unidad cerrada":
        prioridad = "Alta"
        motivo = "Usuario en Unidad Crítica o atención cerrada urgente."
    elif tiene_rut or contexto == "Hospitalizado":
        prioridad = "Alta"
        motivo = "Usuario hospitalizado con RUT registrado o atención directa requerida."
    elif classified_data["destinoTipo"] == "Unidad":
        prioridad = "Media"
        motivo = "Stock o equipamiento para unidad clínica."
    else:
        prioridad = "Media"
        motivo = "Atención ambulatoria estándar."

    return {
        "prioridadIA": prioridad,
        "motivoPrioridad": motivo,
        "confianzaPrioridad": 0.88
    }

# ─── AGENTE RESUMIDOR ──────────────────────────────────
def agente_resumidor(ingested, normalized, classified, prioritized):
    """Genera resumen conciso en lenguaje clínico-operativo para el tablero."""
    target = normalized["nombreUsuarioNormalizado"] if classified["destinoTipo"] == "Usuario" else ingested["unidadTexto"]
    resumen = (
        f"{classified['destinoTipo']} ({target}) | "
        f"Contexto: {classified['contextoAtencion']} | "
        f"Categoría: {classified['categoriaFuncional']} | "
        f"Prioridad: {prioritized['prioridadIA']}"
    )
    return {
        "resumenIA": resumen
    }

# ─── AGENTE SEGUIMIENTO ────────────────────────────────
def agente_seguimiento(solicitud):
    """Monitorea el tiempo de espera y sugiere alertas si el caso requiere atención."""
    dias = solicitud.get("tiempoEsperaDias", 0)
    estado = solicitud.get("estadoCaso", "Nueva solicitud")

    alerta = False
    accion = "Sin acción pendiente"

    if estado == "Nueva solicitud" and dias > 3:
        alerta = True
        accion = f"⚠️ Caso sin revisar durante {dias} días. Asignar moderador urgente."
    elif estado == "En impresión" and dias > 5:
        alerta = True
        accion = f"⚠️ Proceso de impresión excedió {dias} días. Verificar estado de impresoras 3D."

    return {
        "alertaSeguimiento": alerta,
        "accionSugerida": accion
    }

# ─── AGENTE ORQUESTADOR ────────────────────────────────
def agente_orquestador(row_raw, index):
    """Coordinador general: ejecuta la tubería de los 6 agentes y consolida la salida."""
    ingested = agente_ingestor(row_raw, index)
    normalized = agente_normalizador(ingested)
    classified = agente_clasificador(ingested, normalized)
    prioritized = agente_priorizador(classified, normalized)
    summarized = agente_resumidor(ingested, normalized, classified, prioritized)

    requiere_revision = (classified["confianzaClasificacion"] < 0.80) or (not normalized["nombreUsuarioNormalizado"] and classified["destinoTipo"] == "Usuario")

    resultado = {
        **ingested,
        **normalized,
        **classified,
        **prioritized,
        **summarized,
        "requiereRevisionManual": requiere_revision,
        "timestampProcesado": datetime.now().isoformat()
    }
    return resultado

if __name__ == "__main__":
    print("=" * 60)
    print("  RehabPrint IA — Pipeline Multiagente Prototipo")
    print("=" * 60)

    sample_row = {
        "Nombre del funcionario solicitante": "Valentina Muñoz",
        "Profesión": "Terapeuta Ocupacional",
        "¿A quién va dirigido el producto impreso?": "Usuario ambulatorio Poli TO",
        "Si la respuesta anterior fue USUARIO indicar: Nombre, Rut, Servicio(Sala-cama)/Lugar de atención (poli Kine/TO/Fono). ": "Luis González, 14.502.812-4, Poli TO",
        "Solicitud personalizada: describir brevemente el equipamiento/ayuda técnica solicitada": "Adaptador universal para cubiertos",
        "Marca temporal": "14/08/2026 08:30:00"
    }

    output = agente_orquestador(sample_row, 1)
    print("\n🤖 Resultado Consolidado por el Orquestador Multiagente:")
    print(json.dumps(output, indent=2, ensure_ascii=False))
