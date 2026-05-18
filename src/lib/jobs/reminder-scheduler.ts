import { createServerClient } from '@/lib/supabase/client'

/**
 * Job principal: Enviar recordatorios 24h y 3h antes
 * Se ejecuta cada hora vía Vercel Cron
 */
export async function sendAppointmentReminders() {
  console.log('🔔 Starting reminder job...')

  const supabase = createServerClient()
  const now = new Date()

  try {
    // Recordatorios 24 horas antes
    await sendRemindersByHours(24, '24h')

    // Recordatorios 3 horas antes
    await sendRemindersByHours(3, '3h')

    console.log('✅ Reminder job completed')
  } catch (error) {
    console.error('❌ Error in reminder job:', error)
  }
}

/**
 * Enviar recordatorios para citas en X horas
 */
async function sendRemindersByHours(hours: number, reminderType: '24h' | '3h') {
  const supabase = createServerClient()
  const now = new Date()
  const targetTime = new Date(now.getTime() + hours * 60 * 60 * 1000)
  const timeWindow = 60 * 60 * 1000 // Ventana de 1 hora

  console.log(`📅 Checking for ${hours}h reminders...`)

  // Obtener citas confirmadas que aún no han sido recordadas
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      *,
      users (
        phone_number,
        full_name
      )
    `)
    .eq('status', 'confirmed')
    .gte('start_time', new Date(targetTime.getTime() - timeWindow).toISOString())
    .lte('start_time', new Date(targetTime.getTime() + timeWindow).toISOString())
    .is(reminderType === '24h' ? 'reminder_24h_sent', false)
    .is(reminderType === '3h' ? 'reminder_3h_sent', false)

  if (error) {
    console.error('❌ Error fetching appointments:', error)
    return
  }

  if (!appointments || appointments.length === 0) {
    console.log(`ℹ️ No appointments found for ${hours}h reminder`)
    return
  }

  console.log(`📬 Sending ${hours}h reminders to ${appointments.length} appointments`)

  // Enviar recordatorio a cada cita
  for (const appointment of appointments) {
    try {
      await sendReminder(appointment, hours)

      // Marcar como enviado
      const updateField = reminderType === '24h' ? 'reminder_24h_sent' : 'reminder_3h_sent'
      await supabase
        .from('appointments')
        .update({ [updateField]: true })
        .eq('id', appointment.id})

    } catch (error) {
      console.error(`❌ Error sending reminder for ${appointment.id}:`, error)
    }
  }
}

/**
 * Enviar recordatorio individual
 */
async function sendReminder(appointment: any, hours: number) {
  const userPhone = appointment.users?.phone_number
  const userName = appointment.users?.full_name || 'estimado paciente'
  const serviceName = appointment.service_name
  const startTime = new Date(appointment.start_time)

  if (!userPhone) {
    console.warn(`⚠️ No phone number for appointment ${appointment.id}`)
    return
  }

  let message = ''

  if (hours === 24) {
    message = `🔔 ${userName}, te recordamos tu cita de mañana:

🦷 ${serviceName}
📅 ${startTime.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}
⏰ ${startTime.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    })}

📍 [Dirección de la clínica]
🅿️ Estacionamiento disponible

✅ Responde CONFIRMAR para confirmar
✏️ Responde REAGENDAR para cambiar
❌ Responde CANCELAR para cancelar`

  } else if (hours === 3) {
    message = `🔔 ${userName}, tu cita es en 3 HORAS:

🦷 ${serviceName}
⏰ ${startTime.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    })}

📍 [Dirección de la clínica]

✅ Confirmar asistencia
✏️ Reagendar
❌ Cancelar

Responde con el número:
1️⃣ Confirmar
2️⃣ Reagendar
3️⃣ Cancelar`
  }

  // Enviar vía WhatsApp
  await sendWhatsAppMessage(userPhone, message)

  console.log(`✅ Sent ${hours}h reminder to ${userPhone} for ${appointment.id}`)
}

/**
 * Enviar mensaje de WhatsApp
 */
async function sendWhatsAppMessage(to: string, message: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  try {
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
      console.error('❌ Error sending WhatsApp:', error)
      throw new Error('Failed to send WhatsApp message')
    }

    return response.json()
  } catch (error) {
    console.error('❌ Error in sendWhatsAppMessage:', error)
    throw error
  }
}

/**
 * Job: Verificar citas sin confirmar (no-shows potenciales)
 */
export async function checkUnconfirmedAppointments() {
  console.log('⚠️ Checking unconfirmed appointments...')

  const supabase = createServerClient()
  const now = new Date()

  // Buscar citas que pasaron hace más de 1 hora y siguen como "confirmed"
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      *,
      users (
        phone_number,
        full_name
      )
    `)
    .eq('status', 'confirmed')
    .lt('end_time', new Date(now.getTime() - 60 * 60 * 1000).toISOString())

  if (appointments && appointments.length > 0) {
    console.log(`⚠️ Found ${appointments.length} potential no-shows`)

    for (const appointment of appointments) {
      // Marcar como no-show
      await supabase
        .from('appointments')
        .update({
          status: 'no_show',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id)

      // Crear alerta para el dueño
      await supabase.from('owner_alerts').insert({
        appointment_id: appointment.id,
        alert_type: 'no_show',
        payload: {
          patient: appointment.users,
          service: appointment.service_name,
          scheduled_time: appointment.start_time
        }
      })
    }
  }
}