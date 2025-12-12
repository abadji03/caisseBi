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
        //bonData.statutBon = 'retourné';
        bonData.montantAvoir = this.safeNumber(bonData.montantAvoir);
      }
      else if (bon.type === 'commande') {
        bonData.statutBon = bonData.statutBon || 'validé';
      }
      else if (bon.type === 'vente') {
        bonData.statutBon = bonData.statutBon || 'validé'; // Vente à crédit validée par défaut
      }
    } 
    else if (typeEntite === 'fournisseur') {
      bonData.fournisseurId = fournisseurId;
      if (bon.type === 'commande') {
        bonData.statutBon = bonData.statutBon || 'brouillon';
      } 
      else if (bon.type === 'livraison') {
        bonData.statutBon = bonData.statutBon || 'validé';
      }
       else if (bon.type === 'retour') {
        bonData.statutBon = bonData.statutBon || 'validé';
      }
    }

    return bonData;
  }

  /**
   * Mettre à jour le client ou fournisseur selon le bon
   */
  async mettreAJourEntite(bon, typeEntite, clientId, fournisseurId, transaction) {
    /* const statutsTerminaux = ['livré', 'validé', 'facturé', 'retourné','annulé'];
    if (!statutsTerminaux.includes(bon.statutBon)) {
      return;
    } */
   // Déterminer si l'entité doit être mise à jour selon le type de bon et le statut
    const doitMettreAJour = this.determinerSiMiseAJourNecessaire(bon, typeEntite);
    
    if (!doitMettreAJour) {
      console.log(`⏭️ Pas de mise à jour ${typeEntite} nécessaire pour ${bon.type} avec statut ${bon.statutBon}`);
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
   * Déterminer si une mise à jour d'entité est nécessaire
   */
  determinerSiMiseAJourNecessaire(bon, typeEntite) {
    // Règles selon votre logique métier
    const regles = {
      'client': {
        'commande': ['validé','livré', 'annulé', 'retourné'], // Commande client impacte dette
        'vente': ['validé', 'retourné'], // Vente à crédit impacte dette
        'retour': ['validé', 'annulé'] // Retour client impacte dette (avoir)
      },
      'fournisseur': {
        'commande': [], // Commande fournisseur n'impacte pas la dette
        'livraison': ['validé', 'annulé', 'retourné'], // Livraison fournisseur impacte dette
        'retour': ['validé', 'annulé'] // Retour fournisseur impacte dette
      }
    };

    const typesValides = regles[typeEntite];
    if (!typesValides) return false;

    const statutsValides = typesValides[bon.type];
    if (!statutsValides) return false;

    return statutsValides.includes(bon.statutBon);
  }

  /**
   * Mettre à jour client
   */
  async mettreAJourClient(bon, clientId, transaction) {
    const client = await db.Client.findByPk(clientId, { transaction });
    if (!client) return;

    // Utiliser safeNumber pour toutes les valeurs
    const montant = this.safeNumber(bon.resteAPayer) || this.safeNumber(bon.netAPayer) || this.safeNumber(bon.montantTotal) ||this.safeNumber(bon.montantAvoir);
    const soldeActuel = this.safeNumber(client.solde);

    let nouveauSolde = soldeActuel;
    let operation = '';

    console.log('🔢 Mise à jour client - Calculs:', {
      montant,
      soldeActuel,
      typeBon: bon.type,
      netAPayer: bon.netAPayer,
      montantTotal: bon.montantTotal,
      soldeDB: client.solde
    });


    // LOGIQUE MÉTIER AMÉLIORÉE
    if (bon.statutBon === 'annulé') {
      // ANNULATION: Diminuer la dette (remboursement)
      nouveauSolde = soldeActuel - montant;
      operation = 'annulation';
      console.log(`🔁 Annulation bon ${bon.type} - Diminution dette: ${montant}`);
    }
    else if (bon.type === 'retour') {
      
      if (bon.statutBon === 'validé') {
        nouveauSolde = soldeActuel - montant;
        operation = 'retour (avoir)';
        console.log(`↩️ Retour client validé - Création avoir: ${montant}`);
      } else if (bon.statutBon === 'annulé') {
        // Annulation d'un retour = annuler l'avoir
        nouveauSolde = soldeActuel + montant;
        operation = 'annulation retour';
        console.log(`🚫 Annulation retour - Suppression avoir: ${montant}`);
      }
    } 
    else if (bon.type === 'vente') {
      if (bon.statutBon === 'validé') {
        //VENTE VALIDÉE: Augmenter la dette
        nouveauSolde = soldeActuel + montant;
        operation = 'vente validée';
        console.log(`➕ ${bon.type} validé(e) - Augmentation dette: ${montant}`);
      }
      else if (bon.statutBon === 'retourné') {
        //VENTE: Diminuer la dette
        nouveauSolde = soldeActuel - montant;
        operation = 'retour sur vente';
        console.log(`↩️ ${bon.type} retourné - Réduction dette: ${montant}`);
      }

    }
    else if (bon.type === 'commande') {
      if (bon.statutBon === 'validé') {
        // COMMANDE VALIDÉE
        nouveauSolde = soldeActuel;
        operation = 'commande/vente validée';
        console.log(`➕ ${bon.type} validé(e) - pas d'impact sur la dette`);
      }

      else if (bon.statutBon === 'livré') {
        // COMMANDEVALIDÉE: Augmenter la dette
        nouveauSolde = soldeActuel + montant;
        operation = 'commande/vente livré';
        console.log(`➕ ${bon.type} livré(e) - Augmentation dette: ${montant}`);
      }

      else if (bon.statutBon === 'retourné') {
        // RETOUR SUR COMMANDE: Diminuer la dette
        nouveauSolde = soldeActuel - montant;
        operation = 'retour sur vente/commande';
        console.log(`↩️ ${bon.type} retourné - Réduction dette: ${montant}`);
      }
    }
     // Appliquer la mise à jour
    await client.update({
      solde: nouveauSolde,
      dateMiseAJour: new Date()
    }, { transaction });

    console.log('✅ Client mis à jour:', {
      ancienSolde: soldeActuel,
      nouveauSolde: nouveauSolde,
      variation: nouveauSolde - soldeActuel,
      operation: operation
    });
    /* else {
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
    } */
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

    let nouveauMontantAPayer = montantAPayerActuel;
    let operation = '';

    if (bon.type === 'livraison') {
        if (bon.statutBon === 'validé') {
          // LIVRAISON FOURNISSEUR VALIDÉE: Augmenter la dette
          nouveauMontantAPayer = montantAPayerActuel + montant;
          operation = 'livraison validée';
          console.log(`📦 Livraison fournisseur validée - Augmentation dette: ${montant}`);
        }
        else if (bon.statutBon === 'annulé') {
          // ANNULATION LIVRAISON: Diminuer la dette
          nouveauMontantAPayer = montantAPayerActuel - montant;
          operation = 'annulation livraison';
          console.log(`🚫 Annulation livraison - Diminution dette: ${montant}`);
        }
        else if (bon.statutBon === 'retourné') {
          // RETOUR LIVRAISON: Diminuer la dette
          nouveauMontantAPayer = montantAPayerActuel - montant;
          operation = 'retour livraison';
          console.log(`↩️ Retour livraison - Diminution dette: ${montant}`);
        }
    }
    else if (bon.type === 'retour') {
      
      if (bon.statutBon === 'validé') {
        // RETOUR FOURNISSEUR VALIDÉ: Diminuer la dette (avoir)
        nouveauMontantAPayer = montantAPayerActuel - montant;
        operation = 'retour fournisseur';
        console.log(`↪️ Retour fournisseur validé - Diminution dette: ${montant}`);
      }
      else if (bon.statutBon === 'annulé') {
        // ANNULATION RETOUR FOURNISSEUR: Ré-augmenter la dette
        nouveauMontantAPayer = montantAPayerActuel + montant;
        operation = 'annulation retour fournisseur';
        console.log(`🚫 Annulation retour fournisseur - Ré-augmentation dette: ${montant}`);
      }
      // Retour fournisseur = réduction de la dette
     /*  const nouveauMontantAPayer = Math.max(0, montantAPayerActuel - montant);
      
      await fournisseur.update({
        montantAPayer: nouveauMontantAPayer,
        dateMiseAJour: new Date()
      }, { transaction });

      console.log('Fournisseur - Retour traité:', {
        ancienMontant: montantAPayerActuel,
        montantRetour: montant,
        nouveauMontant: nouveauMontantAPayer
      }); */
    } 
    // S'assurer que le montant n'est pas négatif
    nouveauMontantAPayer = Math.max(0, nouveauMontantAPayer);
    
    await fournisseur.update({
      montantAPayer: nouveauMontantAPayer,
      dateMiseAJour: new Date()
    }, { transaction });

    console.log('Fournisseur mis à jour:', {
      ancienMontant: montantAPayerActuel,
      nouveauMontant: nouveauMontantAPayer,
      variation: nouveauMontantAPayer - montantAPayerActuel,
      operation: operation
    });
    /* else {
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
    } */
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
    if(nouveauSolde < 0){
      console.warn(`Attention: Le solde du client (${clientId}) devient négatif après le paiement.`);
    }
    
    console.log(`Le solde du client (${clientId}) après paiement sera de ${nouveauSolde}.`);
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
    
    if(nouveauMontantAPayer < 0){
      console.warn(`Attention: Le montant à payer du fournisseur (${fournisseurId}) devient négatif après le versement.`);
    }
    
    console.log(`Le montant à payer du fournisseur (${fournisseurId}) après versement sera de ${nouveauMontantAPayer}.`); 
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