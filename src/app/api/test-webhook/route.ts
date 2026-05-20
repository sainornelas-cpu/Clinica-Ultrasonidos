import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, message } = body

    console.log('📦 Test webhook - Phone:', phone, 'Message:', message)

    // Test Supabase
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', phone)
      .single()

    console.log('📊 Supabase result:', { data, error })

    return NextResponse.json({
      success: true,
      user: data,
      error: error?.message
    })
  } catch (error) {
    console.error('❌ Test webhook error:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  }
}
