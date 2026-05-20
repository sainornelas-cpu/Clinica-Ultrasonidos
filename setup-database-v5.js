/**
 * Script para crear tablas mediante inserción directa
 * Este es un workaround para crear tablas cuando el SQL directo no funciona
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://heubgudergnidbxyfhqq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhldWJndWRlcmduaWRieHlmaHFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA3ODUzNiwiZXhwIjoyMDkwNjU0NTM2fQ.YYWljfIF2WH-Hq8X6hiTdfVceb4-4mNPy7re4nIfav8'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTableViaInsert(tableName, data) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(data)
  })

  return response
}

async function setupDatabase() {
  console.log('🗄️  SETUP DE BASE DE DATOS SUPABASE')
  console.log('=====================================\n')

  // Paso 1: Crear tabla users mediante inserción con header especial
  console.log('📋 PASO 1: Creando tabla users...')

  try {
    // Usar el endpoint de bulk con prefer para crear la tabla
    const response = await createTableViaInsert('users', {
      phone_number: 'INITIAL_SETUP_' + Date.now(),
      timezone: 'America/Mexico_City',
      trust_score: 1.0
    })

    if (response.ok) {
      console.log('✅ Tabla users creada\n')
    } else {
      const error = await response.json()
      console.log(`⚠️  Users: ${error.message || error.error}\n`)
    }
  } catch (error) {
    console.log(`⚠️  Users: ${error.message}\n`)
  }

  // Paso 2: Crear tabla appointments
  console.log('📋 PASO 2: Creando tabla appointments...')

  try {
    const response = await createTableViaInsert('appointments', {
      user_id: null, // Será un UUID válido
      service_id: 'consult_general',
      service_name: 'Consulta General',
      start_time: new Date().toISOString(),
      status: 'scheduled'
    })

    if (response.ok) {
      console.log('✅ Tabla appointments creada\n')
    } else {
      const error = await response.json()
      console.log(`⚠️  Appointments: ${error.message || error.error}\n`)
    }
  } catch (error) {
    console.log(`⚠️  Appointments: ${error.message}\n`)
  }

  // Paso 3: Crear tabla interaction_logs
  console.log('📋 PASO 3: Creando tabla interaction_logs...')

  try {
    const response = await createTableViaInsert('interaction_logs', {
      user_id: null,
      role: 'system',
      content: 'Inicialización del sistema',
      state_before: 'idle',
      state_after: 'idle'
    })

    if (response.ok) {
      console.log('✅ Tabla interaction_logs creada\n')
    } else {
      const error = await response.json()
      console.log(`⚠️  Interaction logs: ${error.message || error.error}\n`)
    }
  } catch (error) {
    console.log(`⚠️  Interaction logs: ${error.message}\n`)
  }

  // Paso 4: Verificar tablas
  console.log('🔍 PASO 4: Verificando tablas...\n')

  const tables = ['users', 'appointments', 'interaction_logs']
  let allOk = true

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      if (error) {
        console.log(`   ❌ Tabla '${table}': ${error.message}`)
        allOk = false
      } else {
        console.log(`   ✅ Tabla '${table}' accesible (${data.length} registros)`)
      }
    } catch (error) {
      console.log(`   ❌ Tabla '${table}': ${error.message}`)
      allOk = false
    }
  }

  console.log('\n=====================================')

  if (allOk) {
    console.log('🎉 ¡Base de datos configurada exitosamente!')
  } else {
    console.log('⚠️  No se pudieron crear las tablas automáticamente.')
    console.log('\n💡 MANUALMENTE:')
    console.log('   1. Ve a https://supabase.com/dashboard')
    console.log('   2. Selecciona tu proyecto')
    console.log('   3. Ve a SQL Editor')
    console.log('   4. Crea un nuevo query')
    console.log('   5. Copia y pega el contenido de schema.sql')
    console.log('   6. Ejecuta el query')
  }

  return allOk
}

// Ejecutar
setupDatabase().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('❌ Error fatal:', error)
  process.exit(1)
})
