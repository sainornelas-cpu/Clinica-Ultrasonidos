import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-8 p-8">
        <div>
          <h1 className="text-5xl font-bold text-white mb-4">
            🏥 Clinic WhatsApp AI
          </h1>
          <p className="text-xl text-gray-400">
            Sistema inteligente de agendamiento de citas médicas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-white font-semibold mb-2">WhatsApp Bot</h3>
            <p className="text-gray-400 text-sm">
              Agenda, reagenda y cancela citas automáticamente vía WhatsApp
            </p>
          </div>

          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-white font-semibold mb-2">Calendario Híbrido</h3>
            <p className="text-gray-400 text-sm">
              Sincronización bidireccional con Google Calendar en tiempo real
            </p>
          </div>

          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <div className="text-4xl mb-4">🔔</div>
            <h3 className="text-white font-semibold mb-2">Recordatorios</h3>
            <p className="text-gray-400 text-sm">
              Alertas automáticas 24h y 3h antes de cada cita
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Ir al Dashboard
          </Link>
          <a
            href="https://github.com/tu-repo"
            className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
          >
            Documentación
          </a>
        </div>

        <div className="pt-8 border-t border-gray-800">
          <p className="text-gray-500 text-sm">
            Construido con Next.js, Supabase, OpenAI y WhatsApp Business API
          </p>
        </div>
      </div>
    </div>
  )
}