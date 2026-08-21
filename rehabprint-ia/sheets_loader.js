// RehabPrint IA — Cargador de datos reales desde Google Sheets
// Lee live_data.js (bypassea restricciones CORS locales)

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
  { col: 'Adaptador infantil', nombre: 'Adaptador Universal (Infantil)', tipo: 'Ayuda técnica AVD' },
];

function clasificarDestino(texto) {
  if (!texto) return 'Usuario';
  const t = texto.toLowerCase();
  if (t.includes('unidad') || t.includes('stock') || t.includes('servicio')) return 'Unidad';
  return 'Usuario';
}

function clasificarContexto(texto) {
  if (!texto) return 'Ambulatorio';
  const t = texto.toLowerCase();
  if (t.includes('cerrada') || t.includes('uci') || t.includes('hospitaliz') || t.includes('sala') || t.includes('cama')) return 'Unidad cerrada';
  if (t.includes('ambulatorio') || t.includes('poli')) return 'Ambulatorio';
  return 'Hospitalizado';
}

function clasificarArea(prof) {
  if (!prof) return 'Otra';
  const p = prof.toLowerCase();
  if (p.includes('ocupacional') || p.includes('to') || p.includes('t.o')) return 'Terapia Ocupacional';
  if (p.includes('kinesi') || p.includes('kine')) return 'Kinesiología';
  if (p.includes('fonoa') || p.includes('fono')) return 'Fonoaudiología';
  return 'Otra';
}

function detectarPiezas(row) {
  if (row._ai_agent_analysis && Array.isArray(row._ai_agent_analysis.piezasDetectadas) && row._ai_agent_analysis.piezasDetectadas.length > 0) {
    return row._ai_agent_analysis.piezasDetectadas;
  }
  const piezas = [];
  for (const item of ITEM_COLS) {
    const rawVal = row[item.col];
    if (rawVal !== undefined && rawVal !== null) {
      const valStr = String(rawVal).trim();
      const vLower = valStr.toLowerCase();
      if (valStr && vLower !== 'no' && vLower !== 'no requiero' && vLower !== '0' && vLower !== 'false') {
        let nombrePieza = item.nombre;
        if (vLower !== 'requiero' && vLower !== 'si' && vLower !== 'sí' && vLower !== 'x') {
          nombrePieza += ` (${valStr})`;
        }
        piezas.push(nombrePieza);
      }
    }
  }
  const personalizada = row['Solicitud personalizada: describir brevemente el equipamiento/ayuda t\u00e9cnica solicitada'];
  if (personalizada && personalizada.trim()) piezas.push('Personalizado: ' + personalizada.trim().substring(0, 60));
  return piezas;
}

function sugerirPrioridad(contexto, destino, piezas, tieneRut, observaciones) {
  // Alta: unidad crítica, hospitalizado con urgencia, o continuidad de tratamiento comprometida
  if (contexto === 'Unidad cerrada') return 'Alta';
  
  // Buscar palabras clave de urgencia en observaciones o descripción
  const urgenciaKeywords = ['urgente', 'urgencia', 'inmediato', 'alta programada', 'protocolo', 'post-cirug', 'post cirug', 'postquirurg', 'uci'];
  const obsText = (observaciones || '').toLowerCase();
  const esUrgente = urgenciaKeywords.some(k => obsText.includes(k));
  if (contexto === 'Hospitalizado' && esUrgente) return 'Alta';
  
  // Media: hospitalizado sin urgencia explícita, ambulatorio con necesidad funcional relevante, o stock importante
  if (contexto === 'Hospitalizado') return 'Media';
  if (piezas.length > 5) return 'Media';
  if (destino === 'Unidad') return 'Media';
  
  // Baja: reposición programable, pedido no urgente, material no ligado a necesidad inmediata
  return 'Baja';
}

function rowToSolicitud(row, index) {
  const id = `RP-${String(index).padStart(3, '0')}`;
  
  // Load local overrides
  const localStates = JSON.parse(localStorage.getItem('rehabprint_states') || '{}');
  const localAssignees = JSON.parse(localStorage.getItem('rehabprint_assignees') || '{}');

  const destino = clasificarDestino(row['¿A quién va dirigido el producto impreso?'] || '');
  const contexto = clasificarContexto(row['¿A quién va dirigido el producto impreso?'] || '');
  const area = clasificarArea(row['Profesión'] || '');
  const piezas = detectarPiezas(row);
  const tieneTipoRH = piezas.some(p => ITEM_COLS.find(c => c.nombre === p && c.tipo === 'Implemento de rehabilitación'));
  const tieneAVD = piezas.some(p => ITEM_COLS.find(c => c.nombre === p && c.tipo === 'Ayuda técnica AVD'));
  const esPersonalizada = piezas.some(p => p.startsWith('Personalizado:'));

  let categoria = 'Implemento de rehabilitación';
  if (esPersonalizada) categoria = 'Pieza personalizada';
  else if (tieneAVD && tieneTipoRH) categoria = 'Stock de unidad';
  else if (tieneAVD) categoria = 'Ayuda técnica AVD';

  const piezaNormalizada = piezas.length === 0 ? 'Sin especificar' :
    piezas.length === 1 ? piezas[0] :
    piezas.slice(0, 2).join(' + ') + (piezas.length > 2 ? ` (+${piezas.length - 2} más)` : '');

  // Fecha: "10/04/2025 11:58:57" → "2025-04-10"
  let fechaStr = row['Marca temporal'] || '';
  try {
    const parts = fechaStr.split(' ')[0].split('/');
    if (parts.length === 3) fechaStr = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  } catch(e) {}

  const unidadTexto = row['Si la respuesta anterior fue UNIDAD indicar: Unidad y Sala o Poli Kine/TO/Fono '] || '';
  const usuarioTexto = row['Si la respuesta anterior fue USUARIO indicar: Nombre, Rut, Servicio(Sala-cama)/Lugar de atención (poli Kine/TO/Fono). '] || '';

  let nombreUsuario = '';
  let rutUsuario = '';
  let servicioSalaCama = '';

  if (destino === 'Usuario' && usuarioTexto.trim()) {
    // Tolerant regex for Chile RUTs
    const rutRegex = /\b\d{1,2}(?:\.\d{3}){2}-?[\dkK]\b|\b\d{7,8}-?[\dkK]\b|\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]\b|\b\d{1,2}(?:\.\d{3}){2}\b|\b\d{7,8}\b/;
    const cleanText = usuarioTexto.replace(/\brut\b/gi, ' ').replace(/rut(?=\d)/gi, ' ').trim();
    const match = cleanText.match(rutRegex);
    if (match) {
      rutUsuario = match[0];
      const idx = cleanText.indexOf(rutUsuario);
      let prefix = cleanText.substring(0, idx).trim();
      prefix = prefix.replace(/[\/:\s,\t\-\;]+$/, '').trim();
      nombreUsuario = prefix || 'Paciente';

      let suffix = cleanText.substring(idx + rutUsuario.length).trim();
      suffix = suffix.replace(/^[\/:\s,\t\-\;]+/, '').trim();
      servicioSalaCama = suffix;
    } else {
      const parts = usuarioTexto.split(/[,;]/).map(p => p.trim());
      nombreUsuario = parts[0] || '';
      if (parts.length > 1) {
        rutUsuario = parts[1] || '';
        servicioSalaCama = parts.slice(2).join(', ').trim() || '';
      }
    }
    nombreUsuario = nombreUsuario.replace(/[\/\s\-\;:,\.]+(rut)?$/gi, '').trim();
    servicioSalaCama = servicioSalaCama.replace(/^[\/\s\-,;\:]+/, '').trim();
  }

  // Check priority: High if has RUT (meaning rutUsuario contains numbers)
  const tieneRut = rutUsuario && /\d/.test(rutUsuario);
  const prioridad = tieneRut ? 'Alta' : sugerirPrioridad(contexto, destino, piezas, tieneRut);

  // Determinar estado basado en local overrides, luego columnas de entrega o cantidad entregada
  let estado = localStates[id];
  if (!estado) {
    const entrega1 = row['1° FECHA DE ENTREGA'] || row['1ª FECHA DE ENTREGA'] || row['1a FECHA DE ENTREGA'] || '';
    const entrega2 = row['2° FECHA DE ENTREGA'] || row['2ª FECHA DE ENTREGA'] || row['2a FECHA DE ENTREGA'] || '';
    const entrega3 = row['3° FECHA DE ENTREGA'] || row['3ª FECHA DE ENTREGA'] || row['3a FECHA DE ENTREGA'] || '';
    
    const totalEntregados = row['TOTAL IMPLEMENTOS ENTREGADOS '] || row['TOTAL IMPLEMENTOS ENTREGADOS'] || '';
    const totalEntregadosNum = parseInt(String(totalEntregados).trim()) || 0;
    
    estado = ESTADOS.NUEVA;
    if (entrega1 || entrega2 || entrega3 || (String(totalEntregados).trim() !== '' && String(totalEntregados).trim() !== '0' && totalEntregadosNum > 0)) {
      estado = ESTADOS.ENTREGADA;
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
  if (!responsable && estado === ESTADOS.ENTREGADA) {
    responsable = 'Team 3D';
  }

  const tiempoEspera = parseInt(row['1° Tiempo de Espera '] || row['1ª Tiempo de Espera '] || row['1a Tiempo de Espera '] || '0') || 0;

  return {
    id,
    fechaSolicitud: fechaStr,
    fuenteRegistro: 'Google Sheets (Live)',
    nombreSolicitante: row['Nombre del funcionario solicitante'] || '—',
    profesion: row['Profesión'] || '—',
    area,
    destinoTipo: destino,
    contexto,
    unidadDestino: unidadTexto,
    nombreUsuario,
    rutUsuario,
    servicioSalaCama,
    descripcionOriginal: piezas.join(', ') || usuarioTexto || unidadTexto,
    piezasList: piezas,
    categoriaIA: categoria,
    piezaNormalizada,
    prioridadIA: prioridad,
    resumenIA: `${destino === 'Unidad' ? `Solicitud para ${unidadTexto || 'unidad'}` : `Paciente ${contexto.toLowerCase()}`}. ${piezas.length} implemento(s): ${piezaNormalizada}.`,
    estadoCaso: estado,
    responsableActual: responsable || null,
    fechaEntrega: row['1° FECHA DE ENTREGA'] || row['1ª FECHA DE ENTREGA'] || row['1a FECHA DE ENTREGA'] || row['2° FECHA DE ENTREGA'] || row['2ª FECHA DE ENTREGA'] || row['2a FECHA DE ENTREGA'] || row['3° FECHA DE ENTREGA'] || row['3ª FECHA DE ENTREGA'] || row['3a FECHA DE ENTREGA'] || '',
    implementosEntregados: row['TOTAL IMPLEMENTOS ENTREGADOS '] || row['TOTAL IMPLEMENTOS ENTREGADOS'] || '',
    tiempoEsperaDias: tiempoEspera,
    observacionesClinicas: '',
    observacionesTecnicas: '',
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
    // Reemplazar solicitudes con datos reales
    solicitudes.length = 0;
    targetData.records.forEach((row, i) => {
      solicitudes.push(rowToSolicitud(row, i + 1));
    });

    // Mostrar banner de éxito
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;bottom:70px;right:20px;background:#007F3B;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2)';
    banner.innerHTML = `✅ ${targetData.records.length} registros cargados desde Google Sheets · ${(targetData.last_sync || '').slice(0,16).replace('T',' ')}`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 4000);

    // Refrescar vista
    if (typeof navigate === 'function' && typeof currentView !== 'undefined') navigate(currentView);
    if (typeof updateNavBadges === 'function') updateNavBadges();
    console.log(`[RehabPrint] ${targetData.records.length} registros cargados desde liveData.`);
    return true;
  } catch (e) {
    console.error('[RehabPrint] Error al parsear liveData:', e.message);
    return false;
  }
}
