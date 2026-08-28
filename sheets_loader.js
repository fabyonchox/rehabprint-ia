// RehabPrint IA — Cargador de datos reales desde Google Sheets con Pipeline Multiagente IA
// Soporta _ai_agent_analysis pre-procesado en Python y fallback de Agentes JS en navegador.

const ITEM_COLS = [
  { col: 'Adaptador de lápiz con mango (ayuda técnica)', nombre: 'Adaptador de lápiz con mango', tipo: 'Ayuda técnica AVD' },
  { col: 'Adaptador de lápiz tipo pelota  (ayuda técnica)', nombre: 'Adaptador de lápiz pelota', tipo: 'Ayuda técnica AVD' },
  { col: 'Adaptador de cubiertos con mango  (ayuda técnica)', nombre: 'Adaptador de cubiertos con mango', tipo: 'Ayuda técnica AVD' },
  { col: 'Adaptador Universal  (ayuda técnica)', nombre: 'Adaptador Universal (Adulto)', tipo: 'Ayuda técnica AVD' },
  { col: 'Adaptador universal con mango  (ayuda técnica)', nombre: 'Adaptador Universal con Mango (Adulto)', tipo: 'Ayuda técnica AVD' },
  { col: 'Extractor de pastillas   (ayuda técnica)', nombre: 'Extractor de pastillas', tipo: 'Ayuda técnica AVD' },
  { col: 'Adaptador corta uñas   (ayuda técnica)', nombre: 'Adaptador corta uñas', tipo: 'Ayuda técnica AVD' },
  { col: 'Adaptador bolsa de compras  (ayuda técnica)', nombre: 'Adaptador bolsa de compras (Talla S/M/L)', tipo: 'Ayuda técnica AVD' },
  { col: 'Adaptador de llaves  (ayuda técnica)', nombre: 'Adaptador de llaves', tipo: 'Ayuda técnica AVD' },
  { col: 'Abotonador  (ayuda técnica)', nombre: 'Abotonador', tipo: 'Ayuda técnica AVD' },
  { col: 'Cortador de frutas  (ayuda técnica)', nombre: 'Cortador de frutas', tipo: 'Ayuda técnica AVD' },
  { col: 'Abridor de latas (bebidas, atún, jurel, etc)  (ayuda técnica)', nombre: 'Abridor de latas', tipo: 'Ayuda técnica AVD' },
  { col: 'Masajeador de cicatriz (implemento rh)', nombre: 'Masajeador de cicatriz', tipo: 'Implemento de rehabilitación' },
  { col: 'Hand Grip  (implemento rh)', nombre: 'Hand Grip', tipo: 'Implemento de rehabilitación' },
  { col: 'Tablero de motricidad con fósforos   (implemento rh)', nombre: 'Tablero de motricidad con fósforos', tipo: 'Implemento de rehabilitación' },
  { col: '  Tablero extensor de dedos   (implemento rh)', nombre: 'Tablero extensor de dedos', tipo: 'Implemento de rehabilitación' },
  { col: 'Tablero de monedas  (implemento rh)', nombre: 'Tablero de monedas', tipo: 'Implemento de rehabilitación' },
  { col: 'Jenga de gatitos  (implemento rh)', nombre: 'Jenga de gatitos', tipo: 'Implemento de rehabilitación' },
  { col: 'Tazos de discriminación táctil  (implemento rh)', nombre: 'Tazos discriminación táctil', tipo: 'Implemento de rehabilitación' },
  { col: 'Prono-supinador  (implemento rh)', nombre: 'Prono-supinador', tipo: 'Implemento de rehabilitación' },
  { col: 'Finger Grip  (implemento rh)', nombre: 'Finger Grip', tipo: 'Implemento de rehabilitación' },
  { col: 'Encaje de tetris  (implemento rh)', nombre: 'Encaje de tetris', tipo: 'Implemento de rehabilitación' },
  { col: 'Engranaje para mano  (implemento rh)', nombre: 'Engranaje para mano', tipo: 'Implemento de rehabilitación' },
  { col: 'Vasos con pelotitas de colores  (implemento rh)', nombre: 'Vasos con pelotitas de colores', tipo: 'Implemento de rehabilitación' },
  { col: 'Enhebradores de animales   (implemento rh)', nombre: 'Enhebradores de animales', tipo: 'Implemento de rehabilitación' },
  { col: 'Juego tetris (pequeño)  (implemento rh)', nombre: 'Juego tetris pequeño', tipo: 'Implemento de rehabilitación' },
  { col: 'Prueba de la Clavija de Nueve Agujeros (9-HPT)  (implemento rh)', nombre: 'Prueba 9-HPT', tipo: 'Implemento de rehabilitación' },
  { col: 'Soporte de láminas  (ayuda técnica o implemento rh)', nombre: 'Soporte de láminas', tipo: 'Implemento de rehabilitación' },
  { col: 'Ganchos individuales para pared ', nombre: 'Gancho individual para pared', tipo: 'Implemento de rehabilitación' },
  { col: 'Gancho triple para pared', nombre: 'Gancho triple para pared', tipo: 'Implemento de rehabilitación' },
  { col: 'Encaje de figuras geométricas  (implemento rh)', nombre: 'Encaje de figuras geométricas', tipo: 'Implemento de rehabilitación' },
  { col: 'Tablero de monedas ', nombre: 'Tablero de monedas (v2)', tipo: 'Implemento de rehabilitación' },
  { col: 'Adaptador infantil', nombre: 'Adaptador Universal (Infantil)', tipo: 'Ayuda técnica AVD' }
];

// ─── PIPELINE MULTIAGENTE DE IA (IMPLEMENTACIÓN CLIENTE EN JS) ─────────────

function agenteIngestorJS(row, index) {
  const piezas = [];
  const ignoreKeys = new Set([
    "Nombre del funcionario solicitante", "Profesión", "¿A quién va dirigido el producto impreso?",
    "Si la respuesta anterior fue UNIDAD indicar: Unidad y Sala o Poli Kine/TO/Fono ",
    "Si la respuesta anterior fue USUARIO indicar: Nombre, Rut, Servicio(Sala-cama)/Lugar de atención (poli Kine/TO/Fono). ",
    "Marca temporal", "Solicitud personalizada: describir brevemente el equipamiento/ayuda técnica solicitada",
    "_row_index", "_ai_agent_analysis"
  ]);

  for (const k in row) {
    const kLower = k.toLowerCase();
    if (!ignoreKeys.has(k) && row[k] && !kLower.includes('entrega') && !kLower.includes('entregado') && !kLower.includes('espera')) {
      const valStr = String(row[k]).trim();
      const vLower = valStr.toLowerCase();
      if (valStr && !['no', 'no requiero', '0', 'false'].includes(vLower)) {
        let cleanItem = k.split('(')[0].trim();
        if (!['requiero', 'si', 'sí', 'x', 'lo requiero'].includes(vLower)) {
          cleanItem += ` (${valStr.replace(/lo requiero/gi, '').trim()})`;
        }
        piezas.push(cleanItem);
      }
    }
  }

  const personalizada = (row["Solicitud personalizada: describir brevemente el equipamiento/ayuda técnica solicitada"] || "").trim();
  if (personalizada) {
    piezas.push(`Personalizado: ${personalizada.substring(0, 60)}`);
  }

  return {
    id: `RP-${String(index).padStart(3, '0')}`,
    nombreSolicitante: (row["Nombre del funcionario solicitante"] || "—").trim(),
    profesionSolicitante: (row["Profesión"] || "—").trim(),
    destinoTexto: (row["¿A quién va dirigido el producto impreso?"] || "").trim(),
    unidadTexto: (row["Si la respuesta anterior fue UNIDAD indicar: Unidad y Sala o Poli Kine/TO/Fono "] || "").trim(),
    usuarioTexto: (row["Si la respuesta anterior fue USUARIO indicar: Nombre, Rut, Servicio(Sala-cama)/Lugar de atención (poli Kine/TO/Fono). "] || "").trim(),
    personalizadaTexto: personalizada,
    piezasDetectadas: piezas,
    fechaMarca: row["Marca temporal"] || new Date().toLocaleString("es-CL")
  };
}

function agenteNormalizadorJS(ingested) {
  const prof = ingested.profesionSolicitante.toLowerCase();
  let area = "Otra";
  if (prof.includes("ocupacional") || prof.includes("to")) area = "Terapia Ocupacional";
  else if (prof.includes("kinesi") || prof.includes("kine")) area = "Kinesiología";
  else if (prof.includes("fono")) area = "Fonoaudiología";

  const usuarioRaw = ingested.usuarioTexto;
  let rut = "";
  let nombreUser = "";
  let ubicacion = "";

  if (usuarioRaw) {
    const rutRegex = /\b\d{1,2}(?:\.\d{3}){2}-?[\dkK]\b|\b\d{7,8}-?[\dkK]\b/;
    const match = usuarioRaw.match(rutRegex);
    if (match) {
      rut = match[0];
      const idx = usuarioRaw.indexOf(rut);
      nombreUser = usuarioRaw.substring(0, idx).replace(/[\s;:,,\-]*\brut\b[\s;:,,\-]*$/gi, '').replace(/[\s;:,,\-]+$/, '').trim();
      ubicacion = usuarioRaw.substring(idx + rut.length).replace(/^[\s;:,,\-]+/, '').trim();
    } else {
      const parts = usuarioRaw.split(/[,;]/).map(p => p.trim()).filter(Boolean);
      nombreUser = parts[0] || "";
      if (parts.length > 1) rut = parts[1] || "";
      if (parts.length > 2) ubicacion = parts.slice(2).join(", ");
    }
  }

  return {
    areaSolicitante: area,
    nombreUsuarioNormalizado: nombreUser || "Paciente",
    rutUsuarioNormalizado: rut,
    ubicacionNormalizada: ubicacion,
    solicitudPersonalizada: ingested.personalizadaTexto
  };
}

function agenteClasificadorJS(ingested, normalized) {
  const destLower = ingested.destinoTexto.toLowerCase();
  const destinoTipo = (destLower.includes("unidad") || destLower.includes("stock") || destLower.includes("servicio")) ? "Unidad" : "Usuario";

  let contexto = "Hospitalizado";
  if (destLower.includes("cerrada") || destLower.includes("uci") || destLower.includes("hospitaliz") || destLower.includes("cama")) {
    contexto = "Unidad cerrada";
  } else if (destLower.includes("ambulatorio") || destLower.includes("poli")) {
    contexto = "Ambulatorio";
  }

  let categoria = "Ayuda técnica AVD";
  if (normalized.solicitudPersonalizada) {
    categoria = "Pieza personalizada";
  } else if (destinoTipo === "Unidad") {
    categoria = "Stock de unidad";
  } else {
    categoria = "Ayuda técnica AVD";
  }

  const confianza = (destinoTipo && contexto) ? 0.92 : 0.70;

  return {
    destinoTipo,
    contextoAtencion: contexto,
    categoriaFuncional: categoria,
    confianzaClasificacion: confianza
  };
}

function agentePriorizadorJS(classified, normalized) {
  const contexto = classified.contextoAtencion;
  const tieneRut = Boolean(normalized.rutUsuarioNormalizado && /\d/.test(normalized.rutUsuarioNormalizado));

  let prioridad = "Media";
  let motivo = "Atención estándar de rehabilitación.";

  if (contexto === "Unidad cerrada") {
    prioridad = "Alta";
    motivo = "Usuario en Unidad Crítica o atención cerrada urgente.";
  } else if (tieneRut || contexto === "Hospitalizado") {
    prioridad = "Alta";
    motivo = "Usuario hospitalizado con RUT registrado o atención directa requerida.";
  } else if (classified.destinoTipo === "Unidad") {
    prioridad = "Media";
    motivo = "Stock o equipamiento para unidad clínica.";
  } else {
    prioridad = "Media";
    motivo = "Atención ambulatoria estándar.";
  }

  return {
    prioridadIA: prioridad,
    motivoPrioridad: motivo,
    confianzaPrioridad: 0.88
  };
}

function agenteResumidorJS(ingested, normalized, classified, prioritized) {
  const target = classified.destinoTipo === "Usuario" ? normalized.nombreUsuarioNormalizado : (ingested.unidadTexto || "Unidad");
  const resumen = `${classified.destinoTipo} (${target}) | Contexto: ${classified.contextoAtencion} | Categoría: ${classified.categoriaFuncional} | Prioridad: ${prioritized.prioridadIA}`;
  return { resumenIA: resumen };
}

function agenteSeguimientoJS(row, index) {
  const dias = parseInt(row['1° Tiempo de Espera '] || row['1ª Tiempo de Espera '] || row['1a Tiempo de Espera '] || '0') || 0;
  let alerta = false;
  let accion = "Caso en flujo normal";

  if (dias > 5) {
    alerta = true;
    accion = `⚠️ Caso en espera por ${dias} días. Revisar asignación de impresoras 3D.`;
  } else if (dias > 3) {
    alerta = true;
    accion = `⚠️ Caso requiere moderación prioritaria (${dias} días transcurridos).`;
  }

  return {
    alertaSeguimiento: alerta,
    accionSugerida: accion
  };
}

function agenteOrquestadorJS(row, index) {
  if (row._ai_agent_analysis) return row._ai_agent_analysis;

  const ingested = agenteIngestorJS(row, index);
  const normalized = agenteNormalizadorJS(ingested);
  const classified = agenteClasificadorJS(ingested, normalized);
  const prioritized = agentePriorizadorJS(classified, normalized);
  const summarized = agenteResumidorJS(ingested, normalized, classified, prioritized);
  const seguimiento = agenteSeguimientoJS(row, index);

  const requiereRevision = (classified.confianzaClasificacion < 0.80) || (!normalized.nombreUsuarioNormalizado && classified.destinoTipo === "Usuario");

  return {
    ...ingested,
    ...normalized,
    ...classified,
    ...prioritized,
    ...summarized,
    ...seguimiento,
    requiereRevisionManual: requiereRevision,
    timestampProcesado: new Date().toISOString()
  };
}

// ─── MAPEO DE ROW DE GOOGLE SHEETS A SOLICITUD DE LA APP ─────────────────────

function rowToSolicitud(row, index) {
  const id = `RP-${String(index).padStart(3, '0')}`;
  
  // Ejecutar u obtener el análisis consolidado de los 7 Agentes IA
  const ai = agenteOrquestadorJS(row, index);

  // Cargar anulaciones locales (estado / responsable)
  const localStates = JSON.parse(localStorage.getItem('rehabprint_states') || '{}');
  const localAssignees = JSON.parse(localStorage.getItem('rehabprint_assignees') || '{}');

  const piezas = ai.piezasDetectadas && ai.piezasDetectadas.length > 0
    ? ai.piezasDetectadas
    : [row['Solicitud personalizada: describir brevemente el equipamiento/ayuda técnica solicitada'] || 'Pieza 3D'];

  const piezaNormalizada = piezas.length === 0 ? 'Sin especificar' :
    piezas.length === 1 ? piezas[0] :
    piezas.slice(0, 2).join(' + ') + (piezas.length > 2 ? ` (+${piezas.length - 2} más)` : '');

  // Formato de fecha
  let fechaStr = row['Marca temporal'] || ai.fechaMarca || '';
  try {
    const parts = fechaStr.split(' ')[0].split('/');
    if (parts.length === 3) fechaStr = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  } catch(e) {}

  // Determinar estado inicial o de la nube
  let estado = localStates[id];
  if (!estado) {
    const entrega1 = row['1° FECHA DE ENTREGA'] || row['1ª FECHA DE ENTREGA'] || row['1a FECHA DE ENTREGA'] || '';
    const entrega2 = row['2° FECHA DE ENTREGA'] || row['2ª FECHA DE ENTREGA'] || row['2a FECHA DE ENTREGA'] || '';
    const entrega3 = row['3° FECHA DE ENTREGA'] || row['3ª FECHA DE ENTREGA'] || row['3a FECHA DE ENTREGA'] || '';
    
    const totalEntregados = row['TOTAL IMPLEMENTOS ENTREGADOS '] || row['TOTAL IMPLEMENTOS ENTREGADOS'] || '';
    const totalEntregadosNum = parseInt(String(totalEntregados).trim()) || 0;
    
    estado = typeof ESTADOS !== 'undefined' ? ESTADOS.NUEVA : 'Nueva solicitud';
    if (entrega1 || entrega2 || entrega3 || (String(totalEntregados).trim() !== '' && String(totalEntregados).trim() !== '0' && totalEntregadosNum > 0)) {
      estado = typeof ESTADOS !== 'undefined' ? ESTADOS.ENTREGADA : 'Entregada';
    }
  }

  let responsable = localAssignees[id];
  if (!responsable) {
    for (const key of Object.keys(row)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('responsable') || lowerKey.includes('asignado') || lowerKey.includes('moderador') || lowerKey.includes('encargado')) {
        responsable = row[key] || '';
        break;
      }
    }
  }
  if (!responsable && estado === (typeof ESTADOS !== 'undefined' ? ESTADOS.ENTREGADA : 'Entregada')) {
    responsable = 'Team 3D';
  }

  const tiempoEspera = parseInt(row['1° Tiempo de Espera '] || row['1ª Tiempo de Espera '] || row['1a Tiempo de Espera '] || '0') || 0;

  return {
    id,
    fechaSolicitud: fechaStr,
    fuenteRegistro: 'Google Sheets (Live AI Pipeline)',
    nombreSolicitante: ai.nombreSolicitante || row['Nombre del funcionario solicitante'] || '—',
    profesion: ai.profesionSolicitante || row['Profesión'] || '—',
    area: ai.areaSolicitante || 'Otra',
    destinoTipo: ai.destinoTipo || 'Usuario',
    contexto: ai.contextoAtencion || 'Ambulatorio',
    unidadDestino: ai.unidadTexto || row['Si la respuesta anterior fue UNIDAD indicar: Unidad y Sala o Poli Kine/TO/Fono '] || '',
    nombreUsuario: ai.nombreUsuarioNormalizado || '',
    rutUsuario: ai.rutUsuarioNormalizado || '',
    servicioSalaCama: ai.ubicacionNormalizada || '',
    descripcionOriginal: piezas.join(', '),
    piezasList: piezas,
    categoriaIA: ai.categoriaFuncional || 'Ayuda técnica AVD',
    piezaNormalizada,
    prioridadIA: ai.prioridadIA || 'Media',
    motivoPrioridad: ai.motivoPrioridad || 'Atención estándar',
    resumenIA: ai.resumenIA || `${ai.destinoTipo} (${ai.nombreUsuarioNormalizado || 'Unidad'})`,
    confianzaClasificacion: ai.confianzaClasificacion || 0.85,
    requiereRevisionManual: Boolean(ai.requiereRevisionManual),
    alertaSeguimiento: Boolean(ai.alertaSeguimiento),
    accionSugerida: ai.accionSugerida || 'En flujo normal',
    estadoCaso: estado,
    responsableActual: responsable || null,
    fechaEntrega: row['1° FECHA DE ENTREGA'] || row['1ª FECHA DE ENTREGA'] || row['1a FECHA DE ENTREGA'] || row['2° FECHA DE ENTREGA'] || row['2ª FECHA DE ENTREGA'] || row['2a FECHA DE ENTREGA'] || row['3° FECHA DE ENTREGA'] || row['3ª FECHA DE ENTREGA'] || row['3a FECHA DE ENTREGA'] || '',
    implementosEntregados: row['TOTAL IMPLEMENTOS ENTREGADOS '] || row['TOTAL IMPLEMENTOS ENTREGADOS'] || '',
    tiempoEsperaDias: tiempoEspera,
    observacionesClinicas: '',
    observacionesTecnicas: '',
    _ai_agent_analysis: ai,
    _raw: row
  };
}

async function loadLiveData() {
  let targetData = typeof liveData !== 'undefined' ? liveData : null;

  try {
    const res = await fetch(`live_data.json?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      targetData = await res.json();
      window.liveData = targetData;
    }
  } catch (err) {
    console.warn('[RehabPrint] Fetch live_data.json falló, usando fallback en memoria:', err.message);
  }

  if (!targetData || !targetData.records) {
    console.warn('[RehabPrint] liveData no está disponible.');
    return false;
  }

  try {
    // Reemplazar solicitudes con datos reales procesados por los Agentes IA (descartando eliminados)
    const deletedIds = JSON.parse(localStorage.getItem('rehabprint_deleted_ids') || '[]');
    solicitudes.length = 0;
    targetData.records.forEach((row, i) => {
      const sol = rowToSolicitud(row, i + 1);
      if (!deletedIds.includes(sol.id) && sol.estadoCaso !== (typeof ESTADOS !== 'undefined' ? ESTADOS.CANCELADA : 'Cancelada')) {
        solicitudes.push(sol);
      }
    });

    // Mostrar banner de éxito
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;bottom:70px;right:20px;background:#007F3B;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2)';
    banner.innerHTML = `🤖 ${targetData.records.length} registros cargados con Pipeline IA · ${(targetData.last_sync || '').slice(0,16).replace('T',' ')}`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 4000);

    // Refrescar vista
    if (typeof navigate === 'function' && typeof currentView !== 'undefined') navigate(currentView);
    if (typeof updateNavBadges === 'function') updateNavBadges();
    console.log(`[RehabPrint] ${targetData.records.length} registros cargados desde liveData procesados por 7 Agentes IA.`);
    return true;
  } catch (e) {
    console.error('[RehabPrint] Error al parsear liveData:', e.message);
    return false;
  }
}
