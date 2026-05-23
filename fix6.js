const fs = require('fs');
let c = fs.readFileSync('app/battle/[roomCode]/results/resultsClient.tsx', 'utf8');
c = c.replace(
  "myPlayer?.score || 0,",
  "(myPlayer as any)?.score || 0,"
);
fs.writeFileSync('app/battle/[roomCode]/results/resultsClient.tsx', c);
console.log('done');
