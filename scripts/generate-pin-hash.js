#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n=== PIN Hash Generator ===\n');
console.log('This will generate a bcrypt hash for your PIN.');
console.log('Use a 4-6 digit PIN (digits only).\n');

rl.question('Enter PIN: ', async (pin) => {
  if (!/^\d{4,6}$/.test(pin)) {
    console.error('\n❌ Error: PIN must be 4-6 digits.');
    process.exit(1);
  }

  console.log('\n⏳ Generating hash (this may take a moment)...\n');

  try {
    const hash = await bcrypt.hash(pin, 12);

    console.log('✅ Hash generated successfully!\n');
    console.log('Add this to your .env file:\n');
    console.log(`PIN_HASH=${hash}\n`);
    console.log('⚠️  Keep this secret and never commit it to git!\n');

    rl.close();
  } catch (error) {
    console.error('❌ Error generating hash:', error.message);
    process.exit(1);
  }
});

rl.on('close', () => {
  process.exit(0);
});
