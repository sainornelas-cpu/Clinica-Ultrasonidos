// Test para encontrar qué valor acepta el constraint changed_by_check
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://heubgudergnidbxyfhqq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhldWJndWRlcmduaWRieHlmaHFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA3ODUzNiwiZXhwIjoyMDkwNjU0NTM2fQ.YYWljfIF2WH-Hq8X6hiTdfVceb4-4mNPy7re4nIfav8'

const supabase = createClient(supabaseUrl, supabaseKey)

// Valores posibles para changed_by
const testValues = ['bot', 'webhook', 'user', 'admin', 'dashboard', 'whatsapp']

async function testChangedByValues() {
  console.log('='.repeat(70))
  console.log('TEST: Encontrar valor válido para changed_by')
  console.log('='.repeat(70))

  // Primero crear usuario de prueba
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('phone_number', '52199999998')
    .single()

  let userId = user?.id

  if (!userId) {
    const { data: newUser } = await supabase
      .from('users')
      .insert({
        phone_number: '52199999998',
        full_name: 'Test Changed By',
        timezone: 'America/Mexico_City',
        trust_score: 1.0,
        conversation_state: 'idle'
      })
      .select('id')
      .single()

    userId = newUser.id
    console.log(`\n✅ Usuario creado: ${userId}`)
  }

  const startTime = new Date()
  startTime.setDate(startTime.getDate() + 1)
  startTime.setHours(10, 0, 0, 0)

  const endTime = new Date(startTime.getTime() + 45 * 60000)

  for (const value of testValues) {
    console.log(`\n📝 Probando changed_by = '${value}'...`)

    const { error } = await supabase
      .from('appointments')
      .insert({
        user_id: userId,
        owner_id: '00000000-0000-0000-0000-000000000001',
        service_id: 'test_service',
        service_name: 'Test Service',
        duration_minutes: 30,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'confirmed',
        notes: `Test con changed_by=${value}`,
        changed_by: value
      })

    if (error) {
      console.log(`   ❌ RECHAZADO: ${error.message}`)
      if (error.code) {
        console.log(`   Código: ${error.code}`)
      }
    } else {
      console.log(`   ✅✅✅ ACEPTADO!`)
      console.log(`\n🎉 VALOR VÁLIDO ENCONTRADO: '${value}'`)
      return value
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('❌ Ningún valor fue aceptado')
  console.log('El constraint debe ser modificado en Supabase Dashboard')
  console.log('='.repeat(70))
  return null
}

testChangedByValues().catch(console.error)
