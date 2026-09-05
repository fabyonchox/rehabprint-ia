"""
RehabPrint IA — Pipeline Multiagente de IA (Versión Robusta)

Implementa los 7 agentes definidos en 'rehabprint_ia_agentes.md':
1. Agente Orquestador (Coordinador del flujo)
2. Agente Ingestor (Lectura de datos crudos)
3. Agente Normalizador (Limpieza, estandarización y anonimización de seguridad)
4. Agente Clasificador (Categorías y contextos clínicos)
5. Agente Priorizador (Sugerencia de prioridad operacional clínica: Alta, Media, Baja)
6. Agente Resumidor (Resumen clínico de 1-2 líneas)
7. Agente Seguimiento (Alertas y tiempos de espera calculados)
"""

import json
import re
import sys
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# ─── UTILIDADES DE ANONIMIZACIÓN (PRIVACIDAD CLÍNICA) ──────────────────────
def anonymize_rut(rut_str):
    """Enmascara un RUT chileno para proteger la privacidad (ej: 13.381.084-6 -> 13.***.***-6 o 8.765.432-K -> 8.***.***-K)."""
    if not rut_str:
        return ""
    clean = re.sub(r'[^0-9kK]', '', str(rut_str))
    if len(clean) < 7:
        return "***"
    dv = clean[-1]
    cuerpo = clean[:-1]
    prefix_len = max(1, len(cuerpo) - 6)
    prefijo = cuerpo[:prefix_len]
    return f"{prefijo}.***.***-{dv}"

def anonymize_name(name_str):
    """Ofusca el nombre de un paciente dejando solo el primer nombre y la inicial del apellido."""
    if not name_str:
        return "Paciente"
    parts = [p.capitalize() for p in name_str.strip().split() if p.strip()]
    if not parts:
        return "Paciente"
    if len(parts) == 1:
        return parts[0]
    return f"{parts[0]} {parts[1][0]}."

def is_metadata_key(k):
    """Detecta si una columna es de metadatos o formulario base en vez de un ítem imprimible."""
    k_l = k.lower().strip()
    return (
        k_l.startswith("_") or
        "funcionario" in k_l or "solicitante" in k_l or
        "profesi" in k_l or
        "dirigido" in k_l or
        "indicar" in k_l or
        "marca temporal" in k_l or "timestamp" in k_l or
        "personalizada" in k_l or
        "entrega" in k_l or "entregado" in k_l or
        "espera" in k_l or "catastro" in k_l
    )

def get_row_val(row_raw, *keywords):
    """Obtiene un valor buscando de forma flexible por una o más palabras clave en los encabezados."""
    for k, v in row_raw.items():
        k_l = k.lower().strip()
        if any(kw in k_l for kw in keywords):
            return str(v).strip()
    return ""

# ─── AGENTE INGESTOR ───────────────────────────────────
def agente_ingestor(row_raw, index):
    """Convierte la respuesta cruda del formulario/sheet en un bloque inicial estructurado."""
    piezas = []
    
    for k, v in row_raw.items():
        if not is_metadata_key(k) and v:
            val_str = str(v).strip()
            v_lower = val_str.lower()
            if val_str and v_lower not in ("no", "no requiero", "0", "false", "—", "-"):
                clean_item = k.split("(")[0].strip()
                if v_lower not in ("requiero", "si", "sí", "x", "lo requiero"):
                    clean_item += f" ({val_str.replace('lo requiero', '').strip()})"
                piezas.append(clean_item)

    personalizada = get_row_val(row_raw, "personalizada")
    if personalizada:
        piezas.append(f"Personalizado: {personalizada[:60]}")

    return {
        "id": f"RP-{str(index).zfill(3)}",
        "nombreSolicitante": get_row_val(row_raw, "funcionario", "solicitante") or "—",
        "profesionSolicitante": get_row_val(row_raw, "profesi") or "—",
        "destinoTexto": get_row_val(row_raw, "dirigido"),
        "unidadTexto": get_row_val(row_raw, "unidad indicar"),
        "usuarioTexto": get_row_val(row_raw, "usuario indicar"),
        "personalizadaTexto": personalizada,
        "piezasDetectadas": piezas,
        "fechaMarca": get_row_val(row_raw, "marca temporal", "timestamp") or datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    }

# ─── AGENTE NORMALIZADOR ───────────────────────────────
def agente_normalizador(ingested_data):
    """Limpia texto libre, estandariza profesiones, extrae RUT, nombre y genera versiones anonimizadas."""
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
            nombre_user = parts[0].strip()
            nombre_user = re.sub(r'[\s;:,,\-]*\brut\b[\s;:,,\-]*$', '', nombre_user, flags=re.IGNORECASE)
            nombre_user = re.sub(r'[\s;:,,\-]+$', '', nombre_user).strip()
            if len(parts) > 1:
                ubicacion = re.sub(r'^[\s;:,,\-]+', '', parts[1].strip()).strip()
        else:
            parts = [p.strip().strip(";").strip(",") for p in usuario_raw.split(";") if p.strip()]
            if not parts:
                parts = [p.strip().strip(";").strip(",") for p in usuario_raw.split(",") if p.strip()]
            if parts:
                nombre_user = parts[0]
            if len(parts) > 1:
                rut = parts[1]
            if len(parts) > 2:
                ubicacion = ", ".join(parts[2:])

    nombre_final = nombre_user or "Paciente"
    rut_anon = anonymize_rut(rut)
    nombre_anon = anonymize_name(nombre_final)

    return {
        "areaSolicitante": area,
        "nombreUsuarioNormalizado": nombre_final,
        "nombreUsuarioAnonimizado": nombre_anon,
        "rutUsuarioNormalizado": rut,
        "rutUsuarioAnonimizado": rut_anon,
        "ubicacionNormalizada": ubicacion,
        "solicitudPersonalizada": ingested_data["personalizadaTexto"]
    }

# ─── AGENTE CLASIFICADOR ───────────────────────────────
def agente_clasificador(ingested_data, normalized_data):
    """Determina tipo de destino, contexto de atención y categoría funcional del producto 3D."""
    dest_text = ingested_data["destinoTexto"].lower()
    ubicacion_text = normalized_data["ubicacionNormalizada"].lower()
    unidad_text = ingested_data["unidadTexto"].lower()
    combined_context = f"{dest_text} {ubicacion_text} {unidad_text}"

    if "unidad" in dest_text or "stock" in dest_text or "servicio" in dest_text:
        destino_tipo = "Unidad"
    else:
        destino_tipo = "Usuario"

    # Contexto de atención
    if any(k in combined_context for k in ["cerrada", "uci", "uti", "pabellón", "pabellon", "quirúrgic", "quirurgic"]):
        contexto = "Unidad cerrada"
    elif any(k in combined_context for k in ["ambulatorio", "poli"]):
        contexto = "Ambulatorio"
    elif any(k in combined_context for k in ["cama", "sala", "hospitaliz", "medicina interna", "neurología", "traumatología"]):
        contexto = "Hospitalizado"
    else:
        # Si va a usuario sin cama, suele ser ambulatorio
        contexto = "Ambulatorio" if destino_tipo == "Usuario" else "Hospitalizado"

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
def agente_priorizador(classified_data, normalized_data, ingested_data):
    """
    Sugiere nivel de prioridad operativa clínica (Alta, Media, Baja) con justificación técnica.
    
    Criterios:
    - Alta:
        * Usuario en Unidad Cerrada (UCI/UTI/Pabellón).
        * Usuario Hospitalizado con alta programada, protocolo agudo o necesidad inmediata.
        * Texto que mencione urgencia funcional ('urgente', 'alta en', 'inmediato').
    - Baja:
        * Implementos lúdicos o terapéuticos diferibles (jenga, tetris, enhebradores, encajes).
        * Reposición de stock general programable o ganchos de pared sin paciente activo.
    - Media:
        * Atención ambulatoria estándar (Poli TO, Poli Kine, Poli Fono) para AVD.
        * Stock clínico estándar de rotación habitual.
        * Piezas personalizadas ambulatorias regulares.
    """
    contexto = classified_data["contextoAtencion"]
    destino = classified_data["destinoTipo"]
    piezas = [p.lower() for p in ingested_data.get("piezasDetectadas", [])]
    piezas_str = " ".join(piezas)
    desc_raw = (ingested_data.get("personalizadaTexto", "") + " " + ingested_data.get("usuarioTexto", "")).lower()

    es_urgente_texto = any(w in desc_raw for w in ["urgente", "alta programada", "inmediato", "48h", "protocolo"])
    es_ludico_diferible = any(w in piezas_str for w in ["jenga", "tetris", "enhebrador", "tazos", "encaje", "vasos", "gancho"])

    if contexto == "Unidad cerrada":
        prioridad = "Alta"
        motivo = "Usuario o unidad crítica en atención cerrada con necesidad funcional urgente."
        confianza = 0.95
    elif contexto == "Hospitalizado" and (es_urgente_texto or "cama" in desc_raw or "sala" in desc_raw):
        prioridad = "Alta"
        motivo = "Usuario hospitalizado en sala-cama con requerimiento funcional inmediato para estadía o alta."
        confianza = 0.90
    elif es_urgente_texto:
        prioridad = "Alta"
        motivo = "Indicación de urgencia clínica expresa en la solicitud."
        confianza = 0.88
    elif es_ludico_diferible and destino == "Unidad":
        prioridad = "Baja"
        motivo = "Material lúdico-terapéutico o stock programable no vinculado a urgencia inmediata."
        confianza = 0.85
    elif destino == "Unidad" and "stock" in classified_data["categoriaFuncional"].lower():
        prioridad = "Media"
        motivo = "Stock clínico de rotación habitual para servicio de rehabilitación."
        confianza = 0.85
    else:
        # Usuario ambulatorio estándar
        prioridad = "Media"
        motivo = "Usuario ambulatorio en plan de rehabilitación funcional (AVD / apoyo motor)."
        confianza = 0.88

    return {
        "prioridadIA": prioridad,
        "motivoPrioridad": motivo,
        "confianzaPrioridad": confianza
    }

# ─── AGENTE RESUMIDOR ──────────────────────────────────
def agente_resumidor(ingested, normalized, classified, prioritized):
    """Genera resumen conciso en lenguaje clínico-operativo para el tablero."""
    target = normalized["nombreUsuarioAnonimizado"] if classified["destinoTipo"] == "Usuario" else (ingested["unidadTexto"] or "Unidad")
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
    """Monitorea tiempos de espera reales y sugiere alertas si el caso requiere atención."""
    dias = solicitud.get("tiempoEsperaDias", 0)
    estado = solicitud.get("estadoCaso", "Nueva solicitud")
    
    # Calcular días a partir de la fecha de solicitud si días es 0
    fecha_sol_str = solicitud.get("fechaSolicitud") or solicitud.get("fechaMarca")
    if dias == 0 and fecha_sol_str:
        try:
            # Formatos posibles: YYYY-MM-DD o DD/MM/YYYY
            clean_date = fecha_sol_str.split()[0]
            if "-" in clean_date:
                dt = datetime.strptime(clean_date, "%Y-%m-%d")
            elif "/" in clean_date:
                dt = datetime.strptime(clean_date, "%d/%m/%Y")
            else:
                dt = None
            if dt:
                dias = max(0, (datetime.now() - dt).days)
        except Exception:
            pass

    alerta = False
    accion = "En flujo normal de producción."

    if estado == "Nueva solicitud" and dias > 3:
        alerta = True
        accion = f"⚠️ Solicitud sin revisar durante {dias} días. Asignar moderador urgente."
    elif estado in ("En diseño", "En impresión") and dias > 5:
        alerta = True
        accion = f"⚠️ Proceso técnico prolongado ({dias} días). Verificar estado de impresoras 3D."
    elif estado == "Lista para entrega" and dias > 2:
        alerta = True
        accion = f"📦 Pieza lista para entrega sin retirar hace {dias} días. Coordinar despacho con solicitante."
    elif estado == "Observada / requiere ajuste":
        alerta = True
        accion = "⚠️ Caso observado. Requiere resolución de medidas o especificaciones técnicas."

    return {
        "alertaSeguimiento": alerta,
        "accionSugerida": accion,
        "diasCalculados": dias
    }

# ─── AGENTE ORQUESTADOR ────────────────────────────────
def agente_orquestador(row_raw, index):
    """Coordinador general: ejecuta la tubería de los 6 agentes y consolida la salida."""
    ingested = agente_ingestor(row_raw, index)
    normalized = agente_normalizador(ingested)
    classified = agente_clasificador(ingested, normalized)
    prioritized = agente_priorizador(classified, normalized, ingested)
    summarized = agente_resumidor(ingested, normalized, classified, prioritized)
    seguimiento = agente_seguimiento({**ingested, **classified, "estadoCaso": "Nueva solicitud"})

    requiere_revision = (
        (classified["confianzaClasificacion"] < 0.80) or 
        (not normalized["nombreUsuarioNormalizado"] and classified["destinoTipo"] == "Usuario") or
        (prioritized["prioridadIA"] == "Alta" and classified["contextoAtencion"] == "Ambulatorio")
    )

    resultado = {
        **ingested,
        **normalized,
        **classified,
        **prioritized,
        **summarized,
        **seguimiento,
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
        "¿A quién va dirigido el producto impreso?": "Implemento/ayuda técnica entregado a USUARIO ambulatorio",
        "Si la respuesta anterior fue USUARIO indicar: Nombre, Rut, Servicio(Sala-cama)/Lugar de atención (poli Kine/TO/Fono). ": "Luis González, 14.502.812-4, Poli TO",
        "Solicitud personalizada: describir brevemente el equipamiento/ayuda técnica solicitada": "Adaptador universal para cubiertos",
        "Marca temporal": "14/08/2026 08:30:00"
    }

    output = agente_orquestador(sample_row, 1)
    print("\n🤖 Resultado Consolidado por el Orquestador Multiagente:")
    print(json.dumps(output, indent=2, ensure_ascii=False))
