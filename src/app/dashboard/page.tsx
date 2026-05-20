'use client'

import { useState, useEffect } from 'react'
import HybridCalendar from '@/components/dashboard/HybridCalendar'
import { createClient } from '@/lib/supabase/client'

interface Appointment {
  id: string
  service_name: string
  start_time: string
  end_time: string
  status: string
  notes?: string
  users: {
    phone_number: string
    full_name: string | null
  }
}

export default function DashboardPage() {
  const ownerId = 'owner-uuid-placeholder'
  const supabase = createClient()

  // Estados
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewAppointmentForm, setShowNewAppointmentForm] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  // Estadísticas
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    pending: 0,
    cancelled: 0
  })

  // Cargar citas
  useEffect(() => {
    loadAppointments()
  }, [])

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          loadAppointments() // Recargar cuando haya cambios
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadAppointments() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/appointments')
      const data = await response.json()

      if (data.success) {
        setAppointments(data.appointments)
        calculateStats(data.appointments)
      }
    } catch (error) {
      console.error('❌ Error loading appointments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function calculateStats(appts: Appointment[]) {
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const today = appts.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate.toDateString() === now.toDateString()
    }).length

    const week = appts.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= now && aptDate <= weekFromNow
    }).length

    const pending = appts.filter(apt => apt.status === 'confirmed').length
    const cancelled = appts.filter(apt => apt.status === 'cancelled').length

    setStats({ today, week, pending, cancelled })
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-500'
      case 'rescheduled':
        return 'bg-amber-500'
      case 'cancelled':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  async function handleCancelAppointment(apt: Appointment) {
    if (!confirm(`¿Cancelar cita de ${apt.users.full_name || apt.users.phone_number}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/appointment/${apt.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Cancelada desde dashboard'
        })
      })

      if (response.ok) {
        alert('✅ Cita cancelada exitosamente')
        loadAppointments()
      }
    } catch (error) {
      alert('❌ Error al cancelar cita')
    }
  }

  function openAppointmentDetails(apt: Appointment) {
    setSelectedAppointment(apt)
  }

  function closeAppointmentDetails() {
    setSelectedAppointment(null)
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                🏥 Dashboard Dr. Baltierres
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Gestión de citas en tiempo real
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowNewAppointmentForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                + Nueva Cita
              </button>
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">A</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Citas Hoy</div>
            <div className="text-3xl font-bold text-white">{stats.today}</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Esta Semana</div>
            <div className="text-3xl font-bold text-blue-400">{stats.week}</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Confirmadas</div>
            <div className="text-3xl font-bold text-amber-400">{stats.pending}</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Canceladas</div>
            <div className="text-3xl font-bold text-red-400">{stats.cancelled}</div>
          </div>
        </div>

        {/* Calendario y Lista */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Lista de Citas */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className="text-white font-semibold mb-4">Todas las Citas</h3>
              {isLoading ? (
                <div className="text-gray-400 text-center py-8">Cargando...</div>
              ) : appointments.length === 0 ? (
                <div className="text-gray-400 text-center py-8">No hay citas</div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3 bg-gray-800 rounded-lg hover:bg-gray-750 cursor-pointer transition-colors"
                      onClick={() => openAppointmentDetails(apt)}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 mt-1.5 rounded-full ${getStatusColor(apt.status)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">
                            {apt.service_name}
                          </div>
                          <div className="text-gray-400 text-xs mt-1">
                            {formatDate(apt.start_time)}
                          </div>
                          <div className="text-gray-500 text-xs mt-1 truncate">
                            {apt.users.full_name || apt.users.phone_number}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className="text-white font-semibold mb-4">Alertas</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-green-400">✅</span>
                  <span className="text-gray-300">
                    Sistema sincronizado en tiempo real
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Calendario Principal */}
          <div className="lg:col-span-3">
            <HybridCalendar ownerId={ownerId} />
          </div>
        </div>
      </main>

      {/* Modal de detalles de cita */}
      {selectedAppointment && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeAppointmentDetails}
        >
          <div
            className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Detalles de Cita</h3>
              <button
                onClick={closeAppointmentDetails}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Servicio</label>
                <div className="text-white font-medium">{selectedAppointment.service_name}</div>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Fecha y Hora</label>
                <div className="text-white font-medium">
                  {formatDate(selectedAppointment.start_time)}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Paciente</label>
                <div className="text-white font-medium">
                  {selectedAppointment.users.full_name || 'Sin nombre'}
                </div>
                <div className="text-gray-400 text-sm">
                  {selectedAppointment.users.phone_number}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Estado</label>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(selectedAppointment.status)}`} />
                  <span className="text-white capitalize">{selectedAppointment.status}</span>
                </div>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <label className="text-gray-400 text-sm">Notas</label>
                  <div className="text-white text-sm bg-gray-800 p-2 rounded">
                    {selectedAppointment.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              {selectedAppointment.status === 'confirmed' && (
                <button
                  onClick={() => {
                    handleCancelAppointment(selectedAppointment)
                    closeAppointmentDetails()
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar Cita
                </button>
              )}
              <button
                onClick={closeAppointmentDetails}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de nueva cita */}
      {showNewAppointmentForm && (
        <NewAppointmentModal
          onClose={() => setShowNewAppointmentForm(false)}
          onSuccess={() => {
            setShowNewAppointmentForm(false)
            loadAppointments()
          }}
        />
      )}
    </div>
  )
}

function NewAppointmentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    phone_number: '',
    full_name: '',
    service_name: '',
    start_time: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  const services = [
    'Consulta General',
    'Ultrasonido Ginecológico',
    'Control Prenatal',
    'Papanicolaou',
    'Consulta de Fertilidad'
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          duration_minutes: 30,
          notes: 'Creada desde dashboard'
        })
      })

      if (response.ok) {
        alert('✅ Cita creada exitosamente')
        onSuccess()
      }
    } catch (error) {
      alert('❌ Error al crear cita')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Nueva Cita</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Nombre</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Teléfono</label>
            <input
              type="tel"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Servicio</label>
            <select
              value={formData.service_name}
              onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">Seleccionar...</option>
              {services.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Fecha y Hora</label>
            <input
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isLoading ? 'Guardando...' : 'Crear Cita'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}