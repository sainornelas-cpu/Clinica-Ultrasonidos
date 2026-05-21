/**
 * Test real del webhook con el flujo corregido
 */

const BASE_URL = 'http://localhost:3000';
const TEST_PHONE = '+5210000000000';

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

  return { ok: response.ok, status: response.status };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('\n' + '█'.repeat(60));
  log('TEST REAL DE WEBHOOK - FLUJO CORREGIDO', 'cyan');
  console.log('█'.repeat(60));

  const scenarios = [
    { name: 'Primer mensaje', msg: 'Hola' },
    { name: 'Seleccionar agendar', msg: '1' },
    { name: 'Enviar nombre', msg: 'Carlos Ruiz' },
    { name: 'Seleccionar servicio 1', msg: '1' },
    { name: 'Enviar fecha futura', msg: 'Pasado mañana a las 11am' },
    { name: 'Después de confirmación: ver precios', msg: '2' },
    { name: 'Volver al menú', msg: 'menu' },
    { name: 'Ver mis citas', msg: '6' },
  ];

  for (const scenario of scenarios) {
    section(scenario.name);
    log(`→ Enviando: "${scenario.msg}"`, 'blue');

    const result = await sendMessage(scenario.msg);
    await sleep(1000);

    if (result.ok) {
      log('✅ Mensaje enviado (200 OK)', 'green');
    } else {
      log(`❌ Error: ${result.status}`, 'red');
    }
  }

  section('RESUMEN');
  log('✅ Test completado - Verificar logs del servidor', 'green');
}

log('Iniciando en 5 segundos...', 'yellow');
setTimeout(runTest, 5000);