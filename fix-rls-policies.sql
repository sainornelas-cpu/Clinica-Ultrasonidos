-- Actualizar políticas para permitir UPDATE con conversation_state

-- Primero intentamos drop, si no existe continúa
DROP POLICY IF EXISTS "Users: Public read access" ON users;
CREATE POLICY "Users: Public read access" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users: Service role insert access" ON users;
CREATE POLICY "Users: Service role insert access" ON users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users: Service role update access" ON users;
CREATE POLICY "Users: Service role update access" ON users FOR UPDATE USING (true);

-- Verificar
SELECT
  '✅ Políticas actualizadas correctamente' AS status;
