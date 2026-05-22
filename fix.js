const fs = require('fs');
let c = fs.readFileSync('app/spin/page.tsx', 'utf8');
c = c.replace('"use client";\n "react";', '"use client";\nimport { useEffect, useRef, useState, useCallback } from "react";');
fs.writeFileSync('app/spin/page.tsx', c);
console.log('spin fixed:', c.substring(0, 80));
