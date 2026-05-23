const fs = require('fs');
let c = fs.readFileSync('app/battle/[roomCode]/results/resultsClient.tsx', 'utf8');
const lines = c.split('\n');
// Line 521 (index 520) is "Back to Home" - insert </Link> after it
lines.splice(521, 0, '          </Link>');
fs.writeFileSync('app/battle/[roomCode]/results/resultsClient.tsx', lines.join('\n'));
console.log('lines around fix:');
console.log(lines.slice(518, 528).join('\n'));
