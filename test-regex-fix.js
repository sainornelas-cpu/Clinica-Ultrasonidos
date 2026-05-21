// Test del nuevo regex
const testCases = [
  {
    input: 'booking_data_service:{"name":"Ultrasonido Ginecológico","price":"$1,200","duration":45}',
    expectedKey: 'service',
    expectedValue: '{"name":"Ultrasonido Ginecológico","price":"$1,200","duration":45}'
  },
  {
    input: 'booking_data_name:María González',
    expectedKey: 'name',
    expectedValue: 'María González'
  },
  {
    input: 'booking_data_date:2024-05-25T10:00:00',
    expectedKey: 'date',
    expectedValue: '2024-05-25T10:00:00'
  }
]

console.log('='.repeat(70))
console.log('TEST REGEX FIX')
console.log('='.repeat(70))

// Old regex (greedy)
const oldRegex = /booking_data_(.+):(.+)/

console.log('\n🔴 OLD REGEX (greedy):')
testCases.forEach((test, i) => {
  const match = test.input.match(oldRegex)
  if (match) {
    const pass = match[1] === test.expectedKey && match[2] === test.expectedValue
    console.log(`${pass ? '✅' : '❌'} Test ${i + 1}:`)
    console.log(`   Key: "${match[1]}" ${match[1] === test.expectedKey ? '✓' : '✗'}`)
    console.log(`   Value: "${match[2]}" ${match[2] === test.expectedValue ? '✓' : '✗'}`)
  }
})

// New regex (non-greedy)
const newRegex = /^booking_data_(.+?):(.+)$/s

console.log('\n🟢 NEW REGEX (non-greedy):')
testCases.forEach((test, i) => {
  const match = test.input.match(newRegex)
  if (match) {
    const pass = match[1] === test.expectedKey && match[2] === test.expectedValue
    console.log(`${pass ? '✅' : '❌'} Test ${i + 1}:`)
    console.log(`   Key: "${match[1]}" ${match[1] === test.expectedKey ? '✓' : '✗'}`)
    console.log(`   Value: "${match[2]}" ${match[2] === test.expectedValue ? '✓' : '✗'}`)
  }
})

console.log('\n' + '='.repeat(70))