-- ============================================
-- ESQUEMA DE BASE DE DATOS PARA AGENTE DE CITAS
-- Versión FINAL compatible con PostgreSQL 14 y anteriores
-- ============================================

-- Habilitar extensiones
create extension if not exists vector;
create extension if not exists pg_net;

-- ============================================
-- TABLA: users (Usuarios con perfil vectorial)
-- ============================================
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  phone_number text unique not null,
  full_name text,
  email text,
  timezone text default 'America/Mexico_City',
  preferred_time_range text check (preferred_time_range in ('morning','afternoon','evening')),
  trust_score float default 1.0,
  conversation_state text default 'idle',
  embedding vector(1536),
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- TABLA: appointments (Citas médicas)
-- ============================================
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  owner_id uuid,
  service_id text not null,
  service_name text not null,
  duration_minutes int not null,
  start_time timestamptz not null,
  end_time timestamptz,
  status text default 'scheduled' check (status in ('confirmed','rescheduled','cancelled','no_show','pending_sync','scheduled')),
  calendar_event_id text,
  calendar_provider text check (calendar_provider in ('google','calcom','caldav')),
  notes text,
  cancellation_reason text,
  changed_by text check (changed_by in ('bot','dashboard','api')),
  reminder_24h_sent boolean default false,
  reminder_3h_sent boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- TABLA: interaction_logs (Historial de interacciones)
-- ============================================
create table if not exists interaction_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  role text check (role in ('user','assistant','system')),
  content text not null,
  intent_detected text,
  state_before text,
  state_after text,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: owner_alerts (Alertas para el dueño)
-- ============================================
create table if not exists owner_alerts (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id) on delete cascade,
  alert_type text check (alert_type in ('new_booking','reschedule','cancellation','risk_flag','no_show')),
  payload jsonb,
  notified boolean default false,
  notified_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: services (Servicios disponibles)
-- ============================================
create table if not exists services (
  id text primary key,
  owner_id uuid,
  name text not null,
  duration_minutes int not null,
  price text,
  description text,
  active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- ÍNDICES
-- ============================================
create index if not exists idx_users_phone on users(phone_number);
create index if not exists idx_appointments_user on appointments(user_id);
create index if not exists idx_appointments_start_time on appointments(start_time);
create index if not exists idx_appointments_status on appointments(status);
create index if not exists idx_interactions_user on interaction_logs(user_id, created_at desc);
create index if not exists idx_interactions_appointment on interaction_logs(appointment_id);
create index if not exists idx_alerts_appointment on owner_alerts(appointment_id);

-- ============================================
-- HABILITAR REALTIME
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointments, owner_alerts, users;
  END IF;
END $$;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
alter table users enable row level security;
alter table appointments enable row level security;
alter table interaction_logs enable row level security;
alter table owner_alerts enable row level security;
alter table services enable row level security;

-- ============================================
-- POLÍTICAS DE SEGURIDAD (sin IF NOT EXISTS)
-- ============================================

-- Primero intentamos drop, si no existe continúa
DROP POLICY IF EXISTS "Users: Public read access" ON users;
CREATE POLICY "Users: Public read access" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users: Service role insert access" ON users;
CREATE POLICY "Users: Service role insert access" ON users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users: Service role update access" ON users;
CREATE POLICY "Users: Service role update access" ON users FOR UPDATE USING (true);

-- Policies para appointments
DROP POLICY IF EXISTS "Appointments: Public read access" ON appointments;
CREATE POLICY "Appointments: Public read access" ON appointments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Appointments: Service role insert access" ON appointments;
CREATE POLICY "Appointments: Service role insert access" ON appointments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Appointments: Service role update access" ON appointments;
CREATE POLICY "Appointments: Service role update access" ON appointments FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Appointments: Service role delete access" ON appointments;
CREATE POLICY "Appointments: Service role delete access" ON appointments FOR DELETE USING (true);

-- Policies para interaction_logs
DROP POLICY IF EXISTS "Interaction logs: Public read access" ON interaction_logs;
CREATE POLICY "Interaction logs: Public read access" ON interaction_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Interaction logs: Service role insert access" ON interaction_logs;
CREATE POLICY "Interaction logs: Service role insert access" ON interaction_logs FOR INSERT WITH CHECK (true);

-- Policies para owner_alerts
DROP POLICY IF EXISTS "Owner alerts: Public read access" ON owner_alerts;
CREATE POLICY "Owner alerts: Public read access" ON owner_alerts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owner alerts: Service role insert access" ON owner_alerts;
CREATE POLICY "Owner alerts: Service role insert access" ON owner_alerts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owner alerts: Service role update access" ON owner_alerts;
CREATE POLICY "Owner alerts: Service role update access" ON owner_alerts FOR UPDATE USING (true);

-- Policies para services
DROP POLICY IF EXISTS "Services: Public read access" ON services;
CREATE POLICY "Services: Public read access" ON services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Services: Service role insert access" ON services;
CREATE POLICY "Services: Service role insert access" ON services FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Services: Service role update access" ON services;
CREATE POLICY "Services: Service role update access" ON services FOR UPDATE USING (true);

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT
  '✅ Tablas creadas correctamente' AS status,
  (SELECT COUNT(*) FROM users) AS users_count,
  (SELECT COUNT(*) FROM appointments) AS appointments_count,
  (SELECT COUNT(*) FROM interaction_logs) AS logs_count;
