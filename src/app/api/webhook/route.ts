import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import OpenAI from 'openai'

// WhatsApp Webhook Handler
export async function GET(request: NextRequest) {
  console.log('🔔 Webhook GET hit - Meta verification')

  const searchParams = request.nextUrl.searchParams
  const hubMode = searchParams.get('hub.mode')
  const hubVerifyToken = searchParams.get('hub.verify_token')
  const hubChallenge = searchParams.get('hub.challenge')

  // Verificar token
  if (hubMode === 'subscribe' && hubVerifyToken === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully')
    return new NextResponse(hubChallenge, { status: 200 })
  } else {
    console.error('❌ Webhook verification failed')
    return new NextResponse('Forbidden', { status: 403 })
  }
}

export async function POST(request: NextRequest) {
  console.log('📨 Webhook POST hit - Incoming message')

  try {
    const body = await request.json()
    console.log('📦 Received payload:', JSON.stringify(body, null, 2))

    // Extraer mensaje de WhatsApp (estructura anidada de Meta)
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const messages = value?.messages

    if (!messages || messages.length === 0) {
      console.log('⚠️ No messages in payload')
      return new NextResponse('No messages', { status: 200 })
    }

    const message = messages[0]
    const from = message.from // Número del usuario
    const messageType = message.type

    // Solo procesar mensajes de texto
    if (messageType !== 'text') {
      console.log('⚠️ Ignoring non-text message')
      return new NextResponse('OK', { status: 200 })
    }

    const userMessage = message.text.body
    console.log(`💬 Message from ${from}: ${userMessage}`)

    // Obtener o crear usuario en Supabase
    const supabase = createServerClient()

    // 1. Buscar usuario por teléfono
    let { data: existingUser, error: userFetchError } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', from)
      .single()

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      // 2. Crear nuevo usuario si no existe
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          phone_number: from,
          full_name: null,
          timezone: 'America/Mexico_City',
          trust_score: 1.0
        })
        .select('id')
        .single()

      if (insertError || !newUser) {
        console.error('❌ Error creating user:', insertError)
        return new NextResponse('DB Error', { status: 500 })
      }

      userId = newUser.id
      console.log('✅ New user created:', userId)
    }

    // Guardar mensaje del usuario en interaction_logs
    await supabase.from('interaction_logs').insert({
      user_id: userId,
      role: 'user',
      content: userMessage,
      intent_detected: 'unknown',
      state_before: 'idle',
      state_after: 'processing'
    })

    // Cargar system prompt
    const systemPrompt = await loadSystemPrompt()

    // Llamar a OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 500
    })

    const aiResponse = completion.choices[0].message.content || 'Lo siento, tuve un error. Intenta de nuevo.'
    console.log(`🤖 AI Response: ${aiResponse}`)

    // Guardar respuesta de IA en interaction_logs
    await supabase.from('interaction_logs').insert({
      user_id: userId,
      role: 'assistant',
      content: aiResponse,
      intent_detected: 'response',
      state_before: 'processing',
      state_after: 'completed'
    })

    // Enviar respuesta vía WhatsApp API
    await sendWhatsAppMessage(from, aiResponse)

    return new NextResponse('OK', { status: 200 })

  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// Cargar system prompt desde archivo
async function loadSystemPrompt(): Promise<string> {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    const promptPath = path.join(process.cwd(), 'lib', 'prompts', 'agent-system.md')
    return await fs.readFile(promptPath, 'utf-8')
  } catch (error) {
    console.error('⚠️ Could not load system prompt, using fallback')
    return 'Eres un asistente útil de una clínica dental.'
  }
}

// Enviar mensaje vía WhatsApp Cloud API
async function sendWhatsAppMessage(to: string, message: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

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
    console.error('❌ Error sending WhatsApp message:', error)
    throw new Error('Failed to send WhatsApp message')
  }

  console.log('✅ WhatsApp message sent successfully')
  return response.json()
}