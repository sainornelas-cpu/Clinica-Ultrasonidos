// Test para ver logs del servidor en cada paso
const TEST_PHONE = '52100000001' // Nuevo número

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
  console.log(`PASO: ${stepName}`)
  console.log('='.repeat(70))
  console.log(`📤 Usuario: "${message}"`)

  const response = await fetch('https://clinica-ultrasonidos.vercel.app/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createWebhookPayload(message))
  })

  console.log(`📥 Webhook status: ${response.status}`)

  // Verificar citas después de cada paso
  await delay(1500)
  await checkAppointments()

  return response.status
}

async function checkAppointments() {
  const response = await fetch('https://clinica-ultrasonidos.vercel.app/api/appointments')
  const data = await response.json()
  console.log(`📅 Citas totales: ${data.count}`)
  if (data.appointments.length > 0) {
    data.appointments.forEach((apt, i) => {
      console.log(`   ${i+1}. ${apt.service_name} - ${new Date(apt.start_time).toLocaleString('es-MX')} [${apt.status}]`)
    })
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testCompleteFlow() {
  console.log('\n' + '='.repeat(70))
  console.log('FLUJO COMPLETO DE AGENDAMIENTO CON LOGS')
  console.log('='.repeat(70))

  // Paso 1: Primer mensaje
  await sendToWebhook('Hola', '1. Primer mensaje - Bienvenida + Menú')

  // Paso 2: Opción 1
  await sendToWebhook('1', '2. Seleccionar opción 1 - Agendar cita')

  // Paso 3: Nombre
  await sendToWebhook('Juan Prueba', '3. Ingresar nombre')

  // Paso 4: Seleccionar servicio 2
  await sendToWebhook('2', '4. Seleccionar servicio (Ultrasonido)')

  // Paso 5: Fecha
  await sendToWebhook('Mañana 10am', '5. Ingresar fecha - Crear cita')

  // Verificar final
  await delay(2000)
  await checkAppointments()

  console.log('\n' + '='.repeat(70))
  console.log('✅ PRUEBA COMPLETADA')
  console.log('='.repeat(70))
  console.log('\n📝 Revisa los logs del servidor en Vercel para ver detalles de errores')
}

testCompleteFlow().catch(console.error)
