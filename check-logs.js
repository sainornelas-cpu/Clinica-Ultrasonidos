// Script para verificar si hay errores en el webhook
const TEST_PHONE = '52100000000'

async function testWebhookWithLogs() {
  console.log('📥 Enviando mensaje de prueba al webhook...')

  const response = await fetch('https://clinica-ultrasonidos.vercel.app/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              type: 'text',
              text: { body: 'Hola, estoy probando el sistema' }
            }]
          }
        }]
      }]
    })
  })

  console.log(`\n📊 Status: ${response.status}`)
  console.log(`📊 Headers:`, Object.fromEntries(response.headers))

  const text = await response.text()
  console.log(`📊 Response: ${text}`)
}

// Test simple al endpoint de citas
async function testAppointmentsAPI() {
  console.log('\n\n📅 Probando API de citas...')

  const response = await fetch('https://clinica-ultrasonidos.vercel.app/api/appointments')
  console.log(`📊 Status: ${response.status}`)

  if (response.ok) {
    const data = await response.json()
    console.log(`✅ Citas encontradas: ${data.count || 0}`)
    console.log(`📄 Datos:`, data)
  } else {
    console.log('❌ Error al obtener citas')
    console.log(await response.text())
  }
}

// Verificar dashboard
async function testDashboard() {
  console.log('\n\n🖥️ Probando dashboard...')

  const response = await fetch('https://clinica-ultrasonidos.vercel.app/dashboard')
  console.log(`📊 Status: ${response.status}`)

  if (response.ok) {
    console.log('✅ Dashboard accesible')
  } else {
    console.log('❌ Error al acceder dashboard')
    console.log(await response.text())
  }
}

async function runTests() {
  await testDashboard()
  await testAppointmentsAPI()
  await testWebhookWithLogs()
}

runTests().catch(console.error)
