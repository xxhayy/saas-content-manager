import { readFileSync } from 'fs';

const env = readFileSync('.env', 'utf-8');
const lines = env.split('\n');
const keyLine = lines.find(line => line.startsWith('KIE_AI_API_KEY='));
if (!keyLine) {
  console.log('No KIE_AI_API_KEY found');
  process.exit();
}

let key = keyLine.split('=')[1].trim();
key = key.replace(/^["']|["']$/g, '');
if (key.startsWith('Bearer ')) {
  key = key.replace('Bearer ', '').trim();
}

console.log('Testing Key:', key.substring(0, 4) + '...' + key.length + ' chars');

fetch('https://api.kie.ai/api/v1/chat/credit', {
  headers: {
    'Authorization': `Bearer ${key}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('Result:', data);
  process.exit();
})
.catch(err => {
  console.error('Fetch Error:', err);
  process.exit();
});
