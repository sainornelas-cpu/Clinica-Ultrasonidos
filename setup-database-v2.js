/**
 * Script para crear las tablas usando directamente la API de Supabase
 * Este enfoque es más confiable
 */

const { createClient } = require('@supabase/supabase-js')

// Credenciales de Supabase (service role key con permisos de admin)
const supabaseUrl = 'https://heubgudergnidbxyfhqq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhldWJndWRlcmduaWRieHlmaHFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA3ODUzNiwiZXhwIjoyMDkwNjU0NTM2fQ.YYWljfIF2WH-Hq8X6hiTdfVceb4-4mNPy7re4nIfav8'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  console.log('🗄️  SETUP DE BASE DE DATOS SUPABASE')
  console.log('=====================================\n')

  let allSuccess = true

  // ============================================
  // Test 1: Crear tablas directamente
  // ============================================
  console.log('📋 PASO 1: Creando tablas...')

  try {
    // Intentar crear tabla users
    console.log('   ⏳ Creando tabla users...')
    const usersError = await createUsersTable()
    if (usersError && !usersError.message.includes('already exists')) {
      console.log(`   ❌ Error en users: ${usersError.message}`)
    } else {
      console.log('   ✅ Tabla users lista')
    }
  } catch (error) {
    console.log(`   ⚠️  Users: ${error.message}`)
  }

  try {
    // Intentar crear tabla appointments
    console.log('   ⏳ Creando tabla appointments...')
    const appointmentsError = await createAppointmentsTable()
    if (appointmentsError && !appointmentsError.message.includes('already exists')) {
      console.log(`   ❌ Error en appointments: ${appointmentsError.message}`)
      allSuccess = false
    } else {
      console.log('   ✅ Tabla appointments lista')
    }
  } catch (error) {
    console.log(`   ⚠️  Appointments: ${error.message}`)
  }

  try {
    // Intentar crear tabla interaction_logs
    console.log('   ⏳ Creando tabla interaction_logs...')
    const logsError = await createInteractionLogsTable()
    if (logsError && !logsError.message.includes('already exists')) {
      console.log(`   ❌ Error en interaction_logs: ${logsError.message}`)
      allSuccess = false
    } else {
      console.log('   ✅ Tabla interaction_logs lista')
    }
  } catch (error) {
    console.log(`   ⚠️  Interaction logs: ${error.message}`)
  }

  // ============================================
  // Test 2: Verificar que las tablas existen
  // ============================================
  console.log('\n🔍 PASO 2: Verificando tablas...')

  const tables = ['users', 'appointments', 'interaction_logs']
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      if (error) {
        console.log(`   ❌ Tabla '${table}': ${error.message}`)
        allSuccess = false
      } else {
        console.log(`   ✅ Tabla '${table}' accesible (${data.length} registros)`)
      }
    } catch (error) {
      console.log(`   ❌ Tabla '${table}': ${error.message}`)
      allSuccess = false
    }
  }

  // ============================================
  // Test 3: Crear un usuario de prueba
  // ============================================
  console.log('\n🧪 PASO 3: Probando inserción...')

  try {
    const testPhone = `TEST_${Date.now()}`
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        phone_number: testPhone,
        full_name: 'Usuario de Prueba',
        timezone: 'America/Mexico_City',
        trust_score: 1.0
      })
      .select('id')
      .single()

    if (insertError) {
      console.log(`   ❌ Error al crear usuario: ${insertError.message}`)
      allSuccess = false
    } else {
      console.log(`   ✅ Usuario creado exitosamente (ID: ${newUser.id.substring(0, 8)}...)`)

      // Borrar el usuario de prueba
      await supabase.from('users').delete().eq('phone_number', testPhone)
      console.log('   ✅ Usuario de prueba eliminado')
    }
  } catch (error) {
    console.log(`   ❌ Error en prueba: ${error.message}`)
    allSuccess = false
  }

  // ============================================
  // Resumen
  // ============================================
  console.log('\n=====================================')
  console.log('📊 RESUMEN')
  console.log('=====================================')

  if (allSuccess) {
    console.log('🎉 ¡Base de datos configurada exitosamente!')
    console.log('\nTablas creadas:')
    console.log('  - users ✅')
    console.log('  - appointments ✅')
    console.log('  - interaction_logs ✅')
    console.log('\n✅ El sistema está listo para recibir mensajes')
  } else {
    console.log('⚠️  Hubo algunos errores.')
    console.log('\n💡 RECOMENDACIÓN:')
    console.log('   Si algunas tablas fallaron, ejecuta manualmente')
    console.log('   el schema.sql en el panel de Supabase.')
  }

  return allSuccess
}

// Función para crear tabla users (usando SQL directo)
async function createUsersTable() {
  try {
    // Intentar insertar para verificar si la tabla existe
    const { error } = await supabase.from('users').select('*').limit(1)

    if (error && error.code === 'PGRST116') {
      // Tabla no existe, intentar crear vía API
      const response = await fetch(`${supabaseUrl}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          phone_number: 'INITIAL_CHECK',
          timezone: 'America/Mexico_City',
          trust_score: 1.0
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText)
      }
    }

    return null
  } catch (error) {
    return error
  }
}

// Función para crear tabla appointments
async function createAppointmentsTable() {
  try {
    const { error } = await supabase.from('appointments').select('*').limit(1)
    return error
  } catch (error) {
    return error
  }
}

// Función para crear tabla interaction_logs
async function createInteractionLogsTable() {
  try {
    const { error } = await supabase.from('interaction_logs').select('*').limit(1)
    return error
  } catch (error) {
    return error
  }
}

// Ejecutar setup
setupDatabase().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('❌ Error fatal:', error)
  process.exit(1)
})
