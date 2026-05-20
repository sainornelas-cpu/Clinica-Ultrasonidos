/**
 * Test final del webhook con la URL actualizada
 */

const webhookUrl = 'https://clinica-ultrasonidos.vercel.app/api/webhook'
const bypassToken = 'xnv9a0gXRxvOfvh943fmwG6UpU667IaC'

const testMessage = {
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
              phone_number_id: '1017785674760183'
            },
            contacts: [
              {
                profile: {
                  name: 'Paciente Test'
                },
                wa_id: '525512345678'
              }
            ],
            messages: [
              {
                from: '525512345678',
                id: 'test_msg_123',
                timestamp: '1700000000',
                text: {
                  body: 'Hola, quiero agendar una consulta general para mañana'
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

async function testWebhook() {
  console.log('🧪 TEST FINAL DEL WEBHOOK')
  console.log('=====================================\n')
  console.log(`🌐 URL: ${webhookUrl}`)
  console.log(`📨 Mensaje: "Hola, quiero agendar una consulta general para mañana"`)
  console.log(`📞 Desde: 525512345678\n`)

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vercel-protection-bypass': bypassToken
      },
      body: JSON.stringify(testMessage)
    })

    console.log(`📡 Status: ${response.status} ${response.statusText}`)

    const text = await response.text()

    if (response.ok) {
      console.log(`✅ SUCCESS: ${text}`)
      console.log('\n🎉 El webhook funcionó correctamente!')
      console.log('💡 El usuario debería recibir una respuesta de la IA.')
      return true
    } else {
      console.log(`❌ ERROR: ${text}`)
      console.log('\n⚠️ Hubo un error al procesar el mensaje.')
      console.log('💡 Revisa los logs de Vercel para más detalles.')
      return false
    }

  } catch (error) {
    console.error('❌ Error de conexión:', error.message)
    return false
  }
}

// Ejecutar test
testWebhook().then(success => {
  process.exit(success ? 0 : 1)
})
