const fs = require('fs');
let c = fs.readFileSync('app/api/spin-wheel/claim/route.ts', 'utf8');
c = c.replace("from 'next/server';';", "from 'next/server';");
fs.writeFileSync('app/api/spin-wheel/claim/route.ts', c);
console.log('claim fixed');
