// services/import.service.js
const db = require('../models');
const ExcelJS = require('exceljs');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ImportService {
  
  constructor() {
    this.ordreImport = [
      'structures',
      'magasins',
      'categories',
      'clients',
      'fournisseurs',
      'produits',
      'stocks',
      'bons',
      'paiements',
      'factures'
    ];
  }

  /**
   * Point d'entrée principal pour l'import
   */
  async importerFichier(filePath, typeImport, code_structure, userId, options = {}) {
    const transaction = await db.sequelize.transaction();
    const results = {
      success: true,
      total: 0,
      importes: 0,
      // erreurs est un tableau d'objets { ligne, message }
      // Le contrôleur expose erreurs.length au frontend via la clé "nombreErreurs"
      erreurs: [],
      details: {}
    };

    try {
      // Parser le fichier
      let data = await this.parserFichier(filePath, options.hasHeader !== false);

      // Appliquer le mapping utilisateur si fourni
      // Le mapping est de la forme { "Colonne du fichier": "champ_interne" }
      // Ex: { "Nom client": "nomComplet", "Tel": "telephone" }
      if (options.mapping && Object.keys(options.mapping).length > 0) {
        data = this.appliquerMapping(data, options.mapping);
      }

      results.total = data.length;
      
      // Sélectionner la méthode d'import selon le type
      switch (typeImport) {
        case 'structures':
          results.details = await this.importerStructures(data, transaction);
          break;
        case 'magasins':
          results.details = await this.importerMagasins(data, code_structure, transaction);
          break;
        case 'clients':
          results.details = await this.importerClients(data, code_structure, transaction, options);
          break;
        case 'fournisseurs':
          results.details = await this.importerFournisseurs(data, code_structure, transaction, options);
          break;
        case 'categories':
          results.details = await this.importerCategories(data, code_structure, transaction);
          break;
        case 'produits':
          results.details = await this.importerProduits(data, code_structure, userId, transaction, options);
          break;
        case 'stocks':
          results.details = await this.importerStocks(data, code_structure, transaction);
          break;
        default:
          // Ce cas ne devrait jamais être atteint car le contrôleur valide typeImport
          // avant d'appeler importerFichier. On lève quand même une erreur défensive.
          throw new Error(`Type d'import non reconnu: ${typeImport}`);
      }
      
      await transaction.commit();
      
      // Enregistrer le log
      await this.enregistrerLog(code_structure, typeImport, results, userId, path.basename(filePath));
      
      return results;
      
    } catch (error) {
      await transaction.rollback();
      results.success = false;
      results.erreurs.push({ message: error.message, stack: error.stack });
      throw error;
    } finally {
      // Nettoyer le fichier temporaire
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  /**
   * Parser CSV, Excel ou JSON
   */
  async parserFichier(filePath, hasHeader = true) {
    const extension = path.extname(filePath).toLowerCase();
    
    if (extension === '.csv') {
      return await this.parseCSV(filePath, hasHeader);
    } else if (extension === '.xlsx' || extension === '.xls') {
      return await this.parseExcel(filePath, hasHeader);
    } else if (extension === '.json') {
      return this.parseJSON(filePath);
    } else {
      throw new Error('Format non supporté. Utilisez CSV, Excel ou JSON');
    }
  }
  
  /**
   * Détecte le séparateur d'un fichier CSV en lisant ses premiers octets.
   * Compte les occurrences de ',' et ';' sur la première ligne non vide
   * et retourne le plus fréquent. Défaut : ','.
   */
  detecterSeparateurCSV(filePath) {
    try {
      // Lire les 2 premiers Ko — largement suffisant pour une première ligne
      const buffer = Buffer.alloc(2048);
      const fd = fs.openSync(filePath, 'r');
      const bytesRead = fs.readSync(fd, buffer, 0, 2048, 0);
      fs.closeSync(fd);

      const extrait = buffer.slice(0, bytesRead).toString('utf8');
      // Prendre uniquement la première ligne non vide
      const premiereLigne = extrait.split(/\r?\n/).find(l => l.trim().length > 0) || '';

      const nbVirgules  = (premiereLigne.match(/,/g)  || []).length;
      const nbPointVirgules = (premiereLigne.match(/;/g) || []).length;

      return nbPointVirgules > nbVirgules ? ';' : ',';
    } catch {
      return ','; // Valeur par défaut sûre
    }
  }

  parseCSV(filePath, hasHeader) {
    const separator = this.detecterSeparateurCSV(filePath);
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv({ separator, headers: hasHeader }))
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }
  
  /**
   * Parse Excel avec ExcelJS
   */
  async parseExcel(filePath, hasHeader = true) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Aucune feuille trouvée dans le fichier Excel');
    }
    
    const rows = [];
    const rowCount = worksheet.rowCount;
    
    // Récupérer les en-têtes (première ligne)
    let headers = [];
    if (hasHeader) {
      const headerRow = worksheet.getRow(1);
      headers = headerRow.values.slice(1).map(v => v ? String(v).trim() : `col_${Date.now()}`);
    }
    
    // Commencer à partir de la ligne 2 si en-têtes, sinon ligne 1
    const startRow = hasHeader ? 2 : 1;
    
    for (let i = startRow; i <= rowCount; i++) {
      const row = worksheet.getRow(i);
      const rowValues = row.values.slice(1);
      
      // Vérifier si la ligne est vide
      const isEmpty = rowValues.every(cell => cell === undefined || cell === null || cell === '');
      if (isEmpty) continue;
      
      if (hasHeader && headers.length > 0) {
        // Créer un objet avec les en-têtes comme clés
        const rowObj = {};
        headers.forEach((header, idx) => {
          let value = rowValues[idx];
          // Convertir les dates en string si nécessaire
          if (value instanceof Date) {
            value = value.toISOString().split('T')[0];
          }
          rowObj[header] = value !== undefined && value !== null ? value : '';
        });
        rows.push(rowObj);
      } else {
        // Sans en-têtes, utiliser des indices
        const rowObj = {};
        rowValues.forEach((value, idx) => {
          rowObj[`col_${idx}`] = value !== undefined && value !== null ? value : '';
        });
        rows.push(rowObj);
      }
    }
    
    return rows;
  }
  
  parseJSON(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }

  // ==================== MÉTHODES D'IMPORT ====================

  /**
   * Importer des structures
   */
  async importerStructures(data, transaction) {
    const resultats = { importes: 0, erreurs: 0, details: [] };
    
    for (const [index, row] of data.entries()) {
      try {
        const structureData = {
          nom_structure: row.nom_structure || row.nom || row.Nom,
          code_structure: row.code_structure || row.code || this.generateCodeStructure(row.nom_structure || row.nom || row.Nom || 'STRUCT'),
          email: row.email,
          telephone: row.telephone,
          adresse: row.adresse,
          numero_identification_fiscale: row.nineau || row.ninea,
          registre_commerce: row.registre_commerce,
          devise: row.devise || 'FCFA',
          type_structure: row.type_structure || 'entreprise',
          estActive: true
        };
        
        const [structure, created] = await db.Structure.findOrCreate({
          where: { code_structure: structureData.code_structure },
          defaults: structureData,
          transaction
        });
        
        resultats.importes++;
        resultats.details.push({ ligne: index + 2, type: created ? 'cree' : 'existant', id: structure.id });
      } catch (error) {
        resultats.erreurs++;
        resultats.details.push({ ligne: index + 2, type: 'erreur', message: error.message });
      }
    }
    
    return resultats;
  }

  /**
   * Importer des magasins
   */
  async importerMagasins(data, code_structure, transaction) {
    const resultats = { importes: 0, erreurs: 0, details: [] };
    
    for (const [index, row] of data.entries()) {
      try {
        const magasinData = {
          code_structure,
          nom: row.nom || row.Nom || row.name,
          adresse: row.adresse,
          ville: row.ville,
          telephone: row.telephone,
          email: row.email,
          statut: 'Actif'
        };
        
        const magasin = await db.Magasin.create(magasinData, { transaction });
        resultats.importes++;
        resultats.details.push({ ligne: index + 2, type: 'cree', id: magasin.id });
      } catch (error) {
        resultats.erreurs++;
        resultats.details.push({ ligne: index + 2, type: 'erreur', message: error.message });
      }
    }
    
    return resultats;
  }

  /**
   * Importer des clients
   */
  async importerClients(data, code_structure, transaction, options = {}) {
    const resultats = { importes: 0, erreurs: 0, details: [] };
    
    for (const [index, row] of data.entries()) {
      try {
        const telephone = row.telephone || row.Telephone || row.tel || row.TEL;
        if (!telephone && !row.email) {
          throw new Error('Téléphone ou email requis');
        }
        
        const clientData = {
          code_structure,
          nomComplet: row.nomComplet || row.nom || row.Nom || row.name || row.Name,
          telephone: telephone?.toString(),
          email: row.email || row.Email,
          adresse: row.adresse || row.Adresse || '',
          plafond: parseFloat(row.plafond) || 0,
          estEmploye: row.estEmploye === 'oui' || row.estEmploye === true,
          statut: row.statut !== 'inactif',
          solde_total: parseFloat(row.solde) || 0
        };
        
        let client;
        
        if (options.updateExisting) {
          // Chercher par téléphone ou email
          const where = { code_structure };
          if (telephone) where.telephone = telephone;
          if (row.email) where.email = row.email;
          
          const existant = await db.Client.findOne({ where, transaction });
          if (existant) {
            client = await existant.update(clientData, { transaction });
            resultats.details.push({ ligne: index + 2, type: 'mis_a_jour', id: client.id });
          } else {
            client = await db.Client.create(clientData, { transaction });
            resultats.details.push({ ligne: index + 2, type: 'cree', id: client.id });
          }
        } else {
          client = await db.Client.create(clientData, { transaction });
          resultats.details.push({ ligne: index + 2, type: 'cree', id: client.id });
        }
        
        resultats.importes++;
        
        // Associer aux magasins si spécifiés
        if (row.magasinIds) {
          const magasinIds = row.magasinIds.split(',').map(Number);
          for (const magId of magasinIds) {
            await db.MagasinClient.create({
              clientId: client.id,
              magasinId: magId,
              solde: 0
            }, { transaction });
          }
        }
      } catch (error) {
        resultats.erreurs++;
        resultats.details.push({ ligne: index + 2, type: 'erreur', message: error.message });
      }
    }
    
    return resultats;
  }

  /**
   * Importer des fournisseurs
   */
  async importerFournisseurs(data, code_structure, transaction, options = {}) {
    const resultats = { importes: 0, erreurs: 0, details: [] };
    
    for (const [index, row] of data.entries()) {
      try {
        const telephone = row.telephone || row.Telephone || row.tel;
        
        const fournisseurData = {
          code_structure,
          nomComplet: row.nomComplet || row.nom || row.Nom || row.name,
          telephone: telephone?.toString(),
          email: row.email,
          adresse: row.adresse || '',
          banque: row.banque,
          numeroCompte: row.numeroCompte,
          montantAPayer: parseFloat(row.montantAPayer) || 0,
          statut: row.statut !== 'inactif'
        };
        
        let fournisseur;
        
        if (options.updateExisting && telephone) {
          const existant = await db.Fournisseur.findOne({
            where: { code_structure, telephone },
            transaction
          });
          if (existant) {
            fournisseur = await existant.update(fournisseurData, { transaction });
            resultats.details.push({ ligne: index + 2, type: 'mis_a_jour', id: fournisseur.id });
          } else {
            fournisseur = await db.Fournisseur.create(fournisseurData, { transaction });
            resultats.details.push({ ligne: index + 2, type: 'cree', id: fournisseur.id });
          }
        } else {
          fournisseur = await db.Fournisseur.create(fournisseurData, { transaction });
          resultats.details.push({ ligne: index + 2, type: 'cree', id: fournisseur.id });
        }
        
        resultats.importes++;
      } catch (error) {
        resultats.erreurs++;
        resultats.details.push({ ligne: index + 2, type: 'erreur', message: error.message });
      }
    }
    
    return resultats;
  }

  /**
   * Importer des catégories de produits
   */
  async importerCategories(data, code_structure, transaction) {
    const resultats = { importes: 0, erreurs: 0, details: [] };
    
    for (const [index, row] of data.entries()) {
      try {
        const categorieData = {
          code_structure,
          nom: row.nom || row.Nom || row.name || row.categorie,
          description: row.description,
          statut: true
        };
        
        const [categorie, created] = await db.CategoriesProduits.findOrCreate({
          where: { code_structure, nom: categorieData.nom },
          defaults: categorieData,
          transaction
        });
        
        resultats.importes++;
        resultats.details.push({ 
          ligne: index + 2, 
          type: created ? 'cree' : 'existant', 
          id: categorie.id,
          nom: categorie.nom
        });
      } catch (error) {
        resultats.erreurs++;
        resultats.details.push({ ligne: index + 2, type: 'erreur', message: error.message });
      }
    }
    
    return resultats;
  }

  /**
   * Importer des produits
   */
  async importerProduits(data, code_structure, userId, transaction, options = {}) {
    const resultats = { importes: 0, erreurs: 0, details: [] };
    
    // Précharger les catégories pour mapping
    const categories = await db.CategoriesProduits.findAll({
      where: { code_structure },
      transaction
    });
    const categorieMap = new Map();
    categories.forEach(c => categorieMap.set(c.nom.toLowerCase(), c.id));
    
    for (const [index, row] of data.entries()) {
      try {
        const reference = row.reference || row.Ref || row.code || `REF-${Date.now()}-${index}`;
        const designation = row.designation || row.nom || row.Nom || row.name || row.produit;
        
        if (!designation) {
          throw new Error('Désignation requise');
        }
        
        // Trouver ou créer la catégorie
        let categorieId = null;
        const categorieNom = row.categorie || row.Categorie;
        if (categorieNom) {
          const existingId = categorieMap.get(categorieNom.toLowerCase());
          if (existingId) {
            categorieId = existingId;
          } else {
            const newCategorie = await db.CategoriesProduits.create({
              code_structure,
              nom: categorieNom,
              statut: true
            }, { transaction });
            categorieId = newCategorie.id;
            categorieMap.set(categorieNom.toLowerCase(), categorieId);
          }
        }
        
        const produitData = {
          code_structure,
          designation,
          reference,
          code_barre: row.codeBarre || row.code_barre,
          categorieId,
          agentId: userId,
          unite: row.unite || row.unité || 'pièce',
          prixAchatUnitaire: parseFloat(row.prix_achat) || 0,
          prixVenteUnitaire: parseFloat(row.prix_vente || row.prix) || 0,
          tauxTVA: parseFloat(row.tva) || 0,
          description: row.description,
          statut: true
        };
        
        let produit;
        const existant = await db.Produit.findOne({
          where: { code_structure, reference },
          transaction
        });
        
        if (existant && options.updateExisting) {
          produit = await existant.update(produitData, { transaction });
          resultats.details.push({ ligne: index + 2, type: 'mis_a_jour', id: produit.id });
        } else {
          produit = await db.Produit.create(produitData, { transaction });
          resultats.details.push({ ligne: index + 2, type: 'cree', id: produit.id });
        }
        
        resultats.importes++;
      } catch (error) {
        resultats.erreurs++;
        resultats.details.push({ ligne: index + 2, type: 'erreur', message: error.message });
      }
    }
    
    return resultats;
  }

  /**
   * Importer des stocks
   */
  async importerStocks(data, code_structure, transaction) {
    const resultats = { importes: 0, erreurs: 0, details: [] };
    
    // Précharger les produits pour mapping
    const produits = await db.Produit.findAll({
      where: { code_structure },
      transaction
    });
    const produitMap = new Map();
    produits.forEach(p => produitMap.set(p.reference, p.id));
    produitMap.forEach((id, ref) => produitMap.set(ref.toLowerCase(), id));
    
    const magasins = await db.Magasin.findAll({
      where: { code_structure },
      transaction
    });
    const magasinMap = new Map();
    magasins.forEach(m => magasinMap.set(m.nom.toLowerCase(), m.id));
    
    for (const [index, row] of data.entries()) {
      try {
        const reference = row.reference || row.Ref || row.code;
        const nomMagasin = row.magasin || row.Magasin;
        
        const produitId = produitMap.get(reference?.toLowerCase());
        if (!produitId) {
          throw new Error(`Produit non trouvé: ${reference}`);
        }
        
        let magasinId = null;
        if (nomMagasin) {
          magasinId = magasinMap.get(nomMagasin.toLowerCase());
          if (!magasinId) {
            throw new Error(`Magasin non trouvé: ${nomMagasin}`);
          }
        }
        
        const stockData = {
          code_structure,
          produitId,
          magasinId,
          quantiteTotale: parseFloat(row.quantite || row.stock || 0),
          quantiteReservee: 0,
          seuilAlerte: parseFloat(row.seuil_alerte) || 5,
          prixVenteUnitaire: parseFloat(row.prix_vente) || 0,
          statutStock: 'En stock'
        };
        
        const [stock, created] = await db.Stock.findOrCreate({
          where: { code_structure, produitId, magasinId: magasinId || null },
          defaults: stockData,
          transaction
        });
        
        if (!created) {
          await stock.update({ quantiteTotale: stockData.quantiteTotale }, { transaction });
        }
        
        resultats.importes++;
        resultats.details.push({ ligne: index + 2, type: created ? 'cree' : 'mis_a_jour', id: stock.id });
      } catch (error) {
        resultats.erreurs++;
        resultats.details.push({ ligne: index + 2, type: 'erreur', message: error.message });
      }
    }
    
    return resultats;
  }

  // ==================== UTILITAIRES ====================

  /**
   * Applique le mapping utilisateur sur toutes les lignes parsées.
   *
   * Le mapping est { "Colonne fichier" : "champ_interne" }.
   * Exemple : { "Nom client": "nomComplet", "Tel": "telephone" }
   *
   * Pour chaque ligne, les clés présentes dans le mapping sont renommées
   * vers leur champ interne. Les clés sans mapping sont conservées telles
   * quelles (elles seront peut-être reconnues par les alias hardcodés).
   * Les colonnes mappées vers la valeur vide "" sont ignorées (colonne exclue).
   *
   * @param {Object[]} data  - Tableau de lignes (objets clé→valeur)
   * @param {Object}   mapping - Map { colonneSource: champCible }
   * @returns {Object[]} Tableau de lignes avec clés renommées
   */
  appliquerMapping(data, mapping) {
    return data.map(row => {
      const nouvelleRow = {};

      for (const [cle, valeur] of Object.entries(row)) {
        const champCible = mapping[cle];

        if (champCible === undefined) {
          // Clé non mentionnée dans le mapping → on la garde telle quelle
          nouvelleRow[cle] = valeur;
        } else if (champCible === '' || champCible === null) {
          // Colonne explicitement ignorée → on ne l'ajoute pas
        } else {
          // Renommer vers le champ interne attendu par les méthodes d'import
          nouvelleRow[champCible] = valeur;
        }
      }

      return nouvelleRow;
    });
  }

  generateCodeStructure(nom) {
    const cleanName = nom
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6);

    const uniquePart = crypto
        .createHash('sha256')
        .update(`${nom}-${Date.now()}-${Math.random()}`)
        .digest('hex')
        .substring(0, 8)
        .toUpperCase();

    return `${cleanName}-${uniquePart}`;
    }

    async safeGenerateCodeStructure(nom, Structure, transaction) {
    let code;
    let exists = true;

    while (exists) {
        code = this.generateCodeStructure(nom);

        const found = await Structure.findOne({
        where: { code_structure: code },
        transaction
        });

        exists = !!found;
    }

    return code;
    }

  /**
   * Enregistrer le log d'import
   */
  async enregistrerLog(code_structure, typeImport, results, userId, fileName) {
    try {
      // Créer un log dans la table HistoriqueActionsUtilisateur
      await db.HistoriqueActionsUtilisateur.create({
        userId,
        action: `Import ${typeImport} - ${fileName}`,
        ip: null,
        details: {
          type: typeImport,
          total: results.total,
          importes: results.importes,
          erreurs: results.erreurs,
          date: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Erreur enregistrement log:', error);
    }
  }

  /**
   * Détecter la structure d'un fichier
   */
  detecterStructure(entetes) {
  const mapping = {
    clients: {
      nomComplet: ['nom', 'name', 'client', 'fullname', 'nom complet'],
      telephone: ['tel', 'phone', 'téléphone', 'mobile'],
      email: ['mail', 'email', 'courriel'],
      adresse: ['address', 'adresse', 'lieu'],
      plafond: ['plafond', 'limit', 'credit']
    },
    produits: {
      designation: ['nom', 'name', 'designation', 'produit'],
      reference: ['ref', 'reference', 'code', 'sku'],
      prix_achat: ['prix achat', 'cost', 'purchase'],
      prix_vente: ['prix vente', 'price', 'selling'],
      quantite: ['stock', 'quantity', 'qty', 'quantité']
    }
  };
  
  // Utiliser les entetes pour la détection automatique
  const champsTrouves = {};
  for (const entete of entetes) {
    const enteteLower = entete.toLowerCase();
    for (const [,champs] of Object.entries(mapping)) {
      for (const [champ, synonymes] of Object.entries(champs)) {
        if (synonymes.some(syn => enteteLower.includes(syn))) {
          champsTrouves[entete] = champ;
          break;
        }
      }
    }
  }
  
  return { mapping: champsTrouves, nonMappes: entetes.filter(e => !champsTrouves[e]) };
}

  /**
   * Nettoyer une valeur numérique
   */
  nettoyerNombre(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    const cleaned = String(value).replace(/[^\d,.-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
}

module.exports = new ImportService();