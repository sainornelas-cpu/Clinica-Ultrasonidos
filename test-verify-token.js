/**
 * Script para encontrar el WHATSAPP_VERIFY_TOKEN correcto
 * Prueba valores comunes para ver cuál funciona
 */

const webhookUrl = 'https://clinica-ultrasonidos-b25erkjnw-sainornelas-5924s-projects.vercel.app/api/webhook'

const commonTokens = [
  'verify_token',
  'whatsapp_verify',
  'verify_token_123',
  'whatsapp_verify_token',
  'clinic_verify',
  'Alsaoral123.',
  'test',
  'token',
  'whatsapp'
]

async function testVerifyToken(token) {
  const url = new URL(webhookUrl)
  url.searchParams.set('hub.mode', 'subscribe')
  url.searchParams.set('hub.verify_token', token)
  url.searchParams.set('hub.challenge', 'test_challenge_12345')

  try {
    const response = await fetch(url.toString(), { method: 'GET' })

    if (response.ok) {
      const text = await response.text()
      return { success: true, token, challenge: text }
    } else {
      return { success: false, token, status: response.status }
    }
  } catch (error) {
    return { success: false, token, error: error.message }
  }
}

console.log('🔍 Buscando WHATSAPP_VERIFY_TOKEN correcto...\n')

for (const token of commonTokens) {
  const result = await testVerifyToken(token)
  if (result.success) {
    console.log(`✅ ENCONTRADO: "${token}"`)
    console.log(`   Challenge: ${result.challenge}`)
    process.exit(0)
  } else {
    console.log(`❌ "${token}" - HTTP ${result.status}`)
  }
}

console.log('\n⚠️ No se encontró ningún token común.')
console.log('💡 Necesitas obtener el WHATSAPP_VERIFY_TOKEN real desde Meta Developers.')
