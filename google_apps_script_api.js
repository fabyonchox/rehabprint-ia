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
  const ss   = SpreadsheetApp.openById(SHEET_ID);
  let sheet  = ss.getSheetByName(SHEET_SOLICITUDES);
  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  // Encabezados: ID | Timestamp | RUT | Profesional | Área | Servicio/Unidad | Contexto | TipoDestino | Implemento | CategoríaFuncional | Especificaciones | Estado | Prioridad | Responsable | DiasEspera | Observaciones
  return rows.slice(1).map(r => ({
    id:                 String(r[0]),
    timestamp:          String(r[1]),
    rutAnonimizado:     String(r[2]),
    profesional:        String(r[3]),
    area:               String(r[4]),
    servicioUnidad:     String(r[5]),
    contextoAtencion:   String(r[6]),
    tipoDestino:        String(r[7]),
    implemento:         String(r[8]),
    categoriaFuncional: String(r[9]),
    especificaciones:   String(r[10]),
    estado:             String(r[11]),
    prioridad:          String(r[12]),
    responsable:        String(r[13]) || 'Team 3D',
    tiempoEsperaDias:   Number(r[14]) || 0,
    observaciones:      String(r[15]) || ''
  })).filter(s => s.id && s.id !== 'undefined');
}

function saveSolicitud(sol) {
  const ss  = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_SOLICITUDES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SOLICITUDES);
    sheet.appendRow([
      'ID','Timestamp','RUT Anonimizado','Profesional','Área','Servicio/Unidad',
      'Contexto Atención','Tipo Destino','Implemento','Categoría Funcional',
      'Especificaciones','Estado','Prioridad','Responsable','Días Espera','Observaciones'
    ]);
  }

  const rows = sheet.getDataRange().getValues();
  let updated = false;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === sol.id) {
      sheet.getRange(i + 1, 1, 1, 16).setValues([[
        sol.id, sol.timestamp, sol.rutAnonimizado, sol.profesional,
        sol.area, sol.servicioUnidad, sol.contextoAtencion, sol.tipoDestino,
        sol.implemento, sol.categoriaFuncional, sol.especificaciones,
        sol.estado, sol.prioridad, sol.responsable || 'Team 3D',
        sol.tiempoEsperaDias || 0, sol.observaciones || ''
      ]]);
      updated = true;
      break;
    }
  }
  if (!updated) {
    sheet.appendRow([
      sol.id, sol.timestamp, sol.rutAnonimizado, sol.profesional,
      sol.area, sol.servicioUnidad, sol.contextoAtencion, sol.tipoDestino,
      sol.implemento, sol.categoriaFuncional, sol.especificaciones,
      sol.estado, sol.prioridad, sol.responsable || 'Team 3D',
      sol.tiempoEsperaDias || 0, sol.observaciones || ''
    ]);
  }
}
