// RehabPrint IA — Datos de muestra basados en el Excel real
const ESTADOS = {
  NUEVA: 'Nueva solicitud',
  REVISADA: 'Revisada',
  DISENO: 'En diseño',
  IMPRESION: 'En impresión',
  POSTPROCESO: 'En postproceso',
  LISTA: 'Lista para entrega',
  ENTREGADA: 'Entregada',
  OBSERVADA: 'Observada / requiere ajuste',
  CANCELADA: 'Cancelada'
};

const PRIORIDAD = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' };
const AREAS = { TO: 'Terapia Ocupacional', KINE: 'Kinesiología', FONO: 'Fonoaudiología', OTRA: 'Otra' };
const DESTINO = { USUARIO: 'Usuario', UNIDAD: 'Unidad' };
const CONTEXTO = { AMBULATORIO: 'Ambulatorio', HOSPITALIZADO: 'Hospitalizado', CERRADA: 'Unidad cerrada' };
const CATEGORIA = {
  AVD: 'Ayuda técnica AVD',
  REHAB: 'Implemento de rehabilitación',
  STOCK: 'Stock de unidad',
  PERSONALIZADA: 'Pieza personalizada'
};

const solicitudes = [
  {
    id: 'RP-001', fechaSolicitud: '2025-04-10', fuenteRegistro: 'Google Forms',
    nombreSolicitante: 'Álvaro Muñoz Martínez', profesion: 'Terapeuta Ocupacional', area: AREAS.TO,
    destinoTipo: DESTINO.UNIDAD, contexto: CONTEXTO.CERRADA, unidadDestino: 'Cirugía (Módulos quirúrgicos A-B-C-D)',
    descripcionOriginal: 'Stock general para unidad quirúrgica: adaptadores de lápiz, cubiertos, abotonadores, hand grip, tableros de motricidad y monedas, finger grip.',
    categoriaIA: CATEGORIA.STOCK, piezaNormalizada: 'Kit stock unidad quirúrgica',
    prioridadIA: PRIORIDAD.ALTA, resumenIA: 'Solicitud de stock completo para unidad quirúrgica. Alta demanda de implementos AVD y de rehabilitación.',
    estadoCaso: ESTADOS.ENTREGADA, responsableActual: 'Fabian',
    fechaInicioTrabajo: '2025-04-11', fechaEntrega: '2025-04-28',
    implementosEntregados: 'Adaptador lápiz mango x3, Adaptador cubiertos x2, Abotonador x5, Hand Grip x3, Tablero monedas x2, Finger Grip x4',
    tiempoEsperaDias: 18, observacionesTecnicas: 'Entrega en 2 envíos por volumen.'
  },
  {
    id: 'RP-002', fechaSolicitud: '2025-05-03', fuenteRegistro: 'Google Forms',
    nombreSolicitante: 'María González Soto', profesion: 'Kinesiólogo', area: AREAS.KINE,
    destinoTipo: DESTINO.USUARIO, contexto: CONTEXTO.HOSPITALIZADO,
    nombreUsuario: 'Juan Pérez Alarcón', rutUsuario: '12.345.678-9', servicioSalaCama: 'Neurología / Sala 302 - Cama 3',
    descripcionOriginal: 'Paciente con secuela de ACV. Necesita Hand Grip tamaño medio y Finger Grip para trabajo de motricidad fina.',
    categoriaIA: CATEGORIA.REHAB, piezaNormalizada: 'Hand Grip + Finger Grip',
    prioridadIA: PRIORIDAD.ALTA, resumenIA: 'Paciente neurológico hospitalizado. Requiere implementos de rehabilitación de mano para motricidad fina post-ACV.',
    estadoCaso: ESTADOS.IMPRESION, responsableActual: 'Fabian',
    fechaInicioTrabajo: '2025-05-05', tiempoEsperaDias: 3,
    observacionesTecnicas: 'Imprimiendo en PLA azul médico.'
  },
  {
    id: 'RP-003', fechaSolicitud: '2025-05-08', fuenteRegistro: 'Google Forms',
    nombreSolicitante: 'Paula Rojas Mendez', profesion: 'Terapeuta Ocupacional', area: AREAS.TO,
    destinoTipo: DESTINO.USUARIO, contexto: CONTEXTO.AMBULATORIO,
    nombreUsuario: 'Ana Martínez Fuentes', rutUsuario: '9.876.543-2', servicioSalaCama: 'Poli TO',
    descripcionOriginal: 'Adulta mayor con artritis reumatoide. Solicita adaptador de cubiertos con mango y abotonador.',
    categoriaIA: CATEGORIA.AVD, piezaNormalizada: 'Adaptador cubiertos mango + Abotonador',
    prioridadIA: PRIORIDAD.MEDIA, resumenIA: 'Usuaria ambulatoria con dificultad de prensión por artritis. Ayudas técnicas para AVD básicas.',
    estadoCaso: ESTADOS.NUEVA, responsableActual: null,
    tiempoEsperaDias: 0, observacionesClinicas: 'Mano dominante derecha afectada.'
  },
  {
    id: 'RP-004', fechaSolicitud: '2025-05-10', fuenteRegistro: 'Google Forms',
    nombreSolicitante: 'Roberto Herrera Pinto', profesion: 'Fonoaudiólogo', area: AREAS.FONO,
    destinoTipo: DESTINO.UNIDAD, contexto: CONTEXTO.CERRADA, unidadDestino: 'Neurología adulto',
    descripcionOriginal: 'Necesitamos enhebradores de animales y tazos de discriminación táctil para trabajo de praxias manuales en poli fono.',
    categoriaIA: CATEGORIA.REHAB, piezaNormalizada: 'Enhebradores animales + Tazos discriminación táctil',
    prioridadIA: PRIORIDAD.MEDIA, resumenIA: 'Stock de implementos para unidad de fonoaudiología. Praxias manuales y discriminación táctil.',
    estadoCaso: ESTADOS.DISENO, responsableActual: 'Fabian',
    fechaInicioTrabajo: '2025-05-12', tiempoEsperaDias: 2,
    observacionesTecnicas: 'Diseñando en Tinkercad.'
  },
  {
    id: 'RP-005', fechaSolicitud: '2025-05-12', fuenteRegistro: 'Google Forms',
    nombreSolicitante: 'Sandra Pérez Lagos', profesion: 'Kinesiólogo', area: AREAS.KINE,
    destinoTipo: DESTINO.UNIDAD, contexto: CONTEXTO.CERRADA, unidadDestino: 'Traumatología',
    descripcionOriginal: 'Stock para unidad: prono-supinadores x3 y hand grip x5 para pacientes post-cirugía de mano.',
    categoriaIA: CATEGORIA.STOCK, piezaNormalizada: 'Prono-supinador x3 + Hand Grip x5',
    prioridadIA: PRIORIDAD.ALTA, resumenIA: 'Stock de rehabilitación para traumatología. Alta rotación de implementos de mano.',
    estadoCaso: ESTADOS.LISTA, responsableActual: 'Fabian',
    fechaInicioTrabajo: '2025-05-13', tiempoEsperaDias: 5,
    observacionesTecnicas: 'Piezas listas. Pendiente coordinación de entrega.'
  },
  {
    id: 'RP-006', fechaSolicitud: '2025-05-15', fuenteRegistro: 'Google Forms',
    nombreSolicitante: 'Diego Morales Bravo', profesion: 'Terapeuta Ocupacional', area: AREAS.TO,
    destinoTipo: DESTINO.USUARIO, contexto: CONTEXTO.HOSPITALIZADO,
    nombreUsuario: 'Carmen López Vera', rutUsuario: '15.432.876-1', servicioSalaCama: 'Medicina Interna / Sala 105 - Cama 7',
    descripcionOriginal: 'Paciente con hemiplejia derecha. Requiere abotonador y adaptador de bolsa de compras para AVD.',
    categoriaIA: CATEGORIA.AVD, piezaNormalizada: 'Abotonador + Adaptador bolsa compras',
    prioridadIA: PRIORIDAD.ALTA, resumenIA: 'Usuaria hospitalizada con hemiplejia. Ayudas técnicas urgentes para independencia en AVD.',
    estadoCaso: ESTADOS.NUEVA, responsableActual: null,
    tiempoEsperaDias: 0, observacionesClinicas: 'Alta programada en 5 días. Urgente.'
  },
  {
    id: 'RP-007', fechaSolicitud: '2025-05-18', fuenteRegistro: 'Google Forms',
    nombreSolicitante: 'Francisca Vega Araya', profesion: 'Terapeuta Ocupacional', area: AREAS.TO,
    destinoTipo: DESTINO.UNIDAD, contexto: CONTEXTO.CERRADA, unidadDestino: 'UCI',
    descripcionOriginal: 'Stock urgente para UCI: adaptadores universales y masajeadores de cicatriz.',
    categoriaIA: CATEGORIA.STOCK, piezaNormalizada: 'Adaptador universal x4 + Masajeador cicatriz x3',
    prioridadIA: PRIORIDAD.ALTA, resumenIA: 'UCI requiere stock urgente de implementos de movilización y cicatrización.',
    estadoCaso: ESTADOS.ENTREGADA, responsableActual: 'Fabian',
    fechaInicioTrabajo: '2025-05-18', fechaEntrega: '2025-05-22',
    implementosEntregados: 'Adaptador universal x4, Masajeador cicatriz x3',
    tiempoEsperaDias: 4, observacionesTecnicas: 'Prioridad UCI cumplida.'
  },
  {
    id: 'RP-008', fechaSolicitud: '2025-05-20', fuenteRegistro: 'Google Forms',
    nombreSolicitante: 'Andrés Castro Fuentes', profesion: 'Kinesiólogo', area: AREAS.KINE,
    destinoTipo: DESTINO.USUARIO, contexto: CONTEXTO.AMBULATORIO,
    nombreUsuario: 'Pedro Soto Ramírez', rutUsuario: '11.234.567-3', servicioSalaCama: 'Poli Kine',
    descripcionOriginal: 'Necesito prueba de clavija 9-HPT y tablero de monedas para evaluación de motricidad fina.',
    categoriaIA: CATEGORIA.REHAB, piezaNormalizada: 'Prueba 9-HPT + Tablero de monedas',
    prioridadIA: PRIORIDAD.MEDIA, resumenIA: 'Implementos de evaluación y rehabilitación de motricidad fina para paciente ambulatorio.',
    estadoCaso: ESTADOS.POSTPROCESO, responsableActual: 'Fabian',
    fechaInicioTrabajo: '2025-05-21', tiempoEsperaDias: 4,
    observacionesTecnicas: 'Piezas impresas. Limpiando soportes.'
  },
  {
    id: 'RP-009', fechaSolicitud: '2025-05-22', fuenteRegistro: 'Google Forms',
    nombreSolicitante: 'Lorena Muñoz Cisternas', profesion: 'Terapeuta Ocupacional', area: AREAS.TO,
    destinoTipo: DESTINO.USUARIO, contexto: CONTEXTO.HOSPITALIZADO,
    nombreUsuario: 'Isabel Díaz Torres', rutUsuario: '8.765.432-K', servicioSalaCama: 'Geriatría / Sala 201',
    descripcionOriginal: 'Adulta mayor 84 años con temblor esencial. Adaptador de lápiz con mango y adaptador tipo pelota.',
    categoriaIA: CATEGORIA.AVD, piezaNormalizada: 'Adaptador lápiz mango + Adaptador lápiz pelota',
    prioridadIA: PRIORIDAD.MEDIA, resumenIA: 'Adulta mayor con temblor. Ayudas para escritura y control de lápiz.',
    estadoCaso: ESTADOS.REVISADA, responsableActual: 'Fabian',
    tiempoEsperaDias: 1, observacionesClinicas: 'Tamaño de mango a confirmar con TO.'
  },
  {
    id: 'RP-010', fechaSolicitud: '2025-05-25', fuenteRegistro: 'Google Forms',
    nombreSolicitante: 'Sebastián Ramírez Orellana', profesion: 'Terapeuta Ocupacional', area: AREAS.TO,
    destinoTipo: DESTINO.UNIDAD, contexto: CONTEXTO.CERRADA, unidadDestino: 'Pediatría',
    descripcionOriginal: 'Para sala de rehabilitación pediátrica: Jenga de gatitos, encaje de tetris y encaje de figuras geométricas.',
    categoriaIA: CATEGORIA.REHAB, piezaNormalizada: 'Jenga gatitos + Encaje tetris + Encaje figuras',
    prioridadIA: PRIORIDAD.BAJA, resumenIA: 'Implementos lúdico-terapéuticos para rehabilitación pediátrica.',
    estadoCaso: ESTADOS.POSTPROCESO, responsableActual: 'Fabian',
    fechaInicioTrabajo: '2025-05-26', tiempoEsperaDias: 3,
    observacionesTecnicas: 'Colores vivos. Imprimiendo en PLA multicolor.'
  },
  {
    id: 'RP-011', fechaSolicitud: '2025-06-01', fuenteRegistro: 'Google Forms',
    nombreSolicitante: 'Valentina Torres Sánchez', profesion: 'Fonoaudiólogo', area: AREAS.FONO,
    destinoTipo: DESTINO.USUARIO, contexto: CONTEXTO.AMBULATORIO,
    nombreUsuario: 'José Martínez Aguirre', rutUsuario: '13.567.890-5', servicioSalaCama: 'Poli Fono',
    descripcionOriginal: 'Solicitud personalizada: soporte articulado para tablet que permita posicionar pantalla frente al paciente con movilidad reducida en brazos.',
    categoriaIA: CATEGORIA.PERSONALIZADA, piezaNormalizada: 'Soporte articulado tablet (personalizado)',
    prioridadIA: PRIORIDAD.MEDIA, resumenIA: 'Pieza personalizada para usuario con movilidad reducida en MMSS. Requiere revisión de diseño y medidas.',
    estadoCaso: ESTADOS.OBSERVADA, responsableActual: 'Fabian',
    tiempoEsperaDias: 7, observacionesTecnicas: 'Se necesitan medidas exactas del tablet y rango de movimiento del usuario.'
  },
  {
    id: 'RP-012', fechaSolicitud: '2025-06-05', fuenteRegistro: 'Google Forms',
    nombreSolicitante: 'Camila Fuentes Riquelme', profesion: 'Kinesiólogo', area: AREAS.KINE,
    destinoTipo: DESTINO.USUARIO, contexto: CONTEXTO.HOSPITALIZADO,
    nombreUsuario: 'Luis Herrera Campos', rutUsuario: '10.234.567-8', servicioSalaCama: 'Traumatología / Sala 4B - Cama 2',
    descripcionOriginal: 'Post cirugía de mano. Necesita prono-supinador y engranaje para mano.',
    categoriaIA: CATEGORIA.REHAB, piezaNormalizada: 'Prono-supinador + Engranaje para mano',
    prioridadIA: PRIORIDAD.ALTA, resumenIA: 'Rehabilitación de mano post-quirúrgica. Urgente por protocolo de kinesiterapia.',
    estadoCaso: ESTADOS.NUEVA, responsableActual: null,
    tiempoEsperaDias: 0, observacionesClinicas: 'Protocolo de RHB post-cirugía. Inicio en 48h.'
  }
];

// Estadísticas del dashboard
function getDashboardStats() {
  const hoy = solicitudes.filter(s => s.fechaSolicitud === '2025-06-05');
  return {
    nuevasHoy: solicitudes.filter(s => s.estadoCaso === ESTADOS.NUEVA).length,
    enProceso: solicitudes.filter(s => [ESTADOS.REVISADA, ESTADOS.DISENO, ESTADOS.IMPRESION, ESTADOS.POSTPROCESO].includes(s.estadoCaso)).length,
    listasEntrega: solicitudes.filter(s => s.estadoCaso === ESTADOS.LISTA).length,
    entregadas: solicitudes.filter(s => s.estadoCaso === ESTADOS.ENTREGADA).length,
    altaPrioridad: solicitudes.filter(s => s.prioridadIA === PRIORIDAD.ALTA && s.estadoCaso !== ESTADOS.ENTREGADA && s.estadoCaso !== ESTADOS.CANCELADA).length,
    observadas: solicitudes.filter(s => s.estadoCaso === ESTADOS.OBSERVADA).length,
    totalActivas: solicitudes.filter(s => s.estadoCaso !== ESTADOS.ENTREGADA && s.estadoCaso !== ESTADOS.CANCELADA).length
  };
}

// Colores por estado
const ESTADO_CONFIG = {
  [ESTADOS.NUEVA]: { color: '#6366F1', bg: '#EEF2FF', icon: '🆕' },
  [ESTADOS.REVISADA]: { color: '#0EA5E9', bg: '#E0F2FE', icon: '👁️' },
  [ESTADOS.DISENO]: { color: '#8B5CF6', bg: '#F5F3FF', icon: '✏️' },
  [ESTADOS.IMPRESION]: { color: '#F59E0B', bg: '#FFFBEB', icon: '🖨️' },
  [ESTADOS.POSTPROCESO]: { color: '#F97316', bg: '#FFF7ED', icon: '🔧' },
  [ESTADOS.LISTA]: { color: '#10B981', bg: '#ECFDF5', icon: '✅' },
  [ESTADOS.ENTREGADA]: { color: '#6B7280', bg: '#F9FAFB', icon: '📦' },
  [ESTADOS.OBSERVADA]: { color: '#EF4444', bg: '#FEF2F2', icon: '⚠️' },
  [ESTADOS.CANCELADA]: { color: '#9CA3AF', bg: '#F3F4F6', icon: '❌' }
};

const PRIORIDAD_CONFIG = {
  [PRIORIDAD.ALTA]: { color: '#DC2626', bg: '#FEE2E2', label: 'Alta' },
  [PRIORIDAD.MEDIA]: { color: '#D97706', bg: '#FEF3C7', label: 'Media' },
  [PRIORIDAD.BAJA]: { color: '#059669', bg: '#D1FAE5', label: 'Baja' }
};
