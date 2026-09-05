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

function anonymizeRutJS(rutStr) {
  if (!rutStr) return "";
  const clean = String(rutStr).replace(/[^0-9kK]/g, '');
  if (clean.length < 7) return "***";
  const dv = clean.slice(-1);
  const cuerpo = clean.slice(0, -1);
  const prefixLen = Math.max(1, cuerpo.length - 6);
  const prefijo = cuerpo.slice(0, prefixLen);
  return `${prefijo}.***.***-${dv}`;
}

function anonymizeNameJS(nameStr) {
  if (!nameStr) return "Paciente";
  const parts = String(nameStr).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Paciente";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

function isMetadataKeyJS(k) {
  const kl = String(k).toLowerCase().trim();
  return (
    kl.startsWith('_') ||
    kl.includes('funcionario') || kl.includes('solicitante') ||
    kl.includes('profesi') ||
    kl.includes('dirigido') ||
    kl.includes('indicar') ||
    kl.includes('marca temporal') || kl.includes('timestamp') ||
    kl.includes('personalizada') ||
    kl.includes('entrega') || kl.includes('entregado') ||
    kl.includes('espera') || kl.includes('catastro')
  );
}

function getRowValJS(row, ...keywords) {
  for (const k in row) {
    const kl = String(k).toLowerCase().trim();
    if (keywords.some(kw => kl.includes(kw))) {
      return String(row[k]).trim();
    }
  }
  return "";
}

function agenteIngestorJS(row, index) {
  const piezas = [];

  for (const k in row) {
    if (!isMetadataKeyJS(k) && row[k]) {
      const valStr = String(row[k]).trim();
      const vLower = valStr.toLowerCase();
      if (valStr && !['no', 'no requiero', '0', 'false', '—', '-'].includes(vLower)) {
        let cleanItem = k.split('(')[0].trim();
        if (!['requiero', 'si', 'sí', 'x', 'lo requiero'].includes(vLower)) {
          cleanItem += ` (${valStr.replace(/lo requiero/gi, '').trim()})`;
        }
        piezas.push(cleanItem);
      }
    }
  }

  const personalizada = getRowValJS(row, "personalizada");
  if (personalizada) {
    piezas.push(`Personalizado: ${personalizada.substring(0, 60)}`);
  }

  return {
    id: `RP-${String(index).padStart(3, '0')}`,
    nombreSolicitante: getRowValJS(row, "funcionario", "solicitante") || "—",
    profesionSolicitante: getRowValJS(row, "profesi") || "—",
    destinoTexto: getRowValJS(row, "dirigido"),
    unidadTexto: getRowValJS(row, "unidad indicar"),
    usuarioTexto: getRowValJS(row, "usuario indicar"),
    personalizadaTexto: personalizada,
    piezasDetectadas: piezas,
    fechaMarca: getRowValJS(row, "marca temporal", "timestamp") || new Date().toLocaleString("es-CL")
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

  const nombreFinal = nombreUser || "Paciente";
  const rutAnon = anonymizeRutJS(rut);
  const nombreAnon = anonymizeNameJS(nombreFinal);

  return {
    areaSolicitante: area,
    nombreUsuarioNormalizado: nombreFinal,
    nombreUsuarioAnonimizado: nombreAnon,
    rutUsuarioNormalizado: rut,
    rutUsuarioAnonimizado: rutAnon,
    ubicacionNormalizada: ubicacion,
    solicitudPersonalizada: ingested.personalizadaTexto
  };
}

function agenteClasificadorJS(ingested, normalized) {
  const destLower = ingested.destinoTexto.toLowerCase();
  const ubicacionLower = normalized.ubicacionNormalizada.toLowerCase();
  const unidadLower = ingested.unidadTexto.toLowerCase();
  const combinedContext = `${destLower} ${ubicacionLower} ${unidadLower}`;

  const destinoTipo = (destLower.includes("unidad") || destLower.includes("stock") || destLower.includes("servicio")) ? "Unidad" : "Usuario";

  let contexto = "Ambulatorio";
  if (["cerrada", "uci", "uti", "pabellón", "pabellon", "quirúrgic", "quirurgic"].some(k => combinedContext.includes(k))) {
    contexto = "Unidad cerrada";
  } else if (["ambulatorio", "poli"].some(k => combinedContext.includes(k))) {
    contexto = "Ambulatorio";
  } else if (["cama", "sala", "hospitaliz", "medicina interna", "neurología", "traumatología"].some(k => combinedContext.includes(k))) {
    contexto = "Hospitalizado";
  } else {
    contexto = destinoTipo === "Usuario" ? "Ambulatorio" : "Hospitalizado";
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

function agentePriorizadorJS(classified, normalized, ingested) {
  const contexto = classified.contextoAtencion;
  const destino = classified.destinoTipo;
  const piezasStr = (ingested.piezasDetectadas || []).join(' ').toLowerCase();
  const descRaw = `${ingested.personalizadaTexto || ''} ${ingested.usuarioTexto || ''}`.toLowerCase();

  const esUrgenteTexto = ["urgente", "alta programada", "inmediato", "48h", "protocolo"].some(w => descRaw.includes(w));
  const esLudicoDiferible = ["jenga", "tetris", "enhebrador", "tazos", "encaje", "vasos", "gancho"].some(w => piezasStr.includes(w));

  let prioridad = "Media";
  let motivo = "Usuario ambulatorio en plan de rehabilitación funcional (AVD / apoyo motor).";
  let confianza = 0.88;

  if (contexto === "Unidad cerrada") {
    prioridad = "Alta";
    motivo = "Usuario o unidad crítica en atención cerrada con necesidad funcional urgente.";
    confianza = 0.95;
  } else if (contexto === "Hospitalizado" && (esUrgenteTexto || descRaw.includes("cama") || descRaw.includes("sala"))) {
    prioridad = "Alta";
    motivo = "Usuario hospitalizado en sala-cama con requerimiento funcional inmediato para estadía o alta.";
    confianza = 0.90;
  } else if (esUrgenteTexto) {
    prioridad = "Alta";
    motivo = "Indicación de urgencia clínica expresa en la solicitud.";
    confianza = 0.88;
  } else if (esLudicoDiferible && destino === "Unidad") {
    prioridad = "Baja";
    motivo = "Material lúdico-terapéutico o stock programable no vinculado a urgencia inmediata.";
    confianza = 0.85;
  } else if (destino === "Unidad" && classified.categoriaFuncional.toLowerCase().includes("stock")) {
    prioridad = "Media";
    motivo = "Stock clínico de rotación habitual para servicio de rehabilitación.";
    confianza = 0.85;
  }

  return {
    prioridadIA: prioridad,
    motivoPrioridad: motivo,
    confianzaPrioridad: confianza
  };
}

function agenteResumidorJS(ingested, normalized, classified, prioritized) {
  const target = classified.destinoTipo === "Usuario" ? normalized.nombreUsuarioAnonimizado : (ingested.unidadTexto || "Unidad");
  const resumen = `${classified.destinoTipo} (${target}) | Contexto: ${classified.contextoAtencion} | Categoría: ${classified.categoriaFuncional} | Prioridad: ${prioritized.prioridadIA}`;
  return { resumenIA: resumen };
}

function agenteSeguimientoJS(row, index) {
  let dias = parseInt(row['1° Tiempo de Espera '] || row['1ª Tiempo de Espera '] || row['1a Tiempo de Espera '] || row['1° Tiempo de Espera'] || '0') || 0;
  
  const fechaStr = row['Marca temporal'] || row['fechaSolicitud'] || '';
  if (dias === 0 && fechaStr) {
    try {
      const parts = fechaStr.split(' ')[0].split(/[\/\-]/);
      if (parts.length === 3) {
        let dt;
        if (parts[0].length === 4) dt = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
        else dt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(dt.getTime())) {
          dias = Math.max(0, Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24)));
        }
      }
    } catch(e) {}
  }

  let alerta = false;
  let accion = "En flujo normal de producción.";

  if (dias > 5) {
    alerta = true;
    accion = `⚠️ Solicitud sin avance durante ${dias} días. Verificar asignación de impresora 3D.`;
  } else if (dias > 3) {
    alerta = true;
    accion = `⚠️ Caso requiere moderación prioritaria (${dias} días transcurridos).`;
  }

  return {
    alertaSeguimiento: alerta,
    accionSugerida: accion,
    diasCalculados: dias
  };
}

function agenteOrquestadorJS(row, index) {
  if (row._ai_agent_analysis) return row._ai_agent_analysis;

  const ingested = agenteIngestorJS(row, index);
  const normalized = agenteNormalizadorJS(ingested);
  const classified = agenteClasificadorJS(ingested, normalized);
  const prioritized = agentePriorizadorJS(classified, normalized, ingested);
  const summarized = agenteResumidorJS(ingested, normalized, classified, prioritized);
  const seguimiento = agenteSeguimientoJS(row, index);

  const requiereRevision = (classified.confianzaClasificacion < 0.80) || 
    (!normalized.nombreUsuarioNormalizado && classified.destinoTipo === "Usuario") ||
    (prioritized.prioridadIA === "Alta" && classified.contextoAtencion === "Ambulatorio");

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
    nombreUsuario: ai.nombreUsuarioAnonimizado || ai.nombreUsuarioNormalizado || '',
    rutUsuario: ai.rutUsuarioAnonimizado || ai.rutUsuarioNormalizado || '',
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
