// Debug - ver qué se guarda y recupera de booking_data
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://heubgudergnidbxyfhqq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhldWJndWRlcmduaWRieHlmaHFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA3ODUzNiwiZXhwIjoyMDkwNjU0NTM2fQ.YYWljfIF2WH-Hq8X6hiTdfVceb4-4mNPy7re4nIfav8'

const TEST_PHONE = '52144444444'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function saveBookingData(userId, key, value) {
  const content = `booking_data_${key}:${value}`
  console.log(`💾 Guardando: content = "${content}"`)
  console.log(`💾 Longitud: ${content.length}`)

  const { error } = await supabase.from('interaction_logs').insert({
    user_id: userId,
    role: 'system',
    content: content,
    intent_detected: 'booking_data',
    state_before: 'processing',
    state_after: 'processing'
  })

  if (error) {
    console.error('❌ Error:', error)
  } else {
    console.log('✅ Guardado exitoso')
  }
}

async function getBookingDataOld(userId) {
  console.log('\n📖 MÉTODO OLD (LIKE):')

  const { data } = await supabase
    .from('interaction_logs')
    .select('id, content')
    .eq('user_id', userId)
    .like('content', 'booking_data_%')
    .order('created_at', { ascending: false })
    .limit(10)

  console.log(`   Registros encontrados: ${data?.length || 0}`)

  const result = {}

  if (data) {
    data.forEach((log) => {
      console.log(`   - content: "${log.content.substring(0, 50)}..."`)
      const match = log.content.match(/booking_data_(.+):(.+)/)
      if (match) {
        console.log(`     ✅ Match: key="${match[1]}", value="${match[2].substring(0, 30)}..."`)
        result[match[1]] = match[2]
      } else {
        console.log(`     ❌ No match con regex`)
      }
    })
  }

  console.log(`   Resultado:`, JSON.stringify(result, null, 2))
  return result
}

async function getBookingDataNew(userId) {
  console.log('\n📖 MÉTODO NEW (LIKE con % en ambos lados):')

  const { data } = await supabase
    .from('interaction_logs')
    .select('id, content')
    .eq('user_id', userId)
    .like('content', '%booking_data_%')
    .order('created_at', { ascending: false })
    .limit(10)

  console.log(`   Registros encontrados: ${data?.length || 0}`)

  const result = {}

  if (data) {
    data.forEach((log) => {
      console.log(`   - content: "${log.content.substring(0, 50)}..."`)
      const match = log.content.match(/booking_data_(.+):(.+)/)
      if (match) {
        console.log(`     ✅ Match: key="${match[1]}", value="${match[2].substring(0, 30)}..."`)
        result[match[1]] = match[2]
      } else {
        console.log(`     ❌ No match con regex`)
      }
    })
  }

  console.log(`   Resultado:`, JSON.stringify(result, null, 2))
  return result
}

async function getBookingDataDirect(userId) {
  console.log('\n📖 MÉTODO DIRECT (todos los logs del usuario):')

  const { data } = await supabase
    .from('interaction_logs')
    .select('id, role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  console.log(`   Registros encontrados: ${data?.length || 0}`)

  const result = {}

  if (data) {
    data.forEach((log) => {
      if (log.role === 'system' && log.content.startsWith('booking_data_')) {
        console.log(`   - content: "${log.content.substring(0, 50)}..."`)
        const match = log.content.match(/booking_data_(.+):(.+)/)
        if (match) {
          console.log(`     ✅ Match: key="${match[1]}", value="${match[2].substring(0, 30)}..."`)
          result[match[1]] = match[2]
        } else {
          console.log(`     ❌ No match con regex`)
        }
      }
    })
  }

  console.log(`   Resultado:`, JSON.stringify(result, null, 2))
  return result
}

async function test() {
  console.log('='.repeat(70))
  console.log('DEBUG BOOKING DATA')
  console.log('='.repeat(70))

  // Crear usuario
  const { data: user } = await supabase
    .from('users')
    .insert({
      phone_number: TEST_PHONE,
      full_name: null,
      timezone: 'America/Mexico_City',
      trust_score: 1.0,
      conversation_state: 'idle'
    })
    .select('id')
    .single()

  const userId = user.id
  console.log(`✅ Usuario creado: ${userId}\n`)

  // Guardar datos de servicio
  const service = {
    name: 'Ultrasonido Ginecológico',
    price: '$1,200',
    duration: 45
  }

  console.log('📝 Guardando servicio...')
  await saveBookingData(userId, 'service', JSON.stringify(service))

  // Probar los métodos de recuperación
  await getBookingDataOld(userId)
  await getBookingDataNew(userId)
  await getBookingDataDirect(userId)

  // Limpiar
  await supabase.from('users').delete().eq('id', userId)
  await supabase.from('interaction_logs').delete().eq('user_id', userId)
  console.log('\n🧹 Cleanup completado')

  console.log('\n' + '='.repeat(70))
  console.log('CONCLUSIÓN:')
  console.log('LIKE "booking_data_%" busca texto que EMPIEZA con booking_data_')
  console.log('LIKE "%booking_data_%" busca texto que CONTIENE booking_data_')
  console.log('='.repeat(70))
}

test().catch(console.error)