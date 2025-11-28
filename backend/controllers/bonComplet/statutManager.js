const db = require('../../models');

class StatutManager {
  
  /**
   * Convertir une valeur en nombre de manière sécurisée
   */
  safeNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    
    // Si c'est déjà un nombre
    if (typeof value === 'number') return value;
    
    // Si c'est une string, la convertir en nombre
    if (typeof value === 'string') {
      // Nettoyer la string (enlever espaces, caractères non numériques sauf . et -)
      const cleaned = value.replace(/[^\d.-]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    
    // Pour les autres types, essayer de convertir
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Préparer les données d'un bon avant création
   */
  async preparerDonneesBon(bon, typeEntite, clientId, fournisseurId) {
    const bonData = { ...bon };

    if (typeEntite === 'client') {
      bonData.clientId = clientId;
      if (bon.type === 'retour') {
        bonData.statutBon = 'retourné';
        bonData.montantAvoir = this.safeNumber(bonData.montantTotal);
      }
      else if (bon.type === 'commande') {
        bonData.statutBon = bonData.statutBon || 'validé';
      }
    } 
    else if (typeEntite === 'fournisseur') {
      bonData.fournisseurId = fournisseurId;
      if (bon.type === 'commande') {
        bonData.statutBon = bonData.statutBon || 'brouillon';
      } else if (bon.type === 'livraison') {
        bonData.statutBon = bonData.statutBon || 'validé';
      }
    }

    return bonData;
  }

  /**
   * Mettre à jour le client ou fournisseur selon le bon
   */
  async mettreAJourEntite(bon, typeEntite, clientId, fournisseurId, transaction) {
    const statutsTerminaux = ['livré', 'validé', 'facturé', 'retourné'];
    if (!statutsTerminaux.includes(bon.statutBon)) {
      return;
    }

    if (typeEntite === 'client' && clientId) {
      await this.mettreAJourClient(bon, clientId, transaction);
    } 
    else if (typeEntite === 'fournisseur' && fournisseurId) {
      await this.mettreAJourFournisseur(bon, fournisseurId, transaction);
    }
  }

  /**
   * Mettre à jour client
   */
  async mettreAJourClient(bon, clientId, transaction) {
    const client = await db.Client.findByPk(clientId, { transaction });
    if (!client) return;

    // Utiliser safeNumber pour toutes les valeurs
    const montant = this.safeNumber(bon.netAPayer) || this.safeNumber(bon.montantTotal) ||this.safeNumber(bon.montantAvoir);
    const soldeActuel = this.safeNumber(client.solde);

    console.log('🔢 Mise à jour client - Calculs:', {
      montant,
      soldeActuel,
      typeBon: bon.type,
      netAPayer: bon.netAPayer,
      montantTotal: bon.montantTotal,
      soldeDB: client.solde
    });

    if (bon.type === 'retour') {
      // Retour = avoir pour le client (réduction de la dette)
      const nouveauSolde = soldeActuel - montant;
      
      await client.update({
        solde: nouveauSolde,
        dateMiseAJour: new Date()
      }, { transaction });

      console.log('✅ Client - Retour traité:', {
        ancienSolde: soldeActuel,
        montantRetour: montant,
        nouveauSolde: nouveauSolde
      });
    } else {
      // Commande = augmentation de la dette
      const nouveauSolde = soldeActuel + montant;
      
      await client.update({
        solde: nouveauSolde,
        dateMiseAJour: new Date()
      }, { transaction });

      console.log('✅ Client - Commande traitée:', {
        ancienSolde: soldeActuel,
        montantCommande: montant,
        nouveauSolde: nouveauSolde
      });
    }
  }

  /**
   * Mettre à jour fournisseur
   */
  async mettreAJourFournisseur(bon, fournisseurId, transaction) {
    const fournisseur = await db.Fournisseur.findByPk(fournisseurId, { transaction });
    if (!fournisseur) return;

    // Utiliser safeNumber pour toutes les valeurs
    const montant = this.safeNumber(bon.resteAPayer) || this.safeNumber(bon.netAPayer) || this.safeNumber(bon.montantTotal) || this.safeNumber(bon.montantAvoir);
    const montantAPayerActuel = this.safeNumber(fournisseur.montantAPayer);

    console.log('🔢 Mise à jour fournisseur - Calculs:', {
      montant,
      montantAPayerActuel,
      typeBon: bon.type,
      resteAPayer: bon.resteAPayer,
      netAPayer: bon.netAPayer,
      montantTotal: bon.montantTotal,
      montantAPayerDB: fournisseur.montantAPayer
    });

    if (bon.type === 'retour') {
      // Retour fournisseur = réduction de la dette
      const nouveauMontantAPayer = Math.max(0, montantAPayerActuel - montant);
      
      await fournisseur.update({
        montantAPayer: nouveauMontantAPayer,
        dateMiseAJour: new Date()
      }, { transaction });

      console.log('Fournisseur - Retour traité:', {
        ancienMontant: montantAPayerActuel,
        montantRetour: montant,
        nouveauMontant: nouveauMontantAPayer
      });
    } else {
      // Livraison/Commande fournisseur = augmentation de la dette
      const nouveauMontantAPayer = montantAPayerActuel + montant;
      
      await fournisseur.update({
        montantAPayer: nouveauMontantAPayer,
        dateMiseAJour: new Date()
      }, { transaction });

      console.log('Fournisseur - Livraison/Commande traitée:', {
        ancienMontant: montantAPayerActuel,
        montantAjoute: montant,
        nouveauMontant: nouveauMontantAPayer
      });
    }
  }

  /**
   * Créer l'historique des changements de statut du bon
   */
  async creerHistoriqueStatut(bonId, ancienStatut, nouveauStatut, agentId, commentaire, code_structure, transaction) {
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

  /**
   * Mettre à jour client
   */
  async mettreAJourClientApresRegelement(paiement, clientId, transaction) {
    const client = await db.Client.findByPk(clientId, { transaction });
    if (!client) return;

    // Utiliser safeNumber pour toutes les valeurs
    const montant = this.safeNumber(paiement.montant) || 0;
    const soldeActuel = this.safeNumber(client.solde);

    console.log('Mise à jour client - Calculs:', {
      montant,
      soldeActuel,
      methodePaiement: paiement.methodePaiement,
      montantTotal: paiement.montant,
      soldeDB: client.solde
    });
    
    // Paiement = diminution de la dette
    const nouveauSolde = soldeActuel - montant;
    
    await client.update({
      solde: nouveauSolde,
      dateMiseAJour: new Date()
    }, { transaction });

    console.log('Client - Réglement traité:', {
      ancienSolde: soldeActuel,
      montantCommande: montant,
      nouveauSolde: nouveauSolde
    });
    
  }

  /**
   * Mettre à jour fournisseur
   */
  async mettreAJourFournisseurApresVersement(paiement, fournisseurId, transaction) {
    const fournisseur = await db.Fournisseur.findByPk(fournisseurId, { transaction });
    if (!fournisseur) return;

    // Utiliser safeNumber pour toutes les valeurs
    const montant = this.safeNumber(paiement.montant) || 0;
    const montantAPayerActuel = this.safeNumber(fournisseur.montantAPayer);

    console.log('Mise à jour fournisseur - Calculs:', {
      montant,
      montantAPayerActuel,
      montantAPayerDB: fournisseur.montantAPayer
    });

    // Paiement = diminution de la dette
    const nouveauMontantAPayer = montantAPayerActuel - montant;
    
    await fournisseur.update({
      montantAPayer: nouveauMontantAPayer,
      dateMiseAJour: new Date()
    }, { transaction });

    console.log('Fournisseur - Versement traitée:', {
      ancienMontant: montantAPayerActuel,
      montantAjoute: montant,
      nouveauMontant: nouveauMontantAPayer
    });
  
  }


  /**
   * Méthode utilitaire pour debugger les types de données
   */
  debugTypes(bon, entite, nomEntite) {
    console.log('🐛 DEBUG Types de données:', {
      nomEntite,
      // Données du bon
      resteAPayer: { valeur: bon.resteAPayer, type: typeof bon.resteAPayer },
      netAPayer: { valeur: bon.netAPayer, type: typeof bon.netAPayer },
      montantTotal: { valeur: bon.montantTotal, type: typeof bon.montantTotal },
      // Données de l'entité
      montantEntite: { valeur: entite.montantAPayer || entite.solde, type: typeof (entite.montantAPayer || entite.solde) },
      // Conversions
      resteAPayerNumber: this.safeNumber(bon.resteAPayer),
      netAPayerNumber: this.safeNumber(bon.netAPayer),
      montantTotalNumber: this.safeNumber(bon.montantTotal),
      montantEntiteNumber: this.safeNumber(entite.montantAPayer || entite.solde)
    });
  }
}

module.exports = new StatutManager();