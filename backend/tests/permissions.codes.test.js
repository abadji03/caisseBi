// tests/permissions.codes.test.js
//
// Garde-fou : chaque argument de requirePermission(...) dans les routers doit
// être un CODE de permission connu (constants/permissions.js). Empêche la
// régression "libellé tapé à la main" et les codes inexaminables en base.

const fs = require('fs');
const path = require('path');
const { PERMISSIONS } = require('../constants/permissions');

const ROUTERS_DIR = path.join(__dirname, '../routers');
const VALID_CODES = new Set(Object.values(PERMISSIONS));

function extractRequirePermissionArgs(source) {
  const args = [];
  const re = /requirePermission\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const stringRe = /'([^']*)'/g;
    let s;
    while ((s = stringRe.exec(m[1])) !== null) {
      args.push({ value: s[1], index: m.index });
    }
  }
  return args;
}

describe('Garde-fou codes de permission des routers', () => {
  const routerFiles = fs
    .readdirSync(ROUTERS_DIR)
    .filter(f => f.endsWith('.routes.js'));

  it('existe au moins un router à auditer', () => {
    expect(routerFiles.length).toBeGreaterThan(0);
  });

  for (const file of routerFiles) {
    test(`${file} : requirePermission n'utilise que des codes connus`, () => {
      const source = fs.readFileSync(path.join(ROUTERS_DIR, file), 'utf8');
      const args = extractRequirePermissionArgs(source);

      const invalid = args.filter(a => !VALID_CODES.has(a.value));
      expect(
        invalid.map(i => `${file}: '${i.value}'`)
      ).toEqual([]);
    });

    test(`${file} : les routes :code_structure sont protégées par requireStructureAccess`, () => {
      const source = fs.readFileSync(path.join(ROUTERS_DIR, file), 'utf8');
      if (!source.includes(':code_structure')) return;

      expect(source).toContain('requireStructureAccess');

      // Toute ligne de route ACTIVE avec :code_structure doit appeler
      // requireStructureAccess (les lignes commentées sont ignorées).
      const routeLines = source
        .split('\n')
        .filter(l => /router\.(get|post|put|delete|patch)\(/.test(l))
        .filter(l => !l.trim().startsWith('//'));
      const unprotected = routeLines.filter(
        l => l.includes(':code_structure') && !l.includes('requireStructureAccess')
      );
      expect(unprotected).toEqual([]);
    });
  }
});
