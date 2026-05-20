import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')

    const promptPath = path.join(process.cwd(), 'src', 'lib', 'prompts', 'agent-system.md')
    console.log('📄 Prompt path:', promptPath)

    const content = await fs.readFile(promptPath, 'utf-8')
    console.log('✅ Prompt loaded, length:', content.length)

    return NextResponse.json({
      success: true,
      path: promptPath,
      promptLength: content.length,
      promptPreview: content.substring(0, 200)
    })
  } catch (error) {
    console.error('❌ Error loading prompt:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      cwd: process.cwd()
    }, { status: 500 })
  }
}
