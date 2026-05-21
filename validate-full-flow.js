// Validación completa del flujo del bot
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://heubgudergnidbxyfhqq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhldWJndWRlcmduaWRieHlmaHFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA3ODUzNiwiZXhwIjoyMDkwNjU0NTM2fQ.YYWljfIF2WH-Hq8X6hiTdfVceb4-4mNPy7re4nIfav8'

const TEST_PHONE = '52177777777' // Número de prueba único

const CONVERSATION_STATES = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  BOOKING_NAME: 'booking_name',
  BOOKING_SERVICE: 'booking_service',
  BOOKING_DATE: 'booking_date'
}

const SERVICES = {
  '1': { name: 'Consulta General', price: '$500', duration: 30 },
  '2': { name: 'Ultrasonido Ginecológico', price: '$1,200', duration: 45 },
  '3': { name: 'Control Prenatal', price: '$800', duration: 40 },
  '4': { name: 'Papanicolaou', price: '$450', duration: 30 },
  '5': { name: 'Consulta de Fertilidad', price: '$900', duration: 60 }
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ==========================================
// FUNCIONES DEL BOT (copiadas del webhook)
// ==========================================

async function updateConversationState(userId, state) {
  await supabase.from('users').update({ conversation_state: state }).eq('id', userId).select()
}

async function saveBookingData(userId, key, value) {
  await supabase.from('interaction_logs').insert({
    user_id: userId,
    role: 'system',
    content: `booking_data_${key}:${value}`,
    intent_detected: 'booking_data',
    state_before: CONVERSATION_STATES.PROCESSING,
    state_after: CONVERSATION_STATES.PROCESSING
  })
}

async function getBookingData(userId) {
  const { data } = await supabase
    .from('interaction_logs')
    .select('content')
    .eq('user_id', userId)
    .like('content', 'booking_data_%')
    .order('created_at', { ascending: false })
    .limit(10)

  const result = {}
  if (data) {
    data.forEach((log) => {
      const match = log.content.match(/^booking_data_(.+?):(.+)$/)
      if (match) {
        result[match[1]] = match[2]
      }
    })
  }
  return result
}

async function createAppointment(userId, serviceName, duration, dateText) {
  const startTime = new Date()
  startTime.setDate(startTime.getDate() + 1)
  startTime.setHours(10, 0, 0, 0)
  const endTime = new Date(startTime.getTime() + duration * 60000)
  const ownerId = '00000000-0000-0000-0000-000000000001'

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      user_id: userId,
      owner_id: ownerId,
      service_id: serviceName.toLowerCase().replace(/\s+/g, '_'),
      service_name: serviceName,
      duration_minutes: duration,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'confirmed',
      notes: dateText,
      changed_by: 'bot'
    })
    .select('id, user_id, service_name')
    .single()

  if (error) {
    console.error('❌ Error creando cita:', error)
    throw error
  }
  return data
}

function getWelcomeMessage() {
  return `Hola, buenos días. Te atiende el asistente virtual del **Dr. Baltierres Ginecólogo Ultrasonido**. ¿En qué te puedo ayudar hoy?

📋 **Opciones disponibles:**
1️⃣ Agendar cita
2️⃣ Precios
3️⃣ Servicios
4️⃣ Ubicación
5️⃣ Horario de atención

*Responde con el número de la opción que necesitas.*`
}

function getBookingNamePrompt() {
  return `📅 **Para agendar tu cita, necesito algunos datos:**

Por favor, escribe tu **nombre completo** para empezar.`
}

function getBookingServicePrompt() {
  const servicesList = Object.entries(SERVICES)
    .map(([num, s]) => `${num}. ${s.name} - ${s.price}`)
    .join('\n')

  return `✅ Nombre registrado.

🦷 **Selecciona el servicio que necesitas:**

${servicesList}

Responde con el número del servicio.`
}

function getBookingDatePrompt(service) {
  return `📅 **Servicio seleccionado:** ${service.name} - ${service.price}

Por favor, indica la **fecha y hora** deseada para tu cita.

Ejemplo: *Mañana a las 10am* o *Viernes 25 de mayo a las 3pm*`
}

function getBookingConfirmation(service, date, appointmentId) {
  return `✅ **¡Cita confirmada!**

📅 Fecha: ${date}
🦷 Servicio: ${service.name}
💰 Costo: ${service.price}

Te esperamos en:
📍 Av. Principal #123, Colonia Centro
📞 +52 555-123-4567

¿Algo más en lo que te pueda ayudar?`
}

// ==========================================
// VALIDACIONES
// ==========================================

async function validateStep1_Greeting(userId) {
  console.log('\n' + '='.repeat(70))
  console.log('PASO 1: Validar Saludo de Bienvenida')
  console.log('='.repeat(70))

  const message = getWelcomeMessage()

  const validations = {
    tieneNombreClinica: message.includes('Dr. Baltierres'),
    tieneOpciones: message.includes('1️⃣ Agendar cita') && message.includes('2️⃣ Precios'),
    tiene5Opciones: (message.match(/[0-9]️⃣/g) || []).length === 5,
    formatoMarkdown: message.includes('**') && message.includes('*'),
  }

  console.log('✅ Resultados:')
  console.log(`   Nombre de clínica: ${validations.tieneNombreClinica ? '✅' : '❌'}`)
  console.log(`   Opciones del menú: ${validations.tieneOpciones ? '✅' : '❌'}`)
  console.log(`   5 opciones: ${validations.tiene5Opciones ? '✅' : '❌'}`)
  console.log(`   Formato markdown: ${validations.formatoMarkdown ? '✅' : '❌'}`)

  const passed = Object.values(validations).every(v => v)
  console.log(`\n   ${passed ? '✅ PASÓ' : '❌ FALLÓ'} Paso 1`)
  console.log(`\n📄 Mensaje:\n${message}`)

  return passed
}

async function validateStep2_MenuSelection(userId) {
  console.log('\n' + '='.repeat(70))
  console.log('PASO 2: Validar Selección de Menú (1)')
  console.log('='.repeat(70))

  await updateConversationState(userId, CONVERSATION_STATES.BOOKING_NAME)
  const message = getBookingNamePrompt()

  const validations = {
    pideNombreCompleto: message.includes('nombre completo'),
    contextoAgendamiento: message.includes('Para agendar tu cita'),
    formatoMarkdown: message.includes('**'),
  }

  console.log('✅ Resultados:')
  console.log(`   Pide nombre completo: ${validations.pideNombreCompleto ? '✅' : '❌'}`)
  console.log(`   Contexto agendamiento: ${validations.contextoAgendamiento ? '✅' : '❌'}`)
  console.log(`   Formato markdown: ${validations.formatoMarkdown ? '✅' : '❌'}`)

  const passed = Object.values(validations).every(v => v)
  console.log(`\n   ${passed ? '✅ PASÓ' : '❌ FALLÓ'} Paso 2`)
  console.log(`\n📄 Mensaje:\n${message}`)

  return passed
}

async function validateStep3_NameSaved(userId, userName) {
  console.log('\n' + '='.repeat(70))
  console.log('PASO 3: Validar Nombre Guardado')
  console.log('='.repeat(70))

  // Simular que el usuario envía su nombre (esto es lo que hace el webhook)
  await supabase.from('users').update({ full_name: userName }).eq('id', userId).select()
  await updateConversationState(userId, CONVERSATION_STATES.BOOKING_SERVICE)

  const { data: user } = await supabase
    .from('users')
    .select('id, full_name, phone_number')
    .eq('id', userId)
    .single()

  const validations = {
    nombreGuardado: user.full_name === userName,
    telefonoGuardado: user.phone_number === TEST_PHONE,
    userIdExiste: !!user.id,
    estadoCorrecto: user.conversation_state === CONVERSATION_STATES.BOOKING_SERVICE,
  }

  console.log(`   DEBUG: conversation_state="${user.conversation_state}", esperado="${CONVERSATION_STATES.BOOKING_SERVICE}"`)

  console.log('✅ Resultados:')
  console.log(`   Nombre guardado: ${validations.nombreGuardado ? '✅' : '❌'} ("${user.full_name}" == "${userName}")`)
  console.log(`   Teléfono guardado: ${validations.telefonoGuardado ? '✅' : '❌'}`)
  console.log(`   userId existe: ${validations.userIdExiste ? '✅' : '❌'} (${user.id})`)
  console.log(`   Estado correcto: ${validations.estadoCorrecto ? '✅' : '❌'}`)

  const passed = Object.values(validations).every(v => v)
  console.log(`\n   ${passed ? '✅ PASÓ' : '❌ FALLÓ'} Paso 3`)

  // Mostrar servicio
  const serviceMsg = getBookingServicePrompt()
  console.log(`\n📄 Mensaje siguiente:\n${serviceMsg}`)

  return passed
}

async function validateStep4_ServiceSelection(userId) {
  console.log('\n' + '='.repeat(70))
  console.log('PASO 4: Validar Selección de Servicio')
  console.log('='.repeat(70))

  const selectedService = SERVICES['2']
  await saveBookingData(userId, 'service', JSON.stringify(selectedService))
  await updateConversationState(userId, CONVERSATION_STATES.BOOKING_DATE)

  const message = getBookingDatePrompt(selectedService)

  const validations = {
    muestraServicio: message.includes('Ultrasonido Ginecológico'),
    muestraPrecio: message.includes('$1,200'),
    pideFecha: message.includes('fecha y hora'),
    daEjemplo: message.includes('Ejemplo'),
  }

  console.log('✅ Resultados:')
  console.log(`   Muestra servicio: ${validations.muestraServicio ? '✅' : '❌'}`)
  console.log(`   Muestra precio: ${validations.muestraPrecio ? '✅' : '❌'}`)
  console.log(`   Pide fecha: ${validations.pideFecha ? '✅' : '❌'}`)
  console.log(`   Da ejemplo: ${validations.daEjemplo ? '✅' : '❌'}`)

  const passed = Object.values(validations).every(v => v)
  console.log(`\n   ${passed ? '✅ PASÓ' : '❌ FALLÓ'} Paso 4`)
  console.log(`\n📄 Mensaje:\n${message}`)

  return passed
}

async function validateStep5_AppointmentCreation(userId, serviceName, dateText) {
  console.log('\n' + '='.repeat(70))
  console.log('PASO 5: Validar Creación de Cita')
  console.log('='.repeat(70))

  const bookingData = await getBookingData(userId)
  const service = JSON.parse(bookingData?.service || '{}')

  const appointment = await createAppointment(userId, service.name, service.duration, dateText)
  await updateConversationState(userId, CONVERSATION_STATES.IDLE)

  console.log('📊 Datos de la cita creada:')
  console.log(`   ID: ${appointment.id}`)
  console.log(`   User ID: ${appointment.user_id}`)
  console.log(`   Servicio: ${appointment.service_name}`)

  const validations = {
    citaCreada: !!appointment.id,
    userIdGuardado: appointment.user_id === userId,
    servicioCorrecto: appointment.service_name === serviceName,
    estadoUsuario: (await supabase.from('users').select('conversation_state').eq('id', userId).single())?.data?.conversation_state === CONVERSATION_STATES.IDLE,
  }

  console.log('\n✅ Resultados:')
  console.log(`   Cita creada: ${validations.citaCreada ? '✅' : '❌'}`)
  console.log(`   User ID guardado: ${validations.userIdGuardado ? '✅' : '❌'} (${appointment.user_id} == ${userId})`)
  console.log(`   Servicio correcto: ${validations.servicioCorrecto ? '✅' : '❌'}`)
  console.log(`   Estado usuario reset: ${validations.estadoUsuario ? '✅' : '❌'}`)

  const passed = Object.values(validations).every(v => v)
  console.log(`\n   ${passed ? '✅ PASÓ' : '❌ FALLÓ'} Paso 5`)

  const confirmMsg = getBookingConfirmation(service, dateText, appointment.id)
  console.log(`\n📄 Mensaje:\n${confirmMsg}`)

  return passed
}

// ==========================================
// PRINCIPAL
// ==========================================

async function runValidation() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║   VALIDACIÓN COMPLETA DEL BOT DE WHATSAPP                ║')
  console.log('║   Dr. Baltierres Ginecólogo Ultrasonido                 ║')
  console.log('╚══════════════════════════════════════════════════════════╝')

  // Limpiar usuario de prueba anterior
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('phone_number', TEST_PHONE)
    .maybeSingle()

  if (existingUser) {
    console.log('\n🧹 Limpiando datos anteriores...')
    await supabase.from('appointments').delete().eq('user_id', existingUser.id)
    await supabase.from('interaction_logs').delete().eq('user_id', existingUser.id)
    await supabase.from('users').delete().eq('id', existingUser.id)
  }

  // Crear usuario nuevo
  console.log('\n👤 Creando usuario de prueba...')
  const { data: user, error } = await supabase
    .from('users')
    .insert({
      phone_number: TEST_PHONE,
      full_name: null,
      timezone: 'America/Mexico_City',
      trust_score: 1.0,
      conversation_state: CONVERSATION_STATES.IDLE
    })
    .select('id, full_name, phone_number')
    .single()

  if (error) {
    console.error('❌ Error creando usuario:', error)
    return
  }

  console.log(`✅ Usuario creado: ${user.id} (${user.phone_number})`)

  const userId = user.id
  const userName = 'María González'
  const serviceName = 'Ultrasonido Ginecológico'
  const dateText = 'Mañana a las 10am'

  // Ejecutar validaciones
  const results = {
    paso1: await validateStep1_Greeting(userId),
    paso2: await validateStep2_MenuSelection(userId),
    paso3: await validateStep3_NameSaved(userId, userName),
    paso4: await validateStep4_ServiceSelection(userId),
    paso5: await validateStep5_AppointmentCreation(userId, serviceName, dateText),
  }

  // Resumen final
  console.log('\n' + '='.repeat(70))
  console.log('RESUMEN DE VALIDACIÓN')
  console.log('='.repeat(70))

  Object.entries(results).forEach(([paso, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${paso.toUpperCase().replace('PASO', 'Paso ')}: ${passed ? 'PASÓ' : 'FALLÓ'}`)
  })

  const allPassed = Object.values(results).every(v => v)

  console.log('\n' + '='.repeat(70))
  if (allPassed) {
    console.log('✅✅✅ TODOS LOS PASOS PASARON - BOT FUNCIONANDO CORRECTAMENTE')
  } else {
    console.log('❌❌❌ HAY ERRORES - REVISAR PASOS FALLIDOS')
  }
  console.log('='.repeat(70))

  // Verificar cita final
  const { data: finalAppointment } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .single()

  console.log('\n📋 CITA FINAL EN BASE DE DATOS:')
  console.log(`   ID: ${finalAppointment?.id}`)
  console.log(`   User ID: ${finalAppointment?.user_id}`)
  console.log(`   Servicio: ${finalAppointment?.service_name}`)
  console.log(`   Fecha: ${finalAppointment?.start_time}`)
  console.log(`   Status: ${finalAppointment?.status}`)
}

runValidation().catch(console.error)