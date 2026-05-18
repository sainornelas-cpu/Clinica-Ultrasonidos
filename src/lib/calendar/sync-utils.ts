import { createServerClient } from '@/lib/supabase/client'

// Tipos
export interface CalendarEvent {
  id: string
  start: string
  end: string
  summary: string
  description?: string
}

export interface BusyTime {
  start: string
  end: string
}

export interface AppointmentData {
  userId: string
  serviceId: string
  serviceName: string
  duration: number
  startTime: string
  timezone: string
  notes?: string
}

/**
 * Verificar disponibilidad en calendario
 * Usa Google Calendar freeBusy API o Cal.com
 */
export async function checkAvailability(
  serviceId: string,
  dateRange: { start: string; end: string },
  durationMinutes: number,
  timezone: string = 'America/Mexico_City'
): Promise<{ start: string; end: string }[]> {
  console.log('🔍 Checking availability:', { serviceId, dateRange, durationMinutes })

  try {
    // OPCIÓN A: Google Calendar FreeBusy API
    const busyTimes = await fetchBusyTimes(dateRange, timezone)

    // OPCIÓN B: Cal.com (descomentar si usas Cal.com)
    // const busyTimes = await fetchCalcomBusyTimes(dateRange)

    // Generar slots disponibles
    const availableSlots = generateAvailableSlots(
      dateRange,
      busyTimes,
      durationMinutes,
      timezone
    )

    return availableSlots
  } catch (error) {
    console.error('❌ Error checking availability:', error)
    return []
  }
}

/**
 * Obtener tiempos ocupados de Google Calendar
 */
async function fetchBusyTimes(
  dateRange: { start: string; end: string },
  timezone: string
): Promise<BusyTime[]> {
  const calendarId = process.env.GOOGLE_CALENDAR_CLIENT_ID || 'primary'
  const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN

  if (!accessToken) {
    console.warn('⚠️ No Google Calendar access token, returning empty busy times')
    return []
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/freeBusy`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timeMin: dateRange.start,
          timeMax: dateRange.end,
          timeZone: timezone,
          items: [{ id: calendarId }]
        })
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch busy times')
    }

    const data = await response.json()
    const busy = data.calendars?.[calendarId]?.busy || []

    console.log('📅 Busy times:', busy)
    return busy
  } catch (error) {
    console.error('❌ Error fetching busy times:', error)
    return []
  }
}

/**
 * Generar slots disponibles basados en horarios ocupados
 */
function generateAvailableSlots(
  dateRange: { start: string; end: string },
  busyTimes: BusyTime[],
  durationMinutes: number,
  timezone: string
): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = []

  // Horario de trabajo: 9am - 7pm
  const workStartHour = 9
  const workEndHour = 19
  const bufferMinutes = 15

  const startDate = new Date(dateRange.start)
  const endDate = new Date(dateRange.end)

  // Iterar por cada día en el rango
  for (
    let date = new Date(startDate);
    date <= endDate;
    date.setDate(date.getDate() + 1)
  ) {
    // Saltar fines de semana (opcional)
    if (date.getDay() === 0 || date.getDay() === 6) continue

    // Generar slots para este día
    for (let hour = workStartHour; hour < workEndHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = new Date(date)
        slotStart.setHours(hour, minute, 0, 0)

        const slotEnd = new Date(slotStart)
        slotEnd.setMinutes(slotStart.getMinutes() + durationMinutes + bufferMinutes)

        // Verificar si no se traslapa con busy times
        const isBusy = busyTimes.some((busy) => {
          const busyStart = new Date(busy.start)
          const busyEnd = new Date(busy.end)
          return slotStart < busyEnd && slotEnd > busyStart
        })

        if (!isBusy) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString()
          })
        }
      }
    }
  }

  return slots.slice(0, 10) // Retornar máx 10 slots
}

/**
 * Crear cita en calendario + Supabase
 */
export async function createAppointment(data: AppointmentData) {
  const supabase = createServerClient()

  try {
    // 1. Crear evento en Google Calendar
    const calendarEventId = await createCalendarEvent(data)

    // 2. Guardar en Supabase
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        user_id: data.userId,
        owner_id: 'owner-uuid-placeholder', // Reemplazar con owner real
        service_id: data.serviceId,
        service_name: data.serviceName,
        duration_minutes: data.duration,
        start_time: data.startTime,
        end_time: new Date(new Date(data.startTime).getTime() + data.duration * 60000).toISOString(),
        status: 'confirmed',
        calendar_event_id: calendarEventId,
        calendar_provider: 'google',
        notes: data.notes,
        changed_by: 'bot'
      })
      .select()
      .single()

    if (error) throw error

    // 3. Crear alerta para el dueño
    await supabase.from('owner_alerts').insert({
      appointment_id: appointment.id,
      alert_type: 'new_booking',
      payload: {
        service: data.serviceName,
        start_time: data.startTime,
        patient_phone: data.userId
      },
      notified: false
    })

    console.log('✅ Appointment created:', appointment.id)
    return appointment
  } catch (error) {
    console.error('❌ Error creating appointment:', error)
    throw error
  }
}

/**
 * Crear evento en Google Calendar
 */
async function createCalendarEvent(data: AppointmentData): Promise<string> {
  const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN

  if (!accessToken) {
    console.warn('⚠️ No Google Calendar token, returning placeholder ID')
    return `local-${Date.now()}`
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: `${data.serviceName} - Cita`,
          description: data.notes || '',
          start: {
            dateTime: data.startTime,
            timeZone: data.timezone
          },
          end: {
            dateTime: new Date(new Date(data.startTime).getTime() + data.duration * 60000).toISOString(),
            timeZone: data.timezone
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 180 }, // 3 horas antes
              { method: 'email', minutes: 1440 }  // 24 horas antes
            ]
          }
        })
      }
    )

    if (!response.ok) {
      throw new Error('Failed to create calendar event')
    }

    const event = await response.json()
    console.log('📅 Calendar event created:', event.id)
    return event.id
  } catch (error) {
    console.error('❌ Error creating calendar event:', error)
    throw error
  }
}

/**
 * Actualizar cita existente
 */
export async function updateAppointment(
  appointmentId: string,
  newStartTime: string,
  reason: string
) {
  const supabase = createServerClient()

  try {
    // 1. Obtener cita actual
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single()

    if (fetchError) throw fetchError

    // 2. Actualizar en Google Calendar
    if (appointment.calendar_event_id) {
      await updateCalendarEvent(appointment.calendar_event_id, {
        start: newStartTime,
        duration: appointment.duration_minutes
      })
    }

    // 3. Actualizar en Supabase
    const { data: updated, error: updateError } = await supabase
      .from('appointments')
      .update({
        start_time: newStartTime,
        end_time: new Date(new Date(newStartTime).getTime() + appointment.duration_minutes * 60000).toISOString(),
        status: 'rescheduled',
        changed_by: 'bot',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select()
      .single()

    if (updateError) throw updateError

    // 4. Crear alerta
    await supabase.from('owner_alerts').insert({
      appointment_id: appointmentId,
      alert_type: 'reschedule',
      payload: {
        old_time: appointment.start_time,
        new_time: newStartTime,
        reason
      }
    })

    console.log('✅ Appointment updated:', appointmentId)
    return updated
  } catch (error) {
    console.error('❌ Error updating appointment:', error)
    throw error
  }
}

/**
 * Actualizar evento en Google Calendar
 */
async function updateCalendarEvent(
  eventId: string,
  updates: { start: string; duration: number }
) {
  const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN

  if (!accessToken) return

  try {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start: {
            dateTime: updates.start,
            timeZone: 'America/Mexico_City'
          },
          end: {
            dateTime: new Date(new Date(updates.start).getTime() + updates.duration * 60000).toISOString(),
            timeZone: 'America/Mexico_City'
          }
        })
      }
    )
  } catch (error) {
    console.error('❌ Error updating calendar event:', error)
  }
}

/**
 * Cancelar cita
 */
export async function cancelAppointment(
  appointmentId: string,
  reason: string
) {
  const supabase = createServerClient()

  try {
    // 1. Obtener cita
    const { data: appointment } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single()

    // 2. Cancelar en Google Calendar
    if (appointment?.calendar_event_id) {
      await deleteCalendarEvent(appointment.calendar_event_id)
    }

    // 3. Actualizar en Supabase
    await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        changed_by: 'bot',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    // 4. Crear alerta
    await supabase.from('owner_alerts').insert({
      appointment_id: appointmentId,
      alert_type: 'cancellation',
      payload: {
        reason,
        freed_slot: appointment?.start_time,
        service: appointment?.service_name
      }
    })

    console.log('✅ Appointment cancelled:', appointmentId)
  } catch (error) {
    console.error('❌ Error cancelling appointment:', error)
    throw error
  }
}

/**
 * Eliminar evento de Google Calendar
 */
async function deleteCalendarEvent(eventId: string) {
  const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN

  if (!accessToken) return

  try {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )
  } catch (error) {
    console.error('❌ Error deleting calendar event:', error)
  }
}