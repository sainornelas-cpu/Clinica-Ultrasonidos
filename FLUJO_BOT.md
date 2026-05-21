# Diagrama de Flujo - Bot de WhatsApp Dr. Baltierres

```
╔════════════════════════════════════════════════════════════════════════════╗
║                    BOT WHATSAPP - DIAGRAMA DE FLUJO                          ║
║                    Dr. Baltierres Ginecólogo Ultrasonido                      ║
╚════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════
                         1. MENÚ PRINCIPAL
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│  USUARIO ENVÍA MENSAJE                                                       │
│  (cualquier mensaje inicial)                                               │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  ¿Es primer mensaje?  │
              └──────────┬───────────┘
                         │
            ┌────────────┴────────────┐
            │ SÍ                      │ NO
            ▼                         ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  MOSTRAR BIENVENIDA +    │  │  LEER ESTADO ACTUAL      │
│  MENÚ PRINCIPAL          │  │  (de tabla users)         │
│                          │  └──────────┬───────────────┘
│  "Hola, buenos días.     │             │
│   Te atiende el          │             ▼
│   asistente virtual..."  │  ┌──────────────────────────┐
│                          │  │  ESTADO = IDLE           │
│  📋 Opciones:            │  └──────────┬───────────────┘
│  1️⃣ Agendar cita        │             │
│  2️⃣ Precios             │  ┌──────────┴───────────────┐
│  3️⃣ Servicios           │  │ ¿Es opción del menú?    │
│  4️⃣ Ubicación           │  │  (1-5)                   │
│  5️⃣ Horario             │  └──────────┬───────────────┘
│                          │             │
│  Estado: IDLE            │    ┌────────┴────────┐
│  Guardar log usuario     │    │ SÍ             │ NO
└──────────────────────────┘    ▼                ▼
                    ┌──────────────┐  ┌──────────────────┐
                    │ PROCESAR    │  │ ¿Contiene        │
                    │ OPCIÓN      │  │ "agendar/cita"? │
                    └──────┬───────┘  └────────┬─────────┘
                           │                   │
                           └─────────┬─────────┘
                                     │
                                     ▼
                    ┌──────────────────────────────────┐
                    │  CONTINUAR SEGÚN ESTADO ACTUAL   │
                    └──────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════
                         2. PROCESAR OPCIÓN 1 (AGENDAR)
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│  USUARIO ENVÍA: "1"                                                       │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  ACTUALIZAR ESTADO   │
              │  BOOKING_NAME       │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  RESPONDER:           │
              │  "Para agendar tu    │
              │   cita necesito..."  │
              │  "Escribe tu nombre  │
              │   completo"          │
              └──────────┬───────────┘
                         │
                         ▼
              Guardar log assistant (state: booking_name)


═══════════════════════════════════════════════════════════════════════════
                         3. FLUJO DE AGENDAMIENTO
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│  ESTADO: BOOKING_NAME                                                       │
│  USUARIO ENVÍA NOMBRE                                                        │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  GUARDAR NOMBRE EN   │
              │  users.full_name     │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  ACTUALIZAR ESTADO   │
              │  BOOKING_SERVICE     │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  RESPONDER:           │
              │  "✅ Nombre registrado│
              │   Selecciona servicio│
              │   1-5"                 │
              └──────────┬───────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│  ESTADO: BOOKING_SERVICE                                                    │
│  USUARIO ENVÍA SERVICIO (1-5)                                               │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  VALIDAR OPCIÓN      │
              └──────────┬───────────┘
                         │
            ┌────────────┴────────────┐
            │ VÁLIDA                   │ INVÁLIDA
            ▼                         ▼
┌──────────────────────┐  ┌──────────────────────┐
│ GUARDAR SERVICIO EN  │  │ RESPONDER:           │
│ interaction_logs     │  │ "❌ Opción no válida  │
│ (booking_data_...)   │  │  Selecciona 1-5"      │
└──────────┬───────────┘  └──────────┬───────────┘
           │                         │
           ▼                         │
┌──────────────────────┐             │
│ ACTUALIZAR ESTADO     │             │
│ BOOKING_DATE         │             │
└──────────┬───────────┘             │
           │                         │
           ▼                         │
┌──────────────────────┐             │
│ RESPONDER:           │             │
│ "✅ Servicio         │             │
│  seleccionado..."    │             │
│ "Indica fecha y hora"│             │
└──────────┬───────────┘             │
           │                         │
           └──────────┬──────────────┘
                      │
                      ▼


┌─────────────────────────────────────────────────────────────────────────┐
│  ESTADO: BOOKING_DATE                                                        │
│  USUARIO ENVÍA FECHA/HORA                                                    │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  RECUPERAR SERVICIO   │
              │  (booking_data)       │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  ⚠️ VERIFICAR          │
              │  DISPONIBILIDAD       │
              └──────────┬───────────┘
                         │
              ┌──────────┴──────────┐
              │ DISPONIBLE          │ NO DISPONIBLE
              ▼                     ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  CREAR CITA              │  │  RESPONDER:                │
│  EN appointments         │  │  "❌ Horario no disponible"  │
│  (con user_id)           │  │  "Horarios disponibles:"    │
│                          │  │  • Mañana 10:00 AM         │
│  ID: generated           │  │  • Mañana 2:00 PM          │
│  user_id: userId         │  │  • Viernes 9:00 AM         │
│  service_name: nombre    │  │                            │
│  start_time: parsed      │  │  Estado: BOOKING_DATE      │
│  end_time: parsed        │  └──────────────────────────┘
│  status: confirmed       │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ ACTUALIZAR ESTADO        │
│ IDLE                      │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ RESPONDER:               │
│ "✅ Cita confirmada"      │
│ Resumen de cita          │
│                           │
│ "¿Algo más en lo que     │
│  pueda ayudarte?"         │
│                           │
│ 📋 Opciones:              │
│ 1️⃣ Agendar otra cita     │
│ 2️⃣ Ver mis citas         │
│ 3️⃣ Volver al menú        │
└──────────┬───────────────┘
           │
           ▼
    Guardar log assistant
    (state: idle)


═══════════════════════════════════════════════════════════════════════════
                         4. RESPUESTA A CONFIRMACIÓN
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│  USUARIO RESPONDE A "¿Algo más en lo que pueda ayudarte?"                │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  ESTADO = IDLE        │
              │  (después de cita)   │
              └──────────┬───────────┘
                         │
            ┌────────────┴────────────┬────────────┬────────────┐
            │ "1"/"si"/                │ "2"/        │ "3"/
            │ "agendar"                │ "mis citas"  │ "menu"
            ▼                         ▼             ▼
┌───────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ INICIAR NUEVO      │  │ VER CITAS        │  │ MOSTRAR MENÚ      │
│ FLUJO AGENDAR      │  │ USUARIO          │  │ PRINCIPAL         │
│ (como paso 2)      │  │                  │  │                   │
└───────────────────┘  └──────────────────┘  └───────────────────┘


═══════════════════════════════════════════════════════════════════════════
                         5. VERIFICACIÓN DE DISPONIBILIDAD
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│  FUNCIÓN: checkAvailability(date, service, duration)                      │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  OBTENER CITAS       │
              │  EXISTENTES ESE DÍA  │
              │  (FROM appointments)  │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  HORARIO CLÍNICA:     │
              │  Lun-Vie: 9-19       │
              │  Sáb: 9-14           │
              │  Dom: CERRADO        │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  GENERAR SLOTS DE    │
              │  30 MIN              │
              │  (ej: 9:00, 9:30...) │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  FILTRAR SLOTS        │
              │  OCUPADOS            │
              └──────────┬───────────┘
                         │
            ┌────────────┴────────────┐
            │ HAY SLOTS               │ NO SLOTS
            ▼                         ▼
┌───────────────────┐  ┌──────────────────────────┐
│ RETORNAR SLOTS    │  │ RESPONDER:                │
│ DISPONIBLES       │  │ "❌ No hay horarios        │
│                   │  │  disponibles ese día"    │
│ "✅ Horarios       │  │  "¿Te gustaría agendar    │
│  disponibles:"     │  │  otro día?"                │
│  • 10:00 AM        │  │                           │
│  • 11:30 AM        │  │  [Mostrar fechas cercanas] │
│  • 3:00 PM"        │  └──────────────────────────┘
└───────────────────┘


═══════════════════════════════════════════════════════════════════════════
                         6. ESTADOS DE CONVERSIACIÓN
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│  ESTADO          │ TRANSICIÓN                        │ ACCIÓN               │
├─────────────────────────────────────────────────────────────────────────┤
│  IDLE            │ → BOOKING_NAME (opción 1)       │ Agendar cita        │
│                  │ → IDLE (opciones 2-5)           │ Menú informativo     │
│                  │ → IDLE (otro mensaje)           │ Mostrar menú         │
├─────────────────────────────────────────────────────────────────────────┤
│  BOOKING_NAME    │ → BOOKING_SERVICE (nombre)     │ Guardar nombre       │
│                  │ → BOOKING_NAME (otro mensaje)   │ Volver a pedir nombre │
├─────────────────────────────────────────────────────────────────────────┤
│  BOOKING_SERVICE │ → BOOKING_DATE (1-5)            │ Guardar servicio      │
│                  │ → BOOKING_SERVICE (otro mensaje)│ Opción inválida       │
├─────────────────────────────────────────────────────────────────────────┤
│  BOOKING_DATE    │ → IDLE (cita creada)            │ Crear cita           │
│                  │ → BOOKING_DATE (reintentar)     │ Volver a pedir fecha  │
├─────────────────────────────────────────────────────────────────────────┤
│  PROCESSING      │ → ESTADO_FINAL                   │ Estado intermedio     │
└─────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════
                         7. REGLAS CLAVE
═══════════════════════════════════════════════════════════════════════════

1. **Estado de autoridad**: Siempre leer `conversation_state` de tabla `users`

2. **Prioridad de respuestas**:
   - Flujo booking activo > Opción menú > Comandos generales > OpenAI

3. **Logs requeridos**:
   - Cada mensaje del usuario (role: user, state_before, state_after)
   - Cada respuesta del bot (role: assistant, state_before, state_after)
   - Datos de booking (role: system, content: booking_data_*)

4. **Validaciones**:
   - Opción de servicio: debe ser 1-5
   - Fecha: debe ser válida y futura
   - Disponibilidad: verificar antes de agendar

5. **User ID**:
   - Se crea cuando usuario envía primer mensaje
   - Se guarda en `appointments.user_id` al crear cita
   - Siempre disponible en cada interacción

6. **Reset al menú**:
   - Después de cita confirmada: mostrar menú o pregunta
   - Si usuario responde "sí"/"agendar": iniciar nuevo flujo
   - Si usuario responde cualquier cosa: mostrar menú principal


═══════════════════════════════════════════════════════════════════════════
                         8. ESTRUCTURA DE DATOS
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│  TABLA: users                                                                │
├─────────────────────────────────────────────────────────────────────────┤
│  id: UUID              (PK)                                                   │
│  phone_number: VARCHAR  (único)                                            │
│  full_name: VARCHAR                                                           │
│  conversation_state: VARCHAR  (idle, booking_name, ...)                      │
│  timezone: VARCHAR                                                            │
│  trust_score: FLOAT                                                           │
│  created_at: TIMESTAMP                                                         │
│  updated_at: TIMESTAMP                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  TABLA: appointments                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  id: UUID                  (PK)                                               │
│  user_id: UUID              (FK → users.id)                                │
│  owner_id: UUID            (ID del doctor)                                  │
│  service_id: VARCHAR                                                          │
│  service_name: VARCHAR                                                        │
│  duration_minutes: INT                                                       │
│  start_time: TIMESTAMP                                                        │
│  end_time: TIMESTAMP                                                          │
│  status: VARCHAR            (confirmed, cancelled, rescheduled)            │
│  calendar_event_id: VARCHAR                                                   │
│  calendar_provider: VARCHAR                                                   │
│  notes: TEXT                                                                │
│  changed_by: VARCHAR                                                         │
│  created_at: TIMESTAMP                                                        │
│  updated_at: TIMESTAMP                                                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  TABLA: interaction_logs                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  id: UUID              (PK)                                                   │
│  user_id: UUID          (FK → users.id)                                    │
│  role: VARCHAR          (user, assistant, system)                          │
│  content: TEXT                                                                │
│  intent_detected: VARCHAR                                                     │
│  state_before: VARCHAR                                                         │
│  state_after: VARCHAR                                                          │
│  created_at: TIMESTAMP                                                        │
└─────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════
                         9. PSEUDOCÓDIGO PRINCIPAL
═══════════════════════════════════════════════════════════════════════════

function handleMessage(phone, message):
    user = getOrCreateUser(phone)
    state = user.conversation_state || IDLE
    isFirstMessage = hasNoLogs(user.id)

    // Guardar log del usuario
    saveLog(user.id, 'user', message, state, PROCESSING)

    // Generar respuesta
    response = generateResponse(message, state, user, isFirstMessage)

    // Leer estado final y guardar log del bot
    finalState = getUserState(user.id)
    saveLog(user.id, 'assistant', response, state, finalState)

    // Enviar a WhatsApp
    sendWhatsApp(phone, response)
    return OK


function generateResponse(message, state, user, isFirst):
    trimmed = message.trim().toLowerCase()

    // PRIORIDAD 1: Flujo de booking activo
    if state in [BOOKING_NAME, BOOKING_SERVICE, BOOKING_DATE]:
        return handleBookingFlow(message, state, user)

    // PRIORIDAD 2: Primer mensaje
    if isFirstMessage:
        return WELCOME_MESSAGE

    // PRIORIDAD 3: Usuario quiere agendar
    if 'agendar' in message or 'cita' in message:
        if state == IDLE:
            updateState(user.id, BOOKING_NAME)
            return BOOKING_NAME_PROMPT

    // PRIORIDAD 4: Opciones del menú
    if message in ['1', '2', '3', '4', '5']:
        return handleMenuOption(message, user)

    // PRIORIDAD 5: Comandos generales
    if 'mis citas' in message:
        return getUserAppointments(user.id)
    if 'cancelar' in message:
        return handleCancel(user.id)

    // PRIORIDAD 6: Mensaje genérico en idle
    if state == IDLE:
        return WELCOME_MESSAGE

    // FALLBACK
    return getOpenAIResponse(message, user)


function handleBookingFlow(message, state, user):
    switch state:
        case BOOKING_NAME:
            saveUserName(user.id, message)
            updateState(user.id, BOOKING_SERVICE)
            return BOOKING_SERVICE_PROMPT

        case BOOKING_SERVICE:
            if message not in SERVICES:
                return INVALID_OPTION
            saveBookingData(user.id, 'service', SERVICES[message])
            updateState(user.id, BOOKING_DATE)
            return BOOKING_DATE_PROMPT

        case BOOKING_DATE:
            service = getBookingData(user.id).service

            // ⚠️ VERIFICAR DISPONIBILIDAD
            available = checkAvailability(message, service.duration)
            if not available:
                return NO_SLOTS_MESSAGE

            // Crear cita
            appointment = createAppointment(
                user_id: user.id,      # ← USER ID SE GUARDA AQUÍ
                service: service.name,
                date: message
            )

            updateState(user.id, IDLE)
            return CONFIRMATION_MESSAGE + MENU_PROMPT


function checkAvailability(date, duration):
    existing = getAppointmentsByDate(date)
    slots = generateSlots(date, duration)

    for slot in slots:
        if not overlapsWithExisting(slot, existing):
            return slot

    return null