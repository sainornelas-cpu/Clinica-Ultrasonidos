# REQUISITOS DEL SISTEMA - Bot de WhatsApp
# Dr. Baltierres Ginecólogo Ultrasonido

**Versión:** 1.0
**Estado:** DEFINITIVO - BASE DEL SISTEMA
**Fecha:** 2026-05-21
**Última modificación:** Este documento es la base para todas las implementaciones.

---

## 1. OBJETIVO DEL SISTEMA

Bot de WhatsApp automatizado para agendar citas de ginecología y ultrasonido, con las siguientes características:

- **24/7 disponible**: El bot responde automáticamente en cualquier horario
- **Validación de disponibilidad**: No permite agendar en horarios ocupados
- **Experiencia consistente**: El flujo siempre es el mismo, sin respuestas aleatorias
- **Datos persistentes**: Toda la información se guarda en base de datos

---

## 2. REGLAS DE NEGOCIO

### 2.1 Horarios de Atención
| Día | Horario |
|-----|---------|
| Lunes - Viernes | 9:00 AM - 7:00 PM |
| Sábados | 9:00 AM - 2:00 PM |
| Domingos | CERRADO |

### 2.2 Servicios Disponibles
| ID | Servicio | Precio | Duración |
|----|----------|--------|----------|
| 1 | Consulta General | $500 | 30 min |
| 2 | Ultrasonido Ginecológico | $1,200 | 45 min |
| 3 | Control Prenatal | $800 | 40 min |
| 4 | Papanicolaou | $450 | 30 min |
| 5 | Consulta de Fertilidad | $900 | 60 min |

### 2.3 Reglas de Agendamiento
1. **Obligatorio**: Verificar disponibilidad antes de confirmar cita
2. **No solapamiento**: No se pueden agendar citas en el mismo horario
3. **Horario futuro**: Solo se pueden agendar fechas futuras (no pasado ni hoy)
4. **Días cerrados**: No agendar en domingo (y feriados configurables)
5. **Respeto de duración**: Cada servicio requiere su tiempo específico

### 2.4 Información de la Clínica
```
Nombre: Dr. Baltierres Ginecólogo Ultrasonido
Dirección: Av. Principal #123, Colonia Centro, Ciudad de México, CP 00000
Teléfono: +52 555-123-4567
Referencias: Frente al parque central, a 2 cuadras del metro Hidalgo
Estacionamiento: Disponible en entrada trasera
```

---

## 3. FLUJO DE CONVERSACIÓN (OBLIGATORIO)

### 3.1 Estado Inicial - IDLE

```
USUARIO: [Cualquier mensaje inicial]
   ↓
BOT: Hola, buenos días. Te atiende el asistente virtual del
     Dr. Baltierres Ginecólogo Ultrasonido.
     ¿En qué te puedo ayudar hoy?

     📋 Opciones disponibles:
     1️⃣ Agendar cita
     2️⃣ Precios
     3️⃣ Servicios
     4️⃣ Ubicación
     5️⃣ Horario de atención

     *Responde con el número de la opción que necesitas.*

ESTADO: IDLE
GUARDAR: Log usuario (role: user, state: idle → processing)
GUARDAR: Log assistant (role: assistant, state: idle → idle)
```

### 3.2 Agendamiento - BOOKING_NAME

```
USUARIO: "1" o "agendar" o "cita"
   ↓
BOT: 📅 Para agendar tu cita, necesito algunos datos:

     Por favor, escribe tu nombre completo para empezar.

ESTADO: IDLE → BOOKING_NAME
GUARDAR: Log usuario
GUARDAR: Log assistant
ACTUALIZAR: users.conversation_state = booking_name
```

```
USUARIO: [Nombre completo, ej: "María González"]
   ↓
BOT: ✅ Nombre registrado: **[Nombre]**

     🦷 Selecciona el servicio que necesitas:

     1. Consulta General - $500
     2. Ultrasonido Ginecológico - $1,200
     3. Control Prenatal - $800
     4. Papanicolaou - $450
     5. Consulta de Fertilidad - $900

     Responde con el número del servicio.

ESTADO: BOOKING_NAME → BOOKING_SERVICE
GUARDAR: users.full_name = [Nombre]
GUARDAR: Log usuario
GUARDAR: Log assistant
ACTUALIZAR: users.conversation_state = booking_service
```

### 3.3 Agendamiento - BOOKING_SERVICE

```
USUARIO: [1-5]
   ↓
Si opción válida:
BOT: 📅 Servicio seleccionado: **[Servicio]** - **[Precio]**

     Por favor, indica la fecha y hora deseada para tu cita.

     Ejemplo: Mañana a las 10am o Viernes 25 de mayo a las 3pm

ESTADO: BOOKING_SERVICE → BOOKING_DATE
GUARDAR: booking_data_service = [Servicio JSON]
GUARDAR: Log usuario
GUARDAR: Log assistant
ACTUALIZAR: users.conversation_state = booking_date

Si opción inválida:
BOT: ❌ Opción no válida. Selecciona un número del 1 al 5.

ESTADO: BOOKING_SERVICE (sin cambio)
```

### 3.4 Agendamiento - BOOKING_DATE

```
USUARIO: [Fecha y hora, ej: "Mañana a las 10am"]
   ↓
BOT VERIFICA DISPONIBILIDAD:

1. Parsear fecha
2. Verificar que sea fecha futura
3. Verificar que no sea domingo
4. Verificar horario dentro de clínica
5. Verificar que no haya cita existente

SI DISPONIBLE:
BOT: ✅ ¡Cita confirmada!

     📅 Fecha: [Fecha]
     🦷 Servicio: [Servicio]
     💰 Costo: [Precio]

     Te esperamos en:
     📍 Av. Principal #123, Colonia Centro
     📞 +52 555-123-4567

     ¿Algo más en lo que pueda ayudar?

     📋 Opciones disponibles:
     1️⃣ Agendar otra cita
     2️⃣ Ver mis citas
     3️⃣ Volver al menú principal

ESTADO: BOOKING_DATE → IDLE
GUARDAR: Cita en appointments (user_id: [USER ID])
GUARDAR: Log usuario
GUARDAR: Log assistant
ACTUALIZAR: users.conversation_state = idle

SI NO DISPONIBLE:
BOT: ❌ Ese horario no está disponible.

     Estos son los horarios disponibles para esa fecha:
     • 10:00 AM
     • 11:30 AM
     • 3:00 PM

     Por favor selecciona otro horario.

ESTADO: BOOKING_DATE (sin cambio)
```

### 3.5 Post-Confirmación - Respuesta del Usuario

```
USUARIO: [Cualquier respuesta después de cita confirmada]
   ↓
BOT (siempre en estado IDLE):

Si "1" o "agendar" o "cita":
   → Ir a BOOKING_NAME (flujo de agendamiento)

Si "2" o "mis citas":
   → Mostrar citas agendadas

Si "3" o "menu":
   → Mostrar menú principal

Si cualquier otra cosa:
   → Mostrar menú principal
```

---

## 4. ESTADOS DE CONVERSIACIÓN

| Estado | Descripción | Siguiente Estado |
|--------|-------------|------------------|
| `idle` | Usuario sin flujo activo | `booking_name` o `idle` |
| `processing` | Estado intermedio durante procesamiento | Estado final |
| `booking_name` | Pidiendo nombre del usuario | `booking_service` |
| `booking_service` | Pidiendo selección de servicio | `booking_date` |
| `booking_date` | Pidiendo fecha/hora | `idle` |

**Regla de autoridad**: El estado siempre se lee de `users.conversation_state`. Los logs son para auditoría, no para determinar estado.

---

## 5. ESTRUCTURA DE BASE DE DATOS

### 5.1 Tabla: users
```sql
Column              | Tipo            | Restricciones
--------------------|-----------------|------------------
id                  | UUID            | PRIMARY KEY
phone_number        | VARCHAR(20)     | UNIQUE, NOT NULL
full_name           | VARCHAR(100)    | NULL
email               | VARCHAR(100)    | NULL
timezone            | VARCHAR(50)     | DEFAULT 'America/Mexico_City'
trust_score         | FLOAT           | DEFAULT 1.0
conversation_state  | VARCHAR(50)     | DEFAULT 'idle'
created_at          | TIMESTAMP       | DEFAULT NOW()
updated_at          | TIMESTAMP       | DEFAULT NOW()
```

**NOTA**: `conversation_state` ES LA AUTORIDAD PARA DETERMINAR EL ESTADO ACTUAL.

### 5.2 Tabla: appointments
```sql
Column              | Tipo            | Restricciones
--------------------|-----------------|------------------
id                  | UUID            | PRIMARY KEY
user_id             | UUID            | FK users.id, NOT NULL
owner_id            | UUID            | NOT NULL
service_id          | VARCHAR(50)     | NOT NULL
service_name        | VARCHAR(100)    | NOT NULL
duration_minutes   | INT             | NOT NULL
start_time          | TIMESTAMP       | NOT NULL
end_time            | TIMESTAMP       | NOT NULL
status              | VARCHAR(20)     | 'confirmed', 'cancelled', 'rescheduled'
calendar_event_id   | VARCHAR(100)    | NULL
calendar_provider   | VARCHAR(20)     | NULL
notes               | TEXT            | NULL
changed_by          | VARCHAR(20)     | 'bot' o 'admin'
created_at          | TIMESTAMP       | DEFAULT NOW()
updated_at          | TIMESTAMP       | DEFAULT NOW()
```

**REQUISITO**: `user_id` SIEMPRE DEBE ESTAR LLENO CUANDO SE CREA UNA CITA.

### 5.3 Tabla: interaction_logs
```sql
Column              | Tipo            | Restricciones
--------------------|-----------------|------------------
id                  | UUID            | PRIMARY KEY
user_id             | UUID            | FK users.id
role                | VARCHAR(20)     | 'user', 'assistant', 'system'
content             | TEXT            | NOT NULL
intent_detected     | VARCHAR(50)     | NOT NULL
state_before        | VARCHAR(50)     | NOT NULL
state_after         | VARCHAR(50)     | NOT NULL
created_at          | TIMESTAMP       | DEFAULT NOW()
```

**Propósito**: Auditoría y contexto para OpenAI. NO se usa para determinar estado actual.

---

## 6. FUNCIÓN DE VERIFICACIÓN DE DISPONIBILIDAD (OBLIGATORIA)

### 6.1 Requisitos
```typescript
function checkAvailability(dateText: string, serviceDuration: number): {
  available: boolean;
  message?: string;
  suggestedSlots?: string[];
}
```

### 6.2 Lógica
1. **Parsear fecha**: Convertir texto humano a fecha real
2. **Validar fecha futura**: Rechazar fechas de hoy o pasado
3. **Validar horario clínica**:
   - Rechazar si es domingo
   - Rechazar si está fuera de horario de operación
4. **Consultar citas existentes**: `SELECT * FROM appointments WHERE date = [parsed_date]`
5. **Calcular solapamiento**: Verificar si el slot solicitado se traslapa con alguna cita
6. **Si disponible**: Retornar `{ available: true }`
7. **Si no disponible**:
   - Generar slots de 30 min dentro de horario clínica
   - Filtrar slots ocupados
   - Retornar `{ available: false, message: "...", suggestedSlots: [...] }`

### 6.3 Slots Disponibles
Si no hay disponibilidad, mostrar máximo 5 opciones:
```
❌ Ese horario no está disponible.

Estos son los horarios disponibles para esa fecha:
• 10:00 AM
• 11:30 AM
• 2:00 PM
• 4:30 PM
• 6:00 PM

Por favor selecciona otro horario.
```

---

## 7. MENSAJES DEL BOT (OBLIGATORIOS)

### 7.1 Mensaje de Bienvenida
```
Hola, buenos días. Te atiende el asistente virtual del
Dr. Baltierres Ginecólogo Ultrasonido.
¿En qué te puedo ayudar hoy?

📋 Opciones disponibles:
1️⃣ Agendar cita
2️⃣ Precios
3️⃣ Servicios
4️⃣ Ubicación
5️⃣ Horario de atención

*Responde con el número de la opción que necesitas.*
```

### 7.2 Precios
```
💰 Tabla de precios:
• Consulta General: $500
• Ultrasonido Ginecológico: $1,200
• Control Prenatal: $800
• Papanicolaou: $450
• Consulta de Fertilidad: $900

¿Algo más en lo que te pueda ayudar?
```

### 7.3 Servicios
```
🏥 Nuestros servicios:

🦷 Consulta General
Valoración general de salud ginecológica.

📊 Ultrasonido Ginecológico
Diagnóstico por imágenes del sistema reproductor.

👶 Control Prenatal
Seguimiento del embarazo y desarrollo del bebé.

🔬 Papanicolaou
Detección temprana de cáncer cervical.

❤️ Consulta de Fertilidad
Evaluación y tratamiento para la concepción.

¿Algo más en lo que te pueda ayudar?
```

### 7.4 Ubicación
```
📍 Ubicación:
Av. Principal #123, Colonia Centro
Ciudad de México, CP 00000

🚗 Referencias: Frente al parque central, a 2 cuadras del metro Hidalgo
🅿️ Estacionamiento: Disponible en entrada trasera

¿Algo más en lo que te pueda ayudar?
```

### 7.5 Horario de Atención
```
⏰ Horario de atención:

• Lunes a Viernes: 9:00 AM - 7:00 PM
• Sábados: 9:00 AM - 2:00 PM
• Domingos: Cerrado

¿Algo más en lo que te pueda ayudar?
```

### 7.6 Confirmación de Cita
```
✅ ¡Cita confirmada!

📅 Fecha: [Fecha ingresada]
🦷 Servicio: [Servicio]
💰 Costo: [Precio]

Te esperamos en:
📍 Av. Principal #123, Colonia Centro
📞 +52 555-123-4567

¿Algo más en lo que te pueda ayudar?

📋 Opciones disponibles:
1️⃣ Agendar otra cita
2️⃣ Ver mis citas
3️⃣ Volver al menú principal
```

---

## 8. REGLAS DE IMPLEMENTACIÓN

### 8.1 Prioridad de Respuestas (Orden estricto)
1. **Flujo de booking activo**: Si estado es `booking_*`, manejar según estado
2. **Primer mensaje**: Si es primer mensaje del usuario, mostrar bienvenida
3. **Palabras clave**: Si contiene "agendar"/"cita" y está en `idle`, iniciar booking
4. **Opciones del menú**: Si es "1-5", manejar según opción
5. **Comandos generales**: Si es "mis citas"/"cancelar"/"reagendar"
6. **Mensaje genérico en idle**: Si está en `idle`, mostrar menú
7. **Fallback**: Usar OpenAI

### 8.2 Manejo de Errores
- Si Supabase falla: Intentar 3 veces, luego enviar mensaje genérico
- Si WhatsApp API falla: Guardar log del error para retry
- Si no se puede crear cita: Informar al usuario y mantener estado
- Si verificación de disponibilidad falla: Proceder con precaución (puede agendar)

### 8.3 Seguridad
- **RLS Policies**: Tablas protegidas con políticas de seguridad
- **Service Role**: Para operaciones de servidor
- **Anon Role**: Para operaciones de cliente (dashboard)
- **WhatsApp Webhook**: Verificar con `WHATSAPP_VERIFY_TOKEN`

---

## 9. TESTING OBLIGATORIO

### 9.1 Casos de Prueba
1. **Flujo completo de agendamiento**: Nuevo usuario agenda cita
2. **Agendamiento sin disponibilidad**: Usuario intenta agendar en horario ocupado
3. **Respuesta a confirmación**: Usuario responde "sí" después de cita
4. **Opciones del menú**: Usuario prueba cada opción (2-5)
5. **Usuario existente**: Usuario que ya agendó antes regresa
6. **Horario inválido**: Usuario intenta agendar en domingo/horario cerrado

### 9.2 Criterios de Éxito
- ✅ El user_id siempre se guarda en la cita
- ✅ El nombre del usuario se guarda correctamente
- ✅ El estado de conversación se mantiene consistente
- ✅ No se permiten citas en horarios ocupados
- ✅ Después de confirmación, bot responde apropiadamente
- ✅ Bot siempre muestra bienvenida a nuevos usuarios

---

## 10. INTEGRACIONES FUTURAS (Opcionales)

### 10.1 Google Calendar
- Sincronizar citas con Google Calendar del doctor
- Usar FreeBusy API para verificar disponibilidad

### 10.2 Calendario
- Alternativa a Google Calendar
- API para verificar disponibilidad en tiempo real

### 10.3 Notificaciones
- WhatsApp API para recordatorios 24h antes
- Email de confirmación de cita

---

## 11. CHECKLIST DE PRODUCCIÓN

Antes de pasar a producción, verificar:

- [ ] El webhook responde correctamente a GET (verificación)
- [ ] El webhook procesa POST (mensajes)
- [ ] La disponibilidad se verifica antes de agendar
- [ ] El user_id se guarda en appointments
- [ ] El estado de conversación se mantiene
- [ ] Las citas se muestran en el dashboard
- [ ] Las variables de entorno están configuradas
- [ ] RLS policies están activas
- [ ] El bot responde consistentemente (sin respuestas aleatorias)

---

## 12. CONTROL DE CAMBIOS

Este documento es la BASE DEL SISTEMA. Cualquier cambio en el flujo o comportamiento del bot debe:

1. **Documentar el cambio aquí**
2. **Actualizar la versión** (ej: 1.1, 1.2)
3. **Crear un backup antes de implementar**
4. **Ejecutar todos los casos de prueba**
5. **Verificar que no rompa funcionalidad existente**

**Cambios que requieren nueva versión mayor (2.0, 3.0):**
- Agregar nuevos servicios
- Cambiar estructura de base de datos
- Modificar el flujo principal de agendamiento

**Cambios que requieren versión menor (1.1, 1.2):**
- Ajustar mensajes del bot
- Mejorar verificación de disponibilidad
- Agregar integraciones opcionales

---

## 13. VARIABLES DE ENTORNO REQUERIDAS

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# WhatsApp
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...

# OpenAI (opcional, para consultas generales)
OPENAI_API_KEY=...

# Google Calendar (opcional)
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
GOOGLE_CALENDAR_ACCESS_TOKEN=...
```

---

## 14. CONTACTO DE SOPORTE

Para reportar problemas o sugerir cambios, referirse a:
- Repositorio: github.com/sainornelas-cpu/Clinica-Ultrasonidos
- Tag base: v1.0.0-stable
- Documento: REQUISITOS_SISTEMA.md

---

**DOCUMENTO FINAL - VERSIÓN 1.0 - BASE DEL SISTEMA**