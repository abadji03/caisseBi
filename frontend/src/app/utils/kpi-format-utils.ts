/* eslint-disable @typescript-eslint/no-explicit-any */
import { RapportVenteResponse, ToutesStatistiquesSpeciales } from '../modeles/kpiCaisse.model';

/**
 * Utilitaire de formatage et de mise en forme pour les données KPI
 * 
 * Sépare la logique de présentation (UI) de la logique métier (service).
 * Ces méthodes étaient auparavant dans KpiCaisseService, ce qui violait le SRP.
 */
export class KpiFormatUtils {

  /**
   * Formatte un montant avec séparateur de milliers
   */
  static formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant);
  }

  /**
   * Calcule la variation avec formatage couleur
   */
  static getVariationStyle(variation: number): { color: string; icon: string } {
    if (variation > 0) {
      return { color: 'green', icon: '↑' };
    } else if (variation < 0) {
      return { color: 'red', icon: '↓' };
    } else {
      return { color: 'gray', icon: '→' };
    }
  }

  /**
   * Détermine le niveau (structure ou magasin) selon les paramètres
   */
  static getNiveau(params: { magasinId?: number | null }): 'structure' | 'magasin' {
    return params.magasinId ? 'magasin' : 'structure';
  }

  // ================================
  //  FORMATAGE STATISTIQUES SPÉCIALES
  // ================================

  /**
   * Formatte les données pour l'affichage des statistiques spéciales
   */
  static formatStatistiquesSpeciales(stats: ToutesStatistiquesSpeciales): any {
    return {
      resume: {
        totalAvoirs: this.formatMontant(stats.resume.totalAvoirs),
        totalVentesCredit: this.formatMontant(stats.resume.totalVentesCredit),
        totalAvances: this.formatMontant(stats.resume.totalAvances),
        totalRetours: this.formatMontant(stats.resume.totalRetours),
        totalAnnulations: this.formatMontant(stats.resume.totalAnnulations),
      },
      avoirs: {
        montantAvoir: this.formatMontant(stats.avoirs.montantAvoir),
        nombreAvoirs: stats.avoirs.nombreAvoirs
      },
      ventesCredit: {
        montantCredit: this.formatMontant(stats.ventesCredit.montantCredit),
        nombrePaniersCredit: stats.ventesCredit.nombrePaniersCredit,
        nombreBonsCredit: stats.ventesCredit.nombreBonsCredit
      },
      avances: {
        totalAvances: this.formatMontant(stats.avances.totalAvances),
        nombreAvances: stats.avances.nombreAvances,
        nombrePaniersAvecAvance: stats.avances.nombrePaniersAvecAvance,
        moyenneAvance: this.formatMontant(stats.avances.moyenneAvance)
      },
      ventesCreditAnnulees: {
        totalMontantRetour: this.formatMontant(stats.ventesCreditAnnulees.totalMontantRetour),
        nombreRetours: stats.ventesCreditAnnulees.nombreRetours,
        nombreRetoursTotaux: stats.ventesCreditAnnulees.nombreRetoursTotaux,
        nombreRetoursPartiels: stats.ventesCreditAnnulees.nombreRetoursPartiels
      },
      ventesCaisseAnnulees: {
        totalMontant: this.formatMontant(stats.ventesCaisseAnnulees.totalMontant),
        totalPaniers: stats.ventesCaisseAnnulees.totalPaniers,
        totalPaiementsAnnules: this.formatMontant(stats.ventesCaisseAnnulees.totalPaiementsAnnules)
      }
    };
  }

  /**
   * Calcule les pourcentages pour les statistiques spéciales
   */
  static calculerPourcentagesStatistiquesSpeciales(stats: ToutesStatistiquesSpeciales): Record<string, number> {
    const totalGeneral =
      stats.resume.totalAvoirs +
      stats.resume.totalVentesCredit +
      stats.resume.totalAvances +
      stats.resume.totalRetours +
      stats.resume.totalAnnulations;

    return {
      pourcentageAvoirs: totalGeneral > 0 ? (stats.resume.totalAvoirs / totalGeneral) * 100 : 0,
      pourcentageVentesCredit: totalGeneral > 0 ? (stats.resume.totalVentesCredit / totalGeneral) * 100 : 0,
      pourcentageAvances: totalGeneral > 0 ? (stats.resume.totalAvances / totalGeneral) * 100 : 0,
      pourcentageRetours: totalGeneral > 0 ? (stats.resume.totalRetours / totalGeneral) * 100 : 0,
      pourcentageAnnulations: totalGeneral > 0 ? (stats.resume.totalAnnulations / totalGeneral) * 100 : 0,
    };
  }

  /**
   * Obtient l'icône appropriée pour chaque type de statistique spéciale
   */
  static getIconeStatistiqueSpecial(type: string): string {
    const icones: Record<string, string> = {
      'avoirs': 'bi-ticket-perforated',
      'ventesCredit': 'bi-credit-card',
      'avances': 'bi-cash-coin',
      'retours': 'bi-arrow-return-left',
      'annulations': 'bi-x-circle'
    };
    return icones[type] || 'bi-info-circle';
  }

  /**
   * Obtient la couleur appropriée pour chaque type de statistique spéciale
   */
  static getCouleurStatistiqueSpecial(type: string): string {
    const couleurs: Record<string, string> = {
      'avoirs': 'primary',
      'ventesCredit': 'success',
      'avances': 'warning',
      'retours': 'info',
      'annulations': 'danger'
    };
    return couleurs[type] || 'secondary';
  }

  // ================================
  //  FORMATAGE RAPPORT DE VENTE
  // ================================

  /**
   * Formate les données du rapport pour l'affichage
   */
  static formatRapportVente(rapport: RapportVenteResponse): any {
    return {
      ...rapport,
      chiffreAffairesTTCFormatted: this.formatMontant(rapport.chiffreAffairesTTC),
      chiffreAffairesHTFormatted: this.formatMontant(rapport.chiffreAffairesHT),
      margeBeneficiaireFormatted: this.formatMontant(rapport.margeBeneficiaire),
      ticketMoyenFormatted: this.formatMontant(rapport.ticketMoyen),

      statmodesPaiement: rapport.statmodesPaiement.map(mode => ({
        ...mode,
        montantTotalFormatted: this.formatMontant(mode.montantTotal),
        pourcentage: rapport.chiffreAffairesTTC > 0
          ? (mode.montantTotal / rapport.chiffreAffairesTTC * 100).toFixed(1)
          : 0
      })),

      topProduits: rapport.topProduits.map(p => ({
        ...p,
        caFormatted: this.formatMontant(p.ca),
        margeFormatted: this.formatMontant(p.marge),
        margePourcentage: p.ca > 0 ? (p.marge / p.ca * 100).toFixed(1) : 0
      })),

      topClients: rapport.topClients.map(c => ({
        ...c,
        caFormatted: this.formatMontant(c.ca),
        dernierAchat: c.dernierAchat ? new Date(c.dernierAchat) : null
      })),

      vendeursPerformance: rapport.vendeursPerformance.map(v => ({
        ...v,
        caHTFormatted: this.formatMontant(v.caHT),
        caTTCFormatted: this.formatMontant(v.caTTC),
        ticketMoyenFormatted: this.formatMontant(v.ticketMoyen)
      }))
    };
  }

  /**
   * Calcule les tendances pour le rapport
   */
  static calculerTendances(rapport: RapportVenteResponse): {
    caTendance: 'positive' | 'negative' | 'stable';
    volumeTendance: 'positive' | 'negative' | 'stable';
    message: string;
  } {
    const caTendance = rapport.evolutionCA.valeur > 0 ? 'positive'
      : rapport.evolutionCA.valeur < 0 ? 'negative' : 'stable';

    const volumeTendance = rapport.evolutionVolume.valeur > 0 ? 'positive'
      : rapport.evolutionVolume.valeur < 0 ? 'negative' : 'stable';

    let message = '';
    if (caTendance === 'positive' && volumeTendance === 'positive') {
      message = '📈 Excellente performance : CA et volume en hausse';
    } else if (caTendance === 'positive' && volumeTendance === 'negative') {
      message = '📊 CA en hausse malgré une baisse du volume (ticket moyen plus élevé)';
    } else if (caTendance === 'negative' && volumeTendance === 'positive') {
      message = '📉 Baisse du CA malgré une hausse du volume (ticket moyen en baisse)';
    } else if (caTendance === 'negative' && volumeTendance === 'negative') {
      message = '📉 Performance en baisse sur tous les indicateurs';
    } else {
      message = '📊 Performance stable par rapport à la période précédente';
    }

    return { caTendance, volumeTendance, message };
  }

  /**
   * Prépare les données pour les graphiques du rapport
   */
  static prepareChartData(rapport: RapportVenteResponse): {
    evolutionChart: { labels: string[]; datasets: any[] };
    paiementsChart: { labels: string[]; data: number[] };
    topProduitsChart: { labels: string[]; data: number[] };
  } {
    const evolutionChart = {
      labels: rapport.evolutionParJour.map(e => {
        const date = new Date(e.date);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      }),
      datasets: [
        {
          label: 'Chiffre d\'affaires',
          data: rapport.evolutionParJour.map(e => e.ca),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          yAxisID: 'y'
        },
        {
          label: 'Nombre de ventes',
          data: rapport.evolutionParJour.map(e => e.nombreVentes),
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          yAxisID: 'y1'
        }
      ]
    };

    const paiementsChart = {
      labels: rapport.statmodesPaiement.map(m => m.mode),
      data: rapport.statmodesPaiement.map(m => m.montantTotal)
    };

    const topProduitsChart = {
      labels: rapport.topProduits.map(p => p.produit.designation.substring(0, 20) + '...'),
      data: rapport.topProduits.map(p => p.ca)
    };

    return { evolutionChart, paiementsChart, topProduitsChart };
  }
}