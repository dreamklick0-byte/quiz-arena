const fs = require('fs');
const path = require('path');
const dir = 'app/api/spin-wheel';
function fix(d) {
  fs.readdirSync(d).forEach(f => {
    const fp = path.join(d, f);
    if (fs.statSync(fp).isDirectory()) { fix(fp); return; }
    if (!fp.endsWith('.ts')) return;
    let c = fs.readFileSync(fp, 'utf8');
    if (c.includes('../../../lib/supabase')) {
      c = c.split('../../../lib/supabase').join('@/lib/supabase');
      fs.writeFileSync(fp, c);
      console.log('fixed:', fp);
    }
  });
}
fix(dir);
