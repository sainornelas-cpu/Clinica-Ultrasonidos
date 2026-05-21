# Backup v1.0.0-stable

**Fecha:** 2026-05-21
**Estado:** Producción funcionando
**Deploy:** https://clinica-ultrasonidos.vercel.app

## Cambios desde versión anterior

### Correcciones
- Estado de conversación ahora se lee de tabla `users` (autoridad)
- `isFirstMessage` determinado por existencia de logs
- Prioridad corregida: flujo booking > menú > OpenAI
- Regex non-greedy para `booking_data` JSON parsing

### Limpieza
- Eliminados 25+ archivos de prueba/test
- Eliminadas rutas `/api/debug`, `/api/test-*`
- Código sin logs agresivos
- Constantes centralizadas en `src/lib/constants/services.ts`

## Flujo de agendamiento (verificado)

1. Usuario envía cualquier mensaje → Bienvenida + Menú
2. "1" → Inicia flujo `booking_name`
3. Nombre → Guarda nombre, estado `booking_service`
4. "1-5" → Guarda servicio, estado `booking_date`
5. Fecha → Crea cita, estado `idle`

## Comandos para Restaurar

```bash
# Ver tags disponibles
git tag

# Restaurar a esta versión
git checkout v1.0.0-stable

# Ver requisitos del sistema
cat REQUISITOS_SISTEMA.md

# Ver diagrama de flujo
cat FLUJO_BOT.md

# Ver cambios entre versiones
git diff v1.0.0-stable..main

# Crear nueva rama desde backup
git checkout -b feature/nueva v1.0.0-stable
```

## Estructura del proyecto

```
clinic-whatsapp-bot/
├── src/app/api/
│   ├── webhook/          # WhatsApp webhook
│   ├── appointments/     # API de citas
│   └── jobs/reminders/   # Recordatorios
├── src/lib/
│   ├── constants/
│   │   ├── conversation-states.ts
│   │   └── services.ts   # Servicios, clínica, precios
│   ├── calendar/
│   └── supabase/
└── .env.local            # Variables de entorno
```

## Próximas mejoras sugeridas

### BASE DEL SISTEMA (v1.1.0)
⚠️ **IMPORTANTE**: Antes de implementar cualquier mejora, revisar `REQUISITOS_SISTEMA.md`

Documentos base:
- `REQUISITOS_SISTEMA.md` - Requisitos completos, reglas de negocio, estructura DB
- `FLUJO_BOT.md` - Diagrama de flujo visual, pseudocódigo de referencia

Versiones disponibles:
- `v1.0.0-stable` - Bot agendando correctamente
- `v1.1.0-base-sistema` - Documentación base + requisitos

Mejoras pendientes según requisitos:
- [ ] Validar fechas reales (no default mañana) - REQUISITOS_SISTEMA.md §6.2
- [ ] Verificar disponibilidad en calendario - REQUISITOS_SISTEMA.md §6
- [ ] Respuesta post-confirmación con menú - REQUISITOS_SISTEMA.md §3.5
- [ ] Integración con Google Calendar (opcional)
- [ ] Cancelación/reagendamiento completo
- [ ] Soporte para imágenes (opcional)