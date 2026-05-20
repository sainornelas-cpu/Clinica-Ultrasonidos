import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

import { createServerClient } from '@/lib/supabase/client'

// GET: Obtener todas las citas o filtrar por usuario
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const phone = searchParams.get('phone')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')

    const supabase = createServerClient()

    // Base query con joins para obtener información del usuario
    let query = supabase
      .from('from('appointments')')
      .select(`
        *,
        users (
          phone_number,
          full_name,
          email
        )
      `)
      .order('start_time', { ascending: true })
      .limit(limit)

    // Filtrar por teléfono si se proporciona
    if (phone) {
      query = query.eq('users.phone_number', phone)
    }

    // Filtrar por estado si se proporciona
    if (status) {
      query = query.eq('status', status)
    }

    const { data: from('appointments'), error } = await query

    if (error) {
      console.error('❌ Error fetching from('appointments'):', error)
      return NextResponse.json(
        { error: 'Failed to fetch from('appointments')' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      from('appointments'): from('appointments') || [],
      count: from('appointments')?.length || 0
    })

  } catch (error) {
    console.error('❌ Error in GET /api/from('appointments'):', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Crear nueva cita desde el dashboard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      phone_number,
      full_name,
      service_name,
      service_id,
      duration_minutes,
      start_time,
      notes
    } = body

    // Validaciones
    if (!phone_number || !service_name || !start_time) {
      return NextResponse.json(
        { error: 'Missing required fields: phone_number, service_name, start_time' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // 1. Obtener o crear usuario
    let { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', phone_number)
      .single()

    let userId: string

    if (!user) {
      // Crear nuevo usuario
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          phone_number,
          full_name: full_name || null,
          timezone: 'America/Mexico_City',
          trust_score: 1.0,
          conversation_state: 'idle'
        })
        .select('id')
        .single()

      if (insertError) throw insertError
      userId = newUser.id
    } else {
      userId = user.id
    }

    // 2. Calcular end_time
    const duration = duration_minutes || 30
    const startTime = new Date(start_time)
    const endTime = new Date(startTime.getTime() + duration * 60000)

    // 3. Crear cita
    const ownerId = '00000000-0000-0000-0000-000000000001'

    const { data: appointment, error: appointmentError } = await supabase
      .from('from('appointments')')
      .insert({
        user_id: userId,
        owner_id: ownerId,
        service_id: service_id || service_name.toLowerCase().replace(/\s+/g, '_'),
        service_name,
        duration_minutes: duration,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'confirmed',
        notes,
        changed_by: 'dashboard'
      })
      .select(`
        *,
        users (
          phone_number,
          full_name
        )
      `)
      .single()

    if (appointmentError) throw appointmentError

    // 4. Crear alerta para el dueño
    await supabase.from('owner_alerts').insert({
      appointment_id: appointment.id,
      alert_type: 'new_booking',
      payload: {
        service: service_name,
        start_time: startTime.toISOString(),
        patient_phone: phone_number,
        created_by: 'dashboard'
      },
      notified: false
    })

    console.log('✅ Appointment created from dashboard:', appointment.id)

    return NextResponse.json({
      success: true,
      appointment,
      message: 'Appointment created successfully'
    })

  } catch (error) {
    console.error('❌ Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Failed to create appointment', details: (error as Error).message },
      { status: 500 }
    )
  }
}
