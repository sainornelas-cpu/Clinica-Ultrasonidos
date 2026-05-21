// Test directo a Supabase - sin pasar por webhook
// Esto nos dirá si el problema es en la lógica del webhook o en la BD

const { createClient } = require('@supabase/supabase-js')

// Variables desde .env.local (proyecto correcto)
const supabaseUrl = 'https://heubgudergnidbxyfhqq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhldWJndWRlcmduaWRieHlmaHFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA3ODUzNiwiZXhwIjoyMDkwNjU0NTM2fQ.YYWljfIF2WH-Hq8X6hiTdfVceb4-4mNPy7re4nIfav8'

console.log('='.repeat(70))
console.log('TEST DIRECTO A SUPABASE')
console.log('='.repeat(70))
console.log(`URL: ${supabaseUrl}`)
console.log(`Key: ${supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'NO DEFINIDA'}`)

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ ERROR: Variables de entorno no definidas')
  console.log('Asegúrate de tener SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDirectInsert() {
  console.log('\n📝 Paso 1: Verificar conexión con Supabase')
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Error conectando a Supabase:', error)
      return false
    }
    console.log('✅ Conexión exitosa')
  } catch (e) {
    console.error('❌ Excepción:', e.message)
    return false
  }

  console.log('\n📝 Paso 2: Listar citas actuales')
  try {
    const { data: currentAppointments, error: listError } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (listError) {
      console.error('❌ Error listando citas:', listError)
    } else {
      console.log(`📅 Citas actuales: ${currentAppointments?.length || 0}`)
      if (currentAppointments?.length > 0) {
        currentAppointments.forEach((apt, i) => {
          console.log(`   ${i+1}. ${apt.service_name} - ${apt.status}`)
        })
      }
    }
  } catch (e) {
    console.error('❌ Excepción listando:', e.message)
  }

  console.log('\n📝 Paso 3: Crear usuario de prueba')
  let userId
  try {
    // Primero buscar usuario existente
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', '52199999999')
      .single()

    if (existingUser) {
      userId = existingUser.id
      console.log(`✅ Usuario existe: ${userId}`)
    } else {
      // Crear nuevo usuario
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          phone_number: '52199999999',
          full_name: 'Test Direct Supabase',
          timezone: 'America/Mexico_City',
          trust_score: 1.0,
          conversation_state: 'idle'
        })
        .select('id')
        .single()

      if (userError) {
        console.error('❌ Error creando usuario:', userError)
        return false
      }
      userId = newUser.id
      console.log(`✅ Usuario creado: ${userId}`)
    }
  } catch (e) {
    console.error('❌ Excepción creando usuario:', e.message)
    return false
  }

  console.log('\n📝 Paso 4: Crear cita de prueba')
  try {
    const startTime = new Date()
    startTime.setDate(startTime.getDate() + 1)
    startTime.setHours(10, 0, 0, 0)

    const endTime = new Date(startTime.getTime() + 45 * 60000)

    const ownerId = '00000000-0000-0000-0000-000000000001'

    console.log(`   user_id: ${userId}`)
    console.log(`   owner_id: ${ownerId}`)
    console.log(`   service_name: Ultrasonido Ginecológico`)
    console.log(`   start_time: ${startTime.toISOString()}`)

    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .insert({
        user_id: userId,
        owner_id: ownerId,
        service_id: 'ultrasonido_ginecologico',
        service_name: 'Ultrasonido Ginecológico',
        duration_minutes: 45,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'confirmed',
        notes: 'Cita de prueba - test directo a Supabase',
        changed_by: 'bot'
      })
      .select('id')
      .single()

    if (aptError) {
      console.error('\n❌❌❌ ERROR CREANDO CITA:')
      console.error(JSON.stringify(aptError, null, 2))
      return false
    }

    console.log(`\n✅✅✅ CITA CREADA EXITOSAMENTE!`)
    console.log(`📅 ID: ${appointment.id}`)
    console.log(`📅 Fecha: ${startTime.toLocaleString('es-MX')}`)

    return true

  } catch (e) {
    console.error('\n❌ Excepción creando cita:', e.message)
    console.error(e.stack)
    return false
  }
}

async function verifyAppointmentCreated() {
  console.log('\n📝 Paso 5: Verificar que la cita existe')
  try {
    const { data: appointments, error: verifyError } = await supabase
      .from('appointments')
      .select('*')
      .eq('notes', 'Cita de prueba - test directo a Supabase')
      .order('created_at', { ascending: false })
      .limit(1)

    if (verifyError) {
      console.error('❌ Error verificando cita:', verifyError)
      return false
    }

    if (appointments && appointments.length > 0) {
      console.log('✅✅✅ CITA CONFIRMADA EN LA BASE DE DATOS!')
      console.log(JSON.stringify(appointments[0], null, 2))
      return true
    } else {
      console.log('❌ Cita no encontrada en la base de datos')
      return false
    }
  } catch (e) {
    console.error('❌ Excepción verificando:', e.message)
    return false
  }
}

async function main() {
  const success = await testDirectInsert()

  if (success) {
    await verifyAppointmentCreated()
  }

  console.log('\n' + '='.repeat(70))
  console.log('RESULTADO:')
  if (success) {
    console.log('✅ Supabase funciona correctamente')
    console.log('❌ El problema está en la lógica del webhook')
  } else {
    console.log('❌ Supabase tiene problemas')
    console.log('❌ Revisa: permisos RLS, schema, nombre de tabla, foreign keys')
  }
  console.log('='.repeat(70))
}

main().catch(console.error)
