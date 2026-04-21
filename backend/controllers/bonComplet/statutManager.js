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
    // Remplacer les virgules par des points pour les nombres français
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
    
    // Gérer les formats avec séparateurs de milliers
    // Si après nettoyage on a des points comme séparateurs de milliers
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      // C'est un format avec séparateurs de milliers (ex: 1.200.000,50)
      const integerPart = parts.slice(0, -1).join('');
      const decimalPart = parts[parts.length - 1];
      value = `${integerPart}.${decimalPart}`;
    } else {
      value = cleaned;
    }
    
    const num = parseFloat(value);
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
      if (bon.type === 'retour' || bon.type === 'avoir') {
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
       else if (bon.type === 'retour' || bon.type === 'avoir') {
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
        'retour': ['validé', 'annulé'], // Retour client impacte dette (avoir)
        'avoir': ['validé', 'annulé'] // Avoir client impacte dette (avoir)
      },
      'fournisseur': {
        'commande': [], // Commande fournisseur n'impacte pas la dette
        'livraison': ['validé', 'annulé', 'retourné'], // Livraison fournisseur impacte dette
        'retour': ['validé', 'annulé'], // Retour fournisseur impacte dette
        'avoir': ['validé', 'annulé'] // Avoir fournisseur impacte dette (avoir)
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
  /* async mettreAJourClient(bon, clientId, transaction) {
    const client = await db.Client.findByPk(clientId, { transaction });
    if (!client) return;

    // Utiliser safeNumber pour toutes les valeurs
    const montant = this.safeNumber(bon.netAPayer) || this.safeNumber(bon.montantTotal) ||this.safeNumber(bon.montantAvoir);
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
    else if (bon.type === 'retour' || bon.type === 'avoir') {
      
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
  }
 */
  /**
   * Mettre à jour fournisseur
   */
  /* async mettreAJourFournisseur(bon, fournisseurId, transaction) {
    const fournisseur = await db.Fournisseur.findByPk(fournisseurId, { transaction });
    if (!fournisseur) return;

    // Utiliser safeNumber pour toutes les valeurs
    const montant = this.safeNumber(bon.netAPayer) || this.safeNumber(bon.montantTotal) || this.safeNumber(bon.montantAvoir);
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
    else if (bon.type === 'retour' || bon.type === 'avoir') {
      
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
  }
 */

  // statutManager.js - Modifications principales

/**
 * Mettre à jour client - Version avec gestion par magasin
 */
async mettreAJourClient(bon, clientId, transaction) {
  // Récupérer le client avec ses magasins
  const client = await db.Client.findByPk(clientId, { 
    transaction,
    include: [{ model: db.Magasin }]
  });
  if (!client) return;

  // Utiliser le magasinId du bon (important pour la nouvelle architecture)
  const magasinId = bon.magasinId;
  if (!magasinId) {
    console.warn(`⚠️ Pas de magasinId sur le bon ${bon.id}, impossible de mettre à jour le solde`);
    return;
  }

  // Récupérer la relation client-magasin
  const relationClientMagasin = await db.MagasinClient.findOne({
    where: { clientId, magasinId },
    transaction
  });

  if (!relationClientMagasin) {
    console.warn(`⚠️ Relation client-magasin non trouvée pour client ${clientId} et magasin ${magasinId}`);
    return;
  }

  const montant = this.safeNumber(bon.netAPayer) || this.safeNumber(bon.montantTotal) || this.safeNumber(bon.montantAvoir);
  const soldeActuel = this.safeNumber(relationClientMagasin.solde);

  console.log('🔢 Mise à jour client par magasin - Calculs:', {
    montant,
    soldeActuel,
    magasinId,
    typeBon: bon.type,
    netAPayer: bon.netAPayer,
    montantTotal: bon.montantTotal,
  });

  let nouveauSolde = soldeActuel;
  let operation = '';

  // LOGIQUE MÉTIER AMÉLIORÉE
  if (bon.statutBon === 'annulé') {
    nouveauSolde = soldeActuel - montant;
    operation = 'annulation';
  }
  else if (bon.type === 'retour' || bon.type === 'avoir') {
    if (bon.statutBon === 'validé') {
      nouveauSolde = soldeActuel - montant;
      operation = 'retour (avoir)';
    } else if (bon.statutBon === 'annulé') {
      nouveauSolde = soldeActuel + montant;
      operation = 'annulation retour';
    }
  } 
  else if (bon.type === 'vente') {
    if (bon.statutBon === 'validé') {
      nouveauSolde = soldeActuel + montant;
      operation = 'vente validée';
    }
    else if (bon.statutBon === 'retourné') {
      nouveauSolde = soldeActuel - montant;
      operation = 'retour sur vente';
    }
  }
  else if (bon.type === 'commande') {
    if (bon.statutBon === 'validé') {
      nouveauSolde = soldeActuel;
      operation = 'commande validée - pas d\'impact';
    }
    else if (bon.statutBon === 'livré') {
      nouveauSolde = soldeActuel + montant;
      operation = 'commande livrée';
    }
    else if (bon.statutBon === 'retourné') {
      nouveauSolde = soldeActuel - montant;
      operation = 'retour sur commande';
    }
  }
  
  // Appliquer la mise à jour sur la relation
  await relationClientMagasin.update({
    solde: nouveauSolde
  }, { transaction });

  // Mettre à jour le solde total du client (optionnel - pour compatibilité)
  // Calculer la somme de tous les soldes par magasin
  const tousSoldes = await db.MagasinClient.sum('solde', {
    where: { clientId },
    transaction
  });

  await client.update({
    solde: tousSoldes,
    dateMiseAJour: new Date()
  }, { transaction });

  console.log('✅ Client mis à jour:', {
    ancienSoldeParMagasin: soldeActuel,
    nouveauSoldeParMagasin: nouveauSolde,
    soldeTotalClient: tousSoldes,
    variation: nouveauSolde - soldeActuel,
    operation: operation,
    magasinId
  });
}

/**
 * Mettre à jour fournisseur - Version avec gestion par magasin
 */
async mettreAJourFournisseur(bon, fournisseurId, transaction) {
  // Récupérer le fournisseur avec ses magasins
  const fournisseur = await db.Fournisseur.findByPk(fournisseurId, { 
    transaction,
    include: [{ model: db.Magasin }]
  });
  if (!fournisseur) return;

  // Utiliser le magasinId du bon
  const magasinId = bon.magasinId;
  if (!magasinId) {
    console.warn(`⚠️ Pas de magasinId sur le bon ${bon.id}, impossible de mettre à jour le solde`);
    return;
  }

  // Récupérer la relation fournisseur-magasin
  const relationFournisseurMagasin = await db.MagasinFournisseur.findOne({
    where: { fournisseurId, magasinId },
    transaction
  });

  if (!relationFournisseurMagasin) {
    console.warn(`⚠️ Relation fournisseur-magasin non trouvée pour fournisseur ${fournisseurId} et magasin ${magasinId}`);
    return;
  }

  const montant = this.safeNumber(bon.netAPayer) || this.safeNumber(bon.montantTotal) || this.safeNumber(bon.montantAvoir);
  const soldeActuel = this.safeNumber(relationFournisseurMagasin.solde);

  console.log('🔢 Mise à jour fournisseur par magasin - Calculs:', {
    montant,
    soldeActuel,
    magasinId,
    typeBon: bon.type,
  });

  let nouveauSolde = soldeActuel;
  let operation = '';

  if (bon.type === 'livraison') {
    if (bon.statutBon === 'validé') {
      nouveauSolde = soldeActuel + montant;
      operation = 'livraison validée';
    }
    else if (bon.statutBon === 'annulé') {
      nouveauSolde = soldeActuel - montant;
      operation = 'annulation livraison';
    }
    else if (bon.statutBon === 'retourné') {
      nouveauSolde = soldeActuel - montant;
      operation = 'retour livraison';
    }
  }
  else if (bon.type === 'retour' || bon.type === 'avoir') {
    if (bon.statutBon === 'validé') {
      nouveauSolde = soldeActuel - montant;
      operation = 'retour fournisseur';
    }
    else if (bon.statutBon === 'annulé') {
      nouveauSolde = soldeActuel + montant;
      operation = 'annulation retour fournisseur';
    }
  }
  
  // S'assurer que le montant n'est pas négatif
  nouveauSolde = Math.max(0, nouveauSolde);
  
  await relationFournisseurMagasin.update({
    solde: nouveauSolde
  }, { transaction });

  // Mettre à jour le montant total à payer du fournisseur (optionnel)
  const tousSoldes = await db.MagasinFournisseur.sum('solde', {
    where: { fournisseurId },
    transaction
  });

  await fournisseur.update({
    montantAPayer: tousSoldes,
    dateMiseAJour: new Date()
  }, { transaction });

  console.log('✅ Fournisseur mis à jour:', {
    ancienSoldeParMagasin: soldeActuel,
    nouveauSoldeParMagasin: nouveauSolde,
    soldeTotalFournisseur: tousSoldes,
    variation: nouveauSolde - soldeActuel,
    operation: operation,
    magasinId
  });
}

/**
 * Mettre à jour client après règlement - Version par magasin
 */
async mettreAJourClientApresRegelement(paiement, clientId, transaction) {
  // Récupérer la relation client-magasin
  const magasinId = paiement.magasinId;
  if (!magasinId) {
    console.warn(`⚠️ Pas de magasinId sur le paiement, impossible de mettre à jour`);
    return;
  }

  const relationClientMagasin = await db.MagasinClient.findOne({
    where: { clientId, magasinId },
    transaction
  });

  if (!relationClientMagasin) {
    console.warn(`⚠️ Relation client-magasin non trouvée pour client ${clientId} et magasin ${magasinId}`);
    return;
  }

  const montant = this.safeNumber(paiement.montant) || 0;
  const soldeActuel = this.safeNumber(relationClientMagasin.solde);
  
  // Paiement = diminution de la dette
  const nouveauSolde = soldeActuel - montant;
  
  if (nouveauSolde < 0) {
    console.warn(`Attention: Le solde du client (${clientId}) devient négatif après le paiement.`);
  }
  
  await relationClientMagasin.update({
    solde: nouveauSolde
  }, { transaction });

  // Mettre à jour le solde total du client
  const client = await db.Client.findByPk(clientId, { transaction });
  if (client) {
    const tousSoldes = await db.MagasinClient.sum('solde', {
      where: { clientId },
      transaction
    });
    await client.update({
      solde: tousSoldes,
      dateMiseAJour: new Date()
    }, { transaction });
  }

  console.log('✅ Client - Règlement traité par magasin:', {
    ancienSoldeParMagasin: soldeActuel,
    montantPaye: montant,
    nouveauSoldeParMagasin: nouveauSolde,
    magasinId
  });
}

/**
 * Mettre à jour fournisseur après versement - Version par magasin
 */
async mettreAJourFournisseurApresVersement(paiement, fournisseurId, transaction) {
  // Récupérer la relation fournisseur-magasin
  const magasinId = paiement.magasinId;
  if (!magasinId) {
    console.warn(`⚠️ Pas de magasinId sur le paiement, impossible de mettre à jour`);
    return;
  }

  const relationFournisseurMagasin = await db.MagasinFournisseur.findOne({
    where: { fournisseurId, magasinId },
    transaction
  });

  if (!relationFournisseurMagasin) {
    console.warn(`⚠️ Relation fournisseur-magasin non trouvée pour fournisseur ${fournisseurId} et magasin ${magasinId}`);
    return;
  }

  const montant = this.safeNumber(paiement.montant) || 0;
  const soldeActuel = this.safeNumber(relationFournisseurMagasin.solde);

  // Paiement = diminution de la dette
  const nouveauSolde = soldeActuel - montant;
  
  if (nouveauSolde < 0) {
    console.warn(`Attention: Le solde du fournisseur (${fournisseurId}) devient négatif après le versement.`);
  }
  
  await relationFournisseurMagasin.update({
    solde: nouveauSolde
  }, { transaction });

  // Mettre à jour le montant total du fournisseur
  const fournisseur = await db.Fournisseur.findByPk(fournisseurId, { transaction });
  if (fournisseur) {
    const tousSoldes = await db.MagasinFournisseur.sum('solde', {
      where: { fournisseurId },
      transaction
    });
    await fournisseur.update({
      montantAPayer: tousSoldes,
      dateMiseAJour: new Date()
    }, { transaction });
  }

  console.log('✅ Fournisseur - Versement traité par magasin:', {
    ancienSoldeParMagasin: soldeActuel,
    montantPaye: montant,
    nouveauSoldeParMagasin: nouveauSolde,
    magasinId
  });
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
  /* async mettreAJourClientApresRegelement(paiement, clientId, transaction) {
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
    
    
  } */

  /**
   * Mettre à jour fournisseur
   */
  /* async mettreAJourFournisseurApresVersement(paiement, fournisseurId, transaction) {
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
 */

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