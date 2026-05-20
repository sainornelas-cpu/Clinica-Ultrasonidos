import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    console.log('🤖 Testing OpenAI - Message:', message)

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Eres un asistente útil.' },
        { role: 'user', content: message || 'Hola' }
      ],
      temperature: 0.7,
      max_tokens: 100
    })

    const aiResponse = completion.choices[0].message.content
    console.log('✅ OpenAI response:', aiResponse)

    return NextResponse.json({
      success: true,
      response: aiResponse
    })
  } catch (error) {
    console.error('❌ OpenAI test error:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      details: (error as any).toString()
    }, { status: 500 })
  }
}
