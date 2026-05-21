import { NextRequest, NextResponse } from 'next/server'
import { createAppointment, getAppointmentsByPhone, updateAppointmentStatus, updateAppointmentDate, getOrCreateUser } from '@/lib/airtable/client'
import { checkAvailability, createEvent, deleteEvent, getAvailableSlots, updateEvent } from '@/lib/calendar/google'

// ==================== ESTADOS SIMPLES ====================
const STATES = {
  IDLE: 'idle',
  BOOKING_NAME: 'booking_name',
  BOOKING_SERVICE: 'booking_service',
  BOOKING_DATE: 'booking_date',
  RESCHEDULING_SELECT: 'rescheduling_select',
  RESCHEDULING_DATE: 'rescheduling_date',
  CANCELLING_SELECT: 'cancelling_select'
}

// Memoria en memoria (en producción usar Redis)
const userSessions = new Map<string, any>()

// ==================== SERVICIOS ====================
const SERVICES: Record<string, { name: string; price: string; duration: number }> = {
  '1': { name: 'Consulta General', price: '$500', duration: 30 },
  '2': { name: 'Ultrasonido Ginecológico', price: '$1,200', duration: 45 },
  '3': { name: 'Control Prenatal', price: '$800', duration: 40 },
  '4': { name: 'Papanicolaou', price: '$450', duration: 30 },
  '5': { name: 'Consulta de Fertilidad', price: '$900', duration: 60 }
}

// ==================== PARSEO DE FECHA ====================
function parseDate(text: string): Date | null {
  const lower = text.toLowerCase()
  const now = new Date()
  const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)

  let hours = 10, minutes = 0

  if (timeMatch) {
    hours = parseInt(timeMatch[1])
    minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    const period = timeMatch[3]?.toLowerCase()
    if (period === 'pm' && hours !== 12) hours += 12
    if (period === 'am' && hours === 12) hours = 0
  }

  let daysToAdd = 1
  if (lower.includes('hoy')) daysToAdd = 0
  else if (lower.includes('mañana') || lower.includes('manana')) daysToAdd = 1
  else if (lower.includes('pasado mañana') || lower.includes('pasado manana')) daysToAdd = 2

  const result = new Date(now)
  result.setDate(result.getDate() + daysToAdd)
  result.setHours(hours, minutes, 0, 0)

  // Validar fecha futura
  if (result.getTime() <= now.getTime()) return null

  // Validar no domingo
  if (result.getDay() === 0) return null

  return result
}

// ==================== MENSAJES ====================
function getWelcome(userName?: string): string {
  const name = userName ? `¡Hola, ${userName}!` : `Hola, buenos días.`
  return `${name} Te atiende el **Dr. Baltierres Ginecólogo Ultrasonido**. ¿En qué te puedo ayudar?

📋 **Opciones:**
1️⃣ Agendar cita
2️⃣ Mis citas
3️⃣ Cancelar cita
4️⃣ Reagendar cita
5️⃣ Precios

*Responde con el número.*`
}

function getBookingName(): string {
  return `📅 **Agendar cita**

Escribe tu **nombre completo**:`
}

function getBookingServices(): string {
  const list = Object.entries(SERVICES)
    .map(([n, s]) => `${n}. ${s.name} - ${s.price}`)
    .join('\n')
  return `✅ Nombre registrado.

🦷 **Selecciona servicio:**

${list}`
}

function getBookingDate(service: string): string {
  return `✅ Servicio: ${service}

📅 **Indica fecha y hora:**

Ejemplo: "Mañana a las 10am" o "Viernes 25 a las 3pm"`
}

function getConfirmation(appointment: any): string {
  return `✅ **¡Cita confirmada!**

📅 Fecha: ${appointment.date}
🦷 Servicio: ${appointment.service}
📞 Te recordaremos el día anterior

¿Necesitas algo más?
1️⃣ Agendar otra
2️⃣ Ver mis citas`
}

function getPrices(): string {
  const list = Object.values(SERVICES).map(s => `• ${s.name}: ${s.price}`).join('\n')
  return `💰 **Precios:**

${list}

¿Algo más? (1-5)`
}

// ==================== HANDLERS ====================
async function handleIdle(phone: string, message: string): Promise<{ response: string; state: string }> {
  const lower = message.toLowerCase()

  if (message === '1' || lower.includes('agendar')) {
    return { response: getBookingName(), state: STATES.BOOKING_NAME }
  }

  if (message === '2' || lower.includes('mis citas')) {
    const appointments = await getAppointmentsByPhone(phone)
    if (!appointments.length) {
      return { response: '📅 No tienes citas.\n\n¿Agendar una? (1)', state: STATES.IDLE }
    }
    const list = appointments.map((a, i) =>
      `${i + 1}. ${a.service} - ${a.date} (${a.status})`
    ).join('\n')
    return { response: `📅 **Tus citas:**\n\n${list}\n\n¿Reagendar (4) o cancelar (3)?`, state: STATES.IDLE }
  }

  if (message === '3' || lower.includes('cancelar')) {
    const appointments = await getAppointmentsByPhone(phone)
    if (!appointments.length) {
      return { response: '📅 No tienes citas para cancelar.\n\n' + getWelcome(), state: STATES.IDLE }
    }
    userSessions.set(phone, { appointments, action: 'cancel' })
    const list = appointments.map((a, i) => `${i + 1}. ${a.service} - ${a.date}`).join('\n')
    return { response: `⚠️ **¿Cuál cancelar?**\n\n${list}\n\n*Escribe el número.*`, state: STATES.CANCELLING_SELECT }
  }

  if (message === '4' || lower.includes('reagendar')) {
    const appointments = await getAppointmentsByPhone(phone)
    if (!appointments.length) {
      return { response: '📅 No tienes citas para reagendar.\n\n' + getWelcome(), state: STATES.IDLE }
    }
    userSessions.set(phone, { appointments, action: 'reschedule' })
    const list = appointments.map((a, i) => `${i + 1}. ${a.service} - ${a.date}`).join('\n')
    return { response: `🔄 **¿Cuál reagendar?**\n\n${list}\n\n*Escribe el número.*`, state: STATES.RESCHEDULING_SELECT }
  }

  if (message === '5') {
    return { response: getPrices(), state: STATES.IDLE }
  }

  return { response: getWelcome(), state: STATES.IDLE }
}

async function handleBookingName(phone: string, name: string): Promise<{ response: string; state: string }> {
  const user = await getOrCreateUser(phone, name)
  userSessions.set(phone, { user })
  return { response: getBookingServices(), state: STATES.BOOKING_SERVICE }
}

async function handleBookingService(phone: string, serviceKey: string): Promise<{ response: string; state: string }> {
  const service = SERVICES[serviceKey]
  if (!service) return { response: '❌ Opción inválida (1-5).', state: STATES.BOOKING_SERVICE }

  userSessions.set(phone, { ...userSessions.get(phone), service })
  return { response: getBookingDate(service.name), state: STATES.BOOKING_DATE }
}

async function handleBookingDate(phone: string, dateText: string): Promise<{ response: string; state: string }> {
  const session = userSessions.get(phone)
  if (!session) return { response: '❌ Error de sesión. Inicia de nuevo: "Hola"', state: STATES.IDLE }

  const parsedDate = parseDate(dateText)
  if (!parsedDate) {
    return { response: '❌ Fecha inválida (pasada, domingo, o formato incorrecto).\n\nEjemplo: "Mañana a las 10am"', state: STATES.BOOKING_DATE }
  }

  // Verificar disponibilidad en Calendar
  const endTime = new Date(parsedDate.getTime() + session.service.duration * 60000)
  const available = await checkAvailability(parsedDate, endTime)

  if (!available) {
    const slots = await getAvailableSlots(parsedDate, session.service.duration)
    const slotsText = slots.join('\n') || 'No hay horarios disponibles ese día.'
    return { response: `❌ Horario ocupado.\n\nDisponible:\n${slotsText}\n\nIntenta otro horario.`, state: STATES.BOOKING_DATE }
  }

  // Crear evento en Calendar
  const eventId = await createEvent(
    `Cita: ${session.service.name} - ${session.user.name}`,
    `Teléfono: ${phone}`,
    parsedDate,
    endTime
  )

  // Guardar en Airtable
  const appointment = await createAppointment({
    phone,
    name: session.user.name,
    service: session.service.name,
    date: parsedDate.toISOString(),
    status: 'confirmed',
    calendarEventId: eventId
  })

  userSessions.delete(phone)
  return { response: getConfirmation(appointment), state: STATES.IDLE }
}

async function handleReschedulingSelect(phone: string, selection: string): Promise<{ response: string; state: string }> {
  const session = userSessions.get(phone)
  if (!session) return { response: getWelcome(), state: STATES.IDLE }

  const index = parseInt(selection) - 1
  if (isNaN(index) || index < 0 || index >= session.appointments.length) {
    return { response: '❌ Número inválido. Intenta de nuevo:', state: STATES.RESCHEDULING_SELECT }
  }

  const selected = session.appointments[index]
  userSessions.set(phone, { ...session, selected })

  return { response: `🔄 **Reagendar:** ${selected.service} - ${new Date(selected.date).toLocaleString('es-MX')}\n\nNueva fecha y hora:`, state: STATES.RESCHEDULING_DATE }
}

async function handleReschedulingDate(phone: string, dateText: string): Promise<{ response: string; state: string }> {
  const session = userSessions.get(phone)
  if (!session?.selected) return { response: getWelcome(), state: STATES.IDLE }

  const parsedDate = parseDate(dateText)
  if (!parsedDate) {
    return { response: '❌ Fecha inválida.\n\nIntenta de nuevo:', state: STATES.RESCHEDULING_DATE }
  }

  // Actualizar en Calendar
  const duration = SERVICES['1'].duration // Default
  const endTime = new Date(parsedDate.getTime() + duration * 60000)
  await updateEvent(session.selected.calendarEventId || '', parsedDate, endTime)

  // Actualizar en Airtable
  await updateAppointmentDate(session.selected.id, parsedDate.toISOString())

  userSessions.delete(phone)
  return { response: '✅ **Cita reagendada.**\n\n¿Necesitas algo más?\n1️⃣ Agendar\n2️⃣ Mis citas', state: STATES.IDLE }
}

async function handleCancellingSelect(phone: string, selection: string): Promise<{ response: string; state: string }> {
  const session = userSessions.get(phone)
  if (!session) return { response: getWelcome(), state: STATES.IDLE }

  const index = parseInt(selection) - 1
  if (isNaN(index) || index < 0 || index >= session.appointments.length) {
    return { response: '❌ Número inválido. Intenta de nuevo:', state: STATES.CANCELLING_SELECT }
  }

  const selected = session.appointments[index]

  // Borrar de Calendar
  if (selected.calendarEventId) {
    await deleteEvent(selected.calendarEventId)
  }

  // Actualizar en Airtable
  await updateAppointmentStatus(selected.id, 'cancelled')

  userSessions.delete(phone)
  return { response: '✅ **Cita cancelada.**\n\n¿Necesitas algo más?\n1️⃣ Agendar\n2️⃣ Mis citas', state: STATES.IDLE }
}

// ==================== WEBHOOK ====================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]

    if (!message || message.type !== 'text') return NextResponse.json({ ok: true })

    const phone = message.from
    const text = message.text.body.trim()
    const session = userSessions.get(phone) || { state: STATES.IDLE }
    const state = session.state

    let result: { response: string; state: string }

    switch (state) {
      case STATES.BOOKING_NAME:
        result = await handleBookingName(phone, text)
        break
      case STATES.BOOKING_SERVICE:
        result = await handleBookingService(phone, text)
        break
      case STATES.BOOKING_DATE:
        result = await handleBookingDate(phone, text)
        break
      case STATES.RESCHEDULING_SELECT:
        result = await handleReschedulingSelect(phone, text)
        break
      case STATES.RESCHEDULING_DATE:
        result = await handleReschedulingDate(phone, text)
        break
      case STATES.CANCELLING_SELECT:
        result = await handleCancellingSelect(phone, text)
        break
      default:
        result = await handleIdle(phone, text)
    }

    userSessions.set(phone, { state: result.state })

    // Enviar a WhatsApp
    await sendWhatsApp(phone, result.response)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ ok: true }) // No fallar
  }
}

async function sendWhatsApp(phone: string, text: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneId) return

  await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: text }
    })
  })
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode')
  const token = request.nextUrl.searchParams.get('hub.verify_token')
  const challenge = request.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge)
  }

  return new NextResponse('Forbidden', { status: 403 })
}