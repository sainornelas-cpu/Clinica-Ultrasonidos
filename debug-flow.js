/**
 * Test aislado del flujo para detectar bugs
 */

// Simular la lógica de prioridades
const CONVERSATION_STATES = {
  IDLE: 'idle',
  BOOKING_NAME: 'booking_name',
  BOOKING_SERVICE: 'booking_service',
  BOOKING_DATE: 'booking_date'
};

function isMenuOption(message) {
  return ['1', '2', '3', '4', '5', '6'].includes(message.trim());
}

function isGeneralCommand(message) {
  const lower = message.toLowerCase();
  return lower.includes('mis citas') || lower.includes('cancelar') || lower.includes('reagendar');
}

function simulateFlow() {
  console.log('\n=== SIMULACIÓN DE FLUJO ===\n');

  let state = CONVERSATION_STATES.IDLE;
  let isFirstMessage = true;
  let userName = null;

  const messages = [
    'Hola',           // Primer mensaje - debe mostrar menú
    '1',              // Agendar - debe ir a BOOKING_NAME
    'Juan',           // Nombre - debe ir a BOOKING_SERVICE
    '1',              // Servicio - debe ir a BOOKING_DATE
    'Mañana 10am',    // Fecha - debe crear cita y volver a IDLE
    '2',              // Después de confirmación - debe mostrar precios
    'menu',           // Debe mostrar menú principal
    '6',              // Debe mostrar citas
  ];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const lower = message.toLowerCase().trim();
    console.log(`\n--- Mensaje ${i + 1}: "${message}"`);
    console.log(`Estado actual: ${state}`);
    console.log(`isFirstMessage: ${isFirstMessage}`);

    let response = '';

    // Prioridad 1: Flujo booking activo
    if (state === CONVERSATION_STATES.BOOKING_NAME ||
        state === CONVERSATION_STATES.BOOKING_SERVICE ||
        state === CONVERSATION_STATES.BOOKING_DATE) {
      console.log('→ PRIORIDAD 1: Flujo booking activo');

      // Bug detectado: Aquí debería verificar comandos de salida
      // pero en el código actual hay un bug en getWelcomeMessage sin parámetro

      if (state === CONVERSATION_STATES.BOOKING_NAME) {
        userName = message;
        state = CONVERSATION_STATES.BOOKING_SERVICE;
        response = '✅ Nombre registrado. Selecciona servicio (1-5)';
      } else if (state === CONVERSATION_STATES.BOOKING_SERVICE) {
        if (isMenuOption(message)) {
          state = CONVERSATION_STATES.IDLE;
          response = `Menú: ${message}`;
        } else {
          state = CONVERSATION_STATES.BOOKING_DATE;
          response = '✅ Servicio seleccionado. Indica fecha y hora';
        }
      } else if (state === CONVERSATION_STATES.BOOKING_DATE) {
        state = CONVERSATION_STATES.IDLE;
        response = '✅ Cita confirmada. ¿Algo más? (1-3)';
      }
    }
    // Prioridad 2: Primer mensaje
    else if (isFirstMessage) {
      console.log('→ PRIORIDAD 2: Primer mensaje');
      isFirstMessage = false;
      response = `Hola ${userName || 'buenos días'}, bienvenido. Menú: 1-6`;
    }
    // Prioridad 3: Usuario quiere agendar
    else if (lower.includes('agendar') && state === CONVERSATION_STATES.IDLE) {
      console.log('→ PRIORIDAD 3: Quiere agendar');
      state = CONVERSATION_STATES.BOOKING_NAME;
      response = 'Escribe tu nombre';
    }
    // Prioridad 4: Opciones del menú
    else if (isMenuOption(message)) {
      console.log('→ PRIORIDAD 4: Opción de menú');
      response = `Opción ${message} procesada`;
    }
    // Prioridad 5: Comandos generales
    else if (isGeneralCommand(message)) {
      console.log('→ PRIORIDAD 5: Comando general');
      response = `Comando: ${lower}`;
    }
    // Prioridad 6: Mensaje genérico en idle
    else if (state === CONVERSATION_STATES.IDLE) {
      console.log('→ PRIORIDAD 6: Mensaje genérico idle');
      response = `Hola ${userName || ''}, menú: 1-6`;
    }
    // Fallback
    else {
      console.log('→ FALLBACK: OpenAI');
      response = '¿En qué puedo ayudarte?';
    }

    console.log(`Estado nuevo: ${state}`);
    console.log(`Respuesta: ${response}\n`);
  }
}

simulateFlow();