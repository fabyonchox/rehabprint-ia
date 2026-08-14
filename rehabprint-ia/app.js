// RehabPrint IA — App Logic
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxuekn9HYI4cPeLj7Lj5T-YYMsAF7N59dzCJCvqkPW42P8PuXhhMNackUcbfK_nNWxHpA/exec';
const GITHUB_REPO     = 'fabyonchox/rehabprint-ia';
const GITHUB_WORKFLOW = 'sync.yml';
// Token guardado de forma segura en el navegador de cada usuario
function getGithubPAT() { return localStorage.getItem('rehabprint_github_pat') || ''; }


let currentView = 'dashboard';
let selectedSolicitud = null;
let filterEstado = 'todos';
let filterArea = 'todos';
let filterResponsable = 'todos';
let searchQuery = '';
let activeModerator = 'Fabian';

// ─── CLOUD SYNC (Google Sheets compartido) ─────────────────────────────────

async function cloudGetInventory() {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getInventory`, { redirect: 'follow' });
    const json = await res.json();
    if (json.ok && json.data && json.data.length > 0) {
      inventory = cleanDeduplicateInventory(json.data);
      saveInventoryToStorage();
      return true;
    }
  } catch(e) { console.warn('Cloud inventory unavailable, using local cache'); }
  return false;
}

async function cloudSaveInventory() {
  try {
    // no-cors: fire-and-forget, evita bloqueo de CORS preflight
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        action: 'updateInventory',
        inventory: inventory.map(i => ({ ...i, modifiedBy: activeModerator }))
      })
    });
    showToast('☁️ Inventario guardado en la nube', 'success');
  } catch(e) { showToast('⚠️ Sin conexión — cambios guardados localmente', ''); }
}

async function cloudSaveState(id, estado, responsable) {
  try {
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({ action: 'updateState', id, estado, responsable, moderator: activeModerator })
    });
  } catch(e) { console.warn('Estado guardado solo localmente'); }
}

async function cloudGetStates() {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getStates`, { redirect: 'follow' });
    const json = await res.json();
    if (json.ok && json.data) return json.data;
  } catch(e) { console.warn('No se pudo obtener estados de la nube'); }
  return {};
}

// ─── TRIGGER AGENTES IA EN LA NUBE (GitHub Actions) ────────────────────────
async function triggerIASync() {
  const btn  = document.getElementById('btn-sync-ia');
  const icon = document.getElementById('sync-ia-icon');
  const text = document.getElementById('sync-ia-text');
  const pat  = getGithubPAT();

  // Si no hay token configurado, pedirlo al usuario
  if (!pat) {
    const token = prompt(
      '🔑 Ingresa tu GitHub Personal Access Token para activar los Agentes IA en la nube.\n\n' +
      'Solo necesitas ingresarlo una vez — se guarda de forma segura en tu navegador.\n\n' +
      'Token (empieza con ghp_...):'
    );
    if (!token || !token.startsWith('ghp_')) {
      showToast('❌ Token inválido o cancelado', 'error');
      return;
    }
    localStorage.setItem('rehabprint_github_pat', token.trim());
    showToast('✅ Token guardado. Vuelve a presionar el botón.', 'success');
    return;
  }

  btn.disabled = true;
  icon.textContent = '⏳';
  text.textContent = 'Procesando...';

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ref: 'master' })
      }
    );

    if (res.status === 204 || res.ok) {
      icon.textContent = '🤖';
      text.textContent = 'Sincronizando...';
      showToast('🤖 Agentes IA activados — los nuevos pedidos aparecerán en ~60 segundos', 'success');
      setTimeout(async () => {
        await actualizarDatosYEstados(true);
        icon.textContent = '✅';
        text.textContent = 'Sincronizar IA';
        btn.disabled = false;
        showToast('✅ Sincronización completada — datos actualizados', 'success');
        setTimeout(() => { icon.textContent = '🤖'; }, 3000);
      }, 65000);
    } else if (res.status === 401) {
      localStorage.removeItem('rehabprint_github_pat');
      icon.textContent = '🤖'; text.textContent = 'Sincronizar IA'; btn.disabled = false;
      showToast('❌ Token inválido. Presiona de nuevo para ingresar uno nuevo.', 'error');
    } else {
      throw new Error(`Status ${res.status}`);
    }
  } catch(e) {
    icon.textContent = '🤖'; text.textContent = 'Sincronizar IA'; btn.disabled = false;
    showToast('❌ Error de conexión al activar los agentes.', 'error');
  }
}

// ─── NAVIGATION ───────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');
  if (sidebar) sidebar.classList.toggle('open');
  if (backdrop) backdrop.classList.toggle('open');
}

function navigate(view) {
  currentView = view;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + view);
  if (page) page.classList.add('active');
  const navItem = document.querySelector(`[data-view="${view}"]`);
  if (navItem) navItem.classList.add('active');

  // Cerrar sidebar si estamos en móvil
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');

  const titles = {
    dashboard: 'Dashboard', solicitudes: 'Solicitudes', inventario: 'Inventario de Stock 3D', historial: 'Historial', agentes: 'Agentes IA'
  };
  const el = document.getElementById('header-title');
  if (el) el.textContent = titles[view] || 'RehabPrint IA';
  if (view === 'dashboard') renderDashboard();
  if (view === 'solicitudes') renderSolicitudes();
  if (view === 'inventario') renderInventory();
  if (view === 'historial') renderHistorial();
}

// ─── ACTUALIZACIÓN DE ESTADOS Y DATOS EN TIEMPO REAL ─────────────────
async function actualizarDatosYEstados(silencioso = false) {
  const icon = document.getElementById('update-spin-icon');
  if (icon) {
    icon.style.transform = 'rotate(360deg)';
    setTimeout(() => { icon.style.transform = 'rotate(0deg)'; }, 600);
  }

  if (typeof loadLiveData === 'function') loadLiveData();

  // 1️⃣ Obtener estados desde la NUBE (compartido entre Fabían, Valentina y Alexis)
  const cloudStates = await cloudGetStates();
  solicitudes.forEach(s => {
    if (cloudStates[s.id]) {
      s.estadoCaso   = cloudStates[s.id].estado || s.estadoCaso;
      s.responsableActual = cloudStates[s.id].responsable || s.responsableActual;
    }
  });

  // 2️⃣ Aplicar adicionalmente cambios locales (por si no hay internet)
  const localStates   = JSON.parse(localStorage.getItem('rehabprint_states')   || '{}');
  const localAssignees = JSON.parse(localStorage.getItem('rehabprint_assignees') || '{}');
  solicitudes.forEach(s => {
    // La nube tiene prioridad sobre lo local
    if (!cloudStates[s.id] && localStates[s.id])   s.estadoCaso       = localStates[s.id];
    if (!cloudStates[s.id] && localAssignees[s.id]) s.responsableActual = localAssignees[s.id];
  });

  // 3️⃣ Actualizar inventario desde la nube
  await cloudGetInventory();

  updateNavBadges();
  if (currentView === 'dashboard')   renderDashboard();
  else if (currentView === 'solicitudes') renderSolicitudes();
  else if (currentView === 'historial')   renderHistorial();
  else if (currentView === 'inventario')  renderInventory();
  else if (currentView === 'detail' && selectedSolicitud) openDetail(selectedSolicitud.id);

  if (!silencioso) {
    showToast(`☁️ ${solicitudes.length} solicitudes y estados sincronizados con la nube.`, 'success');
  }
}

// ─── DASHBOARD ────────────────────────────────────────
function renderDashboard() {
  const stats = getDashboardStats();
  document.getElementById('kpi-nuevas').textContent = stats.nuevasHoy;
  document.getElementById('kpi-proceso').textContent = stats.enProceso;
  document.getElementById('kpi-listas').textContent = stats.listasEntrega;
  document.getElementById('kpi-alta').textContent = stats.altaPrioridad;
  document.getElementById('kpi-entregadas').textContent = stats.entregadas;
  document.getElementById('kpi-observadas').textContent = stats.observadas;

  // Actividad por área
  const areas = { 'Terapia Ocupacional': 0, 'Kinesiología': 0, 'Fonoaudiología': 0 };
  solicitudes.forEach(s => { if (areas[s.area] !== undefined) areas[s.area]++; });
  const maxVal = Math.max(...Object.values(areas), 1);
  const colors = ['#003087','#0072CE','#41B6E6'];
  const barHTML = Object.entries(areas).map(([label, val], i) => `
    <div class="chart-bar-row">
      <span class="chart-bar-label">${label}</span>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:${(val/maxVal)*100}%;background:${colors[i]}">${val}</div>
      </div>
      <span class="chart-bar-count">${val}</span>
    </div>`).join('');
  document.getElementById('area-chart').innerHTML = barHTML;

  // Recientes
  const recientes = solicitudes.filter(s => s.estadoCaso !== ESTADOS.ENTREGADA && s.estadoCaso !== ESTADOS.CANCELADA)
    .sort((a,b) => new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud)).slice(0, 5);
  document.getElementById('recientes-list').innerHTML = recientes.map(s => solicitudCardHTML(s)).join('');
}

let currentLayout = 'list';

function setSolicitudesLayout(layout) {
  currentLayout = layout;
  const btnList = document.getElementById('btn-layout-list');
  const btnKanban = document.getElementById('btn-layout-kanban');
  if (btnList && btnKanban) {
    if (layout === 'list') {
      btnList.style.background = 'var(--color-primary)';
      btnList.style.color = '#ffffff';
      btnList.style.boxShadow = 'var(--shadow-sm)';
      btnList.style.fontWeight = '600';

      btnKanban.style.background = 'transparent';
      btnKanban.style.color = 'var(--text-secondary)';
      btnKanban.style.boxShadow = 'none';
      btnKanban.style.fontWeight = '500';
    } else {
      btnKanban.style.background = 'var(--color-primary)';
      btnKanban.style.color = '#ffffff';
      btnKanban.style.boxShadow = 'var(--shadow-sm)';
      btnKanban.style.fontWeight = '600';

      btnList.style.background = 'transparent';
      btnList.style.color = 'var(--text-secondary)';
      btnList.style.boxShadow = 'none';
      btnList.style.fontWeight = '500';
    }
  }
  renderSolicitudes();
}

// ─── SOLICITUDES ──────────────────────────────────────
function renderSolicitudes() {
  let list = solicitudes.filter(s => s.estadoCaso !== ESTADOS.ENTREGADA && s.estadoCaso !== ESTADOS.CANCELADA);
  if (filterEstado !== 'todos') {
    if (filterEstado === 'en-proceso') {
      list = list.filter(s => [ESTADOS.REVISADA, ESTADOS.DISENO, ESTADOS.IMPRESION, ESTADOS.POSTPROCESO].includes(s.estadoCaso));
    } else if (filterEstado === 'alta-prioridad') {
      list = list.filter(s => s.prioridadIA === PRIORIDAD.ALTA);
    } else {
      list = list.filter(s => s.estadoCaso === filterEstado);
    }
  }
  if (filterArea !== 'todos') list = list.filter(s => s.area === filterArea);
  if (filterResponsable !== 'todos') {
    if (filterResponsable === 'Sin asignar') {
      list = list.filter(s => !s.responsableActual);
    } else {
      list = list.filter(s => s.responsableActual === filterResponsable);
    }
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(s =>
      s.nombreSolicitante.toLowerCase().includes(q) ||
      s.piezaNormalizada.toLowerCase().includes(q) ||
      (s.nombreUsuario || '').toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    );
  }

  const listContainer = document.getElementById('solicitudes-list');
  const kanbanContainer = document.getElementById('kanban-board');
  const countEl = document.getElementById('solicitudes-count');

  if (countEl) countEl.textContent = `${list.length} solicitudes`;

  if (currentLayout === 'list') {
    if (listContainer) listContainer.style.display = 'flex';
    if (kanbanContainer) kanbanContainer.style.display = 'none';

    if (!list.length) {
      listContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No hay solicitudes con estos filtros</div></div>';
      return;
    }
    listContainer.innerHTML = list.map(s => solicitudCardHTML(s)).join('');
  } else {
    if (listContainer) listContainer.style.display = 'none';
    if (kanbanContainer) kanbanContainer.style.display = 'flex';

    renderKanbanBoard(list);
  }
}

function renderKanbanBoard(list) {
  const kanbanContainer = document.getElementById('kanban-board');
  if (!kanbanContainer) return;

  const columns = [
    { estado: ESTADOS.NUEVA, title: '🆕 Nueva solicitud', bg: '#FEE2E2', border: '#FCA5A5' },
    { estado: ESTADOS.REVISADA, title: '🔍 Revisada', bg: '#FEF3C7', border: '#FDE047' },
    { estado: ESTADOS.DISENO, title: '✏️ En diseño', bg: '#E0F2FE', border: '#7DD3FC' },
    { estado: ESTADOS.IMPRESION, title: '🖨️ En impresión', bg: '#E0E7FF', border: '#A5B4FC' },
    { estado: ESTADOS.POSTPROCESO, title: '✂️ En postproceso', bg: '#F3E8FF', border: '#D8B4FE' },
    { estado: ESTADOS.LISTA, title: '✅ Lista para entrega', bg: '#D1FAE5', border: '#6EE7B7' }
  ];

  const colsHTML = columns.map(col => {
    const colItems = list.filter(s => s.estadoCaso === col.estado);
    const cardsHTML = colItems.length
      ? colItems.map(s => solicitudCardHTML(s)).join('')
      : '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:20px 0">Sin elementos</div>';

    return `
      <div class="kanban-column">
        <div class="kanban-header" style="border-top:3px solid ${col.border}">
          <span class="kanban-title">${col.title}</span>
          <span class="kanban-count">${colItems.length}</span>
        </div>
        <div class="kanban-cards">
          ${cardsHTML}
        </div>
      </div>
    `;
  }).join('');

  kanbanContainer.innerHTML = `
    <div style="width:100%;display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
        <span style="font-size:13px;font-weight:600;color:var(--text-secondary)">Tablero de Estado (Kanban)</span>
        <button class="btn btn-outline btn-sm" onclick="setSolicitudesLayout('list')" style="gap:6px">
          📋 Volver a Vista Lista
        </button>
      </div>
      <div style="display:flex;gap:14px;overflow-x:auto;padding-bottom:16px">
        ${colsHTML}
      </div>
    </div>
  `;
}

function solicitudCardHTML(s) {
  const ec = ESTADO_CONFIG[s.estadoCaso] || {};
  const pc = PRIORIDAD_CONFIG[s.prioridadIA] || {};
  const destIcon = s.destinoTipo === DESTINO.USUARIO ? '👤' : '🏥';

  let items = s.piezasList || [];
  if (!items.length && s.piezaNormalizada && s.piezaNormalizada !== 'Sin especificar') {
    items = s.piezaNormalizada.split('+').map(x => x.trim());
  }
  const checkedMap = JSON.parse(localStorage.getItem('rehabprint_checked_items') || '{}');
  let checkedCount = 0;
  items.forEach((_, idx) => {
    if (checkedMap[`${s.id}_item_${idx}`]) checkedCount++;
  });
  const itemsBadge = items.length > 0
    ? `<span class="badge" style="color:${checkedCount === items.length ? '#007F3B' : '#0072CE'};background:${checkedCount === items.length ? '#D1FAE5' : '#E0F2FE'};font-size:10px">🧩 ${checkedCount}/${items.length} piezas</span>`
    : '';

  return `
  <div class="solicitud-card" onclick="openDetail('${s.id}')">
    <div class="solicitud-card-header">
      <div>
        <div style="display:flex;align-items:center;gap:6px">
          <span class="solicitud-id">${s.id}</span>
          ${itemsBadge}
        </div>
        <div class="solicitud-title">${s.piezaNormalizada}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <span class="badge" style="color:${ec.color};background:${ec.bg}">${ec.icon} ${s.estadoCaso}</span>
        <span class="badge-priority" style="color:${pc.color};background:${pc.bg}">▲ ${s.prioridadIA}</span>
      </div>
    </div>
    <div class="solicitud-meta">
      <span class="meta-item">👤 ${s.nombreSolicitante}</span>
      <span class="meta-item" style="color:var(--text-muted)">•</span>
      <span class="meta-item">🏷️ ${s.area}</span>
      <span class="meta-item" style="color:var(--text-muted)">•</span>
      <span class="meta-item">${destIcon} ${s.destinoTipo === DESTINO.USUARIO ? (s.nombreUsuario || 'Usuario') : (s.unidadDestino || 'Unidad')}</span>
      ${s.responsableActual ? `<span class="meta-item" style="color:var(--text-muted)">•</span><span class="meta-item">👨‍🔧 ${s.responsableActual}</span>` : ''}
    </div>
    <div class="solicitud-footer">
      <span class="solicitud-date">📅 ${formatDate(s.fechaSolicitud)}</span>
      ${s.tiempoEsperaDias > 0 ? `<span class="solicitud-date">⏱️ ${s.tiempoEsperaDias} días</span>` : '<span class="badge" style="color:#6B7280;background:#F3F4F6">Nuevo</span>'}
    </div>
  </div>`;
}

// ─── DETAIL ───────────────────────────────────────────
function openDetail(id) {
  selectedSolicitud = solicitudes.find(s => s.id === id);
  if (!selectedSolicitud) return;
  const s = selectedSolicitud;
  const ec = ESTADO_CONFIG[s.estadoCaso] || {};
  const pc = PRIORIDAD_CONFIG[s.prioridadIA] || {};

  document.getElementById('header-title').textContent = `Detalle — ${s.id}`;
  document.getElementById('detail-id').textContent = s.id;
  document.getElementById('detail-estado-badge').innerHTML = `<span class="badge" style="color:${ec.color};background:${ec.bg};font-size:13px">${ec.icon} ${s.estadoCaso}</span>`;
  document.getElementById('detail-prioridad-badge').innerHTML = `<span class="badge-priority" style="color:${pc.color};background:${pc.bg};font-size:12px;padding:4px 12px">▲ ${s.prioridadIA} Prioridad</span>`;

  // Campos solicitante
  setField('d-solicitante', s.nombreSolicitante);
  setField('d-profesion', s.profesion);
  setField('d-area', s.area);
  setField('d-fecha', formatDate(s.fechaSolicitud));
  setField('d-destino', s.destinoTipo);
  setField('d-contexto', s.contexto);

  if (s.destinoTipo === DESTINO.USUARIO) {
    setField('d-target', `${s.nombreUsuario || '—'} | RUT: ${s.rutUsuario || '—'}`);
    setField('d-ubicacion', s.servicioSalaCama || '—');
  } else {
    setField('d-target', s.unidadDestino || '—');
    setField('d-ubicacion', '—');
  }

  // Descripción original
  document.getElementById('d-descripcion').textContent = s.descripcionOriginal;

  // AI Card
  document.getElementById('ai-categoria').textContent = s.categoriaIA;
  document.getElementById('ai-pieza').textContent = s.piezaNormalizada;
  document.getElementById('ai-resumen').textContent = s.resumenIA;

  // Observaciones
  setField('d-obs-clinicas', s.observacionesClinicas || '—');
  setField('d-obs-tecnicas', s.observacionesTecnicas || '—');

  // Sincronizar Selects de Estado y Responsable en Detalle
  const estadoSelect = document.getElementById('detail-estado-select');
  if (estadoSelect) estadoSelect.value = s.estadoCaso;
  const assigneeSelect = document.getElementById('detail-assignee-select');
  if (assigneeSelect) assigneeSelect.value = s.responsableActual || '';
  const assigneeBadge = document.getElementById('detail-assignee-badge');
  if (assigneeBadge) assigneeBadge.textContent = s.responsableActual ? `Responsable: ${s.responsableActual}` : 'Sin asignar';

  // Checklist individual de implementos
  renderItemsChecklist(s);

  // Timeline
  renderTimeline(s);

  // Botones acción
  renderDetailActions(s);

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-detail').classList.add('active');
}

function renderItemsChecklist(s) {
  const container = document.getElementById('d-items-checklist');
  const progressEl = document.getElementById('d-items-progress');
  if (!container) return;

  let items = s.piezasList || [];
  if (!items.length) {
    if (s.piezaNormalizada && s.piezaNormalizada !== 'Sin especificar') {
      items = s.piezaNormalizada.split('+').map(x => x.trim());
    } else {
      items = [s.descripcionOriginal || 'Pieza sin especificar'];
    }
  }

  const checkedMap = JSON.parse(localStorage.getItem('rehabprint_checked_items') || '{}');
  
  let checkedCount = 0;
  container.innerHTML = items.map((item, idx) => {
    const itemKey = `${s.id}_item_${idx}`;
    const isChecked = !!checkedMap[itemKey];
    if (isChecked) checkedCount++;

    return `
      <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid ${isChecked ? '#A7F3D0' : 'var(--border-color)'};border-radius:8px;background:${isChecked ? '#F0FDF4' : '#fff'};cursor:pointer;transition:all 0.2s ease">
        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleItemCheck('${s.id}', ${idx}, this.checked)" style="width:18px;height:18px;accent-color:var(--color-success);cursor:pointer">
        <span style="font-size:13.5px;font-weight:${isChecked ? '600' : '500'};color:${isChecked ? 'var(--color-success)' : 'var(--text-primary)'};text-decoration:${isChecked ? 'line-through' : 'none'}">${item}</span>
        ${isChecked ? '<span style="margin-left:auto;font-size:11px;color:var(--color-success);font-weight:700">✓ Listo</span>' : '<span style="margin-left:auto;font-size:11px;color:var(--text-muted)">Pendiente</span>'}
      </label>
    `;
  }).join('');

  if (progressEl) {
    progressEl.textContent = `${checkedCount}/${items.length} listos`;
    if (checkedCount === items.length && items.length > 0) {
      progressEl.style.background = '#D1FAE5';
      progressEl.style.color = '#007F3B';
    } else {
      progressEl.style.background = '#E0F2FE';
      progressEl.style.color = 'var(--color-primary-light)';
    }
  }
}

function toggleItemCheck(solicitudId, itemIdx, isChecked) {
  const checkedMap = JSON.parse(localStorage.getItem('rehabprint_checked_items') || '{}');
  const itemKey = `${solicitudId}_item_${itemIdx}`;
  checkedMap[itemKey] = isChecked;
  localStorage.setItem('rehabprint_checked_items', JSON.stringify(checkedMap));

  const s = solicitudes.find(x => x.id === solicitudId);
  if (s) {
    renderItemsChecklist(s);
    showToast(isChecked ? '✅ Implemento marcado como LISTO' : 'ℹ️ Implemento marcado como pendiente', isChecked ? 'success' : 'info');
  }
}

function setField(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val || '—';
}

function renderTimeline(s) {
  const allStates = [ESTADOS.NUEVA, ESTADOS.REVISADA, ESTADOS.DISENO, ESTADOS.IMPRESION, ESTADOS.POSTPROCESO, ESTADOS.LISTA, ESTADOS.ENTREGADA];
  const currentIdx = allStates.indexOf(s.estadoCaso);
  const ec = ESTADO_CONFIG;
  const html = allStates.map((estado, i) => {
    const isDone = i < currentIdx;
    const isCurrent = i === currentIdx;
    const dotClass = isDone ? 'done' : isCurrent ? 'current' : '';
    const lineClass = isDone ? 'done' : '';
    return `
    <div class="timeline-item">
      <div style="position:relative">
        <div class="timeline-dot ${dotClass}">${isDone ? '✓' : ec[estado]?.icon || ''}</div>
        ${i < allStates.length-1 ? `<div class="timeline-line ${lineClass}"></div>` : ''}
      </div>
      <div class="timeline-content">
        <div class="timeline-label" style="color:${isCurrent ? 'var(--color-primary)' : ''};font-weight:${isCurrent ? 700 : 500}">${estado}</div>
        ${isCurrent && s.fechaInicioTrabajo ? `<div class="timeline-date">Inicio: ${formatDate(s.fechaInicioTrabajo)}</div>` : ''}
        ${estado === ESTADOS.ENTREGADA && s.fechaEntrega ? `<div class="timeline-date">Entregado: ${formatDate(s.fechaEntrega)}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  document.getElementById('detail-timeline').innerHTML = html;
}

function renderDetailActions(s) {
  const container = document.getElementById('detail-actions');
  const nextStates = {
    [ESTADOS.NUEVA]: ESTADOS.REVISADA,
    [ESTADOS.REVISADA]: ESTADOS.DISENO,
    [ESTADOS.DISENO]: ESTADOS.IMPRESION,
    [ESTADOS.IMPRESION]: ESTADOS.POSTPROCESO,
    [ESTADOS.POSTPROCESO]: ESTADOS.LISTA,
    [ESTADOS.LISTA]: ESTADOS.ENTREGADA,
  };
  const next = nextStates[s.estadoCaso];
  let btns = '';
  if (next) btns += `<button class="btn btn-primary" onclick="advanceState('${s.id}','${next}')">→ Avanzar a: ${next}</button>`;
  if (s.estadoCaso !== ESTADOS.ENTREGADA && s.estadoCaso !== ESTADOS.CANCELADA)
    btns += `<button class="btn btn-outline" onclick="flagObservada('${s.id}')">⚠️ Observar</button>`;
  container.innerHTML = btns;
}

// ─── MODIFICACIÓN DE ESTADO Y ASIGNACIÓN ────────────────
function changeSolicitudEstado(newEstado) {
  if (!selectedSolicitud) return;
  const s = selectedSolicitud;
  const oldState = s.estadoCaso;
  s.estadoCaso = newEstado;

  if (newEstado === ESTADOS.REVISADA && !s.responsableActual) {
    s.responsableActual = activeModerator || 'Fabian';
  }
  if (newEstado === ESTADOS.DISENO && !s.fechaInicioTrabajo) {
    s.fechaInicioTrabajo = todayStr();
  }
  if (newEstado === ESTADOS.ENTREGADA) {
    s.fechaEntrega = todayStr();
    s.implementosEntregados = s.implementosEntregados || s.piezaNormalizada;
  }

  saveLocalState(s.id, s);
  pushSyncChange(s.id, 'estado', newEstado, oldState);
  // ☁️ Guardar en la nube (compartido con Valentina y Alexis)
  cloudSaveState(s.id, newEstado, s.responsableActual);
  openDetail(s.id);
  updateNavBadges();
  showToast(`✅ Estado actualizado a: ${newEstado}`, 'success');
}

function changeSolicitudAssignee(newAssignee) {
  if (!selectedSolicitud) return;
  const s = selectedSolicitud;
  const oldAssignee = s.responsableActual;
  s.responsableActual = newAssignee;

  saveLocalState(s.id, s);
  pushSyncChange(s.id, 'responsable', newAssignee, oldAssignee);
  openDetail(s.id);
  showToast(`👤 Caso asignado a: ${newAssignee || 'Sin asignar'}`, 'success');
}

function advanceState(id, newState) {
  const s = solicitudes.find(x => x.id === id);
  if (!s) return;
  selectedSolicitud = s;
  changeSolicitudEstado(newState);
}

function flagObservada(id) {
  const s = solicitudes.find(x => x.id === id);
  if (!s) return;
  selectedSolicitud = s;
  changeSolicitudEstado(ESTADOS.OBSERVADA);
}

// ─── MODERADOR ────────────────────────────────────────
function setActiveModerator(val) {
  activeModerator = val;
  const avatar = document.getElementById('moderator-avatar');
  if (avatar) avatar.textContent = val.charAt(0).toUpperCase();
  showToast(`👤 Moderador activo: ${val}`, 'info');
}

// ─── HISTORIAL ────────────────────────────────────────
function renderHistorial() {
  const list = solicitudes.filter(s => s.estadoCaso === ESTADOS.ENTREGADA || s.estadoCaso === ESTADOS.CANCELADA);
  const container = document.getElementById('historial-list');
  if (!list.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📚</div><div class="empty-state-text">No hay casos cerrados aún</div></div>';
    return;
  }
  document.getElementById('historial-count').textContent = `${list.length} casos cerrados`;
  container.innerHTML = list.map(s => {
    const ec = ESTADO_CONFIG[s.estadoCaso] || {};
    return `
    <div class="solicitud-card" onclick="openDetail('${s.id}')">
      <div class="solicitud-card-header">
        <div>
          <div class="solicitud-id">${s.id}</div>
          <div class="solicitud-title">${s.piezaNormalizada}</div>
        </div>
        <span class="badge" style="color:${ec.color};background:${ec.bg}">${ec.icon} ${s.estadoCaso}</span>
      </div>
      <div class="solicitud-meta">
        <span class="meta-item">👤 ${s.nombreSolicitante}</span>
        <span class="meta-item">🏷️ ${s.area}</span>
        ${s.tiempoEsperaDias ? `<span class="meta-item">⏱️ ${s.tiempoEsperaDias} días de espera</span>` : ''}
      </div>
      <div class="solicitud-footer">
        <span class="solicitud-date">Solicitado: ${formatDate(s.fechaSolicitud)}</span>
        ${s.fechaEntrega ? `<span class="solicitud-date">Entregado: ${formatDate(s.fechaEntrega)}</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ─── HELPERS ──────────────────────────────────────────
function formatDate(str) {
  if (!str) return '—';
  try { return new Date(str).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return str; }
}
function todayStr() { return new Date().toISOString().split('T')[0]; }

function showToast(msg, type = '') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function updateNavBadges() {
  const stats = getDashboardStats();
  const el = document.getElementById('badge-nuevas');
  if (el) el.textContent = stats.nuevasHoy;
  const el2 = document.getElementById('badge-entregadas');
  if (el2) el2.textContent = stats.entregadas;
}

function handleKpiClick(type) {
  if (type === 'entregadas') {
    navigate('historial');
    return;
  }
  
  const map = {
    nuevas: ESTADOS.NUEVA,
    proceso: 'en-proceso',
    listas: ESTADOS.LISTA,
    alta: 'alta-prioridad',
    observadas: ESTADOS.OBSERVADA
  };
  
  const val = map[type] || 'todos';
  filterEstado = val;
  filterArea = 'todos';
  filterResponsable = 'todos';
  searchQuery = '';
  
  const selectEstado = document.getElementById('filter-estado');
  if (selectEstado) selectEstado.value = val;
  const selectArea = document.getElementById('filter-area');
  if (selectArea) selectArea.value = 'todos';
  const selectResponsable = document.getElementById('filter-responsable');
  if (selectResponsable) selectResponsable.value = 'todos';
  const searchInput = document.getElementById('global-search');
  if (searchInput) searchInput.value = '';
  
  navigate('solicitudes');
}

// ─── FILTERS ──────────────────────────────────────────
function setFilterEstado(val) { filterEstado = val; renderSolicitudes(); }
function setFilterArea(val) { filterArea = val; renderSolicitudes(); }
function setFilterResponsable(val) { filterResponsable = val; renderSolicitudes(); }
function setSearch(val) { searchQuery = val; renderSolicitudes(); }

// ─── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  navigate('dashboard');
  updateNavBadges();
  if (typeof loadLiveData === 'function') {
    loadLiveData();
  }
  // Cargar inventario compartido desde la nube
  await cloudGetInventory();
  // Cargar estados compartidos desde la nube y aplicarlos
  const cloudStates = await cloudGetStates();
  Object.keys(cloudStates).forEach(id => {
    const s = solicitudes.find(x => x.id === id);
    if (s && cloudStates[id].estado) {
      s.estadoCaso = cloudStates[id].estado;
      s.responsableActual = cloudStates[id].responsable || s.responsableActual;
    }
  });
  updateNavBadges();
  if (currentView === 'dashboard') renderDashboard();
});

// 🔹 Persistencia local + cola de sincronización
function saveLocalState(id, solicitud) {
  const states = JSON.parse(localStorage.getItem('rehabprint_states') || '{}');
  const assignees = JSON.parse(localStorage.getItem('rehabprint_assignees') || '{}');
  states[id] = solicitud.estadoCaso;
  assignees[id] = solicitud.responsableActual || '';
  localStorage.setItem('rehabprint_states', JSON.stringify(states));
  localStorage.setItem('rehabprint_assignees', JSON.stringify(assignees));
}

function pushSyncChange(id, field, newValue, oldValue) {
  const queue = JSON.parse(localStorage.getItem('rehabprint_sync_queue') || '[]');
  const filtered = queue.filter(c => !(c.id === id && c.field === field));
  filtered.push({
    id, field, newValue, oldValue,
    timestamp: new Date().toISOString(),
    row_index: parseInt(id.replace('RP-', '')) || 0
  });
  localStorage.setItem('rehabprint_sync_queue', JSON.stringify(filtered));
}

function getSyncQueue() {
  return JSON.parse(localStorage.getItem('rehabprint_sync_queue') || '[]');
}

function clearSyncQueue() {
  localStorage.setItem('rehabprint_sync_queue', '[]');
}

function exportSyncQueue() {
  const queue = getSyncQueue();
  if (queue.length === 0) {
    showToast('No hay cambios pendientes de sincronizar', '');
    return;
  }
  const data = JSON.stringify(queue, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rehabprint_sync_queue.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast(`📤 ${queue.length} cambios exportados. Ejecuta sync_sheets.py para subir a Google Sheets.`, 'success');
}

// ─── INVENTARIO DE STOCK 3D ──────────────────────────────
let inventory = [];

const DEFAULT_INVENTORY = [
  { id: 'INV-001', nombre: 'Adaptador de lápiz con mango', categoria: 'Ayuda técnica AVD', stock: 0, minStock: 2 },
  { id: 'INV-002', nombre: 'Adaptador de lápiz pelota', categoria: 'Ayuda técnica AVD', stock: 0, minStock: 2 },
  { id: 'INV-003', nombre: 'Adaptador de cubiertos con mango', categoria: 'Ayuda técnica AVD', stock: 0, minStock: 2 },
  { id: 'INV-004', nombre: 'Adaptador Universal (Adulto)', categoria: 'Ayuda técnica AVD', stock: 0, minStock: 3 },
  { id: 'INV-005', nombre: 'Adaptador Universal (Infantil)', categoria: 'Ayuda técnica AVD', stock: 0, minStock: 3 },
  { id: 'INV-006', nombre: 'Adaptador Universal con Mango (Adulto)', categoria: 'Ayuda técnica AVD', stock: 0, minStock: 2 },
  { id: 'INV-007', nombre: 'Extractor de pastillas', categoria: 'Ayuda técnica AVD', stock: 0, minStock: 2 },
  { id: 'INV-008', nombre: 'Adaptador corta uñas', categoria: 'Ayuda técnica AVD', stock: 0, minStock: 2 },
  { id: 'INV-009', nombre: 'Adaptador bolsa de compras (Talla S)', categoria: 'Ayuda técnica AVD', stock: 0, minStock: 2 },
  { id: 'INV-010', nombre: 'Adaptador bolsa de compras (Talla M)', categoria: 'Ayuda técnica AVD', stock: 0, minStock: 2 },
  { id: 'INV-011', nombre: 'Adaptador bolsa de compras (Talla L)', categoria: 'Ayuda técnica AVD', stock: 0, minStock: 2 },
  { id: 'INV-012', nombre: 'Adaptador de llaves', categoria: 'Ayuda técnica AVD', stock: 0, minStock: 2 },
  { id: 'INV-013', nombre: 'Abotonador', categoria: 'Ayuda técnica AVD', stock: 0, minStock: 2 },
  { id: 'INV-014', nombre: 'Cortador de frutas', categoria: 'Ayuda técnica AVD', stock: 0, minStock: 2 },
  { id: 'INV-015', nombre: 'Abridor de latas', categoria: 'Ayuda técnica AVD', stock: 0, minStock: 2 },
  { id: 'INV-016', nombre: 'Masajeador de cicatriz', categoria: 'Implemento de rehabilitación', stock: 0, minStock: 2 },
  { id: 'INV-017', nombre: 'Hand Grip', categoria: 'Implemento de rehabilitación', stock: 0, minStock: 3 },
  { id: 'INV-018', nombre: 'Tablero de motricidad con fósforos', categoria: 'Implemento de rehabilitación', stock: 0, minStock: 2 },
  { id: 'INV-019', nombre: 'Tablero extensor de dedos', categoria: 'Implemento de rehabilitación', stock: 0, minStock: 2 },
  { id: 'INV-020', nombre: 'Tablero de monedas', categoria: 'Implemento de rehabilitación', stock: 0, minStock: 2 },
  { id: 'INV-021', nombre: 'Jenga de gatitos', categoria: 'Implemento de rehabilitación', stock: 0, minStock: 2 },
  { id: 'INV-022', nombre: 'Tazos de discriminación táctil', categoria: 'Implemento de rehabilitación', stock: 0, minStock: 2 },
  { id: 'INV-023', nombre: 'Prono-supinador', categoria: 'Implemento de rehabilitación', stock: 0, minStock: 1 },
  { id: 'INV-024', nombre: 'Finger Grip', categoria: 'Implemento de rehabilitación', stock: 0, minStock: 2 },
  { id: 'INV-025', nombre: 'Encaje de tetris', categoria: 'Implemento de rehabilitación', stock: 0, minStock: 2 },
  { id: 'INV-026', nombre: 'Engranaje para mano', categoria: 'Implemento de rehabilitación', stock: 0, minStock: 2 },
  { id: 'INV-027', nombre: 'Vasos con pelotitas de colores', categoria: 'Implemento de rehabilitación', stock: 0, minStock: 2 },
  { id: 'INV-028', nombre: 'Enhebradores de animales', categoria: 'Implemento de rehabilitación', stock: 0, minStock: 2 },
  { id: 'INV-029', nombre: 'Juego tetris pequeño', categoria: 'Implemento de rehabilitación', stock: 0, minStock: 2 },
  { id: 'INV-030', nombre: 'Prueba de la Clavija de Nueve Agujeros (9-HPT)', categoria: 'Implemento de rehabilitación', stock: 0, minStock: 1 },
  { id: 'INV-031', nombre: 'Soporte de láminas', categoria: 'Implemento de rehabilitación', stock: 0, minStock: 2 },
  { id: 'INV-032', nombre: 'Ganchos individuales para pared', categoria: 'Accesorio / Repuesto', stock: 0, minStock: 2 },
  { id: 'INV-033', nombre: 'Gancho triple para pared', categoria: 'Accesorio / Repuesto', stock: 0, minStock: 2 },
  { id: 'INV-034', nombre: 'Encaje de figuras geométricas', categoria: 'Implemento de rehabilitación', stock: 0, minStock: 2 }
];

function resetInventoryToZero() {
  inventory = DEFAULT_INVENTORY.map(i => ({ ...i, stock: 0 }));
  saveInventoryToStorage();
  cloudSaveInventory();
  renderInventory();
  showToast('🧹 Inventario restablecido: Todas las piezas quedaron en 0 unidades', 'info');
}

function exportInventoryCSV() {
  loadInventory();
  let csv = 'ID,Nombre Pieza 3D,Categoría,Stock Actual (Físico),Mínimo Alerta,Estado Stock\n';
  inventory.forEach(item => {
    let estado = item.stock === 0 ? '🔴 AGOTADO' : item.stock <= item.minStock ? '⚠️ STOCK BAJO' : '🟢 DISPONIBLE';
    csv += `"${item.id}","${item.nombre}","${item.categoria}",${item.stock},${item.minStock},"${estado}"\n`;
  });
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'inventario_rehabprint_3d.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Inventario exportado en formato CSV para Google Sheets', 'success');
}

function cleanDeduplicateInventory(rawItems = []) {
  const map = new Map();
  DEFAULT_INVENTORY.forEach(def => {
    map.set(def.id, { ...def });
  });

  if (Array.isArray(rawItems)) {
    rawItems.forEach(item => {
      if (!item) return;
      const cleanName = item.nombre ? String(item.nombre).trim().toLowerCase() : '';
      const cleanId = item.id ? String(item.id).trim() : '';

      let foundKey = null;
      for (const [k, v] of map.entries()) {
        if ((cleanId && k === cleanId) || (cleanName && v.nombre.trim().toLowerCase() === cleanName)) {
          foundKey = k;
          break;
        }
      }

      if (foundKey) {
        const prev = map.get(foundKey);
        const stockNum = typeof item.stock === 'number' ? item.stock : parseInt(item.stock, 10);
        const minStockNum = typeof item.minStock === 'number' ? item.minStock : parseInt(item.minStock, 10);
        map.set(foundKey, {
          ...prev,
          stock: !isNaN(stockNum) ? stockNum : (prev.stock || 0),
          minStock: !isNaN(minStockNum) ? minStockNum : (prev.minStock || 2),
          categoria: item.categoria || prev.categoria
        });
      } else if (cleanName || cleanId) {
        const newId = cleanId || `INV-${String(map.size + 1).padStart(3, '0')}`;
        const stockNum = parseInt(item.stock, 10);
        const minStockNum = parseInt(item.minStock, 10);
        map.set(newId, {
          id: newId,
          nombre: item.nombre || 'Item Personalizado',
          categoria: item.categoria || 'General',
          stock: !isNaN(stockNum) ? stockNum : 0,
          minStock: !isNaN(minStockNum) ? minStockNum : 2
        });
      }
    });
  }

  return Array.from(map.values());
}

function loadInventory(forceReload = false) {
  if (inventory.length > 0 && !forceReload) {
    inventory = cleanDeduplicateInventory(inventory);
    return;
  }
  const saved = localStorage.getItem('rehabprint_inventory');
  let parsed = [];
  if (saved) {
    try { parsed = JSON.parse(saved); } catch (e) { parsed = []; }
  }
  inventory = cleanDeduplicateInventory(parsed);
  saveInventoryToStorage();
}

function saveInventoryToStorage() {
  localStorage.setItem('rehabprint_inventory', JSON.stringify(inventory));
}

function renderInventory() {
  loadInventory(false);

  const filterCat = document.getElementById('inv-filter-categoria')?.value || 'todos';
  const filterEst = document.getElementById('inv-filter-estado')?.value || 'todos';
  const searchQ = (document.getElementById('inv-search')?.value || '').toLowerCase();

  let list = [...inventory];
  if (filterCat !== 'todos') list = list.filter(i => i.categoria === filterCat);
  if (filterEst !== 'todos') {
    if (filterEst === 'disponible') list = list.filter(i => i.stock > i.minStock);
    else if (filterEst === 'bajo') list = list.filter(i => i.stock > 0 && i.stock <= i.minStock);
    else if (filterEst === 'agotado') list = list.filter(i => i.stock === 0);
  }
  if (searchQ) {
    list = list.filter(i => i.nombre.toLowerCase().includes(searchQ) || i.categoria.toLowerCase().includes(searchQ));
  }

  // KPIs
  updateInventoryKPIs();

  const grid = document.getElementById('inventory-grid');
  if (!grid) return;
  renderInventoryGrid(list);
}

function updateInventoryKPIs() {
  const totalTipos = inventory.length;
  const totalPiezas = inventory.reduce((acc, i) => acc + i.stock, 0);
  const bajoStock = inventory.filter(i => i.stock > 0 && i.stock <= i.minStock).length;
  const agotadas = inventory.filter(i => i.stock === 0).length;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('inv-kpi-total', totalTipos);
  setEl('inv-kpi-disponibles', totalPiezas);
  setEl('inv-kpi-bajas', bajoStock);
  setEl('inv-kpi-agotadas', agotadas);
  setEl('badge-inventario', totalPiezas);
}

function renderInventoryGrid(list) {
  const grid = document.getElementById('inventory-grid');
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📭</div><div class="empty-state-text">No hay piezas en el inventario con estos filtros</div></div>';
    return;
  }

  grid.innerHTML = list.map(item => {
    let statusBadge = '<span class="badge" style="color:#007F3B;background:#D1FAE5">🟢 Disponible</span>';
    let cardBorder = 'var(--border-color)';
    if (item.stock === 0) {
      statusBadge = '<span class="badge" style="color:#D5281B;background:#FEE2E2">🔴 Agotado</span>';
      cardBorder = '#FCA5A5';
    } else if (item.stock <= item.minStock) {
      statusBadge = '<span class="badge" style="color:#B45309;background:#FEF3C7">⚠️ Stock Bajo</span>';
      cardBorder = '#FDE047';
    }

    return `
      <div class="card" style="padding:16px;border:1px solid ${cardBorder};display:flex;flex-direction:column;gap:12px;background:#fff;border-radius:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div>
            <span style="font-size:11px;font-weight:700;color:var(--text-muted)">${item.id}</span>
            <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-top:2px">${item.nombre}</div>
          </div>
          ${statusBadge}
        </div>
        <div style="font-size:12px;color:var(--text-secondary)">🏷️ ${item.categoria}</div>
        
        <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-app);padding:10px 12px;border-radius:8px">
          <div>
            <div style="font-size:11px;color:var(--text-muted)">Stock Actual</div>
            <div style="font-size:20px;font-weight:800;color:var(--text-primary)">${item.stock} <span style="font-size:12px;font-weight:500;color:var(--text-muted)">unid.</span></div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:var(--text-muted)">Mínimo Alerta</div>
            <div style="font-size:13px;font-weight:600;color:var(--text-secondary)">${item.minStock} unid.</div>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:auto">
          <button class="btn btn-outline btn-sm" onclick="changeStock('${item.id}', -1)" style="flex:1;justify-content:center" ${item.stock === 0 ? 'disabled' : ''}>
            ➖ Entregar (-1)
          </button>
          <button class="btn btn-primary btn-sm" onclick="changeStock('${item.id}', 1)" style="flex:1;justify-content:center">
            ➕ Agregar (+1)
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function changeStock(itemId, delta) {
  // Si inventory está vacío (primera carga), leer desde localStorage
  if (inventory.length === 0) loadInventory(true);
  const item = inventory.find(i => i.id === itemId);
  if (!item) return;

  item.stock = Math.max(0, item.stock + delta);
  // Guardar en localStorage Y en la nube (compartido con todo el equipo)
  saveInventoryToStorage();
  cloudSaveInventory();

  // Re-renderizar sin recargar desde localStorage para no perder cambios
  const grid = document.getElementById('inventory-grid');
  if (grid) {
    const filterCat = document.getElementById('inv-filter-categoria')?.value || 'todos';
    const filterEst = document.getElementById('inv-filter-estado')?.value || 'todos';
    const searchQ = (document.getElementById('inv-search')?.value || '').toLowerCase();
    let list = [...inventory];
    if (filterCat !== 'todos') list = list.filter(i => i.categoria === filterCat);
    if (filterEst !== 'todos') {
      if (filterEst === 'disponible') list = list.filter(i => i.stock > i.minStock);
      else if (filterEst === 'bajo') list = list.filter(i => i.stock > 0 && i.stock <= i.minStock);
      else if (filterEst === 'agotado') list = list.filter(i => i.stock === 0);
    }
    if (searchQ) list = list.filter(i => i.nombre.toLowerCase().includes(searchQ) || i.categoria.toLowerCase().includes(searchQ));
    updateInventoryKPIs();
    renderInventoryGrid(list);
  }

  if (delta < 0) {
    showToast(`📦 Entregada 1 unidad de '${item.nombre}'. Stock actual: ${item.stock}`, 'info');
  } else {
    showToast(`✅ Agregada 1 unidad a '${item.nombre}'. Stock actual: ${item.stock}`, 'success');
  }
}

function openAddInventoryModal() {
  document.getElementById('inv-input-nombre').value = '';
  document.getElementById('inv-input-stock').value = '5';
  document.getElementById('inv-input-min').value = '2';
  document.getElementById('inv-modal-overlay').classList.add('active');
}

function closeInvModal(e) {
  if (e && e.target !== document.getElementById('inv-modal-overlay') && !e.target.classList.contains('btn')) return;
  document.getElementById('inv-modal-overlay').classList.remove('active');
}

function saveInventoryItem() {
  const nombre = document.getElementById('inv-input-nombre').value.trim();
  const categoria = document.getElementById('inv-input-categoria').value;
  const stock = parseInt(document.getElementById('inv-input-stock').value) || 0;
  const minStock = parseInt(document.getElementById('inv-input-min').value) || 2;

  if (!nombre) {
    showToast('Ingresa el nombre de la pieza 3D', 'warning');
    return;
  }

  loadInventory();
  const newId = `INV-${String(inventory.length + 1).padStart(3, '0')}`;
  inventory.push({ id: newId, nombre, categoria, stock, minStock });
  saveInventoryToStorage();

  document.getElementById('inv-modal-overlay').classList.remove('active');
  renderInventory();
  showToast(`✅ Pieza '${nombre}' agregada al inventario`, 'success');
}