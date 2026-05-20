// Test para ver logs del servidor
const TEST_PHONE = '52100000003'

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

async function sendToWebhook(message, stepName) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`PASO: ${stepName}`)
  console.log('='.repeat(80))
  console.log(`📤 USUARIO: "${message}"`)

  const response = await fetch('https://clinica-ultrasonidos.vercel.app/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createWebhookPayload(message))
  })

  const text = await response.text()
  console.log(`\n📥 WEBHOOK RESPONDIO: Status ${response.status}`)
  console.log(`📄 Response: ${text}`)

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
    console.log('❌ NO HAY CITAS - Revisa los logs del servidor para ver errores')
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runDebugTest() {
  console.log('\n' + '='.repeat(80))
  console.log('DEBUG TEST: Identificar por qué NO se crean citas')
  console.log('='.repeat(80))

  // FLUJO COMPLETO - PASO A PASO
  await sendToWebhook('Hola', '1. Primer mensaje (debe mostrar bienvenida + menú)')
  await sendToWebhook('1', '2. Respuesta "1" (debe pedir nombre)')
  await sendToWebhook('Maria Lopez', '3. Nombre (debe pedir servicio)')
  await sendToWebhook('2', '4. Respuesta "2" (debe pedir fecha)')
  await sendToWebhook('Hoy a las 3pm', '5. Fecha (debe CREAR CITA)')

  console.log('\n' + '='.repeat(80))
  console.log('📝 Revisa los logs del servidor en Vercel para ver:')
  console.log('   - Si entra en handleBookingFlow')
  console.log('   - Cuál es el currentState')
  console.log('   - Si llama a createAppointmentInDb')
  console.log('   - Si hay error al crear la cita')
  console.log('='.repeat(80))
}

runDebugTest().catch(console.error)
