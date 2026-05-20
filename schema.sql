-- ============================================
-- TABLA: users
-- Almacena información de los usuarios del bot
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

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON public.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- ============================================
-- TABLA: appointments
-- Almacena las citas médicas
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

-- Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- ============================================
-- TABLA: interaction_logs
-- Registra el historial de conversaciones
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

-- Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_interaction_logs_user_id ON public.interaction_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_created_at ON public.interaction_logs(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Políticas de seguridad para las tablas
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interaction_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para users (público para lecturas, admin para escritura)
CREATE POLICY "Users: Public read access" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users: Service role insert access" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users: Service role update access" ON public.users
  FOR UPDATE USING (true);

-- Políticas para appointments
CREATE POLICY "Appointments: Public read access" ON public.appointments
  FOR SELECT USING (true);

CREATE POLICY "Appointments: Service role insert access" ON public.appointments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Appointments: Service role update access" ON public.appointments
  FOR UPDATE USING (true);

CREATE POLICY "Appointments: Service role delete access" ON public.appointments
  FOR DELETE USING (true);

-- Políticas para interaction_logs
CREATE POLICY "Interaction logs: Public read access" ON public.interaction_logs
  FOR SELECT USING (true);

CREATE POLICY "Interaction logs: Service role insert access" ON public.interaction_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- FUNCIONES DE TRIGGER
-- Actualizar updated_at automáticamente
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
DROP TRIGGER IF EXISTS handle_updated_at_users ON public.users;
CREATE TRIGGER handle_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_appointments ON public.appointments;
CREATE TRIGGER handle_updated_at_appointments
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- FINALIZAR
-- ============================================

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BASE DE DATOS INICIALIZADA CORRECTAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tablas creadas:';
  RAISE NOTICE '  - users';
  RAISE NOTICE '  - appointments';
  RAISE NOTICE '  - interaction_logs';
  RAISE NOTICE '========================================';
END $$;
