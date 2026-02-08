const fs = require('fs-extra');
const path = require('path');

// Fonction utilitaire pour écrire dans un fichier
const writeLog = async (level, message, additional) => {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const logDir = path.join(__dirname, '../logs'); // dossier logs
  await fs.ensureDir(logDir); // créer le dossier si inexistant

  const logFile = path.join(logDir, `log-${dateStr}.txt`);
  let logEntry = `[${date.toISOString()}] [${level}] ${message}`;

  if (additional) {
    logEntry += ` | Données: ${JSON.stringify(additional)}`;
  }

  logEntry += '\n';

  await fs.appendFile(logFile, logEntry, 'utf8');
  
  // Retourner des informations sur le log écrit
  return {
    filePath: logFile,
    date: dateStr,
    entry: logEntry.trim()
  };
};

// Lire les logs d'une date spécifique
const readLogsByDate = async (dateStr) => {
  try {
    const logDir = path.join(__dirname, '../logs');
    const logFile = path.join(logDir, `log-${dateStr}.txt`);
    
    // Vérifier si le fichier existe
    const exists = await fs.pathExists(logFile);
    if (!exists) {
      return [];
    }
    
    const content = await fs.readFile(logFile, 'utf8');
    const logs = content.split('\n').filter(line => line.trim() !== '');
    
    return logs.map(log => {
      // Parsing basique des logs
      const match = log.match(/\[(.*?)\] \[(.*?)\] (.*?)(?:\s*\|\s*Données:\s*(.*))?$/);
      if (match) {
        return {
          timestamp: match[1],
          level: match[2],
          message: match[3].trim(),
          additional: match[4] ? JSON.parse(match[4]) : null
        };
      }
      return { raw: log };
    });
  } catch (error) {
    throw new Error(`Erreur lors de la lecture des logs: ${error.message}`);
  }
};

// Lister tous les fichiers de logs disponibles
const listLogFiles = async () => {
  try {
    const logDir = path.join(__dirname, '../logs');
    await fs.ensureDir(logDir);
    
    const files = await fs.readdir(logDir);
    const logFiles = files.filter(file => file.startsWith('log-') && file.endsWith('.txt'));
    
    return logFiles.map(file => {
      const dateStr = file.replace('log-', '').replace('.txt', '');
      return {
        fileName: file,
        date: dateStr,
        filePath: path.join(logDir, file)
      };
    });
  } catch (error) {
    throw new Error(`Erreur lors de la liste des fichiers: ${error.message}`);
  }
};

module.exports = {
  writeLog,
  readLogsByDate,
  listLogFiles
};