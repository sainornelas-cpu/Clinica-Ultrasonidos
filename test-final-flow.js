// Test final del flujo completo de agendamiento
const TEST_PHONE = '52100000002' // Nuevo número

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
  console.log(`\n${'='.repeat(70)}`)
  console.log(`📤 PASO: ${stepName}`)
  console.log('='.repeat(70))
  console.log(`📝 Usuario: "${message}"`)

  const response = await fetch('https://clinica-ultrasonidos.vercel.app/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createWebhookPayload(message))
  })

  const text = await response.text()
  console.log(`📥 Webhook: ${response.status}`)

  // Verificar citas
  await delay(1500)
  await checkAppointments()

  return response.status
}

async function checkAppointments() {
  const response = await fetch('https://clinica-ultrasonidos.vercel.app/api/appointments')
  const data = await response.json()
  console.log(`\n📅 Citas totales: ${data.count}`)
  if (data.appointments.length > 0) {
    console.log('✅ ¡CITAS CREADAS EXITOSAMENTE!')
    data.appointments.forEach((apt, i) => {
      console.log(`   ${i+1}. ${apt.service_name}`)
      console.log(`      📆 ${new Date(apt.start_time).toLocaleString('es-MX')}`)
      console.log(`      📱 ${apt.users?.phone_number}`)
      console.log(`      📊 Status: ${apt.status}`)
    })
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testCompleteFlow() {
  console.log('\n' + '='.repeat(70))
  console.log('TEST FINAL: FLUJO COMPLETO DE AGENDAMIENTO')
  console.log('='.repeat(70))
  console.log('\nOBJETIVO: Usuario registra cita y luego reagenda')
  console.log('')

  // FLUJO DE REGISTRO DE CITA
  console.log('\n' + '='.repeat(70))
  console.log('FASE 1: REGISTRO DE CITA')
  console.log('='.repeat(70))

  // Paso 1: Primer mensaje - Debe mostrar bienvenida + menú
  await sendToWebhook('Hola', '1. Primer mensaje - Bienvenida + Menú')

  // Paso 2: Opción 1 - Debe pedir nombre
  await sendToWebhook('1', '2. Opción 1 - Agendar cita')

  // Paso 3: Nombre - Debe pedir servicio
  await sendToWebhook('Pedro Gómez', '3. Ingresar nombre')

  // Paso 4: Opción 2 (Ultrasonido) - Debe pedir fecha
  await sendToWebhook('2', '4. Seleccionar servicio (Ultrasonido)')

  // Paso 5: Fecha - Debe crear cita
  await sendToWebhook('Hoy a las 3pm', '5. Ingresar fecha - CREAR CITA')

  console.log('\n' + '='.repeat(70))
  console.log('FASE 2: VERIFICACIÓN')
  console.log('='.repeat(70))
  console.log('Verificando que la cita se haya creado...')

  await delay(2000)
  await checkAppointments()

  console.log('\n' + '='.repeat(70))
  console.log('✅ TEST COMPLETADO')
  console.log('='.repeat(70))
  console.log('\n📱 Revisa tu WhatsApp para ver los mensajes del bot')
  console.log('🖥️ Abre el dashboard: https://clinica-ultrasonidos.vercel.app/dashboard')
  console.log('🔄 El dashboard debería mostrar la cita creada en tiempo real')
}

testCompleteFlow().catch(console.error)
