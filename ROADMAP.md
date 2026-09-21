# Roadmap: Mi Día

Mi Día es una PWA mobile-first para organización personal diaria. Está pensada para una sola persona, con contenido privado, autenticación y una experiencia breve que ayude a elegir y completar las prioridades del día.

## Dirección del producto

- Español como idioma principal; se conserva i18n para inglés.
- Experiencia mobile-first, con navegación inferior en móvil y sidebar en escritorio.
- Tema claro, oscuro y automático.
- Núcleo inicial: tareas, áreas, Top 3, timeline, progreso y cierre del día.
- Hábitos, finanzas, Google Calendar, multiusuario e IA de planificación quedan fuera del MVP.
- “Life Organizer” es el nombre técnico heredado; la experiencia visible debe converger hacia “Mi Día”.

## Estado actual

### Implementado

- [x] Next.js App Router con rutas localizadas.
- [x] Supabase SSR, sesiones y RLS para los modelos existentes.
- [x] Autenticación por email y contraseña.
- [x] CRUD básico de tareas y hábitos.
- [x] Registros de cumplimiento de hábitos.
- [x] Diccionarios `en` y `es`.
- [x] Primera versión de “Hoy” con progreso, Top 3, timeline y pendientes.
- [x] Migración inicial del dominio de Mi Día: áreas, campos avanzados de tareas, reviews, puntos y logros.

### Parcial

- [x] El dashboard ya es el punto de partida de “Hoy”, con captura rápida, selección/reordenación del Top 3 y estados básicos de error.
- [x] Existe un perfil mínimo con nombre visible, zona horaria, tema, áreas y preferencias.
- [x] Existe `is_reminder`, permisos de navegador, almacenamiento de suscripciones y núcleo de entrega Web Push.
- [ ] Falta publicar el workflow de cron y verificar una entrega real en la Edge Function ya desplegada y probada.
- [ ] La UI es responsive, pero aún no tiene la shell mobile-first final.
- [x] `description` se conserva por compatibilidad; formularios y lecturas usan `notes` y los datos existentes fueron migrados.
- [x] La autenticación funciona con contraseña y magic link; Google depende de configurar OAuth en Supabase.

## Fases de construcción

### Fase 0: Foundation de Mi Día

- [ ] Definir navegación: Hoy, Calendario, Progreso, Ajustes y acción rápida central.
- [ ] Consolidar tokens visuales, estados de carga/error/vacío y accesibilidad.
- [ ] Definir cálculo de “hoy” usando la zona horaria del perfil.
- [ ] Mantener hábitos fuera de las primeras pantallas de Mi Día, sin eliminar su código existente.

**Criterio de salida:** la shell funciona en móvil y escritorio, los estados principales son accesibles y las fechas no dependen accidentalmente de UTC.

### Fase 1: Autenticación y dominio de datos

- [x] Añadir `areas` con nombre, color, icono y objetivo.
- [x] Ampliar `tasks` con notas, área, prioridad, estado, horario, duración, Top 3 y recurrencia.
- [x] Añadir `daily_reviews`, `user_points`, `achievements` y `user_achievements`.
- [x] Añadir preferencias de perfil para zona horaria, tema y notificaciones.
- [x] Validar en Supabase Cloud el aislamiento RLS de tareas, eventos de completado y puntos con usuarios separados.
- [x] Completar la migración de `description` a `notes` sin romper datos existentes.
- [x] Añadir magic link; habilitar Google solo si la configuración OAuth está disponible.

**Criterio de salida:** un usuario autenticado puede crear y leer solo sus datos, y una tarea conserva un estado coherente entre `status` y `completed_at`.

### Fase 2: Hoy

- [x] Mostrar fecha localizada y saludo personalizado.
- [x] Mostrar anillo de progreso diario.
- [x] Mostrar Top 3 y timeline ordenado.
- [x] Mostrar tareas pendientes sin fecha.
- [x] Crear captura rápida en modal con autofocus.
- [x] Permitir seleccionar, editar y reordenar el Top 3.
- [x] Añadir filtros por área, prioridad y estado.

**Criterio de salida:** completar una tarea actualiza la lista y el porcentaje sin perder contexto ni afectar datos de otro usuario.

### Fase 3: Interacciones y cierre del día

- [x] Añadir posponer a mañana.
- [x] Permitir elegir fecha y eliminar mediante controles accesibles.
- [x] Añadir recurrencia diaria, semanal y mensual.
- [x] Añadir tachado, confetti al completar el Top 3 y háptica opcional.
- [x] Mostrar estados básicos de error.
- [x] Otorgar puntos de forma idempotente y actualizar rachas por fecha local.
- [x] Crear formulario de review diaria de un minuto.

**Riesgos:** doble asignación de puntos, cambios de zona horaria, accesibilidad de gestos y sincronización de tareas recurrentes.

### Fase 4: Calendario

- [x] Vista semanal en móvil.
- [x] Vista mensual en escritorio.
- [x] Navegar a un día y crear/editar tareas desde ese contexto.
- [x] Mostrar carga diaria y colores de áreas.

**Criterio de salida:** el mismo dato de tarea se representa igual en Hoy, Calendario y la captura rápida.

### Fase 5: Progreso

- [x] Gráfico semanal de tareas completadas por día.
- [x] Racha actual y puntos acumulados.
- [x] Logros: primera tarea, racha de 3 días, semana perfecta y 10 tareas en un día.
- [x] Resumen semanal por área.

### Fase 6: Ajustes

- [x] Perfil: nombre visible y zona horaria.
- [x] Gestión de áreas con color, icono y objetivo.
- [x] Tema claro, oscuro y automático.
- [x] Activar/desactivar recordatorios.
- [x] Cerrar sesión.

### Fase 7: PWA y notificaciones

- [x] Manifest con iconos 192, 512 y maskable; `display: standalone` y `theme_color` índigo.
- [ ] Service worker para cachear el app shell (fallback offline y assets estáticos implementados; falta cachear una shell navegable).
- [x] Definir datos guardados y límites del modo offline antes de implementar sincronización. Ver `OFFLINE.md`.
- [x] Solicitar permiso de notificaciones de forma explícita.
- [ ] Programar recordatorios, resumen matutino y cierre nocturno mediante proveedor/cron.

**Criterio de salida:** la app es instalable, el shell puede abrirse sin red y las notificaciones fallan de forma visible y recuperable cuando no hay permisos.

## Después del MVP

- [ ] Hábitos y analítica de hábitos.
- [ ] Notas/knowledge base.
- [ ] Google Calendar y otras integraciones.
- [ ] Finanzas.
- [ ] Multiusuario y colaboración.
- [ ] IA para planificación, smart scheduling y voz.
- [ ] Plantillas y rutinas compartibles.
- [ ] Informes de auditoría de vida.

## Reglas de implementación

- Mantener RLS y verificar `user_id` en cada acción de servidor.
- Usar resultados `{ success: true }` o `{ error: string }` en Server Actions.
- Revalidar rutas localizadas después de cada mutación.
- Probar móvil y escritorio para cada pantalla nueva.
- Preferir una app online estable antes de añadir sincronización offline completa.
