/**
 * Script para crear tablas usando el endpoint SQL de Supabase
 */

const supabaseUrl = 'https://heubgudergnidbxyfhqq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhldWJndWRlcmduaWRieHlmaHFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA3ODUzNiwiZXhwIjoyMDkwNjU0NTM2fQ.YYWljfIF2WH-Hq8X6hiTdfVceb4-4mNPy7re4nIfav8'

async function executeSQL(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({ query: sql })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || 'Error desconocido')
  }

  return await response.json()
}

async function setupDatabase() {
  console.log('🗄️  SETUP DE BASE DE DATOS SUPABASE')
  console.log('=====================================\n')

  // PASO 1: Crear tabla users
  console.log('📋 PASO 1: Creando tabla users...')

  const createUsersSQL = `
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      phone_number TEXT UNIQUE NOT NULL,
      full_name TEXT,
      timezone TEXT DEFAULT 'America/Mexico_City',
      trust_score NUMERIC DEFAULT 1.0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_users_phone_number ON public.users(phone_number);
    CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);
  `

  try {
    await executeSQL(createUsersSQL)
    console.log('✅ Tabla users creada\n')
  } catch (error) {
    console.log(`⚠️  Users: ${error.message}\n`)
  }

  // PASO 2: Crear tabla appointments
  console.log('📋 PASO 2: Creando tabla appointments...')

  const createAppointmentsSQL = `
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
    CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
  `

  try {
    await executeSQL(createAppointmentsSQL)
    console.log('✅ Tabla appointments creada\n')
  } catch (error) {
    console.log(`⚠️  Appointments: ${error.message}\n`)
  }

  // PASO 3: Crear tabla interaction_logs
  console.log('📋 PASO 3: Creando tabla interaction_logs...')

  const createLogsSQL = `
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
    CREATE INDEX IF NOT EXISTS idx_interaction_logs_user_id ON public.interaction_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_interaction_logs_created_at ON public.interaction_logs(created_at);
  `

  try {
    await executeSQL(createLogsSQL)
    console.log('✅ Tabla interaction_logs creada\n')
  } catch (error) {
    console.log(`⚠️  Interaction logs: ${error.message}\n`)
  }

  // PASO 4: Configurar RLS
  console.log('📋 PASO 4: Configurando RLS...')

  const rlsSQL = `
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.interaction_logs ENABLE ROW LEVEL SECURITY;

    CREATE POLICY IF NOT EXISTS "Users: Public read access" ON public.users FOR SELECT USING (true);
    CREATE POLICY IF NOT EXISTS "Users: Service role insert access" ON public.users FOR INSERT WITH CHECK (true);
    CREATE POLICY IF NOT EXISTS "Users: Service role update access" ON public.users FOR UPDATE USING (true);

    CREATE POLICY IF NOT EXISTS "Appointments: Public read access" ON public.appointments FOR SELECT USING (true);
    CREATE POLICY IF NOT EXISTS "Appointments: Service role insert access" ON public.appointments FOR INSERT WITH CHECK (true);
    CREATE POLICY IF NOT EXISTS "Appointments: Service role update access" ON public.appointments FOR UPDATE USING (true);
    CREATE POLICY IF NOT EXISTS "Appointments: Service role delete access" ON public.appointments FOR DELETE USING (true);

    CREATE POLICY IF NOT EXISTS "Interaction logs: Public read access" ON public.interaction_logs FOR SELECT USING (true);
    CREATE POLICY IF NOT EXISTS "Interaction logs: Service role insert access" ON public.interaction_logs FOR INSERT WITH CHECK (true);
  `

  try {
    await executeSQL(rlsSQL)
    console.log('✅ RLS configurado\n')
  } catch (error) {
    console.log(`⚠️  RLS: ${error.message}\n`)
  }

  // PASO 5: Crear trigger para updated_at
  console.log('📋 PASO 5: Creando trigger para updated_at...')

  const triggerSQL = `
    CREATE OR REPLACE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS handle_updated_at_users ON public.users;
    CREATE TRIGGER handle_updated_at_users
      BEFORE UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

    DROP TRIGGER IF EXISTS handle_updated_at_appointments ON public.appointments;
    CREATE TRIGGER handle_updated_at_appointments
      BEFORE UPDATE ON public.appointments
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  `

  try {
    await executeSQL(triggerSQL)
    console.log('✅ Trigger creado\n')
  } catch (error) {
    console.log(`⚠️  Trigger: ${error.message}\n`)
  }

  // PASO 6: Verificar tablas
  console.log('🔍 PASO 6: Verificando tablas...\n')

  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    console.log('⚠️  Algunos pasos fallaron.')
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
