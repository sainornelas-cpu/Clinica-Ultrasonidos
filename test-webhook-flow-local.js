// Test webhook flow - ejecuta localmente la lógica del webhook
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://heubgudergnidbxyfhqq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhldWJndWRlcmduaWRieHlmaHFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA3ODUzNiwiZXhwIjoyMDkwNjU0NTM2fQ.YYWljfIF2WH-Hq8X6hiTdfVceb4-4mNPy7re4nIfav8'

const TEST_PHONE = '52133333333'
const services = {
  '1': { name: 'Consulta General', price: '$500', duration: 30 },
  '2': { name: 'Ultrasonido Ginecológico', price: '$1,200', duration: 45 },
  '3': { name: 'Control Prenatal', price: '$800', duration: 40 },
  '4': { name: 'Papanicolaou', price: '$450', duration: 30 },
  '5': { name: 'Consulta de Fertilidad', price: '$900', duration: 60 }
}

const CONVERSATION_STATES = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  BOOKING_NAME: 'booking_name',
  BOOKING_SERVICE: 'booking_service',
  BOOKING_DATE: 'booking_date'
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function logInteraction(userId, role, content, intent, stateBefore, stateAfter) {
  const { error } = await supabase.from('interaction_logs').insert({
    user_id: userId,
    role,
    content,
    intent_detected: intent,
    state_before: stateBefore,
    state_after: stateAfter
  })

  if (error) {
    console.error('❌ Error guardando log:', error)
  }
}

async function updateConversationState(userId, state) {
  try {
    await supabase
      .from('users')
      .update({ conversation_state: state })
      .eq('id', userId)
    console.log(`✅ Estado actualizado: ${state}`)
  } catch (error) {
    console.warn('⚠️ No se pudo actualizar estado:', error.message)
  }
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
      // Usar non-greedy match (.*?) para capturar solo hasta el primer ":"
      const match = log.content.match(/^booking_data_(.+?):(.+)$/)
      if (match) {
        result[match[1]] = match[2]
      }
    })
  }

  return result
}

async function createAppointmentInDb(userId, serviceName, duration, dateText) {
  const startTime = new Date()
  startTime.setDate(startTime.getDate() + 1)
  startTime.setHours(10, 0, 0, 0)

  const endTime = new Date(startTime.getTime() + duration * 60000)
  const ownerId = '00000000-0000-0000-0000-000000000001'

  console.log(`📝 Creando cita en Supabase:`)
  console.log(`   userId: ${userId}`)
  console.log(`   serviceName: ${serviceName}`)
  console.log(`   duration: ${duration}`)
  console.log(`   startTime: ${startTime.toISOString()}`)

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
    .select('id')
    .single()

  if (error) {
    console.error('❌❌❌ ERROR CREANDO CITA:')
    console.error(JSON.stringify(error, null, 2))
    throw error
  }

  console.log(`✅ Cita creada exitosamente, ID: ${data.id}`)
  return data.id
}

async function handleBookingFlow(message, currentState, userId) {
  const trimmedMessage = message.trim()

  if (currentState === CONVERSATION_STATES.BOOKING_NAME) {
    console.log('📝 Paso: Guardar nombre')

    await supabase
      .from('users')
      .update({ full_name: trimmedMessage })
      .eq('id', userId)
      .select()

    await updateConversationState(userId, CONVERSATION_STATES.BOOKING_SERVICE)

    return `✅ Nombre registrado: **${trimmedMessage}**

🦷 **Selecciona el servicio:**
1. Consulta General - $500
2. Ultrasonido Ginecológico - $1,200
3. Control Prenatal - $800
4. Papanicolaou - $450
5. Consulta de Fertilidad - $900`
  }

  if (currentState === CONVERSATION_STATES.BOOKING_SERVICE) {
    console.log('📝 Paso: Seleccionar servicio')

    const service = services[trimmedMessage]
    if (!service) {
      return '❌ Opción no válida. Selecciona un número del 1 al 5.'
    }

    await saveBookingData(userId, 'service', JSON.stringify(service))
    await updateConversationState(userId, CONVERSATION_STATES.BOOKING_DATE)

    return `📅 **Servicio seleccionado:** ${service.name} - ${service.price}

Por favor, indica la **fecha y hora** deseada.`
  }

  if (currentState === CONVERSATION_STATES.BOOKING_DATE) {
    console.log('📝 Paso: Crear cita')
    const bookingData = await getBookingData(userId)
    const service = JSON.parse(bookingData?.service || '{}')

    console.log('📦 Datos de servicio:', JSON.stringify(service, null, 2))

    const appointmentId = await createAppointmentInDb(
      userId,
      service.name,
      service.duration,
      trimmedMessage
    )

    await updateConversationState(userId, CONVERSATION_STATES.IDLE)

    return `✅ **¡Cita confirmada!**

📅 Fecha: ${trimmedMessage}
🦷 Servicio: ${service.name}
💰 Costo: ${service.price}

ID de cita: ${appointmentId}`
  }

  return 'Error en flujo'
}

async function testFlow() {
  console.log('='.repeat(70))
  console.log('TEST WEBHOOK FLOW - LOCAL')
  console.log('='.repeat(70))

  // Buscar o crear usuario
  let { data: user } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('phone_number', TEST_PHONE)
    .single()

  if (!user) {
    console.log('📝 Creando nuevo usuario...')
    const { data: newUser } = await supabase
      .from('users')
      .insert({
        phone_number: TEST_PHONE,
        full_name: null,
        timezone: 'America/Mexico_City',
        trust_score: 1.0,
        conversation_state: CONVERSATION_STATES.IDLE
      })
      .select('id, full_name')
      .single()

    user = newUser
    console.log(`✅ Usuario creado: ${user.id}`)
  } else {
    console.log(`✅ Usuario encontrado: ${user.id}`)
  }

  const userId = user.id

  // Paso 1: Opción 1 - Iniciar agendamiento
  console.log('\n' + '='.repeat(70))
  console.log('PASO 1: "1" - Iniciar agendamiento')
  console.log('='.repeat(70))

  await updateConversationState(userId, CONVERSATION_STATES.BOOKING_NAME)
  const response1 = `📅 **Para agendar tu cita, necesito algunos datos:**

Por favor, escribe tu **nombre completo** para empezar.`

  await logInteraction(userId, 'assistant', response1, 'menu_selection', CONVERSATION_STATES.IDLE, CONVERSATION_STATES.BOOKING_NAME)
  console.log(`🤖 Bot: ${response1}`)

  await delay(1000)

  // Paso 2: Nombre
  console.log('\n' + '='.repeat(70))
  console.log('PASO 2: "María González" - Ingresar nombre')
  console.log('='.repeat(70))

  await logInteraction(userId, 'user', 'María González', 'provide_name', CONVERSATION_STATES.BOOKING_NAME, CONVERSATION_STATES.PROCESSING)

  const response2 = await handleBookingFlow('María González', CONVERSATION_STATES.BOOKING_NAME, userId)
  console.log(`🤖 Bot: ${response2}`)

  await logInteraction(userId, 'assistant', response2, 'response', CONVERSATION_STATES.BOOKING_NAME, CONVERSATION_STATES.BOOKING_SERVICE)
  await delay(1000)

  // Paso 3: Servicio
  console.log('\n' + '='.repeat(70))
  console.log('PASO 3: "2" - Seleccionar Ultrasonido')
  console.log('='.repeat(70))

  await logInteraction(userId, 'user', '2', 'select_service', CONVERSATION_STATES.BOOKING_SERVICE, CONVERSATION_STATES.PROCESSING)

  const response3 = await handleBookingFlow('2', CONVERSATION_STATES.BOOKING_SERVICE, userId)
  console.log(`🤖 Bot: ${response3}`)

  await logInteraction(userId, 'assistant', response3, 'response', CONVERSATION_STATES.BOOKING_SERVICE, CONVERSATION_STATES.BOOKING_DATE)
  await delay(1000)

  // Paso 4: Fecha
  console.log('\n' + '='.repeat(70))
  console.log('PASO 4: "Mañana a las 10am" - Crear cita')
  console.log('='.repeat(70))

  await logInteraction(userId, 'user', 'Mañana a las 10am', 'select_date', CONVERSATION_STATES.BOOKING_DATE, CONVERSATION_STATES.PROCESSING)

  const response4 = await handleBookingFlow('Mañana a las 10am', CONVERSATION_STATES.BOOKING_DATE, userId)
  console.log(`🤖 Bot: ${response4}`)

  await logInteraction(userId, 'assistant', response4, 'response', CONVERSATION_STATES.BOOKING_DATE, CONVERSATION_STATES.IDLE)

  // Verificar cita creada
  await delay(1000)

  console.log('\n' + '='.repeat(70))
  console.log('VERIFICACIÓN FINAL')
  console.log('='.repeat(70))

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (appointments && appointments.length > 0) {
    const apt = appointments[0]
    console.log('✅✅✅ ¡CITA CREADA EXITOSAMENTE!')
    console.log(`   ID: ${apt.id}`)
    console.log(`   Servicio: ${apt.service_name}`)
    console.log(`   Fecha: ${new Date(apt.start_time).toLocaleString('es-MX')}`)
    console.log(`   Status: ${apt.status}`)
    console.log(`   Changed by: ${apt.changed_by}`)
  } else {
    console.log('❌❌❌ CITA NO CREADA')
  }

  console.log('\n' + '='.repeat(70))
  console.log('TEST FINALIZADO')
  console.log('='.repeat(70))
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

testFlow().catch(console.error)