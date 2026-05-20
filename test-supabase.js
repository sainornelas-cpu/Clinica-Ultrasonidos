/**
 * Test de conexión a Supabase
 */

const { createClient } = require('@supabase/supabase-js')

// Usar las credenciales correctas
const supabaseUrl = 'https://heubgudergnidbxyfhqq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhldWJndWRlcmduaWRieHlmaHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzg1MzYsImV4cCI6MjA5MDY1NDUzNn0.jPhhGKy4UEAVvyv-c16_dzGWsRcGiYXQ5g3esN73ncc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSupabaseConnection() {
  console.log('🧪 TEST DE CONEXIÓN A SUPABASE')
  console.log('=====================================\n')

  // Test 1: Verificar conexión
  console.log('📡 Test 1: Conexión básica')
  try {
    const { data, error } = await supabase.from('users').select('*').limit(1)
    if (error) {
      console.log('❌ Error de conexión:', error.message)
      console.log('   Código:', error.code)
      console.log('   Detalles:', error)
    } else {
      console.log('✅ Conexión exitosa')
      console.log(`   Datos: ${data.length} usuario(s) encontrado(s)`)
    }
  } catch (error) {
    console.log('❌ Error de conexión:', error.message)
  }

  console.log('\n')

  // Test 2: Intentar crear un usuario de prueba
  console.log('📋 Test 2: Crear usuario de prueba')
  try {
    const testPhone = '5255123456789'
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        phone_number: testPhone,
        full_name: null,
        timezone: 'America/Mexico_City',
        trust_score: 1.0
      })
      .select('id')
      .single()

    if (insertError) {
      console.log('❌ Error al crear usuario:', insertError.message)
      console.log('   Código:', insertError.code)
      console.log('   Detalles:', insertError)
    } else {
      console.log('✅ Usuario creado exitosamente')
      console.log(`   ID: ${newUser.id}`)

      // Borrar el usuario de prueba
      console.log('\n🗑️ Limpiando usuario de prueba...')
      await supabase.from('users').delete().eq('phone_number', testPhone)
      console.log('✅ Usuario de prueba eliminado')
    }
  } catch (error) {
    console.log('❌ Error inesperado:', error.message)
  }

  console.log('\n')

  // Test 3: Verificar tabla interaction_logs
  console.log('📝 Test 3: Verificar tabla interaction_logs')
  try {
    const { data, error } = await supabase.from('interaction_logs').select('*').limit(1)
    if (error) {
      console.log('❌ Error:', error.message)
    } else {
      console.log('✅ Tabla accesible')
      console.log(`   Registros: ${data.length}`)
    }
  } catch (error) {
    console.log('❌ Error:', error.message)
  }

  console.log('\n=====================================')
  console.log('📊 FIN DEL TEST DE SUPABASE')
}

testSupabaseConnection()
