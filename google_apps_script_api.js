// ═══════════════════════════════════════════════════════
// RehabPrint IA — Google Apps Script API v2
// Soporta: Web App + App Android (clinicalsuite-rehabprint)
// Sheet ID: 1Gd-M3J_kRd0M6aXBTi4LivVAXWrLMZ9JWluWxkX6Gcg
// ═══════════════════════════════════════════════════════

const SHEET_ID          = '1Gd-M3J_kRd0M6aXBTi4LivVAXWrLMZ9JWluWxkX6Gcg';
const SHEET_INVENTARIO  = 'INVENTARIO';
const SHEET_ESTADOS     = 'ESTADOS';
const SHEET_SOLICITUDES = 'SOLICITUDES';

// ─── Helper de respuesta JSON ─────────────────────────
function setCORSHeaders(output) {
  return output.setMimeType(ContentService.MimeType.JSON);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}


// ─── GET: Leer datos ─────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'getInventory') {
      return setCORSHeaders(
        ContentService.createTextOutput(
          JSON.stringify({ ok: true, data: getInventory() })
        )
      );
    }
    if (action === 'getStates') {
      return setCORSHeaders(
        ContentService.createTextOutput(
          JSON.stringify({ ok: true, data: getStates() })
        )
      );
    }
    if (action === 'getSolicitudes') {
      return setCORSHeaders(
        ContentService.createTextOutput(
          JSON.stringify({ ok: true, data: getSolicitudes() })
        )
      );
    }
    // Health check para verificar conexión desde Android
    if (action === 'ping') {
      return setCORSHeaders(
        ContentService.createTextOutput(
          JSON.stringify({ ok: true, msg: 'RehabPrint API v2 activa', ts: new Date().toISOString() })
        )
      );
    }
    return setCORSHeaders(
      ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Acción no reconocida: ' + action }))
    );
  } catch(err) {
    return setCORSHeaders(
      ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
    );
  }
}

// ─── POST: Escribir datos ─────────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action  = payload.action;

    if (action === 'updateInventory') {
      saveInventory(payload.inventory);
      return setCORSHeaders(
        ContentService.createTextOutput(JSON.stringify({ ok: true, msg: 'Inventario guardado' }))
      );
    }
    if (action === 'updateState') {
      saveState(payload.id, payload.estado, payload.responsable, payload.moderator);
      return setCORSHeaders(
        ContentService.createTextOutput(JSON.stringify({ ok: true, msg: 'Estado actualizado' }))
      );
    }
    if (action === 'saveSolicitud') {
      saveSolicitud(payload.solicitud);
      return setCORSHeaders(
        ContentService.createTextOutput(JSON.stringify({ ok: true, msg: 'Solicitud guardada' }))
      );
    }
    if (action === 'updateStock') {
      updateStockItem(payload.id, payload.delta);
      return setCORSHeaders(
        ContentService.createTextOutput(JSON.stringify({ ok: true, msg: 'Stock actualizado' }))
      );
    }
    return setCORSHeaders(
      ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Acción no reconocida' }))
    );
  } catch(err) {
    return setCORSHeaders(
      ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
    );
  }
}

// ─── INVENTARIO ───────────────────────────────────────────
function getInventory() {
  const ss   = SpreadsheetApp.openById(SHEET_ID);
  let sheet  = ss.getSheetByName(SHEET_INVENTARIO);
  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  return rows.slice(1).map(r => ({
    id:       r[0],
    nombre:   r[1],
    categoria:r[2],
    stock:    Number(r[3]) || 0,
    minStock: Number(r[4]) || 2
  }));
}

function saveInventory(items) {
  const ss  = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_INVENTARIO);
  if (!sheet) sheet = ss.insertSheet(SHEET_INVENTARIO);

  sheet.clearContents();
  sheet.appendRow(['ID', 'Nombre', 'Categoría', 'Stock', 'Mínimo Alerta', 'Última Actualización', 'Modificado por']);

  const now = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  items.forEach(item => {
    sheet.appendRow([
      item.id,
      item.nombre,
      item.categoria,
      item.stock,
      item.minStock,
      now,
      item.modifiedBy || 'Android App'
    ]);
  });
}

function updateStockItem(id, delta) {
  const ss  = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_INVENTARIO);
  if (!sheet) return;

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      const currentStock = Number(rows[i][3]) || 0;
      const newStock = Math.max(0, currentStock + Number(delta));
      sheet.getRange(i + 1, 4).setValue(newStock);
      sheet.getRange(i + 1, 6).setValue(new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' }));
      sheet.getRange(i + 1, 7).setValue('Android App');
      break;
    }
  }
}

// ─── ESTADOS DE SOLICITUDES ───────────────────────────────
function getStates() {
  const ss   = SpreadsheetApp.openById(SHEET_ID);
  let sheet  = ss.getSheetByName(SHEET_ESTADOS);
  if (!sheet) return {};

  const rows = sheet.getDataRange().getValues();
  const result = {};
  rows.slice(1).forEach(r => {
    if (r[0]) result[r[0]] = {
      estado:      r[1],
      responsable: r[2],
      moderator:   r[3],
      updatedAt:   r[4]
    };
  });
  return result;
}

function saveState(id, estado, responsable, moderator) {
  const ss  = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_ESTADOS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ESTADOS);
    sheet.appendRow(['ID', 'Estado', 'Responsable', 'Modificado por', 'Fecha actualización']);
  }

  const rows  = sheet.getDataRange().getValues();
  const now   = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  let updated = false;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      sheet.getRange(i + 1, 2, 1, 4).setValues([[estado, responsable || '—', moderator || 'Android App', now]]);
      updated = true;
      break;
    }
  }
  if (!updated) {
    sheet.appendRow([id, estado, responsable || '—', moderator || 'Android App', now]);
  }
}

// ─── SOLICITUDES ─────────────────────────────────────────
function getSolicitudes() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // 1. Buscar la hoja de formulario
  let sheet = ss.getSheetByName('Respuestas de formulario 1');
  if (!sheet) {
    const allSheets = ss.getSheets();
    for (let s of allSheets) {
      const name = s.getName().toLowerCase();
      if (name.includes('respuestas') || name.includes('formulario')) {
        sheet = s;
        break;
      }
    }
  }
  if (!sheet) sheet = ss.getSheetByName(SHEET_SOLICITUDES);
  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => String(h).trim().toLowerCase());
  const states = getStates();

  const colFuncionario = headers.findIndex(h => h.includes('funcionario') || h.includes('solicitante'));
  const colProfesion = headers.findIndex(h => h.includes('profesi'));
  const colDirigido = headers.findIndex(h => h.includes('dirigido'));
  const colUsuario = headers.findIndex(h => h.includes('usuario indicar'));
  const colUnidad = headers.findIndex(h => h.includes('unidad indicar'));
  const colPersonalizada = headers.findIndex(h => h.includes('personalizada'));
  const colEntrega1 = headers.findIndex(h => h.includes('1° fecha de entrega') || h.includes('1ª fecha de entrega') || h.includes('1a fecha de entrega'));
  const colTotalEntregados = headers.findIndex(h => h.includes('total implementos entregados'));
  const colEspera = headers.findIndex(h => h.includes('tiempo de espera'));

  const results = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(cell => String(cell).trim() === '')) continue;

    const id = 'RP-' + String(i).padStart(3, '0');
    const timestamp = String(r[0] || '');
    const profesional = String(colFuncionario >= 0 ? r[colFuncionario] : r[1] || '—').trim();
    const profesion = String(colProfesion >= 0 ? r[colProfesion] : r[2] || '').trim();

    // Área
    let area = 'Otra';
    const profLower = (profesion + ' ' + profesional).toLowerCase();
    if (profLower.includes('ocupacional') || profLower.includes('to')) area = 'Terapia Ocupacional';
    else if (profLower.includes('kinesi') || profLower.includes('kine')) area = 'Kinesiología';
    else if (profLower.includes('fono')) area = 'Fonoaudiología';

    // Destino y Paciente
    const dirigidoTxt = String(colDirigido >= 0 ? r[colDirigido] : r[3] || '');
    const usuarioTxt = String(colUsuario >= 0 ? r[colUsuario] : r[4] || '').trim();
    const unidadTxt = String(colUnidad >= 0 ? r[colUnidad] : r[5] || '').trim();

    const isUnidad = dirigidoTxt.toLowerCase().includes('unidad');
    const tipoDestino = isUnidad ? 'Unidad' : 'Usuario';
    const servicioUnidad = isUnidad ? (unidadTxt || 'Unidad') : (usuarioTxt || 'Poli Adulto');

    // RUT anonimizado
    let rutAnon = '—';
    if (usuarioTxt) {
      const matchRut = usuarioTxt.match(/\b\d{1,2}(?:\.\d{3}){2}-?[\dkK]\b|\b\d{7,8}-?[\dkK]\b/);
      if (matchRut) {
        const rawRut = matchRut[0].replace(/\./g, '');
        const dashIdx = rawRut.indexOf('-');
        const base = dashIdx > 0 ? rawRut.substring(0, dashIdx) : rawRut.slice(0, -1);
        const dv = dashIdx > 0 ? rawRut.substring(dashIdx + 1) : rawRut.slice(-1);
        if (base.length >= 4) {
          rutAnon = base.substring(0, 2) + '.***.***-' + dv;
        } else {
          rutAnon = '***.***-' + dv;
        }
      }
    }

    // Piezas solicitadas
    const piezas = [];
    for (let c = 6; c < headers.length; c++) {
      if (c === colPersonalizada || c === colEntrega1 || c === colTotalEntregados || c === colEspera) continue;
      if (headers[c].includes('entrega') || headers[c].includes('espera') || headers[c].includes('catastro')) continue;
      
      const val = String(r[c] || '').trim();
      const valLower = val.toLowerCase();
      if (val && !['no', 'no requiero', '0', 'false', '—', '-'].includes(valLower)) {
        let cleanName = rows[0][c].split('(')[0].trim();
        if (!['requiero', 'si', 'sí', 'lo requiero', 'x'].includes(valLower)) {
          cleanName += ' (' + val.replace(/lo requiero/gi, '').trim() + ')';
        }
        piezas.push(cleanName);
      }
    }
    const pers = String(colPersonalizada >= 0 ? r[colPersonalizada] : '').trim();
    if (pers) {
      piezas.push('Personalizado: ' + pers.substring(0, 60));
    }
    const implemento = piezas.length > 0 ? piezas.join(' + ') : 'Implemento 3D';

    // Estado y Responsable
    let estado = 'Nueva solicitud';
    let responsable = 'Team 3D';
    if (states[id]) {
      estado = states[id].estado || estado;
      responsable = states[id].responsable || states[id].moderator || responsable;
    } else {
      const ent1 = colEntrega1 >= 0 ? String(r[colEntrega1] || '').trim() : '';
      const totEnt = colTotalEntregados >= 0 ? Number(r[colTotalEntregados]) || 0 : 0;
      if (ent1 || totEnt > 0) {
        estado = 'Entregada';
      }
    }

    const diasEspera = colEspera >= 0 ? Number(r[colEspera]) || 0 : 0;

    results.push({
      id: id,
      timestamp: timestamp,
      rutAnonimizado: rutAnon,
      profesional: profesional,
      area: area,
      servicioUnidad: servicioUnidad,
      contextoAtencion: isUnidad ? 'Unidad cerrada' : 'Ambulatorio',
      tipoDestino: tipoDestino,
      implemento: implemento,
      categoriaFuncional: pers ? 'Pieza personalizada' : (isUnidad ? 'Stock de unidad' : 'Ayuda técnica AVD'),
      especificaciones: pers || usuarioTxt || '',
      estado: estado,
      prioridad: estado === 'Entregada' ? 'Baja' : (isUnidad ? 'Alta' : 'Media'),
      responsable: responsable,
      tiempoEsperaDias: diasEspera,
      observaciones: ''
    });
  }

  return results;
}

function saveSolicitud(sol) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_ESTADOS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ESTADOS);
    sheet.appendRow(['ID', 'Estado', 'Responsable', 'Modificado por', 'Fecha actualización']);
  }
  saveState(sol.id, sol.estado, sol.responsable, 'Android App');
}

