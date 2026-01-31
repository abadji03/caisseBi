/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import { TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { DonneesComparativesResponse, IndicateursFinanciers, ModesPaiementStats, RepartitionDepenses, RepartitionRecettes, TransactionDetail } from '../modeles/finance.model';

@Injectable({
  providedIn: 'root'
})
export class RapportPDFService {

   // Définir les polices disponibles
  private initializeFonts(): void {
    pdfMake.fonts = {
      // Police par défaut
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
      },
      // Police alternative
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };
  }

  constructor() {
    this.initializeFonts();
  }

  // Styles pour le rapport financier
  private getStyles(): any {
    return {
      // Titres
      title: {
        fontSize: 22,
        bold: true,
        color: '#2c3e50',
        alignment: 'center',
        margin: [0, 0, 0, 20]
      },
      sectionTitle: {
        fontSize: 16,
        bold: true,
        color: '#ffffff',
        margin: [0, 0, 0, 10]
      },
      subsectionTitle: {
        fontSize: 14,
        bold: true,
        color: '#2c3e50',
        margin: [0, 0, 0, 10]
      },
      
      // Textes
      normal: {
        fontSize: 10,
        color: '#333333',
        lineHeight: 1.3
      },
      bold: {
        fontSize: 10,
        bold: true,
        color: '#333333'
      },
      small: {
        fontSize: 8,
        color: '#666666'
      },
      
      // Indicateurs
      indicatorTitle: {
        fontSize: 11,
        bold: true,
        color: '#7f8c8d',
        alignment: 'center'
      },
      indicatorValue: {
        fontSize: 16,
        bold: true,
        alignment: 'center'
      },
      indicatorSubtitle: {
        fontSize: 9,
        color: '#7f8c8d',
        alignment: 'center'
      },
      
      // Tableaux
      tableHeader: {
        bold: true,
        fontSize: 9,
        color: '#ffffff',
        fillColor: '#2c3e50'
      },
      tableRow: {
        fontSize: 9,
        color: '#333333'
      },
      tableFooter: {
        bold: true,
        fontSize: 10,
        color: '#ffffff',
        fillColor: '#95a5a6'
      },
      
      // Couleurs spécifiques
      positive: {
        color: '#27ae60', // Vert
        bold: true
      },
      negative: {
        color: '#e74c3c', // Rouge
        bold: true
      },
      warning: {
        color: '#f39c12', // Orange
        bold: true
      },
      info: {
        color: '#3498db' // Bleu
      }
    };
  }

  // Générer l'en-tête du rapport
  private getHeader(nomStructure: string, periode: string): any {
    return {
      columns: [
        {
          width: 'auto',
          stack: [
            {
              text: nomStructure,
              style: 'sectionTitle',
              color: '#2c3e50',
              fontSize: 18
            },
            {
              text: 'Rapport Financier',
              style: 'subsectionTitle',
              fontSize: 16
            }
          ]
        },
        {
          width: '*',
          stack: [
            {
              text: `Période: ${periode}`,
              style: 'normal',
              alignment: 'right'
            },
            {
              text: `Généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
              style: 'small',
              alignment: 'right'
            }
          ]
        }
      ],
      margin: [0, 0, 0, 20]
    };
  }

  // Générer le pied de page
  private getFooter(): any {
    return (currentPage: number, pageCount: number) => {
      return {
        columns: [
          {
            text: `Page ${currentPage} sur ${pageCount}`,
            style: 'small',
            alignment: 'left'
          },
          {
            text: '© Rapport Financier - Document confidentiel',
            style: 'small',
            alignment: 'right'
          }
        ],
        margin: [40, 20, 40, 0]
      };
    };
  }

  // Générer les indicateurs financiers
  private generateIndicateurs(indicateurs: IndicateursFinanciers): any[] {
    const content = [];
    
    // Titre de la section
    content.push({
      text: 'Indicateurs Financiers',
      style: 'subsectionTitle',
      background: '#ecf0f1',
      margin: [0, 0, 0, 10],
      padding: [10, 5]
    });
    
    // Grille d'indicateurs
    const indicateursGrid = [
      {
        columns: [
          // Chiffre d'affaires
          {
            width: '25%',
            stack: [
              {
                text: 'Chiffre d\'affaires',
                style: 'indicatorTitle'
              },
              {
                text: this.formatMontant(indicateurs.chiffreAffaires),
                style: 'indicatorValue',
                color: '#3498db'
              },
              {
                text: `${indicateurs.nbVentes} transaction(s)`,
                style: 'indicatorSubtitle'
              },
              {
                text: `Évolution: ${indicateurs.evolutionCA.pourcentage}%`,
                style: indicateurs.evolutionCA.tendance === 'hausse' ? 'positive' : 
                       indicateurs.evolutionCA.tendance === 'baisse' ? 'negative' : 'normal',
                alignment: 'center',
                margin: [0, 2, 0, 0]
              }
            ],
            margin: [0, 5, 5, 5]
          },
          
          // Dépenses totales
          {
            width: '25%',
            stack: [
              {
                text: 'Dépenses totales',
                style: 'indicatorTitle'
              },
              {
                text: this.formatMontant(indicateurs.totalDepenses),
                style: 'indicatorValue',
                color: '#e74c3c'
              },
              {
                text: `${indicateurs.nbDepenses} transaction(s)`,
                style: 'indicatorSubtitle'
              }
            ],
            margin: [0, 5, 5, 5]
          },
          
          // Bénéfice net
          {
            width: '25%',
            stack: [
              {
                text: 'Bénéfice net',
                style: 'indicatorTitle'
              },
              {
                text: this.formatMontant(indicateurs.beneficeNet),
                style: 'indicatorValue',
                color: indicateurs.beneficeNet >= 0 ? '#27ae60' : '#e74c3c'
              },
              {
                text: `Marge: ${this.calculerMarge(indicateurs).toFixed(1)}%`,
                style: indicateurs.beneficeNet >= 0 ? 'positive' : 'negative',
                alignment: 'center'
              }
            ],
            margin: [0, 5, 5, 5]
          },
          
          // Solde trésorerie
          {
            width: '25%',
            stack: [
              {
                text: 'Solde trésorerie',
                style: 'indicatorTitle'
              },
              {
                text: this.formatMontant(indicateurs.soldeTresorerie),
                style: 'indicatorValue',
                color: indicateurs.soldeTresorerie >= 0 ? '#27ae60' : '#e74c3c'
              }
            ],
            margin: [0, 5, 5, 5]
          }
        ]
      }
    ];
    
    content.push({
      stack: indicateursGrid,
      margin: [0, 0, 0, 15]
    });
    
    return content;
  }

  // Générer le flux de trésorerie
  private generateFluxTresorerie(flux: any): any[] {
    const content = [];
    
    content.push({
      text: 'Flux de Trésorerie',
      style: 'subsectionTitle',
      background: '#ecf0f1',
      margin: [0, 0, 0, 10],
      padding: [10, 5]
    });
    
    const fluxGrid = [
      {
        columns: [
          // Solde initial
          {
            width: '25%',
            stack: [
              {
                text: 'Solde Initial',
                style: 'indicatorTitle'
              },
              {
                text: this.formatMontant(flux.soldeInitial),
                style: 'indicatorValue',
                color: flux.soldeInitial >= 0 ? '#27ae60' : '#e74c3c'
              }
            ],
            margin: [0, 5, 5, 5]
          },
          
          // Entrées
          {
            width: '25%',
            stack: [
              {
                text: 'Entrées',
                style: 'indicatorTitle'
              },
              {
                text: `+ ${this.formatMontant(flux.recettesPeriod)}`,
                style: 'indicatorValue',
                color: '#27ae60'
              }
            ],
            margin: [0, 5, 5, 5]
          },
          
          // Sorties
          {
            width: '25%',
            stack: [
              {
                text: 'Sorties',
                style: 'indicatorTitle'
              },
              {
                text: `- ${this.formatMontant(flux.depensesPeriod)}`,
                style: 'indicatorValue',
                color: '#e74c3c'
              }
            ],
            margin: [0, 5, 5, 5]
          },
          
          // Solde final
          {
            width: '25%',
            stack: [
              {
                text: 'Solde Final',
                style: 'indicatorTitle'
              },
              {
                text: this.formatMontant(flux.soldeFinal),
                style: 'indicatorValue',
                color: flux.soldeFinal >= 0 ? '#27ae60' : '#e74c3c'
              }
            ],
            margin: [0, 5, 5, 5]
          }
        ]
      }
    ];
    
    content.push({
      stack: fluxGrid,
      margin: [0, 0, 0, 15]
    });
    
    return content;
  }

  // Générer la répartition des dépenses
  private generateRepartitionDepenses(repartition: RepartitionDepenses): any[] {
    const content = [];
    
    content.push({
      text: 'Répartition des Dépenses',
      style: 'subsectionTitle',
      background: '#ecf0f1',
      margin: [0, 0, 0, 10],
      padding: [10, 5]
    });
    
    // Tableau des catégories
    const tableBody: TableCell[][] = [
      [
        { text: 'Catégorie', style: 'tableHeader' },
        { text: 'Montant', style: 'tableHeader', alignment: 'right' },
        { text: '%', style: 'tableHeader', alignment: 'center' },
        { text: 'Transactions', style: 'tableHeader', alignment: 'center' }
      ]
    ];
    
    repartition.repartition.forEach(cat => {
      tableBody.push([
        { text: cat.categorieName, style: 'tableRow' },
        { 
          text: this.formatMontant(cat.montantTotal), 
          style: 'tableRow', 
          alignment: 'right' 
        },
        { 
          text: `${cat.pourcentage.toFixed(1)}%`, 
          style: 'tableRow', 
          alignment: 'center' 
        },
        { 
          text: cat.occurrences.toString(), 
          style: 'tableRow', 
          alignment: 'center' 
        }
      ]);
    });
    
    // Ligne total
    tableBody.push([
      { 
        text: 'TOTAL DÉPENSES', 
        style: 'tableFooter' 
      },
      { 
        text: this.formatMontant(repartition.totalDepenses), 
        style: 'tableFooter', 
        alignment: 'right' 
      },
      { 
        text: '100%', 
        style: 'tableFooter', 
        alignment: 'center' 
      },
      { 
        text: repartition.repartition.reduce((sum, cat) => sum + cat.occurrences, 0).toString(),
        style: 'tableFooter', 
        alignment: 'center' 
      }
    ]);
    
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: tableBody
      },
      layout: {
        fillColor: (rowIndex: number) => {
          if (rowIndex === 0) return '#2c3e50';
          if (rowIndex === tableBody.length - 1) return '#95a5a6';
          return (rowIndex % 2 === 0) ? '#f8f9fa' : null;
        }
      },
      margin: [0, 0, 0, 15]
    });
    
    return content;
  }

  // Générer la répartition des recettes
  private generateRepartitionRecettes(repartition: RepartitionRecettes): any[] {
    const content = [];
    
    content.push({
      text: 'Sources de Revenus',
      style: 'subsectionTitle',
      background: '#ecf0f1',
      margin: [0, 0, 0, 10],
      padding: [10, 5]
    });
    
    // Tableau des catégories
    const tableBody: TableCell[][] = [
      [
        { text: 'Catégorie', style: 'tableHeader' },
        { text: 'Montant', style: 'tableHeader', alignment: 'right' },
        { text: '%', style: 'tableHeader', alignment: 'center' },
        { text: 'Transactions', style: 'tableHeader', alignment: 'center' }
      ]
    ];
    
    repartition.repartition.forEach(cat => {
      tableBody.push([
        { text: cat.categorieName, style: 'tableRow' },
        { 
          text: this.formatMontant(cat.montantTotal), 
          style: 'tableRow', 
          alignment: 'right' 
        },
        { 
          text: `${cat.pourcentage.toFixed(1)}%`, 
          style: 'tableRow', 
          alignment: 'center' 
        },
        { 
          text: cat.occurrences.toString(), 
          style: 'tableRow', 
          alignment: 'center' 
        }
      ]);
    });
    
    // Ligne total
    tableBody.push([
      { 
        text: 'TOTAL RECETTES', 
        style: 'tableFooter' 
      },
      { 
        text: this.formatMontant(repartition.totalRecettes), 
        style: 'tableFooter', 
        alignment: 'right' 
      },
      { 
        text: '100%', 
        style: 'tableFooter', 
        alignment: 'center' 
      },
      { 
        text: repartition.repartition.reduce((sum, cat) => sum + cat.occurrences, 0).toString(),
        style: 'tableFooter', 
        alignment: 'center' 
      }
    ]);
    
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: tableBody
      },
      layout: {
        fillColor: (rowIndex: number) => {
          if (rowIndex === 0) return '#2c3e50';
          if (rowIndex === tableBody.length - 1) return '#95a5a6';
          return (rowIndex % 2 === 0) ? '#f8f9fa' : null;
        }
      },
      margin: [0, 0, 0, 15]
    });
    
    return content;
  }

  // Générer les modes de paiement
  private generateModesPaiement(stats: ModesPaiementStats): any[] {
    const content = [];
    
    content.push({
      text: 'Modes de Paiement',
      style: 'subsectionTitle',
      background: '#ecf0f1',
      margin: [0, 0, 0, 10],
      padding: [10, 5]
    });
    
    // Tableau des modes de paiement
    const tableBody: TableCell[][] = [
      [
        { text: 'Mode de paiement', style: 'tableHeader' },
        { text: 'Montant', style: 'tableHeader', alignment: 'right' },
        { text: 'Transactions', style: 'tableHeader', alignment: 'center' },
        { text: '%', style: 'tableHeader', alignment: 'center' }
      ]
    ];
    
    stats.modesPaiement.forEach(mode => {
      tableBody.push([
        { text: mode.mode, style: 'tableRow' },
        { 
          text: this.formatMontant(mode.montantTotal), 
          style: 'tableRow', 
          alignment: 'right' 
        },
        { 
          text: mode.occurrences.toString(), 
          style: 'tableRow', 
          alignment: 'center' 
        },
        { 
          text: `${mode.pourcentage.toFixed(1)}%`, 
          style: 'tableRow', 
          alignment: 'center' 
        }
      ]);
    });
    
    // Ligne total
    tableBody.push([
      { 
        text: 'TOTAL', 
        style: 'tableFooter' 
      },
      { 
        text: this.formatMontant(stats.modesPaiement.reduce((sum, m) => sum + m.montantTotal, 0)), 
        style: 'tableFooter', 
        alignment: 'right' 
      },
      { 
        text: stats.totalTransactions.toString(), 
        style: 'tableFooter', 
        alignment: 'center' 
      },
      { 
        text: '100%', 
        style: 'tableFooter', 
        alignment: 'center' 
      }
    ]);
    
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: tableBody
      },
      layout: {
        fillColor: (rowIndex: number) => {
          if (rowIndex === 0) return '#2c3e50';
          if (rowIndex === tableBody.length - 1) return '#95a5a6';
          return (rowIndex % 2 === 0) ? '#f8f9fa' : null;
        }
      },
      margin: [0, 0, 0, 15]
    });
    
    return content;
  }

  // Générer les transactions détaillées
  private generateTransactionsDetaillees(titre: string, transactions: TransactionDetail[]): any[] {
    const content = [];
    
    content.push({
      text: titre,
      style: 'subsectionTitle',
      background: '#ecf0f1',
      margin: [0, 0, 0, 10],
      padding: [10, 5]
    });
    
    if (transactions.length === 0) {
      content.push({
        text: 'Aucune transaction pour cette période',
        style: 'normal',
        italics: true,
        alignment: 'center',
        margin: [0, 10, 0, 15]
      });
      return content;
    }
    
    // Tableau des transactions
    const tableBody: TableCell[][] = [
      [
        { text: 'Date', style: 'tableHeader' },
        { text: 'Catégorie', style: 'tableHeader' },
        { text: 'Description', style: 'tableHeader' },
        { text: 'Montant', style: 'tableHeader',alignment: 'right' },
        { text: 'Mode paiement', style: 'tableHeader' }
      ]
    ];
    
    transactions.forEach(trans => {
      const date = new Date(trans.date);
      tableBody.push([
        { 
          text: `${date.toLocaleDateString('fr-FR')}\n${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 
          style: 'tableRow',
          fontSize: 8
        },
        { 
          text: trans.categorie?.name || 'Non classé', 
          style: 'tableRow' 
        },
        { 
          text: trans.description || '-', 
          style: 'tableRow',
          fontSize: 8
        },
        { 
          text: this.formatMontant(trans.montant), 
          style: 'tableRow', 
          alignment: 'right',
          color: titre.includes('Dépenses') ? '#e74c3c' : '#27ae60'
        },
        { 
          text: trans.paymentMode, 
          style: 'tableRow' 
        }
      ]);
    });
    
    // Total
    const total = transactions.reduce((sum, t) => sum + t.montant, 0);
    tableBody.push([
      { 
        text: 'TOTAL', 
        style: 'tableFooter',
        colSpan: 4
      },
      {}, {}, {},
      { 
        text: this.formatMontant(total), 
        style: 'tableFooter', 
        alignment: 'right',
        color: titre.includes('Dépenses') ? '#e74c3c' : '#27ae60'
      }
    ]);
    
    content.push({
      table: {
        headerRows: 1,
        widths: ['15%', '20%', '30%', '15%', '20%'],
        body: tableBody
      },
      layout: {
        fillColor: (rowIndex: number) => {
          if (rowIndex === 0) return '#2c3e50';
          if (rowIndex === tableBody.length - 1) return '#95a5a6';
          return (rowIndex % 2 === 0) ? '#f8f9fa' : null;
        }
      },
      margin: [0, 0, 0, 15]
    });
    
    return content;
  }

  // Générer les données comparatives
  private generateDonneesComparatives(comparatives: DonneesComparativesResponse): any[] {
    const content = [];
    
    content.push({
      text: 'Comparaison sur Plusieurs Périodes',
      style: 'subsectionTitle',
      background: '#ecf0f1',
      margin: [0, 0, 0, 10],
      padding: [10, 5]
    });
    
    // Tableau comparatif
    const tableBody: TableCell[][] = [
      [
        { text: 'Période', style: 'tableHeader' },
        { text: 'Chiffre d\'affaires', style: 'tableHeader', alignment: 'right' },
        { text: 'Dépenses', style: 'tableHeader', alignment: 'right' },
        { text: 'Bénéfice', style: 'tableHeader', alignment: 'right' },
        { text: 'Transactions', style: 'tableHeader', alignment: 'center' }
      ]
    ];
    
    comparatives.donneesPeriodes.forEach(periode => {
      tableBody.push([
        { 
          text: periode.libelle, 
          style: 'tableRow',
          fontSize: 8
        },
        { 
          text: this.formatMontant(periode.chiffreAffaires), 
          style: 'tableRow', 
          alignment: 'right',
          color: '#3498db'
        },
        { 
          text: this.formatMontant(periode.totalDepenses), 
          style: 'tableRow', 
          alignment: 'right',
          color: '#e74c3c'
        },
        { 
          text: this.formatMontant(periode.beneficeNet), 
          style: 'tableRow', 
          alignment: 'right',
          color: periode.beneficeNet >= 0 ? '#27ae60' : '#e74c3c'
        },
        { 
          text: (periode.nbVentes + periode.nbAutresRecettes + periode.nbDepenses).toString(), 
          style: 'tableRow', 
          alignment: 'center' 
        }
      ]);
    });
    
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto'],
        body: tableBody
      },
      layout: {
        fillColor: (rowIndex: number) => {
          if (rowIndex === 0) return '#2c3e50';
          return (rowIndex % 2 === 0) ? '#f8f9fa' : null;
        }
      },
      margin: [0, 0, 0, 15]
    });
    
    return content;
  }

  // Méthodes utilitaires
  private formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(montant) + ' F CFA';
  }

  private calculerMarge(indicateurs: IndicateursFinanciers): number {
    const chiffreAffairesTotal = indicateurs.chiffreAffaires + indicateurs.autresRecettes;
    if (chiffreAffairesTotal === 0) return 0;
    return (indicateurs.beneficeNet / chiffreAffairesTotal) * 100;
  }

  // Méthode principale pour générer le rapport financier complet
  async generateRapportFinancier(
    nomStructure: string,
    periode: string,
    indicateurs: IndicateursFinanciers,
    repartitionDepenses?: RepartitionDepenses,
    repartitionRecettes?: RepartitionRecettes,
    modesPaiementStats?: ModesPaiementStats,
    depensesDetaillees?: TransactionDetail[],
    recettesDetaillees?: TransactionDetail[],
    donneesComparatives?: DonneesComparativesResponse,
    options?: { nomFichier?: string; ouvrir?: boolean }
  ): Promise<void> {
    
    try {
      const content = [];
      
      // En-tête
      content.push(this.getHeader(nomStructure, periode));
      
      // Indicateurs financiers
      content.push(...this.generateIndicateurs(indicateurs));
      
      // Flux de trésorerie
      if (indicateurs.fluxTresorerie) {
        content.push(...this.generateFluxTresorerie(indicateurs.fluxTresorerie));
      }
      
      // Répartition des dépenses
      if (repartitionDepenses && repartitionDepenses.repartition.length > 0) {
        content.push(...this.generateRepartitionDepenses(repartitionDepenses));
      }
      
      // Répartition des recettes
      if (repartitionRecettes && repartitionRecettes.repartition.length > 0) {
        content.push(...this.generateRepartitionRecettes(repartitionRecettes));
      }
      
      // Modes de paiement
      if (modesPaiementStats && modesPaiementStats.modesPaiement.length > 0) {
        content.push(...this.generateModesPaiement(modesPaiementStats));
      }
      
      // Dépenses détaillées
      if (depensesDetaillees && depensesDetaillees.length > 0) {
        content.push(...this.generateTransactionsDetaillees('Détails des Dépenses', depensesDetaillees));
      }
      
      // Recettes détaillées
      if (recettesDetaillees && recettesDetaillees.length > 0) {
        content.push(...this.generateTransactionsDetaillees('Détails des Recettes', recettesDetaillees));
      }
      
      // Données comparatives
      if (donneesComparatives && donneesComparatives.donneesPeriodes.length > 0) {
        content.push(...this.generateDonneesComparatives(donneesComparatives));
      }
      
      // Définition du document
      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 60, 40, 60],
        footer: this.getFooter(),
        content: content,
        styles: this.getStyles(),
        defaultStyle: {
          font: 'Roboto'
        }
      };
      
      // Générer le PDF
      const pdfDoc = pdfMake.createPdf(docDefinition);
      const nomFichier = options?.nomFichier || `rapport-financier-${periode.replace(/\//g, '-')}-${new Date().getTime()}.pdf`;
      
      if (options?.ouvrir) {
        pdfDoc.open();
      } else {
        pdfDoc.download(nomFichier);
      }
      
    } catch (error) {
      console.error('Erreur lors de la génération du rapport financier:', error);
      throw new Error('Impossible de générer le rapport PDF');
    }
  }

  // Méthode simplifiée pour générer un rapport basique
  async generateRapportBasique(
    nomStructure: string,
    periode: string,
    indicateurs: IndicateursFinanciers
  ): Promise<void> {
    return this.generateRapportFinancier(
      nomStructure,
      periode,
      indicateurs,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { nomFichier: `rapport-basique-${periode.replace(/\//g, '-')}.pdf` }
    );
  }

  // Méthode pour générer uniquement les indicateurs (pour impression rapide)
  async generateIndicateursSeuls(
    nomStructure: string,
    periode: string,
    indicateurs: IndicateursFinanciers
  ): Promise<void> {
    try {
      const content = [
        this.getHeader(nomStructure, periode),
        ...this.generateIndicateurs(indicateurs)
      ];
      
      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        content: content,
        styles: this.getStyles()
      };
      
      pdfMake.createPdf(docDefinition).open();
      
    } catch (error) {
      console.error('Erreur génération indicateurs:', error);
      throw error;
    }
  }

}
