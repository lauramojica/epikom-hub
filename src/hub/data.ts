import type { Client, User, ContentPost, Project, Notification, PhaseData } from "./types";

// ─── Users ────────────────────────────────────────────────────────────────────
export const initialUsers: User[] = [
  { id: "u1", name: "Ana Ríos", email: "ana@epikom.co", phone: "+57 310-555-0101", role: "superadmin", initials: "AR", color: "#dbfa45", assignedClientIds: [], alertThresholdDays: 3, emailNotifications: true, status: "active", joinDate: "2022-03-01", skills: ["Strategy", "Creative Direction", "Brand"], streak: 21 },
  { id: "u2", name: "Miguel Torres", email: "miguel@epikom.co", phone: "+57 314-555-0182", role: "admin", initials: "MT", color: "#31b498", assignedClientIds: ["c1","c2","c5"], alertThresholdDays: 3, emailNotifications: true, status: "active", joinDate: "2022-06-15", skills: ["Photography", "Reels", "UGC Direction"], streak: 14 },
  { id: "u3", name: "Valeria Chen", email: "valeria@epikom.co", phone: "+57 300-555-0947", role: "crew", initials: "VC", color: "#e040fb", assignedClientIds: ["c3","c4","c7"], alertThresholdDays: 2, emailNotifications: true, status: "active", joinDate: "2023-01-10", skills: ["Content Strategy", "Analytics", "Campaign Planning"], streak: 9 },
  { id: "u4", name: "Diego Martínez", email: "diego@epikom.co", phone: "+57 311-555-0371", role: "crew", initials: "DM", color: "#f59e0b", assignedClientIds: ["c6","c8","c9"], alertThresholdDays: 3, emailNotifications: false, status: "active", joinDate: "2023-04-20", skills: ["Video Editing", "Motion Graphics", "TikTok"], streak: 6 },
  { id: "u5", name: "Sara Kim", email: "sara@epikom.co", phone: "+57 316-555-0264", role: "crew", initials: "SK", color: "#22c55e", assignedClientIds: ["c10","c11"], alertThresholdDays: 1, emailNotifications: true, status: "away", joinDate: "2023-09-05", skills: ["Copywriting", "Community Management", "Brand Voice"], streak: 3 },
  { id: "u6", name: "Luis Okafor", email: "luis@epikom.co", phone: "+57 313-555-0813", role: "crew", initials: "LO", color: "#ff2d78", assignedClientIds: ["c1","c3","c6"], alertThresholdDays: 3, emailNotifications: false, status: "active", joinDate: "2024-02-01", skills: ["Visual Design", "Brand Guidelines", "Illustration"], streak: 18 },
  { id: "u7", name: "Carmen Reyes", email: "carmen@epikom.co", phone: "+57 318-555-0539", role: "crew", initials: "CR", color: "#a78bfa", assignedClientIds: ["c2","c5","c11"], alertThresholdDays: 3, emailNotifications: true, status: "offline", joinDate: "2022-11-15", skills: ["Engagement", "Moderation", "Customer Relations"], streak: 7 },
];

// ─── Clients (11) ─────────────────────────────────────────────────────────────
export const initialClients: Client[] = [
  {
    id: "c1", name: "Andrés Morales", company: "IG Sports", industry: "Sports & Apparel",
    email: "andres@igsports.co", phone: "+57 300-100-1001", initials: "IG", color: "#ef4444",
    language: "es", timezone: "America/Bogota",
    brandRules: { bannedWords: ["competidores", "barato", "ofertón"], guidelines: "Usar siempre fondo blanco en fotos de producto. Nunca mostrar ropa arrugada.", tone: "Energético, motivador, aspiracional", colors: [{ label: "Rojo principal", hex: "#ef4444" }, { label: "Negro", hex: "#111111" }, { label: "Blanco", hex: "#ffffff" }], fonts: [{ name: "Bebas Neue", weight: "Regular 400", usage: "Titulares y display" }, { name: "Inter", weight: "Medium 500", usage: "Cuerpo y UI" }] },
    contacts: [{ name: "Andrés Morales", role: "CEO", email: "andres@igsports.co", phone: "+57 300-100-1001" }, { name: "Camila Ruiz", role: "Marketing", email: "camila@igsports.co", phone: "+57 301-100-1002" }],
    interactions: [{ id: "i1", date: "2026-08-25", type: "meeting", notes: "Revisión de campaña Back-to-School. Aprueban el concepto de reels deportivos.", by: "Ana Ríos" }, { id: "i2", date: "2026-08-18", type: "email", notes: "Enviaron nuevas referencias de producto para septiembre.", by: "Miguel Torres" }],
    portalAccess: true, notifyEmail: true, projectIds: ["p1"],
  },
  {
    id: "c2", name: "Chef Ricardo Vargas", company: "La Farola del Chef", industry: "Food & Restaurant",
    email: "ricardovargas@lafarola.co", phone: "+57 312-200-2001", initials: "LF", color: "#f59e0b",
    language: "es", timezone: "America/Bogota",
    brandRules: { bannedWords: ["chatarra", "sintético", "enlatado"], guidelines: "Las fotos de comida deben mostrar vapores y texturas. Siempre luz natural o cálida.", tone: "Cálido, apetitoso, artesanal", colors: [{ label: "Ámbar", hex: "#f59e0b" }, { label: "Crema", hex: "#fef3c7" }, { label: "Café oscuro", hex: "#3b1a08" }], fonts: [{ name: "Playfair Display", weight: "Bold 700", usage: "Titulares" }, { name: "Lato", weight: "Regular 400", usage: "Cuerpo" }] },
    contacts: [{ name: "Ricardo Vargas", role: "Chef & Dueño", email: "ricardovargas@lafarola.co", phone: "+57 312-200-2001" }],
    interactions: [{ id: "i3", date: "2026-08-22", type: "call", notes: "Confirmaron menú especial de temporada para publicación semanal.", by: "Carmen Reyes" }],
    portalAccess: true, notifyEmail: true, projectIds: ["p2"],
  },
  {
    id: "c3", name: "Dra. Sofía Leal", company: "Clínica Dental Viva", industry: "Healthcare",
    email: "sofia@clinicaviva.co", phone: "+57 304-300-3001", initials: "DV", color: "#38bdf8",
    language: "es", timezone: "America/Bogota",
    brandRules: { bannedWords: ["dolor", "extracción", "sangrado"], guidelines: "Siempre mostrar sonrisas. Evitar imágenes de procedimientos. Colores pasteles y blancos.", tone: "Tranquilizador, profesional, cercano", colors: [{ label: "Azul cielo", hex: "#38bdf8" }, { label: "Blanco", hex: "#ffffff" }, { label: "Gris claro", hex: "#f1f5f9" }], fonts: [{ name: "Poppins", weight: "SemiBold 600", usage: "Titulares" }, { name: "Poppins", weight: "Regular 400", usage: "Cuerpo" }] },
    contacts: [{ name: "Dra. Sofía Leal", role: "Directora Médica", email: "sofia@clinicaviva.co", phone: "+57 304-300-3001" }, { name: "Luis Fernández", role: "Administración", email: "luis@clinicaviva.co", phone: "+57 304-300-3002" }],
    interactions: [{ id: "i4", date: "2026-08-20", type: "email", notes: "Solicitan contenido sobre blanqueamiento dental para agosto-septiembre.", by: "Valeria Chen" }],
    portalAccess: false, notifyEmail: true, projectIds: ["p3"],
  },
  {
    id: "c4", name: "Beatriz Herrera", company: "Casa Hogar Inmobiliaria", industry: "Real Estate",
    email: "beatriz@casahogar.co", phone: "+57 315-400-4001", initials: "CH", color: "#22c55e",
    language: "es", timezone: "America/Bogota",
    brandRules: { bannedWords: ["urgente", "remato", "baratísimo"], guidelines: "Mostrar propiedades con decoración. Nunca fotos de obra negra. Siempre incluir precio o CTA de consulta.", tone: "Aspiracional, confiable, premium", colors: [{ label: "Verde esmeralda", hex: "#22c55e" }, { label: "Blanco roto", hex: "#fafaf9" }, { label: "Gris oscuro", hex: "#292524" }], fonts: [{ name: "Cormorant Garamond", weight: "Bold 700", usage: "Titulares premium" }, { name: "Montserrat", weight: "Light 300", usage: "Subtítulos y cuerpo" }] },
    contacts: [{ name: "Beatriz Herrera", role: "Gerente General", email: "beatriz@casahogar.co", phone: "+57 315-400-4001" }],
    interactions: [{ id: "i5", date: "2026-08-15", type: "meeting", notes: "Presentamos propuesta para campaña de apartamentos nueva etapa.", by: "Valeria Chen" }],
    portalAccess: true, notifyEmail: false, projectIds: ["p4"],
  },
  {
    id: "c5", name: "Marcos Aguirre", company: "FitZone Academia", industry: "Fitness & Wellness",
    email: "marcos@fitzoneacademia.co", phone: "+57 321-500-5001", initials: "FZ", color: "#a78bfa",
    language: "es", timezone: "America/Bogota",
    brandRules: { bannedWords: ["gordo", "flaco", "feo"], guidelines: "Contenido inclusivo y motivador. Diversidad de cuerpos. Música enérgica en videos.", tone: "Motivador, inclusivo, energético", colors: [{ label: "Violeta", hex: "#a78bfa" }, { label: "Negro", hex: "#0f0f0f" }, { label: "Blanco", hex: "#ffffff" }], fonts: [{ name: "Oswald", weight: "Bold 700", usage: "Titulares" }, { name: "Nunito", weight: "Regular 400", usage: "Cuerpo" }] },
    contacts: [{ name: "Marcos Aguirre", role: "Fundador", email: "marcos@fitzoneacademia.co", phone: "+57 321-500-5001" }, { name: "Gina López", role: "Coordinadora", email: "gina@fitzoneacademia.co", phone: "+57 321-500-5002" }],
    interactions: [{ id: "i6", date: "2026-08-27", type: "call", notes: "Lanzan nueva clase de pilates reformer en septiembre. Necesitan contenido específico.", by: "Miguel Torres" }],
    portalAccess: true, notifyEmail: true, projectIds: ["p5"],
  },
  {
    id: "c6", name: "Isabella Moreno", company: "Tropika Moda", industry: "Fashion & Lifestyle",
    email: "isa@tropikamoda.co", phone: "+57 317-600-6001", initials: "TM", color: "#e040fb",
    language: "es", timezone: "America/Bogota",
    brandRules: { bannedWords: ["ganga", "saldo", "rebaja"], guidelines: "Estética editorial siempre. Fondo blanco o neutro. Modelos con actitud. Nunca fondos recargados.", tone: "Fashion-forward, aspiracional, moderno", colors: [{ label: "Magenta", hex: "#e040fb" }, { label: "Blanco", hex: "#ffffff" }, { label: "Arena", hex: "#f5f0e8" }], fonts: [{ name: "Didact Gothic", weight: "Regular 400", usage: "Display editorial" }, { name: "Helvetica Neue", weight: "Light 300", usage: "Cuerpo" }] },
    contacts: [{ name: "Isabella Moreno", role: "Directora Creativa", email: "isa@tropikamoda.co", phone: "+57 317-600-6001" }],
    interactions: [{ id: "i7", date: "2026-08-24", type: "email", notes: "Envían look book temporada otoño-invierno para crear contenido.", by: "Diego Martínez" }],
    portalAccess: true, notifyEmail: true, projectIds: ["p6"],
  },
  {
    id: "c7", name: "Germán Pinto", company: "AutoPlaza Colombia", industry: "Automotive",
    email: "german@autoplaza.co", phone: "+57 310-700-7001", initials: "AP", color: "#1e3a5f",
    language: "es", timezone: "America/Bogota",
    brandRules: { bannedWords: ["accidente", "falla", "recall"], guidelines: "Autos siempre limpios. Mostrar velocidad y lujo. Testimonios de clientes son clave.", tone: "Prestige, confiable, aspiracional", colors: [{ label: "Azul marino", hex: "#1e3a5f" }, { label: "Plateado", hex: "#c0c0c0" }, { label: "Negro", hex: "#0a0a0a" }], fonts: [{ name: "Barlow", weight: "SemiBold 600", usage: "Titulares" }, { name: "Barlow", weight: "Regular 400", usage: "Cuerpo" }] },
    contacts: [{ name: "Germán Pinto", role: "Gerente Comercial", email: "german@autoplaza.co", phone: "+57 310-700-7001" }, { name: "Patricia Salazar", role: "Marketing", email: "patricia@autoplaza.co", phone: "+57 310-700-7002" }],
    interactions: [{ id: "i8", date: "2026-08-19", type: "meeting", notes: "Revisión estrategia Q4. Nuevos modelos llegando en octubre.", by: "Valeria Chen" }],
    portalAccess: false, notifyEmail: true, projectIds: ["p7"],
  },
  {
    id: "c8", name: "Natalia Ospina", company: "Hotel Palmera Boutique", industry: "Hospitality",
    email: "natalia@hotelpalmera.co", phone: "+57 302-800-8001", initials: "HP", color: "#0d9488",
    language: "es", timezone: "America/Bogota",
    brandRules: { bannedWords: ["económico", "barato", "cupo"], guidelines: "Mostrar experiencias, no habitaciones vacías. Fotografías de alta gama. Siempre sunset o amanecer.", tone: "Exclusivo, relajante, experiencial", colors: [{ label: "Teal", hex: "#0d9488" }, { label: "Arena dorada", hex: "#f0e68c" }, { label: "Blanco", hex: "#ffffff" }], fonts: [{ name: "Garamond", weight: "Italic 400", usage: "Titulares" }, { name: "Gill Sans", weight: "Regular 400", usage: "Cuerpo" }] },
    contacts: [{ name: "Natalia Ospina", role: "Directora General", email: "natalia@hotelpalmera.co", phone: "+57 302-800-8001" }],
    interactions: [{ id: "i9", date: "2026-08-23", type: "call", notes: "Temporada alta diciembre-enero. Planificar contenido anticipado.", by: "Diego Martínez" }],
    portalAccess: true, notifyEmail: false, projectIds: ["p8"],
  },
  {
    id: "c9", name: "Padre Julio Méndez", company: "Farmacia San José", industry: "Pharmacy & Health",
    email: "julio@farmaciasanjose.co", phone: "+57 308-900-9001", initials: "SJ", color: "#16a34a",
    language: "es", timezone: "America/Bogota",
    brandRules: { bannedWords: ["cura", "milagro", "garantizado"], guidelines: "Nunca hacer afirmaciones médicas. Siempre recomendar consultar médico. Colores verde y blanco.", tone: "Confiable, cercano, informativo", colors: [{ label: "Verde salud", hex: "#16a34a" }, { label: "Blanco", hex: "#ffffff" }, { label: "Gris suave", hex: "#f9fafb" }], fonts: [{ name: "Source Sans Pro", weight: "Regular 400", usage: "Cuerpo" }, { name: "Source Sans Pro", weight: "SemiBold 600", usage: "Titulares" }] },
    contacts: [{ name: "Julio Méndez", role: "Propietario", email: "julio@farmaciasanjose.co", phone: "+57 308-900-9001" }, { name: "Ana Gómez", role: "Auxiliar", email: "ana@farmaciasanjose.co", phone: "+57 308-900-9002" }],
    interactions: [{ id: "i10", date: "2026-08-21", type: "email", notes: "Campaña de vacunas de temporada lista para publicar.", by: "Diego Martínez" }],
    portalAccess: false, notifyEmail: true, projectIds: ["p9"],
  },
  {
    id: "c10", name: "Abg. Felipe Romero", company: "Romero & Asociados Legal", industry: "Legal Services",
    email: "felipe@romeroasociados.co", phone: "+57 309-010-1001", initials: "RA", color: "#1e293b",
    language: "es", timezone: "America/Bogota",
    brandRules: { bannedWords: ["trampa", "ilegal", "fraude"], guidelines: "Tono serio y confiable. Nunca prometer resultados garantizados. Usar siempre colores corporativos.", tone: "Profesional, serio, confiable", colors: [{ label: "Azul corporativo", hex: "#1e293b" }, { label: "Dorado", hex: "#b8960c" }, { label: "Blanco", hex: "#ffffff" }], fonts: [{ name: "Merriweather", weight: "Bold 700", usage: "Titulares" }, { name: "Georgia", weight: "Regular 400", usage: "Cuerpo legal" }] },
    contacts: [{ name: "Felipe Romero", role: "Socio Principal", email: "felipe@romeroasociados.co", phone: "+57 309-010-1001" }],
    interactions: [{ id: "i11", date: "2026-08-17", type: "meeting", notes: "Necesitan posicionamiento como expertos en derecho corporativo.", by: "Sara Kim" }],
    portalAccess: false, notifyEmail: false, projectIds: ["p10"],
  },
  {
    id: "c11", name: "Laura Vega", company: "EcoTienda Verde", industry: "Eco & Sustainable",
    email: "laura@ecotiendaverde.co", phone: "+57 303-110-1101", initials: "EV", color: "#84cc16",
    language: "es", timezone: "America/Bogota",
    brandRules: { bannedWords: ["plástico", "desechable", "contaminante"], guidelines: "Siempre mostrar el producto en contexto natural. Colores tierra y verde. Mostrar certificaciones.", tone: "Consciente, auténtico, esperanzador", colors: [{ label: "Verde lima", hex: "#84cc16" }, { label: "Tierra", hex: "#92400e" }, { label: "Crema natural", hex: "#fefce8" }], fonts: [{ name: "DM Sans", weight: "Medium 500", usage: "Titulares" }, { name: "DM Sans", weight: "Regular 400", usage: "Cuerpo" }] },
    contacts: [{ name: "Laura Vega", role: "Fundadora", email: "laura@ecotiendaverde.co", phone: "+57 303-110-1101" }, { name: "Pablo Torres", role: "Logística", email: "pablo@ecotiendaverde.co", phone: "+57 303-110-1102" }],
    interactions: [{ id: "i12", date: "2026-08-26", type: "call", notes: "Quieren reforzar contenido de educación ambiental en septiembre.", by: "Sara Kim" }],
    portalAccess: true, notifyEmail: true, projectIds: ["p11"],
  },
];

// ─── Content Posts ─────────────────────────────────────────────────────────────
export const initialPosts: ContentPost[] = [
  // idea
  { id: "post1", clientId: "c1", title: "Colección Otoño — Teaser", channel: "Instagram", format: "reel", angle: "Reveal progresivo de la nueva colección con música intensa", copy: "¿Listos para lo que viene? 👀🔥 #IGSports", hashtags: ["#IGSports","#Coleccion","#Otoño"], brand: "IG Sports", product: "Colección Otoño", assigneeId: "u2", campaign: "Back to School", status: "idea", scheduledDate: "2026-09-08", notes: "" },
  { id: "post2", clientId: "c3", title: "Mitos del Blanqueamiento Dental", channel: "Instagram", format: "carrusel", angle: "5 mitos vs realidades sobre blanqueamiento dental", copy: "¿Qué es verdad y qué es mito? Te contamos todo 😁", hashtags: ["#SonrisaPerfecta","#Dental","#ClinicaViva"], brand: "Dental Viva", product: "Blanqueamiento", assigneeId: "u3", campaign: "Educación", status: "idea", scheduledDate: "2026-09-05", notes: "" },
  { id: "post3", clientId: "c11", title: "Por qué elegir empaque biodegradable", channel: "TikTok", format: "video", angle: "Behind the scenes del proceso de empaque sostenible", copy: "Así hacemos la diferencia en cada pedido 🌱", hashtags: ["#Sostenible","#EcoVerde","#ZeroWaste"], brand: "EcoTienda Verde", product: "Empaques", assigneeId: "u5", campaign: "Educación Ambiental", status: "idea", scheduledDate: "2026-09-10", notes: "" },

  // creation
  { id: "post4", clientId: "c2", title: "Nuevo Menú de Temporada", channel: "Instagram", format: "carrusel", angle: "Presentación de 6 nuevos platos con historia detrás de cada uno", copy: "La temporada llegó a nuestra mesa 🍽️ Cada plato, una historia...", hashtags: ["#LaFarola","#MenuTemporada","#GastronomiaBogota"], brand: "La Farola del Chef", product: "Menú Temporada", assigneeId: "u2", campaign: "Lanzamiento Menú", status: "creation", scheduledDate: "2026-09-01", notes: "Chef confirma disponibilidad para sesión fotográfica" },
  { id: "post5", clientId: "c5", title: "Clase de Pilates Reformer — Launch", channel: "Instagram", format: "reel", angle: "Primer vistazo a la nueva sala de reformer con clientes beta", copy: "🌟 NUEVO en FitZone: Pilates Reformer. Transforma tu cuerpo desde adentro.", hashtags: ["#FitZone","#PilatesReformer","#Bienestar"], brand: "FitZone", product: "Pilates Reformer", assigneeId: "u2", campaign: "Lanzamiento Pilates", status: "creation", scheduledDate: "2026-09-03", notes: "" },
  { id: "post6", clientId: "c8", title: "Sunset View — Habitación Premium", channel: "Instagram", format: "imagen", angle: "Shot editorial desde terraza con vista al atardecer", copy: "El paraíso tiene dirección 🌅 #HotelPalmera", hashtags: ["#HotelPalmera","#LuxuryTravel","#Colombia"], brand: "Hotel Palmera", product: "Habitación Premium", assigneeId: "u4", campaign: "Q4 Reservas", status: "creation", scheduledDate: "2026-09-12", notes: "" },

  // design
  { id: "post7", clientId: "c6", title: "Look de Temporada — Editorial", channel: "Instagram", format: "carrusel", angle: "Editorial fotográfico con 8 looks de la colección nueva", copy: "La nueva temporada llegó para quedarse ✨", hashtags: ["#TropikaModa","#Moda","#Estilo"], brand: "Tropika Moda", product: "Colección Nueva", assigneeId: "u4", campaign: "Lanzamiento Col.", status: "design", scheduledDate: "2026-08-31", notes: "Diseño en proceso — Lucho validando colores" },
  { id: "post8", clientId: "c7", title: "Nuevo Modelo 2026 — Reveal", channel: "Facebook", format: "video", angle: "Video cinemático del nuevo modelo con tomas aéreas", copy: "El futuro tiene cuatro ruedas. Descúbrelo en AutoPlaza 🚗✨", hashtags: ["#AutoPlaza","#NuevoModelo","#Colombia"], brand: "AutoPlaza", product: "Nuevo Modelo 2026", assigneeId: "u3", campaign: "Lanzamiento Q4", status: "design", scheduledDate: "2026-09-02", notes: "" },
  { id: "post9", clientId: "c4", title: "Apartamentos Etapa 3 — CTA", channel: "Instagram", format: "imagen", angle: "Foto del penthouse con CTA claro de separar", copy: "Tu nuevo hogar te espera. ¡Aparta ya! 🏙️", hashtags: ["#CasaHogar","#Apartamento","#Bogota"], brand: "Casa Hogar", product: "Etapa 3", assigneeId: "u3", campaign: "Ventas Etapa 3", status: "design", scheduledDate: "2026-09-04", notes: "" },

  // review
  { id: "post10", clientId: "c1", title: "Testimonio — Maratón Bogotá", channel: "TikTok", format: "reel", angle: "Corredor amateur comparte experiencia usando IG Sports en la maratón", copy: "42km con IG Sports. Esto es lo que significa rendimiento real 🏃", hashtags: ["#IGSports","#MaratonBogota","#Running"], brand: "IG Sports", product: "Running Collection", assigneeId: "u6", campaign: "User Stories", status: "review", scheduledDate: "2026-08-30", notes: "Esperando aprobación del cliente" },
  { id: "post11", clientId: "c9", title: "Campaña de Vacunación — Infografía", channel: "Facebook", format: "imagen", angle: "Infografía con calendario de vacunas y cómo acceder en farmacia", copy: "Protégete esta temporada 💉 Vacúnate con nosotros.", hashtags: ["#FarmaciaSanJose","#Vacunacion","#Salud"], brand: "Farmacia San José", product: "Vacunas", assigneeId: "u4", campaign: "Salud Preventiva", status: "review", scheduledDate: "2026-08-29", notes: "Revisión legal pendiente" },
  { id: "post12", clientId: "c10", title: "¿Cuándo necesitas un abogado?", channel: "LinkedIn", format: "carrusel", angle: "5 situaciones cotidianas donde necesitas asesoría legal", copy: "Proteger tus derechos no es opcional. ⚖️", hashtags: ["#RomeroAsociados","#Abogados","#Derecho"], brand: "Romero & Asoc.", product: "Consultoría", assigneeId: "u5", campaign: "Educación Legal", status: "review", scheduledDate: "2026-09-01", notes: "" },

  // approved
  { id: "post13", clientId: "c2", title: "Receta del Chef — Sopa de Tomate", channel: "TikTok", format: "reel", angle: "Chef Ricardo revela el secreto de su sopa de tomate en 60s", copy: "El secreto mejor guardado de La Farola, finalmente revelado 🍅", hashtags: ["#LaFarola","#RecetaDelChef","#Foodie"], brand: "La Farola del Chef", product: "Sopa de Tomate", assigneeId: "u5", campaign: "Contenido Orgánico", status: "approved", scheduledDate: "2026-08-29", notes: "" },
  { id: "post14", clientId: "c5", title: "Transformación 30 Días", channel: "Instagram", format: "carrusel", angle: "Antes y después de 3 miembros reales del gimnasio", copy: "30 días. 3 historias. Una sola decisión. 💪 #FitZone", hashtags: ["#FitZone","#Transformacion","#Fitness"], brand: "FitZone", product: "Membresía", assigneeId: "u7", campaign: "Social Proof", status: "approved", scheduledDate: "2026-09-03", notes: "" },
  { id: "post15", clientId: "c11", title: "Guía Minimalista — 5 Cambios Sostenibles", channel: "Instagram", format: "carrusel", angle: "5 cambios pequeños con gran impacto ambiental, con productos EcoVerde", copy: "El cambio empieza en casa 🏡🌿 Aquí te mostramos cómo.", hashtags: ["#EcoTienda","#Sostenibilidad","#MinimalismVerde"], brand: "EcoTienda Verde", product: "Kit Hogar", assigneeId: "u5", campaign: "Educación", status: "approved", scheduledDate: "2026-09-07", notes: "" },

  // scheduled
  { id: "post16", clientId: "c1", title: "Promo Maratón — 20% OFF", channel: "Instagram", format: "story", angle: "Story con countdown sticker y código de descuento", copy: "¡Solo por 48 horas! Código: MARATON20 🔥", hashtags: [], brand: "IG Sports", product: "Running Collection", assigneeId: "u2", campaign: "Back to School", status: "scheduled", scheduledDate: "2026-08-29", notes: "" },
  { id: "post17", clientId: "c4", title: "Tour Virtual — Penthouse", channel: "YouTube", format: "video", angle: "Recorrido en video 360° del penthouse más exclusivo", copy: "Recorre tu próximo hogar sin salir de casa 🏠", hashtags: ["#CasaHogar","#TourVirtual","#LuxuryLiving"], brand: "Casa Hogar", product: "Penthouse", assigneeId: "u4", campaign: "Ventas Etapa 3", status: "scheduled", scheduledDate: "2026-08-30", notes: "" },
  { id: "post18", clientId: "c8", title: "Paquete Romántico — Anuncio", channel: "Instagram", format: "reel", angle: "Video de pareja disfrutando el paquete romántico en el hotel", copy: "Porque los momentos especiales merecen el mejor lugar 🌹", hashtags: ["#HotelPalmera","#RomanticEscape","#Colombia"], brand: "Hotel Palmera", product: "Paquete Romántico", assigneeId: "u4", campaign: "Q4 Reservas", status: "scheduled", scheduledDate: "2026-08-31", notes: "" },

  // published
  { id: "post19", clientId: "c3", title: "Ortodoncia Invisible — Antes/Después", channel: "Instagram", format: "carrusel", angle: "3 casos reales de ortodoncia invisible con permiso del paciente", copy: "Sonríe sin complejos 😁 Conócenos y cambia tu vida.", hashtags: ["#ClinicaViva","#Ortodoncia","#SonrisaPerfecta"], brand: "Dental Viva", product: "Ortodoncia Invisible", assigneeId: "u6", campaign: "Casos de Éxito", status: "published", scheduledDate: "2026-08-25", publishedDate: "2026-08-25", reach: 4820, notes: "" },
  { id: "post20", clientId: "c6", title: "OOTD — Nueva Colección", channel: "TikTok", format: "reel", angle: "Influencer hace un OOTD con prendas de la nueva colección", copy: "De la pasarela a tu armario ✨ @tropikamoda", hashtags: ["#TropikaModa","#OOTD","#TikTokModa"], brand: "Tropika Moda", product: "Colección Nueva", assigneeId: "u4", campaign: "Lanzamiento Col.", status: "published", scheduledDate: "2026-08-26", publishedDate: "2026-08-26", reach: 12400, notes: "" },
  { id: "post21", clientId: "c7", title: "Testimonial — Cliente Satisfecho", channel: "Facebook", format: "video", angle: "Entrevista en cámara a cliente que compró su vehículo en AutoPlaza", copy: "Así es como se siente comprar tu sueño 🚗", hashtags: ["#AutoPlaza","#TestimonioReal"], brand: "AutoPlaza", product: "Vehículo", assigneeId: "u3", campaign: "Social Proof", status: "published", scheduledDate: "2026-08-27", publishedDate: "2026-08-27", reach: 7200, notes: "" },
];

// ─── Projects ──────────────────────────────────────────────────────────────────
const allPhases = (current: number): PhaseData[] => {
  const defs = [
    { key: "discovery", label: "Descubrimiento" },
    { key: "strategy", label: "Estrategia" },
    { key: "production", label: "Producción" },
    { key: "review", label: "Revisión" },
    { key: "launch", label: "Lanzamiento" },
    { key: "reporting", label: "Reportes" },
  ] as const;
  return defs.map((d, i) => ({ key: d.key, label: d.label, completedAt: i < current ? "2026-08-" + String(i + 1).padStart(2, "0") : undefined }));
};

export const initialProjects: Project[] = [
  { id: "p1", name: "Campaña Back to School", clientId: "c1", currentPhase: "production", phases: allPhases(2), deliverables: [{ id: "d1", title: "Brief creativo", status: "approved", dueDate: "2026-08-10", timeSpent: 3, comments: [] }, { id: "d2", title: "Pack de contenido reels", status: "in-review", dueDate: "2026-08-30", timeSpent: 12, comments: ["Cliente sugiere cambiar la música del reel 2"] }, { id: "d3", title: "Plan de pauta", status: "pending", dueDate: "2026-09-05", timeSpent: 0, comments: [] }], startDate: "2026-08-01", endDate: "2026-09-20", budget: 8500000, description: "Campaña integral para regreso a clases con foco en deportistas universitarios.", color: "#ef4444", status: "active" },
  { id: "p2", name: "Relanzamiento Menú Temporada", clientId: "c2", currentPhase: "strategy", phases: allPhases(1), deliverables: [{ id: "d4", title: "Propuesta de contenido", status: "approved", dueDate: "2026-08-20", timeSpent: 4, comments: [] }, { id: "d5", title: "Sesión fotográfica menú", status: "pending", dueDate: "2026-09-01", timeSpent: 0, comments: [] }], startDate: "2026-08-15", endDate: "2026-09-30", budget: 3200000, description: "Relanzamiento del menú de temporada con contenido gastronómico premium.", color: "#f59e0b", status: "active" },
  { id: "p3", name: "Posicionamiento Digital", clientId: "c3", currentPhase: "launch", phases: allPhases(4), deliverables: [{ id: "d6", title: "Branding digital", status: "approved", dueDate: "2026-07-15", timeSpent: 8, comments: [] }, { id: "d7", title: "Pack contenido educativo", status: "approved", dueDate: "2026-08-01", timeSpent: 16, comments: [] }, { id: "d8", title: "Reporte mensual", status: "in-review", dueDate: "2026-08-31", timeSpent: 2, comments: [] }], startDate: "2026-07-01", endDate: "2026-09-30", budget: 4800000, description: "Posicionamiento como clínica dental líder con contenido educativo.", color: "#38bdf8", status: "active" },
  { id: "p4", name: "Ventas Etapa 3", clientId: "c4", currentPhase: "review", phases: allPhases(3), deliverables: [{ id: "d9", title: "Videos 360°", status: "in-review", dueDate: "2026-08-28", timeSpent: 10, comments: ["Falta el tour del piso 12"] }, { id: "d10", title: "Pauta digital Facebook", status: "pending", dueDate: "2026-09-10", timeSpent: 0, comments: [] }], startDate: "2026-07-20", endDate: "2026-10-31", budget: 12000000, description: "Campaña de ventas de la tercera etapa del proyecto residencial.", color: "#22c55e", status: "active" },
  { id: "p5", name: "Lanzamiento Pilates Reformer", clientId: "c5", currentPhase: "production", phases: allPhases(2), deliverables: [{ id: "d11", title: "Contenido de lanzamiento", status: "in-review", dueDate: "2026-09-02", timeSpent: 6, comments: [] }], startDate: "2026-08-20", endDate: "2026-09-15", budget: 2500000, description: "Lanzamiento de la nueva sala de pilates reformer.", color: "#a78bfa", status: "active" },
  { id: "p6", name: "Colección Nueva — Editorial", clientId: "c6", currentPhase: "production", phases: allPhases(2), deliverables: [{ id: "d12", title: "Editorial fotográfico", status: "in-review", dueDate: "2026-08-31", timeSpent: 14, comments: ["Revisar iluminación fotos 3 y 7"] }], startDate: "2026-08-10", endDate: "2026-09-20", budget: 5500000, description: "Editorial para lanzamiento de colección otoño-invierno.", color: "#e040fb", status: "active" },
  { id: "p7", name: "Lanzamiento Modelo 2026", clientId: "c7", currentPhase: "strategy", phases: allPhases(1), deliverables: [{ id: "d13", title: "Brief de producto", status: "approved", dueDate: "2026-08-22", timeSpent: 3, comments: [] }], startDate: "2026-08-18", endDate: "2026-10-15", budget: 15000000, description: "Campaña de lanzamiento del nuevo modelo 2026.", color: "#1e3a5f", status: "active" },
  { id: "p8", name: "Campaña Q4 Temporada Alta", clientId: "c8", currentPhase: "discovery", phases: allPhases(0), deliverables: [{ id: "d14", title: "Diagnóstico de marca", status: "pending", dueDate: "2026-09-05", timeSpent: 0, comments: [] }], startDate: "2026-08-25", endDate: "2026-12-31", budget: 9000000, description: "Estrategia de contenido para la temporada alta diciembre-enero.", color: "#0d9488", status: "active" },
  { id: "p9", name: "Salud Preventiva Digital", clientId: "c9", currentPhase: "launch", phases: allPhases(4), deliverables: [{ id: "d15", title: "Pack informativo vacunas", status: "approved", dueDate: "2026-08-20", timeSpent: 5, comments: [] }], startDate: "2026-07-15", endDate: "2026-09-30", budget: 1800000, description: "Campaña de salud preventiva y posicionamiento local.", color: "#16a34a", status: "active" },
  { id: "p10", name: "Autoridad Legal Digital", clientId: "c10", currentPhase: "strategy", phases: allPhases(1), deliverables: [{ id: "d16", title: "Estrategia de contenido", status: "in-review", dueDate: "2026-08-30", timeSpent: 4, comments: [] }], startDate: "2026-08-12", endDate: "2026-11-30", budget: 4200000, description: "Posicionamiento como firma líder en derecho corporativo.", color: "#1e293b", status: "active" },
  { id: "p11", name: "Septiembre Verde", clientId: "c11", currentPhase: "production", phases: allPhases(2), deliverables: [{ id: "d17", title: "Contenido educativo ambiental", status: "pending", dueDate: "2026-09-08", timeSpent: 0, comments: [] }], startDate: "2026-08-22", endDate: "2026-09-30", budget: 2100000, description: "Campaña educativa y de ventas para septiembre sostenible.", color: "#84cc16", status: "active" },
];

// ─── Notifications ─────────────────────────────────────────────────────────────
export const initialNotifications: Notification[] = [
  { id: "n1", type: "alert", title: "Publicación en 24h", message: "«Promo Maratón — 20% OFF» (IG Sports) se publica mañana. ¿El contenido está listo?", timestamp: "2026-08-28T09:00:00", read: false, postId: "post16", clientId: "c1" },
  { id: "n2", type: "alert", title: "Publicación en 24h", message: "«Receta del Chef — Sopa de Tomate» (La Farola) se publica mañana.", timestamp: "2026-08-28T09:01:00", read: false, postId: "post13", clientId: "c2" },
  { id: "n3", type: "approval", title: "Entregable en revisión", message: "«Pack de contenido reels» (IG Sports) está esperando tu aprobación.", timestamp: "2026-08-28T08:30:00", read: false, projectId: "p1" },
  { id: "n4", type: "approval", title: "Entregable en revisión", message: "«Videos 360°» (Casa Hogar) fue enviado a revisión.", timestamp: "2026-08-27T17:15:00", read: false, projectId: "p4" },
  { id: "n5", type: "mention", title: "Mención en comentario", message: "Valeria Chen te mencionó en «Pack de contenido reels»: revisá la transición del reel 2.", timestamp: "2026-08-27T14:22:00", read: true, projectId: "p1" },
  { id: "n6", type: "publish", title: "Publicado exitosamente", message: "«Ortodoncia Invisible — Antes/Después» fue publicado. Alcance inicial: 4,820 personas.", timestamp: "2026-08-25T10:00:00", read: true, postId: "post19", clientId: "c3" },
  { id: "n7", type: "publish", title: "Publicado exitosamente", message: "«OOTD — Nueva Colección» fue publicado en TikTok. Alcance: 12,400 personas.", timestamp: "2026-08-26T11:30:00", read: true, postId: "post20", clientId: "c6" },
  { id: "n8", type: "system", title: "Resumen semanal disponible", message: "Tu resumen de la semana del 21 al 27 de agosto está listo en Analítica.", timestamp: "2026-08-28T07:00:00", read: false },
  { id: "n9", type: "alert", title: "Revisión legal pendiente", message: "«Campaña de Vacunación» (Farmacia San José) lleva 2 días en revisión.", timestamp: "2026-08-28T08:45:00", read: false, postId: "post11", clientId: "c9" },
];
