/**
 * Script para crear las tablas de la base de datos en Supabase
 * Usa el service role key con permisos de admin
 */

const { createClient } = require('@supabase/supabase-js')

// Credenciales de Supabase (service role key con permisos de admin)
const supabaseUrl = 'https://heubgudergnidbxyfhqq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhldWJndWRlcmduaWRieHlmaHFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA3ODUzNiwiZXhwIjoyMDkwNjU0NTM2fQ.YYWljfIF2WH-Hq8X6hiTdfVceb4-4mNPy7re4nIfav8'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Consultas SQL para crear las tablas
const sqlQueries = [
  // ============================================
  // TABLA: users
  // ============================================
  `
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      phone_number TEXT UNIQUE NOT NULL,
      full_name TEXT,
      timezone TEXT DEFAULT 'America/Mexico_City',
      trust_score NUMERIC DEFAULT 1.0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
  // Índices para users
  `CREATE INDEX IF NOT EXISTS idx_users_phone_number ON public.users(phone_number);`,
  `CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);`,

  // ============================================
  // TABLA: appointments
  // ============================================
  `
    CREATE TABLE IF NOT EXISTS public.appointments (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      start_time TIMESTAMP WITH TIME ZONE NOT NULL,
      end_time TIMESTAMP WITH TIME ZONE,
      status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed')),
      reason TEXT,
      google_calendar_event_id TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
  // Índices para appointments
  `CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);`,

  // ============================================
  // TABLA: interaction_logs
  // ============================================
  `
    CREATE TABLE IF NOT EXISTS public.interaction_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      intent_detected TEXT,
      state_before TEXT,
      state_after TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
  // Índices para interaction_logs
  `CREATE INDEX IF NOT EXISTS idx_interaction_logs_user_id ON public.interaction_logs(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_interaction_logs_created_at ON public.interaction_logs(created_at);`,

  // ============================================
  // ROW LEVEL SECURITY (RLS)
  // ============================================
  `ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE public.interaction_logs ENABLE ROW LEVEL SECURITY;`,

  // Políticas para users
  `CREATE POLICY IF NOT EXISTS "Users: Public read access" ON public.users FOR SELECT USING (true);`,
  `CREATE POLICY IF NOT EXISTS "Users: Service role insert access" ON public.users FOR INSERT WITH CHECK (true);`,
  `CREATE POLICY IF NOT EXISTS "Users: Service role update access" ON public.users FOR UPDATE USING (true);`,

  // Políticas para appointments
  `CREATE POLICY IF NOT EXISTS "Appointments: Public read access" ON public.appointments FOR SELECT USING (true);`,
  `CREATE POLICY IF NOT EXISTS "Appointments: Service role insert access" ON public.appointments FOR INSERT WITH CHECK (true);`,
  `CREATE POLICY IF NOT EXISTS "Appointments: Service role update access" ON public.appointments FOR UPDATE USING (true);`,
  `CREATE POLICY IF NOT EXISTS "Appointments: Service role delete access" ON public.appointments FOR DELETE USING (true);`,

  // Políticas para interaction_logs
  `CREATE POLICY IF NOT EXISTS "Interaction logs: Public read access" ON public.interaction_logs FOR SELECT USING (true);`,
  `CREATE POLICY IF NOT EXISTS "Interaction logs: Service role insert access" ON public.interaction_logs FOR INSERT WITH CHECK (true);`,

  // ============================================
  // FUNCIONES DE TRIGGER
  // ============================================
  `
    CREATE OR REPLACE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // Triggers para updated_at
  `
    DROP TRIGGER IF EXISTS handle_updated_at_users ON public.users;
    CREATE TRIGGER handle_updated_at_users
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  `,
  `
    DROP TRIGGER IF EXISTS handle_updated_at_appointments ON public.appointments;
    CREATE TRIGGER handle_updated_at_appointments
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  `
]

async function setupDatabase() {
  console.log('🗄️  SETUP DE BASE DE DATOS SUPABASE')
  console.log('=====================================\n')

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < sqlQueries.length; i++) {
    const query = sqlQueries[i]
    const queryName = `Query ${i + 1}/${sqlQueries.length}`

    try {
      console.log(`⏳ Ejecutando ${queryName}...`)

      const { data, error } = await supabase.rpc('exec_sql', { sql: query })

      if (error) {
        // Si exec_sql no existe, intentar con una alternativa
        const altError = await executeViaREST(query)
        if (altError) {
          throw altError
        }
      }

      console.log(`✅ ${queryName} completado`)
      successCount++
    } catch (error) {
      errorCount++
      console.log(`❌ ${queryName} falló:`)
      console.log(`   ${error.message}`)

      // Si el error es "already exists" o similar, no es crítico
      if (
        error.message.includes('already exists') ||
        error.message.includes('duplicate') ||
        error.message.includes('does not exist') && query.includes('DROP')
      ) {
        console.log(`   ⚠️  (Este error puede ignorarse)`)
        errorCount--
        successCount++
      }
    }
  }

  console.log('\n=====================================')
  console.log('📊 RESUMEN')
  console.log('=====================================')
  console.log(`✅ Exitosos: ${successCount}`)
  console.log(`❌ Errores: ${errorCount}`)

  if (errorCount === 0) {
    console.log('\n🎉 ¡Base de datos configurada exitosamente!')
    console.log('\nTablas creadas:')
    console.log('  - users')
    console.log('  - appointments')
    console.log('  - interaction_logs')
  } else {
    console.log('\n⚠️  Hubo algunos errores, pero la configuración puede estar completa.')
    console.log('💡 Revisa los logs arriba para más detalles.')
  }

  return errorCount === 0
}

// Función alternativa para ejecutar SQL vía REST API
async function executeViaREST(query) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ sql: query })
    })

    if (!response.ok) {
      const error = await response.json()
      return new Error(error.message || error.error || 'Error desconocido')
    }

    return null
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
