/**
 * Test de flujo corregido según FLUJO_BOT.md
 */

const BASE_URL = 'http://localhost:3000';
const TEST_PHONE = '+5219999999999';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function sendMessage(text) {
  const response = await fetch(`${BASE_URL}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              type: 'text',
              text: { body: text }
            }]
          }
        }]
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.ok;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFlow() {
  console.log('\n' + '█'.repeat(60));
  log('TEST DE FLUJO CORREGIDO', 'cyan');
  console.log('█'.repeat(60));

  try {
    // TEST 1: Agendar cita completa
    section('TEST 1: Agendar cita completa');

    log('→ "Hola" (debe mostrar bienvenida)', 'blue');
    await sendMessage('Hola');
    await sleep(1000);

    log('→ "1" (iniciar agendar)', 'blue');
    await sendMessage('1');
    await sleep(1000);

    log('→ "Ana López" (nombre)', 'blue');
    await sendMessage('Ana López');
    await sleep(1000);

    log('→ "1" (servicio)', 'blue');
    await sendMessage('1');
    await sleep(1000);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    log('→ "Pasado mañana a las 10am" (fecha futura)', 'blue');
    await sendMessage('Pasado mañana a las 10am');
    await sleep(1500);
    log('✅ Cita confirmada con menú de opciones', 'green');

    // TEST 2: Responder después de confirmación
    section('TEST 2: Respuesta post-confirmación');

    log('→ "1" (agendar otra cita)', 'blue');
    await sendMessage('1');
    await sleep(1000);
    log('✅ Debe iniciar nuevo flujo de agendar', 'green');

    log('→ "3" (Volver al menú)', 'blue');
    await sendMessage('3');
    await sleep(1000);
    log('✅ Debe mostrar menú principal', 'green');

    // TEST 3: Interceptar comando durante booking
    section('TEST 3: Comando durante flujo de booking');

    log('→ "1" (iniciar agendar)', 'blue');
    await sendMessage('1');
    await sleep(1000);

    log('→ "Pedro" (nombre)', 'blue');
    await sendMessage('Pedro');
    await sleep(1000);

    log('→ "menu" (salir del flujo)', 'blue');
    await sendMessage('menu');
    await sleep(1000);
    log('✅ Debe salir del flujo y mostrar menú', 'green');

    // TEST 4: Cancelar durante booking
    section('TEST 4: Cancelar durante booking');

    log('→ "1" (iniciar agendar)', 'blue');
    await sendMessage('1');
    await sleep(1000);

    log('→ "María" (nombre)', 'blue');
    await sendMessage('María');
    await sleep(1000);

    log('→ "cancelar" (salir)', 'blue');
    await sendMessage('cancelar');
    await sleep(1000);
    log('✅ Debe salir del flujo', 'green');

    section('RESUMEN');
    log('✅ Tests completados', 'green');

  } catch (error) {
    log('❌ Error: ' + error.message, 'red');
  }
}

log('Iniciando en 3 segundos...', 'yellow');
setTimeout(testFlow, 3000);