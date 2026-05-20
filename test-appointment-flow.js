/**
 * Script de prueba para simular el flujo de agendamiento de citas
 * Esto nos ayuda a identificar problemas en el sistema
 */

const testConfig = {
  // URL del webhook desplegado en Vercel
  webhookUrl: process.env.WEBHOOK_URL || 'https://tu-app.vercel.app/api/webhook',

  // Token de verificación que debe estar en WHATSAPP_VERIFY_TOKEN
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'test_verify_token_123',

  // Token de acceso para enviar mensajes
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',

  // ID del número de teléfono
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',

  // Número de prueba
  testPhoneNumber: '+521234567890'
}

console.log('🧪 =======================================')
console.log('🧪 TEST: Sistema de Citas WhatsApp Bot')
console.log('🧪 =======================================\n')

// Tests a ejecutar
const tests = [
  {
    name: '1. Test de Verificación de Webhook (GET)',
    fn: testWebhookVerification
  },
  {
    name: '2. Test de Recepción de Mensaje (POST - Simular "Hola")',
    fn: testIncomingMessage
  },
  {
    name: '3. Test de Agendamiento de Cita (Simular "Quiero agendar consulta")',
    fn: testAppointmentBooking
  },
  {
    name: '4. Diagnóstico de Configuración',
    fn: diagnoseConfiguration
  }

]

async function runTests() {
  const results = []

  for (const test of tests) {
    console.log(`\n📋 ${test.name}`)
    console.log('----------------------------------------')

    try {
      const result = await test.fn()
      results.push({ name: test.name, success: true, result })
      console.log('✅ PASSED:', result)
    } catch (error) {
      results.push({ name: test.name, success: false, error: error.message })
      console.log('❌ FAILED:', error.message)
    }
  }

  // Resumen
  console.log('\n📊 =======================================')
  console.log('📊 RESUMEN DE TESTS')
  console.log('📊 =======================================')

  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log(`✅ Pasaron: ${passed}`)
  console.log(`❌ Fallaron: ${failed}`)

  if (failed > 0) {
    console.log('\n⚠️ Tests fallados:')
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`)
    })
  }

  // Recomendaciones
  console.log('\n💡 RECOMENDACIONES')
  console.log('=======================================')
  if (failed > 0) {
    console.log('1. Verifica que WHATSAPP_VERIFY_TOKEN sea una cadena simple, no un access token')
    console.log('2. Asegúrate de que las variables de entorno estén configuradas en Vercel')
    console.log('3. Revisa los logs de Vercel para ver errores en tiempo real')
    console.log('4. Verifica que el webhook esté configurado correctamente en Meta Developers')
  } else {
    console.log('✅ Todos los tests pasaron. El sistema parece estar funcionando correctamente.')
  }
}

/**
 * Test 1: Verificación del webhook con Meta
 */
async function testWebhookVerification() {
  const url = new URL(testConfig.webhookUrl)

  // Estos son los parámetros que Meta envía al verificar el webhook
  url.searchParams.set('hub.mode', 'subscribe')
  url.searchParams.set('hub.verify_token', testConfig.verifyToken)
  url.searchParams.set('hub.challenge', 'test_challenge_12345')

  console.log(`   URL: ${url}`)
  console.log(`   verify_token esperado: ${testConfig.verifyToken}`)

  const response = await fetch(url.toString(), { method: 'GET' })

  if (response.ok) {
    const text = await response.text()
    return {
      status: response.status,
      challenge: text,
      message: 'Webhook verificado correctamente'
    }
  } else {
    throw new Error(
      `HTTP ${response.status}: ${response.statusText}\n` +
      `Verifica que WHATSAPP_VERIFY_TOKEN en .env sea: "${testConfig.verifyToken}"`
    )
  }
}

/**
 * Test 2: Simular mensaje entrante de WhatsApp
 */
async function testIncomingMessage() {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '1234567890',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+525512345678',
                phone_number_id: testConfig.phoneNumberId
              },
              contacts: [
                {
                  profile: {
                    name: 'Usuario Test'
                  },
                  wa_id: testConfig.testPhoneNumber.replace('+', '')
                }
              ],
              messages: [
                {
                  from: testConfig.testPhoneNumber.replace('+', ''),
                  id: 'wamid.HBgLNTI1NTEyMzQ1Njc4FQIAERgSNDk0NDJFNTM3MkRFNDIyOUQyNg==',
                  timestamp: '1700000000',
                  text: {
                    body: 'Hola'
                  },
                  type: 'text'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  }

  console.log(`   Payload: Mensaje "Hola" de ${testConfig.testPhoneNumber}`)

  const response = await fetch(testConfig.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const responseText = await response.text()

  if (response.ok) {
    return {
      status: response.status,
      message: 'Mensaje recibido y procesado',
      response: responseText
    }
  } else {
    throw new Error(
      `HTTP ${response.status}: ${response.statusText}\n` +
      `Response: ${responseText}`
    )
  }
}

/**
 * Test 3: Simular flujo de agendamiento
 */
async function testAppointmentBooking() {
  const testMessages = [
    'Hola, quiero agendar una consulta',
    'Mañana a las 10:00',
    'Confirmo'
  ]

  console.log(`   Mensajes a probar: ${testMessages.join(', ')}`)

  // En este test solo verificamos que el endpoint acepte el mensaje
  // El procesamiento real depende de OpenAI y la base de datos
  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '1234567890',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              contacts: [
                {
                  profile: { name: 'Paciente Test' },
                  wa_id: testConfig.testPhoneNumber.replace('+', '')
                }
              ],
              messages: [
                {
                  from: testConfig.testPhoneNumber.replace('+', ''),
                  id: 'test_msg_123',
                  timestamp: '1700000000',
                  text: { body: testMessages[0] },
                  type: 'text'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  }

  const response = await fetch(testConfig.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  if (response.ok) {
    return {
      status: response.status,
      message: 'Solicitud de cita recibida correctamente',
      note: 'Verifica logs de Vercel para ver respuesta de OpenAI'
    }
  } else {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
}

/**
 * Test 4: Diagnóstico de configuración
 */
function diagnoseConfiguration() {
  const issues = []

  // Verificar WHATSAPP_VERIFY_TOKEN
  if (!testConfig.verifyToken || testConfig.verifyToken.startsWith('EAA')) {
    issues.push({
      critical: true,
      var: 'WHATSAPP_VERIFY_TOKEN',
      issue: 'No debe ser un access token. Debe ser una cadena simple.',
      fix: 'Usa algo como: WHATSAPP_VERIFY_TOKEN=mi_clinica_verify_2025'
    })
  }

  // Verificar WHATSAPP_ACCESS_TOKEN
  if (!testConfig.accessToken || !testConfig.accessToken.startsWith('EAA')) {
    issues.push({
      critical: true,
      var: 'WHATSAPP_ACCESS_TOKEN',
      issue: 'Debe empezar con "EAA..." y tener más de 100 caracteres',
      fix: 'Obtén el token desde Meta Developers > WhatsApp > API Setup'
    })
  }

  // Verificar WHATSAPP_PHONE_NUMBER_ID
  if (!testConfig.phoneNumberId || isNaN(testConfig.phoneNumberId)) {
    issues.push({
      critical: true,
      var: 'WHATSAPP_PHONE_NUMBER_ID',
      issue: 'Debe ser un ID numérico',
      fix: 'Obtén el ID desde Meta Developers > WhatsApp > Phone Numbers'
    })
  }

  // Verificar URL del webhook
  if (!testConfig.webhookUrl.includes('vercel.app') && !testConfig.webhookUrl.includes('localhost')) {
    issues.push({
      critical: false,
      var: 'WEBHOOK_URL',
      issue: 'No parece ser una URL de despliegue',
      fix: 'Usa la URL de tu app en Vercel'
    })
  }

  if (issues.length > 0) {
    const criticalIssues = issues.filter(i => i.critical)
    const message = issues.map(i =>
      `\n  ${i.critical ? '🚨' : '⚠️'} ${i.var}:\n     ${i.issue}\n     💡 ${i.fix}`
    ).join('')

    throw new Error(
      `Problemas detectados:${message}`
    )
  }

  return {
    message: 'Configuración parece correcta',
    verifyToken: `${testConfig.verifyToken.substring(0, 10)}...`,
    hasAccessToken: testConfig.accessToken.length > 50,
    phoneNumberId: testConfig.phoneNumberId
  }
}

// Ejecutar tests
runTests().catch(console.error)
