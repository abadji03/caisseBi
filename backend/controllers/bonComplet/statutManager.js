/* const db = require('../../models');

class StatutManager {
  // PRÉPARER LES DONNÉES DU BON
  async preparerDonneesBon(bon, typeEntite, clientId, fournisseurId) {
    const bonData = { ...bon };
    
    if (typeEntite === 'client') {
      bonData.clientId = clientId;
      if (bon.type === 'retour') {
        bonData.statutBon = 'retourné';
        bonData.montantAvoir = bonData.montantTotal || 0;
      }
    } else if (typeEntite === 'fournisseur') {
      bonData.fournisseurId = fournisseurId;
    }

    // Calculs automatiques
    if (!bonData.netAPayer && bonData.montantTotal && bonData.remise) {
      bonData.netAPayer = bonData.montantTotal - (bonData.remise || 0);
    }
    
    if (!bonData.resteAPayer && bonData.netAPayer && bonData.avance) {
      bonData.resteAPayer = bonData.netAPayer - (bonData.avance || 0);
    }

    return bonData;
  }

  // METTRE À JOUR L'ENTITÉ (CLIENT/FOURNISSEUR)
  async mettreAJourEntite(bon, typeEntite, clientId, fournisseurId, transaction) {
    if (typeEntite === 'client' && clientId) {
      const client = await db.Client.findByPk(clientId, { transaction });
      if (client) {
        const nouveauSolde = (client.solde || 0) + bon.netAPayer;
        const nouveauMontantAPayer = (client.montantANousPayer || 0) + bon.resteAPayer;
        
        await client.update({
          solde: nouveauSolde,
          montantANousPayer: nouveauMontantAPayer,
          dateMiseAJour: new Date()
        }, { transaction });
      }
    } else if (typeEntite === 'fournisseur' && fournisseurId) {
      const fournisseur = await db.Fournisseur.findByPk(fournisseurId, { transaction });
      if (fournisseur) {
        const nouveauMontantAPayer = (fournisseur.montantAPayer || 0) + bon.resteAPayer;
        
        await fournisseur.update({
          montantAPayer: nouveauMontantAPayer,
          dateMiseAJour: new Date()
        }, { transaction });
      }
    }
  }

  // CRÉER UN HISTORIQUE DE STATUT
  async creerHistoriqueStatut(bonId, ancienStatut, nouveauStatut, agentId, commentaire, transaction) {
    await db.HistoriqueStatutBon.create({
      bonId: bonId,
      ancienStatut: ancienStatut,
      nouveauStatut: nouveauStatut,
      agentId: agentId,
      commentaire: commentaire || `Changement de statut: ${ancienStatut} → ${nouveauStatut}`,
      dateChangement: new Date()
    }, { transaction });
  } 
}

module.exports = new StatutManager(); */

const db = require('../../models');

class StatutManager {
  /**
   * Préparer les données d'un bon avant création
   */
  async preparerDonneesBon(bon, typeEntite, clientId, fournisseurId) {
    const bonData = { ...bon };

    if (typeEntite === 'client') {
      bonData.clientId = clientId;
      if (bon.type === 'retour') {
        bonData.statutBon = 'retourné';
        bonData.montantAvoir = bonData.montantTotal || 0;
      }
    } else if (typeEntite === 'fournisseur') {
      bonData.fournisseurId = fournisseurId;
    }

    // Calcul automatique
    if (!bonData.netAPayer && bonData.montantTotal) {
      bonData.netAPayer = bonData.montantTotal - (bonData.remise || 0);
    }
    if (!bonData.resteAPayer && bonData.netAPayer) {
      bonData.resteAPayer = bonData.netAPayer - (bonData.avance || 0);
    }

    return bonData;
  }

  /**
   * Mettre à jour le client ou fournisseur selon le bon
   */
  async mettreAJourEntite(bon, typeEntite, clientId, fournisseurId, transaction) {
    if (typeEntite === 'client' && clientId) {
      const client = await db.Client.findByPk(clientId, { transaction });
      if (client) {
        await client.update({
          solde: (client.solde || 0) + bon.netAPayer,
          montantANousPayer: (client.montantANousPayer || 0) + bon.resteAPayer,
          dateMiseAJour: new Date()
        }, { transaction });
      }
    } else if (typeEntite === 'fournisseur' && fournisseurId) {
      const fournisseur = await db.Fournisseur.findByPk(fournisseurId, { transaction });
      if (fournisseur) {
        await fournisseur.update({
          montantAPayer: (fournisseur.montantAPayer || 0) + bon.resteAPayer,
          dateMiseAJour: new Date()
        }, { transaction });
      }
    }
  }

  /**
   * Créer l'historique des changements de statut du bon
   */
  async creerHistoriqueStatut(bonId, ancienStatut, nouveauStatut, agentId, commentaire,code_structure, transaction) {
    await db.HistoriqueStatut.create({
      bonId,
      ancienStatut,
      nouveauStatut,
      code_structure,
      agentId,
      commentaire: commentaire || `Changement de statut: ${ancienStatut} → ${nouveauStatut}`,
      dateChangement: new Date()
    }, { transaction });
  }
}

module.exports = new StatutManager();
