import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { updateAppointment, cancelAppointment } from '@/lib/calendar/sync-utils'

// GET: Obtener detalles de una cita
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ✅ params es Promise
) {
  try {
    // ✅ Await para extraer el id
    const { id: appointmentId } = await params

    const supabase = createServerClient()
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        users (
          phone_number,
          full_name
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (error || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ appointment })

  } catch (error) {
    console.error('❌ Error fetching appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT: Actualizar/Reagendar cita
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ✅ params es Promise
) {
  try {
    const { id: appointmentId } = await params  // ✅ Await aquí también
    const body = await request.json()
    const { start_time, reason, user_phone } = body

    if (!start_time) {
      return NextResponse.json(
        { error: 'start_time is required' },
        { status: 400 }
      )
    }

    console.log(`🔄 Updating appointment ${appointmentId}:`, { start_time, reason })

    const supabase = createServerClient()

    // Verificar que la cita existe
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      console.error('❌ Appointment not found:', fetchError)
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Verificación opcional por phone_number
    if (user_phone) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', user_phone)
        .single()

      if (!user || user.id !== appointment.user_id) {
        return NextResponse.json(
          { error: 'Unauthorized: Phone number does not match' },
          { status: 403 }
        )
      }
    }

    // Actualizar cita
    const updated = await updateAppointment(
      appointmentId,
      start_time,
      reason || 'Reagendado desde dashboard'
    )

    return NextResponse.json({
      success: true,
      appointment: updated,
      message: 'Appointment updated successfully'
    })

  } catch (error) {
    console.error('❌ Error updating appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Cancelar cita
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ✅ params es Promise
) {
  try {
    const { id: appointmentId } = await params  // ✅ Await aquí también
    const body = await request.json()
    const { reason, user_phone } = body

    console.log(`❌ Cancelling appointment ${appointmentId}:`, { reason })

    // Verificación opcional
    if (user_phone) {
      const supabase = createServerClient()
      const { data: appointment } = await supabase
        .from('appointments')
        .select('user_id')
        .eq('id', appointmentId)
        .single()

      if (appointment) {
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('phone_number', user_phone)
          .single()

        if (!user || user.id !== appointment.user_id) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
      }
    }

    // Cancelar cita
    await cancelAppointment(
      appointmentId,
      reason || 'Cancelada desde dashboard'
    )

    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled successfully'
    })

  } catch (error) {
    console.error('❌ Error cancelling appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
