const db = require('../../models');

class FonctionsUtilitaires{
    //Utilitaire pour calculer la période de la journée
    static  getPeriodeJournee() {
        const aujourdhui = new Date();
        const debutJournee = new Date(aujourdhui.setHours(0, 0, 0, 0));
        const finJournee = new Date(aujourdhui.setHours(23, 59, 59, 999));
        return { debutJournee, finJournee };
    }

    //Utilitaire de calcul des dates
    /* static getPeriodeDates(periode, dateReference = new Date()) {
        const date = new Date(dateReference);

        switch (periode) {
            case 'jour':
            return {
                debut: new Date(date.setHours(0, 0, 0, 0)),
                fin: new Date(date.setHours(23, 59, 59, 999))
            };

            case 'semaine': {
            const debut = new Date(date);
            debut.setDate(date.getDate() - date.getDay());
            debut.setHours(0, 0, 0, 0);

            const fin = new Date(debut);
            fin.setDate(debut.getDate() + 6);
            fin.setHours(23, 59, 59, 999);

            return { debut, fin };
            }

            case 'mois': {
            const debut = new Date(date.getFullYear(), date.getMonth(), 1);
            const fin = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
            return { debut, fin };
            }

            case 'annee': {
            const debut = new Date(date.getFullYear(), 0, 1);
            const fin = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
            return { debut, fin };
            }

            default:
            throw new Error('Période invalide');
        }
    } */

    // Utilitaire de calcul des dates - CORRIGÉ
static getPeriodeDates(periode, dateReference = new Date()) {
    const date = this.normalizeDate(dateReference, 'start');;

    switch (periode) {
        case 'jour':{
            // ✅ IMPORTANT: Créer les dates en heure locale
            const debutJour = new Date(date);
            debutJour.setHours(0, 0, 0, 0);
            
            const finJour = new Date(date);
            finJour.setHours(23, 59, 59, 999);
            
            return { debut: debutJour, fin: finJour };
        }
        case 'semaine': {
            const debut = new Date(date);
            debut.setDate(date.getDate() - date.getDay());
            debut.setHours(0, 0, 0, 0);

            const fin = new Date(debut);
            fin.setDate(debut.getDate() + 6);
            fin.setHours(23, 59, 59, 999);

            return { debut, fin };
        }

        case 'mois': {
            const debut = new Date(date.getFullYear(), date.getMonth(), 1);
            debut.setHours(0, 0, 0, 0);
            
            const fin = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            fin.setHours(23, 59, 59, 999);
            
            return { debut, fin };
        }

        case 'annee': {
            const debut = new Date(date.getFullYear(), 0, 1);
            debut.setHours(0, 0, 0, 0);
            
            const fin = new Date(date.getFullYear(), 11, 31);
            fin.setHours(23, 59, 59, 999);
            
            return { debut, fin };
        }

        default:
            throw new Error('Période invalide');
    }
}
    //Utilitaire pour calculer la pérode pécédente
    static getPeriodePrecedente(periode, dateReference = new Date()) {
        const date = new Date(dateReference);

        switch (periode) {
            case 'jour':
            date.setDate(date.getDate() - 1);
            break;
            case 'semaine':
            date.setDate(date.getDate() - 7);
            break;
            case 'mois':
            date.setMonth(date.getMonth() - 1);
            break;
            case 'annee':
            date.setFullYear(date.getFullYear() - 1);
            break;
        }

        return this.getPeriodeDates(periode, date);
    }

    //Une autre fonction qui calcule une période
    /* static buildWhereStats({
        periode,
        dateReference,
        code_structure,
        magasinId,
        agentId
        }) {
        const { Op } = db.Sequelize;
        const { debut, fin } = this.getPeriodeDates(periode, dateReference);

        const where = {
            statut: { [Op.notIn]: ['annulé', 'retourné', 'en_cours'] },
            dateCreation: { [Op.between]: [debut, fin] },
            code_structure
        };

        if (magasinId) {
            where.magasinId = magasinId;
        }

        if (agentId) {
            where.agentId = agentId;
        }

        return { where, debut, fin };
    } */

    //Construction condition WHERE pour statistiques
    static buildWhereStats({
        periode,
        dateReference,
        fromDate,
        toDate,
        code_structure,
        magasinId,
        agentId,
        tableType = 'panier' // 'panier', 'depense', 'recette'
    }) {
        const { Op } = db.Sequelize;
        
        let dateCondition;
        let dateField = 'dateCreation';
        
        if (tableType === 'depense' || tableType === 'recette') {
            dateField = 'date';
        }
        
        if (periode) {
            const { debut, fin } = this.getPeriodeDates(periode, dateReference);
            dateCondition = { [Op.between]: [debut, fin] };
        } 
        else if (fromDate && toDate) {
            const debut = this.normalizeDate(fromDate, 'start');
            const fin = this.normalizeDate(toDate, 'end');
            dateCondition = { [Op.between]: [debut, fin] };
        } 
        else {
            const { debutJournee, finJournee } = this.getPeriodeJournee();
            dateCondition = { [Op.between]: [debutJournee, finJournee] };
        }

        const where = {
            code_structure,
            [dateField]: dateCondition
        };

        if (tableType === 'panier') {
            where.statut = { [Op.notIn]: ['annulé', 'retourné', 'en_cours'] };
        }

        if (magasinId) {
            where.magasinId = magasinId;
        }

        if (agentId) {
            where[tableType === 'panier' ? 'agentId' : 'agentId'] = agentId;
        }

        return { where, debut: dateCondition[Op.between][0], fin: dateCondition[Op.between][1] };
    }

    // Fonction pour calculer la période précédente d'une plage personnalisée
    static getPeriodePrecedentePersonnalisee(dateDebut, dateFin) {
        const startDate = this.normalizeDate(dateDebut, 'start');
        const endDate = this.normalizeDate(dateFin, 'end');
        
        // Calculer la durée de la période en jours
        const dureePeriode = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        // Calculer la date de début de la période précédente
        const startDatePrecedent = new Date(startDate);
        startDatePrecedent.setDate(startDate.getDate() - dureePeriode);
        
        // Calculer la date de fin de la période précédente
        const endDatePrecedent = new Date(startDate);
        endDatePrecedent.setDate(startDate.getDate() - 1);
        
        return {
            debut: startDatePrecedent,
            fin: endDatePrecedent
        };
    }

    // Fonction utilitaire pour les statistiques financières
    /* static buildWhereFinance({
        periode,
        dateReference,
        fromDate,
        toDate,
        code_structure,
        magasinId,
        agentId,
        type // 'DEPENSE' ou 'RECETTE'
    }) {
        const { Op } = db.Sequelize;
        
        let dateCondition;
        
        if (periode) {
            const { debut, fin } = this.getPeriodeDates(periode, dateReference);
            dateCondition = { [Op.between]: [debut, fin] };
        } else if (fromDate && toDate) {
            dateCondition = { [Op.between]: [fromDate, toDate] };
        } else {
            const { debutJournee, finJournee } = this.getPeriodeJournee();
            dateCondition = { [Op.between]: [debutJournee, finJournee] };
        }

        const where = {
            code_structure,
            date: dateCondition
        };

        if (type === 'DEPENSE') {
            where.statutDepense = 'validé';
        } else if (type === 'RECETTE') {
            where.statutRecette = 'validé';
        }

        if (magasinId) {
            where.magasinId = magasinId;
        }

        if (agentId) {
            where.agentId = agentId;
        }

        return where;
    }
 */
// Fonction utilitaire pour les statistiques financières - CORRIGÉE
static buildWhereFinance({
    periode,
    dateReference,
    fromDate,
    toDate,
    code_structure,
    magasinId,
    agentId,
    type, // 'DEPENSE' ou 'RECETTE'
    statut
}) {
    const { Op } = db.Sequelize;
    
    let dateCondition;
    
    if (periode) {
        const { debut, fin } = this.getPeriodeDates(periode, dateReference);
        dateCondition = { [Op.between]: [debut, fin] };
    } 
    else if (fromDate && toDate) {
        // ✅ SOLUTION: Traiter correctement les dates personnalisées
        const debut = this.normalizeDate(fromDate, 'start');
        const fin = this.normalizeDate(toDate, 'end');
        dateCondition = { [Op.between]: [debut, fin] };
    } 
    else {
        const { debutJournee, finJournee } = this.getPeriodeJournee();
        dateCondition = { [Op.between]: [debutJournee, finJournee] };
    }

    const where = {
        code_structure,
        date: dateCondition
    };

    if (type === 'DEPENSE') {
        where.statutDepense = statut || 'validé';
    } else if (type === 'RECETTE') {
        where.statutRecette = statut ||'validé';
    }

    if (magasinId) {
        where.magasinId = magasinId;
    }

    if (agentId) {
        where.agentId = agentId;
    }

    return where;
}

// NOUVELLE FONCTION UTILITAIRE POUR NORMALISER LES DATES
static normalizeDate(dateInput, type = 'start') {
    let date;
    
    if (dateInput instanceof Date) {
        date = new Date(dateInput);
    } else {
        // Si c'est une string "YYYY-MM-DD", on crée la date en local
        const [year, month, day] = dateInput.split('T')[0].split('-').map(Number);
        date = new Date(year, month - 1, day); // Mois: 0-indexé
    }
    
    if (type === 'start') {
        date.setHours(0, 0, 0, 0);
    } else {
        date.setHours(23, 59, 59, 999);
    }
    
    return date;
}

// Dans fonctionsUtilitaires.js, ajoutez cette méthode
static buildDateRange(periode, dateReference, fromDate, toDate) {
    let debut, fin;
    
    if (periode && periode !== 'personnalisee') {
        const dates = this.getPeriodeDates(periode, dateReference);
        debut = dates.debut;
        fin = dates.fin;
    } else if (fromDate && toDate) {
        debut = this.normalizeDate(fromDate, 'start');
        fin = this.normalizeDate(toDate, 'end');
    } else {
        // Par défaut : 30 derniers jours
        fin = new Date();
        debut = new Date();
        debut.setDate(debut.getDate() - 30);
        debut = this.normalizeDate(debut, 'start');
        fin = this.normalizeDate(fin, 'end');
    }
    
    return { debut, fin };
}
}

module.exports = FonctionsUtilitaires;