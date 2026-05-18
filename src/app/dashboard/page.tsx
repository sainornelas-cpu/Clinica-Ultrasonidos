import { redirect } from 'next/navigation'
import HybridCalendar from '@/components/dashboard/HybridCalendar'

// TODO: Implementar autenticación real con Supabase Auth
export default function DashboardPage() {
  // Placeholder owner ID - reemplazar con auth real
  const ownerId = 'owner-uuid-placeholder'

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                🏥 Dashboard Clínica
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Gestión de citas en tiempo real
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
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
            <div className="text-3xl font-bold text-white">12</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Esta Semana</div>
            <div className="text-3xl font-bold text-blue-400">48</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Pendientes</div>
            <div className="text-3xl font-bold text-amber-400">5</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Canceladas</div>
            <div className="text-3xl font-bold text-red-400">2</div>
          </div>
        </div>

        {/* Calendario */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className="text-white font-semibold mb-4">Próximas Citas</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="text-white text-sm font-medium">Limpieza Dental</div>
                  <div className="text-gray-400 text-xs mt-1">Hoy, 10:00 AM</div>
                  <div className="text-gray-500 text-xs mt-1">+52 123 456 7890</div>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="text-white text-sm font-medium">Ortodoncia</div>
                  <div className="text-gray-400 text-xs mt-1">Hoy, 2:00 PM</div>
                  <div className="text-gray-500 text-xs mt-1">+52 098 765 4321</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className="text-white font-semibold mb-4">Alertas</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-amber-400">⚠️</span>
                  <span className="text-gray-300">2 cancelaciones hoy</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-green-400">✅</span>
                  <span className="text-gray-300">Nueva cita agendada</span>
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
    </div>
  )
}