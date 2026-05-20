// Test del flujo completo de agendamiento
const TEST_PHONE = '52100000000'

// Payload de WhatsApp
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

async function sendToWebhook(message) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📤 USUARIO: "${message}"`)
  console.log('='.repeat(60))

  const response = await fetch('https://clinica-ultrasonidos.vercel.app/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createWebhookPayload(message))
  })

  const text = await response.text()
  console.log(`\n📥 WEBHOOK RESPONDIO: Status ${response.status}`)
  console.log(`📄 Response: ${text.substring(0, 150)}`)

  return response.status
}

async function checkAppointments() {
  const response = await fetch('https://clinica-ultrasonidos.vercel.app/api/appointments')
  const data = await response.json()
  console.log(`\n📅 CITAS TOTALES: ${data.count}`)
  if (data.appointments.length > 0) {
    data.appointments.forEach((apt, i) => {
      console.log(`   ${i+1}. ${apt.service_name} - ${new Date(apt.start_time).toLocaleString('es-MX')}`)
    })
  }
}

async function testFlow() {
  console.log('\n' + '='.repeat(60))
  console.log('SIMULANDO FLUJO COMPLETO DE AGENDAMIENTO')
  console.log('='.repeat(60))

  // Paso 1: Primer mensaje - Bienvenida
  await sendToWebhook('Hola')
  await delay(2000)

  // Paso 2: Opción 1 - Agendar cita
  await sendToWebhook('1')
  await delay(2000)

  // Paso 3: Nombre
  await sendToWebhook('María García de prueba')
  await delay(2000)

  // Paso 4: Seleccionar servicio 2 (Ultrasonido)
  await sendToWebhook('2')
  await delay(2000)

  // Paso 5: Fecha
  await sendToWebhook('Mañana a las 10am')
  await delay(2000)

  // Verificar citas
  await checkAppointments()

  // Paso 6: Mis citas
  await sendToWebhook('Mis citas')
  await delay(2000)

  console.log('\n' + '='.repeat(60))
  console.log('✅ PRUEBA COMPLETADA')
  console.log('='.repeat(60))
  console.log('\n📝 Revisa tu WhatsApp para ver los mensajes enviados por el bot')
  console.log('🖥️ Abre el dashboard: https://clinica-ultrasonidos.vercel.app/dashboard')
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

testFlow().catch(console.error)
