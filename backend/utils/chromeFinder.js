/**
 * chromeFinder.js
 * Utilitaire partagé pour détecter le chemin de Chrome/Chromium
 * sur la machine hôte. Supporte :
 *   - Windows 64-bit (Program Files)
 *   - Windows 32-bit (Program Files (x86))
 *   - Linux (google-chrome, chromium-browser, chromium)
 *   - macOS (Google Chrome, Chromium)
 * 
 * La variable d'environnement CHROME_PATH permet d'overrider
 * tous les chemins automatiques.
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Liste ordonnée des chemins candidats selon l'OS.
 * La première entrée accessible est utilisée.
 */
const CHROME_CANDIDATES = [
  // Override via variable d'environnement (priorité absolue)
  ...(process.env.CHROME_PATH ? [process.env.CHROME_PATH] : []),

  // Windows 64-bit (installation par défaut depuis Chrome 64)
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',

  // Windows 32-bit (anciennes installations ou forçage 32-bit)
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',

  // Windows — Edge comme alternative (même moteur Chromium)
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',

  // Linux — Google Chrome
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',

  // Linux — Chromium
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/snap/bin/chromium',

  // macOS — Google Chrome
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',

  // macOS — Chromium
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

/**
 * Cherche le premier exécutable Chrome/Chromium accessible.
 * @returns {Promise<string>} Chemin vers l'exécutable trouvé.
 * @throws {Error} Si aucun navigateur n'est trouvé.
 */
async function findChromePath() {
  for (const candidate of CHROME_CANDIDATES) {
    if (!candidate) continue;
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Ce chemin n'existe pas, on essaie le suivant
    }
  }

  throw new Error(
    'Chrome/Chromium introuvable sur ce système.\n' +
    'Solutions :\n' +
    '  1. Installer Google Chrome (https://www.google.com/chrome/)\n' +
    '  2. Définir la variable d\'environnement CHROME_PATH avec le chemin exact\n' +
    `  Chemins testés :\n${CHROME_CANDIDATES.filter(Boolean).map(p => `    - ${p}`).join('\n')}`
  );
}

module.exports = { findChromePath };
