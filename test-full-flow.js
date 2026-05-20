// Test script para simular flujo completo de WhatsApp
const TEST_PHONE = '52100000000' // Número de prueba

// Payload de prueba para webhook de WhatsApp
const createWebhookPayload = (message) => ({
  object: 'whatsapp_business_account',
  entry: [{
    changes: [{
      value: {
        messages: [{
          from: TEST_PHONE,
          type: 'text',
          text: { body: message }
        }]
      }
    }]
  }]
})

async function sendWebhook(message) {
  console.log(`\n📤 ENVIANDO: "${message}"`)

  const response = await fetch('https://clinica-ultrasonidos.vercel.app/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createWebhookPayload(message))
  })

  const text = await response.text()
  console.log(`📥 RESPUESTA (${response.status}): ${text.substring(0, 200)}...`)
  console.log(`   Status: ${response.status}`)
  return { status: response.status, text }
}

// Verificar citas en Supabase
async function checkAppointments() {
  const response = await fetch('https://heubgudergnidbxyfhqq.supabase.co/rest/v1/appointments?select=*')
  const data = await response.json()
  console.log('\n📅 CITAS EN SUPABASE:')
  console.log(JSON.stringify(data, null, 2))
  return data
}

// Verificar logs en Supabase
async function checkLogs(phone) {
  const response = await fetch(`https://heubgudergnidbxyfhqq.supabase.co/rest/v1/interaction_logs?user_id=eq.${phone}&order=created_at.desc&limit=10`)
  const data = await response.json()
  console.log('\n📝 LOGS DE INTERACCIÓN:')
  console.log(JSON.stringify(data, null, 2))
  return data
}

// ================== TESTS ==================

async function runTests() {
  console.log('='.repeat(60))
  console.log('TEST 1: PRIMER MENSAJE - Debería mostrar bienvenida + menú')
  console.log('='.repeat(60))

  // Limpiar logs previos (si existe usuario)
  await checkLogs(TEST_PHONE)

  await sendWebhook('Hola')
  await new Promise(r => setTimeout(r, 1000)) // Esperar
  await checkLogs(TEST_PHONE)

  console.log('\n' + '='.repeat(60))
  console.log('TEST 2: RESPUESTA 1 - Debería pedir nombre')
  console.log('='.repeat(60))

  await sendWebhook('1')
  await new Promise(r => setTimeout(r, 1000))
  await checkLogs(TEST_PHONE)

  console.log('\n' + '='.repeat(60))
  console.log('TEST 3: NOMBRE - Debería pedir servicio')
  console.log('='.repeat(60))

  await sendWebhook('Juan Pérez de prueba')
  await new Promise(r => setTimeout(r, 1000))
  await checkLogs(TEST_PHONE)

  console.log('\n' + '='.repeat(60))
  console.log('TEST 4: SERVICIO 2 - Debería pedir fecha')
  console.log('='.repeat(60))

  await sendWebhook('2')
  await new Promise(r => setTimeout(r, 1000))
  await checkLogs(TEST_PHONE)

  console.log('\n' + '='.repeat(60))
  console.log('TEST 5: FECHA - Debería crear cita y confirmar')
  console.log('='.repeat(60))

  await sendWebhook('Mañana a las 10am')
  await new Promise(r => setTimeout(r, 1000))
  await checkAppointments()
  await checkLogs(TEST_PHONE)

  console.log('\n' + '='.repeat(60))
  console.log('TEST 6: MIS CITAS - Debería mostrar citas')
  console.log('='.repeat(60))

  await sendWebhook('Mis citas')
  await new Promise(r => setTimeout(r, 1000))
  await checkLogs(TEST_PHONE)

  console.log('\n' + '='.repeat(60))
  console.log('✅ TESTS COMPLETADOS')
  console.log('='.repeat(60))
}

runTests().catch(console.error)
