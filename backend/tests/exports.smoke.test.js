/**
 * Tests de fumée — chaîne d'exports (Lot audit sécurité)
 * Valide que les majs majeures (sharp 0.35, puppeteer-core 25) et les
 * librairies de génération (pdfkit, exceljs) fonctionnent réellement :
 *  - pdfkit    : génération d'un PDF en mémoire
 *  - exceljs   : génération d'un classeur Excel en mémoire
 *  - sharp     : traitement d'image (SVG -> PNG redimensionné)
 *  - puppeteer-core : module chargeable et API attendue présente
 */

describe('Chaîne d\'exports — smoke tests', () => {
  test('pdfkit génère un PDF valide en mémoire', () => {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ bufferPages: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.text('Test facture');
    doc.end();

    return new Promise(resolve => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        expect(buffer.length).toBeGreaterThan(0);
        // En-tête magique PDF
        expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
        resolve();
      });
    });
  });

  test('exceljs génère un classeur avec lignes', async () => {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Rapport');
    sheet.addRow(['Produit', 'Quantite', 'Prix']);
    sheet.addRow(['Test', 2, 1500]);
    const buffer = await workbook.xlsx.writeBuffer();
    expect(buffer.length).toBeGreaterThan(0);
    // Signature ZIP (xlsx = archive zip)
    const head = Buffer.from(buffer).subarray(0, 2).toString();
    expect(head).toBe('PK');
  });

  test('sharp traite une image (SVG -> PNG redimensionne)', async () => {
    const sharp = require('sharp');
    const svg = Buffer.from('<svg width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>');
    const output = await sharp(svg).resize(50, 50).png().toBuffer();
    expect(output.length).toBeGreaterThan(0);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(50);
    expect(meta.height).toBe(50);
  });

  test('puppeteer-core (ESM-first v25) est chargeable par un runtime Node recent', () => {
    // puppeteer-core v25 est ESM-first : le require() ne fonctionne qu'a
    // partir de Node 20.19+/22+. On verifie dans un vrai process Node
    // (le runtime CJS de Jest ne supporte pas l'ESM).
    const { execSync } = require('child_process');
    const sortie = execSync('node -e "const p = require(\'puppeteer-core\'); console.log(typeof p.launch)"', {
      cwd: __dirname + '/..',
      encoding: 'utf8',
    });
    expect(sortie.trim()).toBe('function');
  });
});