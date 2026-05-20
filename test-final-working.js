// Test final del sistema - Debería crear citas ahora
const TEST_PHONE = '52100000004'

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
  console.log(`📤 Usuario: "${message}"`)

  const response = await fetch('https://clinica-ultrasonidos.vercel.app/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createWebhookPayload(message))
  })

  const text = await response.text()
  console.log(`\n📥 WEBHOOK RESPONDIO: Status ${response.status}`)
  console.log(`📄 Response: ${text.substring(0, 200)}`)

  // Verificar citas después de cada paso
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
    console.log('❌ NO HAY CITAS - Revisa logs del servidor')
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

  // ============== FASE 1: REGISTRO DE CITA ==============
  console.log('\n' + '='.repeat(70))
  console.log('FASE 1: REGISTRO DE CITA')
  console.log('='.repeat(70))

  // Paso 1: Primer mensaje - Bienvenida + Menú
  await sendToWebhook('Hola', '1. Primer mensaje - Debe mostrar bienvenida + menú')

  // Paso 2: Opción 1 - Agendar cita
  await sendToWebhook('1', '2. Opción 1 - Debe pedir nombre')

  // Paso 3: Nombre - Debe pedir servicio
  await sendToWebhook('Carlos Hernández', '3. Ingresar nombre')

  // Paso 4: Opción 2 (Ultrasonido) - Debe pedir fecha
  await sendToWebhook('2', '4. Seleccionar servicio (Ultrasonido)')

  // Paso 5: Fecha - Debe CREAR CITA
  await sendToWebhook('Hoy a las 4pm', '5. Ingresar fecha - DEBE CREAR CITA')

  // Verificar final
  await delay(2000)
  await checkAppointments()

  // ============== FASE 2: VERIFICACIÓN ==============
  console.log('\n' + '='.repeat(70))
  console.log('FASE 2: VERIFICACIÓN')
  console.log('='.repeat(70))

  // Paso 6: Mis citas - Debe mostrar las citas creadas
  await sendToWebhook('Mis citas', '6. Comando Mis Citas - Debe listar citas')

  console.log('\n' + '='.repeat(70))
  console.log('✅ TEST COMPLETADO')
  console.log('='.repeat(70))
  console.log('\n📱 Revisa tu WhatsApp para ver los mensajes del bot')
  console.log('🖥️ Abre el dashboard: https://clinica-ultrasonidos.vercel.app/dashboard')
  console.log('🔄 El dashboard debería mostrar las citas creadas en tiempo real')
}

testCompleteFlow().catch(console.error)
