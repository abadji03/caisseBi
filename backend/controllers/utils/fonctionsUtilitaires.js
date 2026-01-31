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
    static getPeriodeDates(periode, dateReference = new Date()) {
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
    static buildWhereStats({
        periode,
        dateReference,
        code_structure,
        magasinId,
        userId
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

        if (userId) {
            where.userId = userId;
        }

        return { where, debut, fin };
    }

    // Fonction pour calculer la période précédente d'une plage personnalisée
    static getPeriodePrecedentePersonnalisee(dateDebut, dateFin) {
        const startDate = new Date(dateDebut);
        const endDate = new Date(dateFin);
        
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
    static buildWhereFinance({
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

}

module.exports = FonctionsUtilitaires;