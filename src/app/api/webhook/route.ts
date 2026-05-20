import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import OpenAI from 'openai'

// WhatsApp Webhook Handler
export async function GET(request: NextRequest) {
  // 🔥 DEBUG AGRESIVO: Ver qué está pasando
  const verifyTokenEnv = process.env.WHATSAPP_VERIFY_TOKEN
  const searchParams = request.nextUrl.searchParams

  const hubMode = searchParams.get('hub.mode')
  const hubVerifyToken = searchParams.get('hub.verify_token')
  const hubChallenge = searchParams.get('hub.challenge')

  console.log('🔥 [WEBHOOK DEBUG] ========================')
  console.log('🔥 WHATSAPP_VERIFY_TOKEN from env:', JSON.stringify(verifyTokenEnv))
  console.log('🔥 Length:', verifyTokenEnv?.length)
  console.log('🔥 hub.verify_token from Meta:', JSON.stringify(hubVerifyToken))
  console.log('🔥 hub.mode:', hubMode)
  console.log('🔥 Do they match EXACTLY?:', verifyTokenEnv === hubVerifyToken)
  console.log('🔥 Do they match after trim?:', verifyTokenEnv?.trim() === hubVerifyToken?.trim())
  console.log('🔥 [END DEBUG] ============================')

  // ✅ FIX: Usar trim() para ignorar espacios invisibles
  if (hubMode === 'subscribe' && verifyTokenEnv?.trim() === hubVerifyToken?.trim()) {
    console.log('✅ Webhook verified! Challenge:', hubChallenge)
    return new NextResponse(hubChallenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  console.error('❌ Verification FAILED')
  console.error('Expected (env):', JSON.stringify(verifyTokenEnv))
  console.error('Received (Meta):', JSON.stringify(hubVerifyToken))

  return new NextResponse('Forbidden', {
    status: 403,
    headers: { 'Content-Type': 'text/plain' }
  })
}

export async function POST(request: NextRequest) {
  console.log('📨 Webhook POST hit - Incoming message')

  try {
    const body = await request.json()
    console.log('📦 Received payload:', JSON.stringify(body, null, 2))

    // Extraer mensaje de WhatsApp (estructura anidada de Meta)
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const messages = value?.messages

    if (!messages || messages.length === 0) {
      console.log('⚠️ No messages in payload')
      return new NextResponse('No messages', { status: 200 })
    }

    const message = messages[0]
    const from = message.from // Número del usuario
    const messageType = message.type

    // Solo procesar mensajes de texto
    if (messageType !== 'text') {
      console.log('⚠️ Ignoring non-text message')
      return new NextResponse('OK', { status: 200 })
    }

    const userMessage = message.text.body
    console.log(`💬 Message from ${from}: ${userMessage}`)

    // Obtener o crear usuario en Supabase
    const supabase = createServerClient()

    // 1. Buscar usuario por teléfono
    let { data: existingUser, error: userFetchError } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('phone_number', from)
      .single()

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      // 2. Crear nuevo usuario si no existe
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          phone_number: from,
          full_name: null,
          timezone: 'America/Mexico_City',
          trust_score: 1.0
        })
        .select('id')
        .single()

      if (insertError || !newUser) {
        console.error('❌ Error creating user:', insertError)
        return new NextResponse('DB Error', { status: 500 })
      }

      userId = newUser.id
      console.log('✅ New user created:', userId)
    }

    // Obtener estado de conversación actual (ANTES de guardar nuevo log)
    const { data: lastInteraction } = await supabase
      .from('interaction_logs')
      .select('state_after, state_before, content, role')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // El estado real es state_before del último log (no state_after que siempre es 'processing')
    const conversationState = lastInteraction?.state_before || 'idle'

    // Verificar si es el primer mensaje (no hay logs previos)
    const { data: previousLogs } = await supabase
      .from('interaction_logs')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    const isFirstMessage = !previousLogs || previousLogs.length === 0
    console.log(`💬 User state: ${conversationState}, First message: ${isFirstMessage}, Last interaction state: ${lastInteraction?.state_after}`)

    // Guardar mensaje del usuario en interaction_logs
    console.log('📝 Guardando interaction log para usuario...')
    const { error: logError } = await supabase.from('interaction_logs').insert({
      user_id: userId,
      role: 'user',
      content: userMessage,
      intent_detected: detectIntent(userMessage, conversationState),
      state_before: conversationState,
      state_after: 'processing'
    })

    if (logError) {
      console.error('❌ Error inserting interaction log:', logError)
    } else {
      console.log('✅ Interaction log guardado')
    }

    // Generar respuesta basada en el contexto
    let aiResponse: string

    if (isFirstMessage) {
      // Primer mensaje - mostrar bienvenida + menú
      aiResponse = generateWelcomeMessage()
    } else if (isMenuOption(userMessage)) {
      // Opción del menú (1-5)
      aiResponse = await handleMenuOption(userMessage, userId, from, supabase)
    } else if (conversationState.startsWith('booking_')) {
      // En medio del flujo de agendamiento
      aiResponse = await handleBookingFlow(userMessage, conversationState, userId, from, supabase)
    } else if (isGeneralCommand(userMessage)) {
      // Comando general (Mis citas, Cancelar, Reagendar)
      aiResponse = await handleGeneralCommand(userMessage, userId, supabase)
    } else {
      // Otro mensaje - usar OpenAI
      aiResponse = await getOpenAIResponse(userMessage, conversationState, userId, supabase)
    }

    console.log(`🤖 Response: ${aiResponse}`)

    // Guardar respuesta en interaction_logs
    console.log('📝 Guardando interaction log para assistant...')
    const { error: assistantLogError } = await supabase.from('interaction_logs').insert({
      user_id: userId,
      role: 'assistant',
      content: aiResponse,
      intent_detected: 'response',
      state_before: 'processing',
      state_after: 'idle'
    })

    if (assistantLogError) {
      console.error('❌ Error inserting assistant log:', assistantLogError)
    } else {
      console.log('✅ Assistant interaction log guardado')
    }

    // Enviar respuesta vía WhatsApp API
    console.log('📤 Enviando respuesta a WhatsApp...')
    await sendWhatsAppMessage(from, aiResponse)

    return new NextResponse('OK', { status: 200 })

  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// Cargar system prompt desde archivo
async function loadSystemPrompt(): Promise<string> {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    const promptPath = path.join(process.cwd(), 'src', 'lib', 'prompts', 'agent-system.md')
    return await fs.readFile(promptPath, 'utf-8')
  } catch (error) {
    console.error('⚠️ Could not load system prompt, using fallback')
    return 'Eres un asistente útil de una clínica dental.'
  }
}

// Enviar mensaje vía WhatsApp Cloud API
async function sendWhatsAppMessage(to: string, message: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      })
    }
  )

  if (!response.ok) {
    const error = await response.json()
    console.error('❌ Error sending WhatsApp message:', error)
    throw new Error('Failed to send WhatsApp message')
  }

  console.log('✅ WhatsApp message sent successfully')
  return response.json()
}

// =================== CONVERSATION MANAGEMENT ===================

// Detectar intención del mensaje
function detectIntent(message: string, currentState: string): string {
  const lowerMessage = message.toLowerCase().trim()

  // Menu options
  if (['1', '2', '3', '4', '5'].includes(lowerMessage)) {
    return 'menu_selection'
  }

  // Commands
  if (lowerMessage.includes('mis citas')) return 'view_appointments'
  if (lowerMessage.includes('cancelar')) return 'cancel_appointment'
  if (lowerMessage.includes('reagendar')) return 'reschedule_appointment'
  if (lowerMessage.includes('agendar')) return 'book_appointment'

  // Booking flow
  if (currentState === 'booking_service') return 'select_service'
  if (currentState === 'booking_date') return 'select_date'
  if (currentState === 'booking_name') return 'provide_name'

  return 'general_query'
}

// Verificar si es una opción del menú (1-5)
function isMenuOption(message: string): boolean {
  return ['1', '2', '3', '4', '5'].includes(message.trim())
}

// Verificar si es un comando general
function isGeneralCommand(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('mis citas') || lower.includes('cancelar') || lower.includes('reagendar')
}

// Mensaje de bienvenida con menú
function generateWelcomeMessage(): string {
  return `Hola, buenos días. Te atiende el asistente virtual del **Dr. Baltierres Ginecólogo Ultrasonido**. ¿En qué te puedo ayudar hoy?

📋 **Opciones disponibles:**
1️⃣ Agendar cita
2️⃣ Precios
3️⃣ Servicios
4️⃣ Ubicación
5️⃣ Horario de atención

*Responde con el número de la opción que necesitas.*`
}

// Manejar opción del menú
async function handleMenuOption(option: string, userId: string, phone: string, supabase: any): Promise<string> {
  switch (option.trim()) {
    case '1':
      // Iniciar flujo de agendamiento - actualizar estado
      await updateConversationState(userId, 'booking_name', supabase)
      return `📅 **Para agendar tu cita, necesito algunos datos:**

Por favor, escribe tu **nombre completo** para empezar.`

    case '2':
      return `💰 **Tabla de precios:**
• Consulta General: $500
• Ultrasonido Ginecológico: $1,200
• Control Prenatal: $800
• Papanicolaou: $450
• Consulta de Fertilidad: $900

¿Algo más en lo que te pueda ayudar?`

    case '3':
      return `🏥 **Nuestros servicios:**

🦷 **Consulta General**
Valoración general de salud ginecológica.

📊 **Ultrasonido Ginecológico**
Diagnóstico por imágenes del sistema reproductor.

👶 **Control Prenatal**
Seguimiento del embarazo y desarrollo del bebé.

🔬 **Papanicolaou**
Detección temprana de cáncer cervical.

❤️ **Consulta de Fertilidad**
Evaluación y tratamiento para la concepción.

¿Algo más en lo que te pueda ayudar?`

    case '4':
      return `📍 **Ubicación:**
Av. Principal #123, Colonia Centro
Ciudad de México, CP 00000

🚗 Referencias: Frente al parque central, a 2 cuadras del metro Hidalgo
🅿️ Estacionamiento: Disponible en entrada trasera

¿Algo más en lo que te pueda ayudar?`

    case '5':
      return `⏰ **Horario de atención:**

• Lunes a Viernes: 9:00 AM - 7:00 PM
• Sábados: 9:00 AM - 2:00 PM
• Domingos: Cerrado

¿Algo más en lo que te pueda ayudar?`

    default:
      return 'Opción no válida. Por favor, responde con un número del 1 al 5.'
  }
}

// Manejar flujo de agendamiento
async function handleBookingFlow(
  message: string,
  currentState: string,
  userId: string,
  phone: string,
  supabase: any
): Promise<string> {
  const trimmedMessage = message.trim()

  if (currentState === 'booking_name') {
    // Guardar nombre en perfil del usuario
    await supabase
      .from('users')
      .update({ full_name: trimmedMessage })
      .eq('id', userId)
      .select()

    // Mover al siguiente estado
    await updateConversationState(userId, 'booking_service', supabase)

    return `✅ Nombre registrado: **${trimmedMessage}**

🦷 **Selecciona el servicio que necesitas:**

1. Consulta General - $500
2. Ultrasonido Ginecológico - $1,200
3. Control Prenatal - $800
4. Papanicolaou - $450
5. Consulta de Fertilidad - $900

Responde con el número del servicio.`
  }

  if (currentState === 'booking_service') {
    const services: Record<string, { name: string; price: string; duration: number }> = {
      '1': { name: 'Consulta General', price: '$500', duration: 30 },
      '2': { name: 'Ultrasonido Ginecológico', price: '$1,200', duration: 45 },
      '3': { name: 'Control Prenatal', price: '$800', duration: 40 },
      '4': { name: 'Papanicolaou', price: '$450', duration: 30 },
      '5': { name: 'Consulta de Fertilidad', price: '$900', duration: 60 }
    }

    const service = services[trimmedMessage]
    if (!service) {
      return '❌ Opción no válida. Por favor, selecciona un número del 1 al 5.'
    }

    // Guardar servicio en el estado (usando interaction_logs temporalmente)
    await saveBookingData(userId, 'service', JSON.stringify(service), supabase)

    // Mover al siguiente estado
    await updateConversationState(userId, 'booking_date', supabase)

    return `📅 **Servicio seleccionado:** ${service.name} - ${service.price}

Por favor, indica la **fecha y hora** deseada para tu cita.

Ejemplo: *Mañana a las 10am* o *Viernes 25 de mayo a las 3pm*`
  }

  if (currentState === 'booking_date') {
    // Obtener datos de la cita en progreso
    const bookingData = await getBookingData(userId, supabase)
    const service = JSON.parse(bookingData?.service || '{}')

    // Aquí normalmente parsearíamos la fecha y verificaríamos disponibilidad
    // Por ahora, asumimos que la fecha es válida
    const scheduledDate = trimmedMessage

    // Crear la cita
    const appointmentId = await createAppointmentInDb(
      userId,
      service.name,
      service.duration,
      scheduledDate,
      supabase
    )

    // Resetear estado
    await updateConversationState(userId, 'idle', supabase)

    return `✅ **¡Cita confirmada!**

📅 Fecha: ${scheduledDate}
🦷 Servicio: ${service.name}
💰 Costo: ${service.price}

Te esperamos en:
📍 Av. Principal #123, Colonia Centro
📞 +52 555-123-4567

¿Algo más en lo que te pueda ayudar?`
  }

  return 'Lo siento, hubo un error en el proceso. Para empezar de nuevo, escribe "1" o "Agendar cita".'
}

// Manejar comandos generales
async function handleGeneralCommand(message: string, userId: string, supabase: any): Promise<string> {
  const lower = message.toLowerCase()

  if (lower.includes('mis citas')) {
    return await getUserAppointments(userId, supabase)
  }

  if (lower.includes('cancelar')) {
    // Flujo de cancelación
    return await handleCancellation(userId, supabase)
  }

  if (lower.includes('reagendar')) {
    // Flujo de reagendamiento
    return await handleReschedule(userId, supabase)
  }

  return '¿Cómo puedo ayudarte? Responde con el número de una opción del menú (1-5).'
}

// Obtener citas del usuario
async function getUserAppointments(userId: string, supabase: any): Promise<string> {
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['confirmed', 'rescheduled'])
    .order('start_time', { ascending: true })

  if (!appointments || appointments.length === 0) {
    return `📅 No tienes citas agendadas.

¿Deseas agendar una nueva? Responde "1" o "Agendar cita".`
  }

  let response = `📅 **Tus citas agendadas:**\n\n`

  appointments.forEach((apt: any, index: number) => {
    const date = new Date(apt.start_time).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
    const time = new Date(apt.start_time).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    })
    const statusIcon = apt.status === 'confirmed' ? '✅' : '🔄'

    response += `${statusIcon} **${index + 1}. ${date} - ${time}**\n`
    response += `   🦷 ${apt.service_name}\n\n`
  })

  response += `Para reagendar o cancelar, escribe "Reagendar [número]" o "Cancelar [número]".`

  return response
}

// Crear cita en base de datos
async function createAppointmentInDb(
  userId: string,
  serviceName: string,
  duration: number,
  dateText: string,
  supabase: any
): Promise<string> {
  // Parsear fecha simple (en producción usar una librería como date-fns)
  const startTime = new Date()
  startTime.setDate(startTime.getDate() + 1) // Default: mañana
  startTime.setHours(10, 0, 0, 0)

  const endTime = new Date(startTime.getTime() + duration * 60000)

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      user_id: userId,
      owner_id: 'owner-uuid-placeholder',
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
    console.error('❌ Error creating appointment:', error)
    console.error('❌ Error details:', JSON.stringify(error, null, 2))
    throw error
  }

  console.log('✅ Cita creada exitosamente, ID:', data.id)
  return data.id
}

// Actualizar estado de conversación
async function updateConversationState(userId: string, state: string, supabase: any) {
  try {
    await supabase
      .from('users')
      .update({ conversation_state: state })
      .eq('id', userId)
      .select()
  } catch (error) {
    console.warn('⚠️ Could not update conversation_state (column may not exist):', error)
  }
}

// Guardar datos temporales de la cita
async function saveBookingData(userId: string, key: string, value: string, supabase: any) {
  // Usar interaction_logs para guardar datos temporales
  await supabase.from('interaction_logs').insert({
    user_id: userId,
    role: 'system',
    content: `booking_data_${key}:${value}`,
    intent_detected: 'booking_data',
    state_before: 'processing',
    state_after: 'processing'
  })
}

// Obtener datos de la cita en progreso
async function getBookingData(userId: string, supabase: any) {
  const { data } = await supabase
    .from('interaction_logs')
    .select('content')
    .eq('user_id', userId)
    .like('content', 'booking_data_%')
    .order('created_at', { ascending: false })
    .limit(10)

  const result: Record<string, string> = {}

  if (data) {
    data.forEach((log: any) => {
      const match = log.content.match(/booking_data_(.+):(.+)/)
      if (match) {
        result[match[1]] = match[2]
      }
    })
  }

  return result
}

// Placeholder functions for cancellation and reschedule
async function handleCancellation(userId: string, supabase: any): Promise<string> {
  const appointments = await getUserAppointments(userId, supabase)
  if (appointments.includes('No tienes citas')) {
    return appointments
  }

  return `⚠️ **¿Cuál cita deseas cancelar?**

${appointments}

Escribe el número de la cita a cancelar, o "Cancelar" para volver.`
}

async function handleReschedule(userId: string, supabase: any): Promise<string> {
  const appointments = await getUserAppointments(userId, supabase)
  if (appointments.includes('No tienes citas')) {
    return appointments
  }

  return `🔄 **¿Cuál cita deseas reagendar?**

${appointments}

Escribe el número de la cita a reagendar, o "Cancelar" para volver.`
}

// Obtener respuesta de OpenAI para consultas generales
async function getOpenAIResponse(
  message: string,
  currentState: string,
  userId: string,
  supabase: any
): Promise<string> {
  const systemPrompt = await loadSystemPrompt()

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  // Obtener historial de conversación para contexto
  const { data: history } = await supabase
    .from('interaction_logs')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(20)

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt }
  ]

  if (history) {
    history.forEach((log: any) => {
      if (log.role !== 'system') {
        messages.push({ role: log.role, content: log.content })
      }
    })
  }

  messages.push({ role: 'user', content: message })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 500
  })

  return completion.choices[0].message.content || 'Lo siento, tuve un error. Intenta de nuevo.'
}