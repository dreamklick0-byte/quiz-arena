const fs = require('fs');
let c = fs.readFileSync('app/battle/[roomCode]/results/resultsClient.tsx', 'utf8');
c = c.replace(
  '            Back to Home\n        </footer>',
  '            Back to Home\n          </Link>\n        </footer>'
);
fs.writeFileSync('app/battle/[roomCode]/results/resultsClient.tsx', c);
console.log('done');
