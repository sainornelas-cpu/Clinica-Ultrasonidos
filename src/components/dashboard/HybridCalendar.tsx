'use client'

import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

interface Appointment {
  id: string
  service_name: string
  start_time: string
  end_time: string
  status: string
  user_id: string
  notes?: string
}

interface HybridCalendarProps {
  ownerId: string
}

export default function HybridCalendar({ ownerId }: HybridCalendarProps) {
  const [events, setEvents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  // Cargar citas iniciales
  useEffect(() => {
    loadAppointments()
  }, [ownerId])

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    let channel: RealtimeChannel

    const subscribeToChanges = () => {
      channel = supabase
        .channel('appointments_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments',
            filter: `owner_id=eq.${ownerId}`
          },
          (payload) => {
            console.log('🔔 Realtime change:', payload)

            // ✅ Doble cast para puente entre Supabase (loose) y TypeScript (strict)
            const newData = payload.new as unknown as Appointment
            const oldData = payload.old as unknown as Appointment

            if (payload.eventType === 'INSERT' && newData) {
              setEvents((prev) => [...prev, formatEvent(newData)])
            } else if (payload.eventType === 'UPDATE' && newData) {
              setEvents((prev) =>
                prev.map((event) =>
                  event.id === newData.id ? formatEvent(newData) : event
                )
              )
            } else if (payload.eventType === 'DELETE' && oldData) {
              setEvents((prev) => prev.filter((event) => event.id !== oldData.id))
            }
          }
        )
        .subscribe()
    }

    subscribeToChanges()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [ownerId])

  async function loadAppointments() {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('status', 'confirmed')
        .order('start_time', { ascending: true })

      if (error) throw error

      const formattedEvents = data.map(formatEvent)
      setEvents(formattedEvents)
    } catch (error) {
      console.error('❌ Error loading appointments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function formatEvent(appointment: Appointment) {
    return {
      id: appointment.id,
      title: `${appointment.service_name}`,
      start: appointment.start_time,
      end: appointment.end_time,
      backgroundColor: getStatusColor(appointment.status),
      borderColor: getStatusColor(appointment.status),
      extendedProps: {
        ...appointment
      }
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'confirmed':
        return '#3b82f6' // blue
      case 'rescheduled':
        return '#f59e0b' // amber
      case 'cancelled':
        return '#ef4444' // red
      default:
        return '#6b7280' // gray
    }
  }

  // Manejar drag-and-drop (reagendar)
  const handleEventDrop = async (info: any) => {
    const appointmentId = info.event.id
    const newStart = info.event.start.toISOString()

    try {
      const response = await fetch(`/api/appointment/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: newStart,
          reason: 'Reagendado desde dashboard'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update appointment')
      }

      // Actualización local optimista
      info.event.setProp('backgroundColor', '#f59e0b')
      info.event.setProp('borderColor', '#f59e0b')

      alert('✅ Cita reagendada exitosamente')
    } catch (error) {
      console.error('❌ Error rescheduling:', error)
      info.revert() // Revertir cambio visual si falla
      alert('❌ No se pudo reagendar la cita. Intenta de nuevo.')
    }
  }

  // Manejar resize de evento
  const handleEventResize = async (info: any) => {
    // Similar a handleEventDrop pero para cambiar duración
    await handleEventDrop(info)
  }

  // Click en evento para ver detalles
  const handleEventClick = (info: any) => {
    const appointment = info.event.extendedProps
    alert(`
      📅 ${appointment.service_name}
      ⏰ ${new Date(appointment.start_time).toLocaleString()}
      📝 Notas: ${appointment.notes || 'Sin notas'}
      👤 Usuario: ${appointment.user_id}
    `)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 rounded-xl">
        <div className="text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Cargando calendario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-900 rounded-xl p-4 relative">
      {/* Header con badge de realtime */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">📅 Calendario de Citas</h2>
        <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          En vivo
        </div>
      </div>

      {/* Calendario */}
      <div className="bg-gray-800 rounded-lg p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          events={events}
          editable={true}
          selectable={true}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventClick={handleEventClick}
          locale={esLocale}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={false}
          slotDuration="00:30:00"
          slotLabelInterval="01:00"
          height="auto"
          eventDisplay="block"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false
          }}
          dayHeaderFormat={{
            weekday: 'short',
            day: 'numeric',
            month: 'short'
          }}
          buttonText={{
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día'
          }}
          eventContent={(eventInfo) => (
            <div className="p-1 text-xs font-semibold">
              <div>{eventInfo.timeText}</div>
              <div>{eventInfo.event.title}</div>
            </div>
          )}
        />
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex gap-4 text-sm text-gray-300">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Confirmada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500 rounded"></div>
          <span>Reagendada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Cancelada</span>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="mt-4 text-xs text-gray-400">
        💡 Arrastra las citas para reagendar • Click para ver detalles
      </div>
    </div>
  )
}