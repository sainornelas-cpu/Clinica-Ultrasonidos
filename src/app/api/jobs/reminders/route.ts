import { NextResponse } from 'next/server'
import { sendAppointmentReminders, checkUnconfirmedAppointments } from '@/lib/jobs/reminder-scheduler'

// GET: Ejecutar job de recordatorios (llamado por Vercel Cron)
export async function GET(request: Request) {
  // Verificar secret token para seguridad
  const authHeader = request.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.REMINDER_CRON_SECRET}`

  if (authHeader !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  console.log('🤖 Cron job triggered at', new Date().toISOString())

  try {
    // Ejecutar jobs
    await sendAppointmentReminders()
    await checkUnconfirmedAppointments()

    return NextResponse.json({
      success: true,
      message: 'Reminder jobs completed',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Cron job failed:', error)
    return NextResponse.json(
      { error: 'Job failed', details: error },
      { status: 500 }
    )
  }
}