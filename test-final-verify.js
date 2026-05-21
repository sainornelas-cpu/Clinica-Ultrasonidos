// Test final - verificar si las citas se crean
const TEST_PHONE = '52100000005'

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
  console.log(`\n${'='.repeat(70)}`)
  console.log(`PASO: ${message}`)
  console.log('='.repeat(70))
  console.log(`📤 Usuario: "${message}"`)

  const response = await fetch('https://clinica-ultrasonidos.vercel.app/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createWebhookPayload(message))
  })

  const text = await response.text()
  console.log(`📥 WEBHOOK RESPONDIO: Status ${response.status}`)

  // Verificar citas
  await delay(1500)
  await checkAppointments()

  return response.status
}

async function checkAppointments() {
  const response = await fetch('https://clinica-ultrasonidos.vercel.app/api/appointments')
  const data = await response.json()
  console.log(`\n📅 CITAS TOTALES: ${data.count}`)

  if (data.appointments.length > 0) {
    console.log('✅ ¡CITAS CREADAS EXITOSAMENTE!')
    data.appointments.forEach((apt, i) => {
      console.log(`   ${i+1}. ${apt.service_name}`)
      console.log(`      📆 ${new Date(apt.start_time).toLocaleString('es-MX')}`)
      console.log(`      📱 ${apt.users?.phone_number}`)
      console.log(`      📊 Status: ${apt.status}`)
    })
  } else {
    console.log('❌ NO HAY CITAS - Verifica logs del servidor')
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testCompleteFlow() {
  console.log('\n' + '='.repeat(70))
  console.log('TEST FINAL: Verificación de sistema completo')
  console.log('='.repeat(70))

  await sendToWebhook('Hola', '1. Primer mensaje - Bienvenida + Menú')
  await delay(2000)
  await sendToWebhook('1', '2. Opción 1 - Agendar cita')
  await delay(2000)
  await sendToWebhook('Carlos Hernández', '3. Ingresar nombre')
  await delay(2000)
  await sendToWebhook('2', '4. Seleccionar servicio (Ultrasonido)')
  await delay(2000)
  await sendToWebhook('Hoy a las 4pm', '5. Ingresar fecha - CREAR CITA')

  await delay(3000)
  await checkAppointments()

  console.log('\n' + '='.repeat(70))
  console.log('✅ TEST COMPLETADO')
  console.log('='.repeat(70))
  console.log('\n📱 Revisa tu WhatsApp para ver los mensajes del bot')
  console.log('🖥️ Abre el dashboard: https://clinica-ultrasonidos.vercel.app/dashboard')
  console.log('🔄 El dashboard debería mostrar las citas creadas en tiempo real')
}

testCompleteFlow().catch(console.error)