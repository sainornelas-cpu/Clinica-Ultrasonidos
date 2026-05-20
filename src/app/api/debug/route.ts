import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const envVars = {
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN ? '✅ Set (length: ' + process.env.WHATSAPP_ACCESS_TOKEN.length + ')' : '❌ NOT SET',
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '❌ NOT SET',
    WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '❌ NOT SET',
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || '❌ NOT SET',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✅ Set (length: ' + process.env.OPENAI_API_KEY.length + ')' : '❌ NOT SET',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '❌ NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : '❌ NOT SET',
  }

  return NextResponse.json({ environment: envVars })
}
