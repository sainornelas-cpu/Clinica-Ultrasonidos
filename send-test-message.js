// Script para enviar mensaje de prueba a WhatsApp

// Tu número de teléfono (cámbialo al tuyo para recibir el mensaje)
const TO_PHONE = '52100000000' // Tu número

// Configuración (deben coincidir con Vercel)
const CONFIG = {
  PHONE_NUMBER_ID: '1017785674760183',
  ACCESS_TOKEN: 'EAAW8fSAlIZA0BRtiFnLS5kt3xZAKRzfHiS1HoeZAbjeKS5C8Ma7MmX9JkaYVDdmSqTJR25bHcYEr0CGuI49aZA0alwOKXGEwrSggcgUfSqg3z5ZAOYIqnZBTMEpAdYTzZCmbKVJfehHRNX2R212BOyYWmzktiU3KaXZCANG8i2GOfAW2bNg7TyxWnfHdDkayLsEbOwZDZD'
}

async function sendWhatsAppMessage(to, message) {
  console.log(`📤 Enviando mensaje a ${to}...`)
  console.log(`📝 Mensaje: ${message}`)

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${CONFIG.PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      })
    }
  )

  const data = await response.json()
  console.log(`\n📊 Response status: ${response.status}`)
  console.log(`📊 Response data:`, JSON.stringify(data, null, 2))

  if (response.ok) {
    console.log('\n✅ Mensaje enviado exitosamente!')
    console.log(`📥 Mensaje ID: ${data.messages?.[0]?.id}`)
  } else {
    console.log('\n❌ Error al enviar mensaje:')
    console.log(`   Error: ${data.error?.message}`)
    console.log(`   Code: ${data.error?.code}`)
  }

  return { success: response.ok, data }
}

async function runTests() {
  console.log('='.repeat(60))
  console.log('ENVIO DE MENSAJE DE PRUEBA A WHATSAPP')
  console.log('='.repeat(60))
  console.log(`\n📱 Teléfono de destino: ${TO_PHONE}`)
  console.log(`📱 Phone Number ID: ${CONFIG.PHONE_NUMBER_ID}`)
  console.log(`🔑 Access Token (primeros 20 chars): ${CONFIG.ACCESS_TOKEN.substring(0, 20)}...`)
  console.log('')

  await sendWhatsAppMessage(
    TO_PHONE,
    '🧪 TEST DE SISTEMA\n\nHola, buenos días. Te atiende el asistente virtual del Dr. Baltierres Ginecólogo Ultrasonido.\n\nEste es un mensaje de prueba del sistema.'
  )
}

runTests().catch(console.error)
