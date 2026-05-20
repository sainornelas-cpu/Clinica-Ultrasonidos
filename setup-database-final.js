/**
 * Script para crear las tablas usando la API de ejecución de SQL de Supabase
 * Este es el método más confiable
 */

const supabaseUrl = 'https://heubgudergnidbxyfhqq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhldWJndWRlcmduaWRieHlmaHFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA3ODUzNiwiZXhwIjoyMDkwNjU0NTM2fQ.YYWljfIF2WH-Hq8X6hiTdfVceb4-4mNPy7re4nIfav8'

// SQL completo para crear todas las tablas
const schemaSQL = `
-- ============================================
-- TABLA: users
-- ============================================
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

-- ============================================
-- TABLA: appointments
-- ============================================
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

-- ============================================
-- TABLA: interaction_logs
-- ============================================
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

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interaction_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY IF NOT EXISTS "Users: Public read access" ON public.users
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users: Service role insert access" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users: Service role update access" ON public.users
  FOR UPDATE USING (true);

-- Políticas para appointments
CREATE POLICY IF NOT EXISTS "Appointments: Public read access" ON public.appointments
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Appointments: Service role insert access" ON public.appointments
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Appointments: Service role update access" ON public.appointments
  FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Appointments: Service role delete access" ON public.appointments
  FOR DELETE USING (true);

-- Políticas para interaction_logs
CREATE POLICY IF NOT EXISTS "Interaction logs: Public read access" ON public.interaction_logs
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Interaction logs: Service role insert access" ON public.interaction_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- FUNCIONES DE TRIGGER
-- ============================================
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
`;

async function setupDatabase() {
  console.log('🗄️  SETUP DE BASE DE DATOS SUPABASE')
  console.log('=====================================\n')

  try {
    console.log('⏳ Ejecutando SQL para crear tablas...')
    console.log('   Esto puede tomar unos segundos...\n')

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        query: schemaSQL
      })
    })

    const responseText = await response.text()

    if (!response.ok) {
      console.log('⚠️  La respuesta indica posible error, pero verificando...')

      // Intentar verificar si las tablas se crearon
      await verifyTables()
      return
    }

    console.log('✅ SQL ejecutado exitosamente!\n')

    // Verificar que las tablas existen
    await verifyTables()

  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    console.log('\n⚠️  No se pudo ejecutar automáticamente.')
    console.log('\n💡 MANUALMENTE:')
    console.log('   1. Ve a https://supabase.com/dashboard')
    console.log('   2. Selecciona tu proyecto')
    console.log('   3. Ve a SQL Editor')
    console.log('   4. Crea un nuevo query')
    console.log('   5. Copia y pega el contenido de schema.sql')
    console.log('   6. Ejecuta el query')
  }
}

async function verifyTables() {
  console.log('🔍 Verificando tablas...\n')

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
    console.log('\nTablas creadas:')
    console.log('  - users ✅')
    console.log('  - appointments ✅')
    console.log('  - interaction_logs ✅')
    console.log('\n✅ El sistema está listo para recibir mensajes')
    return true
  } else {
    console.log('⚠️  Algunas tablas no están accesibles.')
    console.log('\n💡 MANUALMENTE:')
    console.log('   1. Ve a https://supabase.com/dashboard')
    console.log('   2. Selecciona tu proyecto')
    console.log('   3. Ve a SQL Editor')
    console.log('   4. Crea un nuevo query')
    console.log('   5. Copia y pega el contenido de schema.sql')
    console.log('   6. Ejecuta el query')
    return false
  }
}

// Ejecutar setup
setupDatabase().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('❌ Error fatal:', error)
  process.exit(1)
})
