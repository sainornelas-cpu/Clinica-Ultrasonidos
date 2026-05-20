/**
 * Script de prueba para simular un mensaje POST al webhook
 */

const webhookUrl = 'https://clinica-ultrasonidos-b25erkjnw-sainornelas-5924s-projects.vercel.app/api/webhook'
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
                  name: 'Usuario Test'
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
                  body: 'Hola, quiero agendar una cita'
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

async function testWebhookPOST() {
  console.log('🧪 Test POST al webhook de WhatsApp')
  console.log('=====================================\n')

  try {
    console.log('📤 Enviando mensaje de prueba...')
    console.log('📨 Mensaje: "Hola, quiero agendar una cita"')
    console.log('📞 Desde: 525512345678\n')

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vercel-protection-bypass': bypassToken
      },
      body: JSON.stringify(testMessage)
    })

    console.log(`📡 Status HTTP: ${response.status} ${response.statusText}`)

    const text = await response.text()

    if (response.ok) {
      console.log(`✅ SUCCESS: ${text}`)
      console.log('\n📋 El webhook procesó el mensaje correctamente.')
      console.log('💡 Revisa los logs de Vercel para ver la respuesta completa.')
    } else {
      console.log(`❌ ERROR: ${text}`)
      console.log('\n⚠️ El webhook falló al procesar el mensaje.')
    }

  } catch (error) {
    console.error('❌ Error de conexión:', error.message)
  }
}

testWebhookPOST()
