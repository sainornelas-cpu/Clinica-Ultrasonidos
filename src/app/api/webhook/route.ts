import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { CONVERSATION_STATES } from '@/lib/constants/conversation-states'
import { SERVICES, CLINIC_INFO, OWNER_ID } from '@/lib/constants/services'
import { checkAvailability } from '@/lib/availability/check-availability'
import OpenAI from 'openai'

// =================== WEBHOOK HANDLERS ===================

export async function GET(request: NextRequest) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN
  const hubMode = request.nextUrl.searchParams.get('hub.mode')
  const hubVerifyToken = request.nextUrl.searchParams.get('hub.verify_token')
  const hubChallenge = request.nextUrl.searchParams.get('hub.challenge')

  if (hubMode === 'subscribe' && verifyToken?.trim() === hubVerifyToken?.trim()) {
    return new NextResponse(hubChallenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  return new NextResponse('Forbidden', {
    status: 403,
    headers: { 'Content-Type': 'text/plain' }
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extraer mensaje de WhatsApp
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const messages = changes?.value?.messages

    if (!messages?.length) {
      return new NextResponse('No messages', { status: 200 })
    }

    const message = messages[0]
    const from = message.from
    const messageType = message.type

    if (messageType !== 'text') {
      return new NextResponse('OK', { status: 200 })
    }

    const userMessage = message.text.body
    const supabase = createServerClient()

    // Obtener o crear usuario
    let userId: string
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('phone_number', from)
      .maybeSingle()

    if (existingUser) {
      userId = existingUser.id
    } else {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          phone_number: from,
          full_name: null,
          timezone: 'America/Mexico_City',
          trust_score: 1.0,
          conversation_state: CONVERSATION_STATES.IDLE
        })
        .select('id')
        .single()

      if (error || !newUser) {
        return new NextResponse('DB Error', { status: 500 })
      }
      userId = newUser.id
    }

    // Obtener estado de conversación
    const { data: userState } = await supabase
      .from('users')
      .select('conversation_state')
      .eq('id', userId)
      .maybeSingle()

    const conversationState = userState?.conversation_state || CONVERSATION_STATES.IDLE

    // Verificar si es primer mensaje
    const { data: existingLogs } = await supabase
      .from('interaction_logs')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    const isFirstMessage = !existingLogs || existingLogs.length === 0

    // Guardar mensaje del usuario
    await supabase.from('interaction_logs').insert({
      user_id: userId,
      role: 'user',
      content: userMessage,
      intent_detected: detectIntent(userMessage, conversationState),
      state_before: conversationState,
      state_after: CONVERSATION_STATES.PROCESSING
    })

    // Generar respuesta
    const response = await generateResponse(userMessage, conversationState, userId, from, supabase, isFirstMessage, existingUser)

    // Leer estado final y guardar respuesta del bot
    const { data: finalState } = await supabase
      .from('users')
      .select('conversation_state')
      .eq('id', userId)
      .maybeSingle()

    await supabase.from('interaction_logs').insert({
      user_id: userId,
      role: 'assistant',
      content: response,
      intent_detected: 'response',
      state_before: conversationState,
      state_after: finalState?.conversation_state || CONVERSATION_STATES.IDLE
    })

    // Enviar respuesta a WhatsApp (no fallar si no hay token)
    try {
      await sendWhatsAppMessage(from, response)
    } catch (whatsappError) {
      console.warn('WhatsApp message not sent (可能是测试环境):', whatsappError)
      // En modo de prueba, no fallar
    }

    return new NextResponse('OK', { status: 200 })

  } catch (error) {
    console.error('Webhook error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// =================== RESPONSE GENERATION ===================

async function generateResponse(
  message: string,
  state: string,
  userId: string,
  phone: string,
  supabase: any,
  isFirstMessage: boolean,
  existingUser?: { id: string; full_name: string | null } | null
): Promise<string> {
  const lowerMessage = message.toLowerCase().trim()
  const wantsToBook = lowerMessage.includes('agendar') || lowerMessage.includes('cita') || lowerMessage.includes('reservar')

  // Prioridad 1: Flujo de agendamiento activo
  if (state === CONVERSATION_STATES.BOOKING_NAME ||
      state === CONVERSATION_STATES.BOOKING_SERVICE ||
      state === CONVERSATION_STATES.BOOKING_DATE) {
    return await handleBookingFlow(message, state, userId, supabase)
  }

  // Prioridad 2: Primer mensaje
  if (isFirstMessage) {
    return getWelcomeMessage(existingUser?.full_name)
  }

  // Prioridad 3: Usuario quiere agendar y está en idle
  if (wantsToBook && state === CONVERSATION_STATES.IDLE) {
    await updateConversationState(userId, CONVERSATION_STATES.BOOKING_NAME, supabase)
    return getBookingNamePrompt()
  }

  // Prioridad 4: Opciones del menú
  if (isMenuOption(message)) {
    return await handleMenuOption(message, userId, supabase)
  }

  // Prioridad 5: Comandos generales
  if (isGeneralCommand(message)) {
    return await handleGeneralCommand(message, userId, supabase)
  }

  // Prioridad 6: Mensaje genérico en idle
  if (state === CONVERSATION_STATES.IDLE) {
    return getWelcomeMessage()
  }

  // Fallback: OpenAI
  return await getOpenAIResponse(message, userId, supabase)
}

// =================== FLOW HANDLERS ===================

async function handleBookingFlow(message: string, state: string, userId: string, supabase: any): Promise<string> {
  const trimmed = message.trim()

  switch (state) {
    case CONVERSATION_STATES.BOOKING_NAME:
      await supabase.from('users').update({ full_name: trimmed }).eq('id', userId)
      await updateConversationState(userId, CONVERSATION_STATES.BOOKING_SERVICE, supabase)
      return getBookingServicePrompt()

    case CONVERSATION_STATES.BOOKING_SERVICE:
      const selectedService = SERVICES[trimmed]
      if (!selectedService) {
        return '❌ Opción no válida. Selecciona un número del 1 al 5.'
      }
      await saveBookingData(userId, 'service', JSON.stringify(selectedService), supabase)
      await updateConversationState(userId, CONVERSATION_STATES.BOOKING_DATE, supabase)
      return getBookingDatePrompt(selectedService)

    case CONVERSATION_STATES.BOOKING_DATE:
      const bookingData = await getBookingData(userId, supabase)
      const service = JSON.parse(bookingData?.service || '{}')

      // ⚠️ Verificar disponibilidad OBLIGATORIO
      const availability = await checkAvailability(trimmed, service.duration)

      if (!availability.available) {
        const errorResponse = `${availability.message}\n\n${availability.suggestedSlots?.join('\n') || ''}`;
        return errorResponse;
      }

      // Si está disponible, crear la cita
      const appointmentId = await createAppointment(
        userId,
        service.name,
        service.duration,
        availability.parsedDate!,
        trimmed,
        supabase
      )
      await updateConversationState(userId, CONVERSATION_STATES.IDLE, supabase)
      return getBookingConfirmation(service, trimmed, appointmentId)

    default:
      return getWelcomeMessage()
  }
}

async function handleMenuOption(option: string, userId: string, supabase: any): Promise<string> {
  switch (option.trim()) {
    case '1':
      await updateConversationState(userId, CONVERSATION_STATES.BOOKING_NAME, supabase)
      return getBookingNamePrompt()

    case '2':
      return getPricesMenu()

    case '3':
      return getServicesMenu()

    case '4':
      return getLocationInfo()

    case '5':
      return getHoursInfo()

    case '6':
      return await getUserAppointments(userId, supabase)

    default:
      return 'Opción no válida. Responde con un número del 1 al 6.'
  }
}

async function handleGeneralCommand(message: string, userId: string, supabase: any): Promise<string> {
  const lower = message.toLowerCase()

  if (lower.includes('mis citas')) {
    return await getUserAppointments(userId, supabase)
  }

  if (lower.includes('cancelar')) {
    const appointments = await getUserAppointments(userId, supabase)
    return appointments.includes('No tienes citas') ? appointments :
      `⚠️ **¿Cuál cita deseas cancelar?**\n\n${appointments}\n\nEscribe el número de la cita a cancelar.`
  }

  if (lower.includes('reagendar')) {
    const appointments = await getUserAppointments(userId, supabase)
    return appointments.includes('No tienes citas') ? appointments :
      `🔄 **¿Cuál cita deseas reagendar?**\n\n${appointments}\n\nEscribe el número de la cita a reagendar.`
  }

  return '¿Cómo puedo ayudarte? Responde con el número de una opción del menú (1-5).'
}

// =================== MESSAGE TEMPLATES ===================

function getWelcomeMessage(userName?: string | null): string {
  const greeting = userName ? `¡Hola, ${userName}!` : `Hola, buenos días.`
  return `${greeting} Te atiende el asistente virtual del **${CLINIC_INFO.name}**. ¿En qué te puedo ayudar hoy?

📋 **Opciones disponibles:**
1️⃣ Agendar cita
2️⃣ Precios
3️⃣ Servicios
4️⃣ Ubicación
5️⃣ Horario de atención
6️⃣ Mis citas

*Responde con el número de la opción que necesitas.*`
}

function getBookingNamePrompt(): string {
  return `📅 **Para agendar tu cita, necesito algunos datos:**

Por favor, escribe tu **nombre completo** para empezar.`
}

function getBookingServicePrompt(): string {
  const servicesList = Object.entries(SERVICES)
    .map(([num, s]) => `${num}. ${s.name} - ${s.price}`)
    .join('\n')

  return `✅ Nombre registrado.

🦷 **Selecciona el servicio que necesitas:**

${servicesList}

Responde con el número del servicio.`
}

function getBookingDatePrompt(service: { name: string; price: string }): string {
  return `📅 **Servicio seleccionado:** ${service.name} - ${service.price}

Por favor, indica la **fecha y hora** deseada para tu cita.

Ejemplo: *Mañana a las 10am* o *Viernes 25 de mayo a las 3pm*`
}

function getBookingConfirmation(
  service: { name: string; price: string },
  date: string,
  appointmentId: string
): string {
  return `✅ **¡Cita confirmada!**

📅 Fecha: ${date}
🦷 Servicio: ${service.name}
💰 Costo: ${service.price}

Te esperamos en:
📍 ${CLINIC_INFO.address}
📞 ${CLINIC_INFO.phone}

¿Algo más en lo que te pueda ayudar?`
}

function getPricesMenu(): string {
  const pricesList = Object.entries(SERVICES)
    .map(([_, s]) => `• ${s.name}: ${s.price}`)
    .join('\n')

  return `💰 **Tabla de precios:**
${pricesList}

¿Algo más en lo que te pueda ayudar?`
}

function getServicesMenu(): string {
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
}

function getLocationInfo(): string {
  return `📍 **Ubicación:**
${CLINIC_INFO.address}

🚗 Referencias: Frente al parque central, a 2 cuadras del metro Hidalgo
🅿️ Estacionamiento: Disponible en entrada trasera

¿Algo más en lo que te pueda ayudar?`
}

function getHoursInfo(): string {
  return `⏰ **Horario de atención:**

${CLINIC_INFO.hours}

¿Algo más en lo que te pueda ayudar?`
}

// =================== DATABASE OPERATIONS ===================

async function createAppointment(
  userId: string,
  serviceName: string,
  duration: number,
  startTime: Date,
  dateText: string,
  supabase: any
): Promise<string> {
  const endTime = new Date(startTime.getTime() + duration * 60000)

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      user_id: userId,
      owner_id: OWNER_ID,
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
    throw error
  }

  return data.id
}

async function getUserAppointments(userId: string, supabase: any): Promise<string> {
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['confirmed', 'rescheduled'])
    .order('start_time', { ascending: true })

  if (!appointments?.length) {
    return `📅 No tienes citas agendadas.\n\n¿Deseas agendar una nueva? Responde "1" o "Agendar cita".`
  }

  const appointmentsList = appointments.map((apt: any, i: number) => {
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
    return `${statusIcon} **${i + 1}. ${date} - ${time}**\n   🦷 ${apt.service_name}`
  }).join('\n\n')

  return `📅 **Tus citas agendadas:**\n\n${appointmentsList}\n\nPara reagendar o cancelar, escribe "Reagendar [número]" o "Cancelar [número]".`
}

async function updateConversationState(userId: string, state: string, supabase: any): Promise<void> {
  try {
    await supabase.from('users').update({ conversation_state: state }).eq('id', userId)
  } catch (error) {
    console.warn('Could not update conversation_state:', error)
  }
}

async function saveBookingData(userId: string, key: string, value: string, supabase: any): Promise<void> {
  await supabase.from('interaction_logs').insert({
    user_id: userId,
    role: 'system',
    content: `booking_data_${key}:${value}`,
    intent_detected: 'booking_data',
    state_before: CONVERSATION_STATES.PROCESSING,
    state_after: CONVERSATION_STATES.PROCESSING
  })
}

async function getBookingData(userId: string, supabase: any): Promise<Record<string, string>> {
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
      const match = log.content.match(/^booking_data_(.+?):(.+)$/)
      if (match) {
        result[match[1]] = match[2]
      }
    })
  }
  return result
}

async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
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
        to,
        type: 'text',
        text: { body: message }
      })
    }
  )

  if (!response.ok) {
    throw new Error('Failed to send WhatsApp message')
  }
}

// =================== OPENAI INTEGRATION ===================

async function getOpenAIResponse(message: string, userId: string, supabase: any): Promise<string> {
  const systemPrompt = 'Eres un asistente útil de una clínica de ginecología y ultrasonido. Ayuda a los pacientes con información sobre servicios, citas y preguntas generales de salud.'

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const { data: history } = await supabase
    .from('interaction_logs')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(20)

  const messages = [{ role: 'system', content: systemPrompt }]

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

// =================== HELPERS ===================

function detectIntent(message: string, currentState: string): string {
  const lower = message.toLowerCase().trim()

  if (['1', '2', '3', '4', '5'].includes(lower)) return 'menu_selection'
  if (lower.includes('mis citas')) return 'view_appointments'
  if (lower.includes('cancelar')) return 'cancel_appointment'
  if (lower.includes('reagendar')) return 'reschedule_appointment'
  if (lower.includes('agendar')) return 'book_appointment'
  if (currentState === CONVERSATION_STATES.BOOKING_SERVICE) return 'select_service'
  if (currentState === CONVERSATION_STATES.BOOKING_DATE) return 'select_date'
  if (currentState === CONVERSATION_STATES.BOOKING_NAME) return 'provide_name'

  return 'general_query'
}

function isMenuOption(message: string): boolean {
  return ['1', '2', '3', '4', '5'].includes(message.trim())
}

function isGeneralCommand(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('mis citas') || lower.includes('cancelar') || lower.includes('reagendar')
}