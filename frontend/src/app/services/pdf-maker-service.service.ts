/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { Structure } from '../modeles/structure.model';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { TableCell } from 'pdfmake/interfaces';
import { ImageConverterService } from './image-converter.service';


pdfMake.vfs = (pdfFonts as any).vfs;

@Injectable({
  providedIn: 'root'
})
export class PdfMakerServiceService {

  private structureInfo: Structure | null = null;
  private defaultLogo = ''; // Logo par défaut en base64

private imageConverter = inject(ImageConverterService)

  constructor() {
    this.loadDefaultLogo();
  }

  // Charger un logo par défaut
  private async loadDefaultLogo(): Promise<void> {
    try {
      // Vous pouvez créer un logo par défaut ou utiliser une image dans assets
      this.defaultLogo = await this.imageConverter.localImageToBase64('assets/avatar.jp');
    } catch (error) {
      console.warn('Logo par défaut non chargé, utilisation texte à la place',error);
      this.defaultLogo = '';
    }
  }
  setStructureInfo(structure: Structure): void {
    this.structureInfo = structure;
  }

  private async getHeader(): Promise<any> {
    if (!this.structureInfo) {
      return {};
    }

     let logoData = '';
    
    // Convertir le logo en base64 si disponible
    if (this.structureInfo.logo && this.imageConverter.isValidImageUrl(this.structureInfo.logo)) {
      try {
        logoData = await this.imageConverter.imageUrlToBase64(this.structureInfo.logo);
      } catch (error) {
        console.warn('Erreur chargement logo, utilisation du logo par défaut',error);
        logoData = this.defaultLogo;
      }
    } else {
      logoData = this.defaultLogo;
    }
    return {
      columns: [
        {
          width: 'auto',
          stack: [
            // Logo (si disponible)
            this.structureInfo.logo ? {
              image: logoData,
              width: 60,
              height: 60,
              margin: [0, 0, 10, 0]
            } : { text: '', width: 60 },
          ]
        },
        {
          width: '*',
          stack: [
            { text: this.structureInfo.nom_structure || 'Nom de la structure', style: 'header' },
            { text: this.structureInfo.adresse || '', style: 'subheader' },
            { text: `Tél: ${this.structureInfo.telephone || ''}`, style: 'subheader' },
            { text: `Email: ${this.structureInfo.email || ''}`, style: 'subheader' },
            { text: `RC: ${this.structureInfo.registreCommerce || ''}`, style: 'subheader' },
            { text: `NINEA: ${this.structureInfo.numero_identification_fiscale || ''}`, style: 'subheader' }
          ]
        }
      ],
      margin: [0, 0, 0, 20]
    };
  }

  private getFooter(): any {
    return (currentPage: number, pageCount: number) => {
      return {
        columns: [
          {
            text: `Page ${currentPage} sur ${pageCount}`,
            alignment: 'left',
            margin: [40, 0, 0, 0]
          },
          {
            text: this.structureInfo?.nom_structure || 'Structure',
            alignment: 'right',
            margin: [0, 0, 40, 0]
          }
        ],
        margin: [0, 20, 0, 0]
      };
    };
  }

  private getStyles(): any {
    return {
      header: {
        fontSize: 16,
        bold: true,
        margin: [0, 0, 0, 5]
      },
      subheader: {
        fontSize: 10,
        margin: [0, 0, 0, 2]
      },
      title: {
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 10],
        alignment: 'center'
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        fillColor: '#f5f5f5'
      },
      normal: {
        fontSize: 10
      },
      bold: {
        bold: true,
        fontSize: 10
      },
      total: {
        bold: true,
        fontSize: 11,
        fillColor: '#f0f0f0'
      }
    };
  }

  // Générer un ticket de vente
  generateTicket(venteData: any): void {
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A7',
      pageMargins: [10, 10, 10, 10],
      content: [
        this.getHeader(),
        { text: 'TICKET DE VENTE', style: 'title' },
        {
          columns: [
            { text: 'Date:', style: 'bold', width: 'auto' },
            { text: new Date().toLocaleDateString(), style: 'normal', width: '*' }
          ]
        },
        {
          columns: [
            { text: 'Heure:', style: 'bold', width: 'auto' },
            { text: new Date().toLocaleTimeString(), style: 'normal', width: '*' }
          ]
        },
        { text: 'Articles:', style: 'bold', margin: [0, 10, 0, 5] },
        this.generateArticlesTable(venteData.articles),
        { text: `Total: ${venteData.total} F CFA`, style: 'total', margin: [0, 10, 0, 0] },
        { text: 'Merci de votre visite !', style: 'normal', alignment: 'center', margin: [0, 10, 0, 0] }
      ],
      styles: this.getStyles()
    };

    pdfMake.createPdf(docDefinition).open();
  }

  /* // Générer une facture
  async generateFacture(factureData: any): Promise<void> {
    // Valider les données avant génération
  const validatedArticles = this.validateArticlesData(factureData.articles);
  const header = await this.getHeader();

    const docDefinition : TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      header: header,
      footer: this.getFooter(),
      content: [
        { text: 'FACTURE', style: 'title' },
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'CLIENT', style: 'bold', margin: [0, 10, 0, 5] },
                { text: factureData.client.nomComplet || '', style: 'normal' },
                { text: factureData.client.adresse || '', style: 'normal' },
                { text: factureData.client.telephone || '', style: 'normal' },
                { text: factureData.client.email || '', style: 'normal' }
              ]
            },
            {
              width: '50%',
              stack: [
                { text: 'FACTURE', style: 'bold', margin: [0, 10, 0, 5] },
                { text: `Nº: ${factureData.numero}`, style: 'normal' },
                { text: `Date: ${new Date(factureData.date).toLocaleDateString()}`, style: 'normal' },
                { text: `Échéance: ${new Date(factureData.echeance).toLocaleDateString()}`, style: 'normal' }
              ]
            }
          ]
        },
        { text: 'DÉTAIL DES ARTICLES', style: 'bold', margin: [0, 20, 0, 10] },
        this.generateDetailedArticlesTable(validatedArticles),
        this.generateTotals(factureData.totaux),
        { text: 'Conditions de paiement: ' + (factureData.conditionsPaiement || 'Paiement à réception'), style: 'normal', margin: [0, 20, 0, 0] },
        { text: 'Signature', style: 'bold', margin: [0, 40, 0, 0] }
      ],
      styles: this.getStyles()
    };

    pdfMake.createPdf(docDefinition).download(`facture-${factureData.numero}.pdf`);
  }
 */

  // Générer une facture
  async generateFacture(factureData: any): Promise<void> {
    // Valider les données avant génération
  const validatedArticles = this.validateArticlesData(factureData.articles);
  const header = await this.getHeader();

    const docDefinition : TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      header: header,
      footer: this.getFooter(),
      content: [
        { text: 'FACTURE', style: 'title' },
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'CLIENT', style: 'bold', margin: [0, 10, 0, 5] },
                { text: factureData.client.nomComplet || '', style: 'normal' },
                { text: factureData.client.adresse || '', style: 'normal' },
                { text: factureData.client.telephone || '', style: 'normal' },
                { text: factureData.client.email || '', style: 'normal' }
              ]
            },
            {
              width: '50%',
              stack: [
                { text: 'FACTURE', style: 'bold', margin: [0, 10, 0, 5] },
                { text: `Nº: ${factureData.numero}`, style: 'normal' },
                { text: `Date: ${new Date(factureData.date).toLocaleDateString()}`, style: 'normal' },
                { text: `Échéance: ${new Date(factureData.echeance).toLocaleDateString()}`, style: 'normal' }
              ]
            }
          ]
        },
        { text: 'DÉTAIL DES ARTICLES', style: 'bold', margin: [0, 20, 0, 10] },
        this.generateDetailedArticlesTable(validatedArticles),
        this.generateTotals(factureData.totaux),
        { text: 'Conditions de paiement: ' + (factureData.conditionsPaiement || 'Paiement à réception'), style: 'normal', margin: [0, 20, 0, 0] },
        { text: 'Signature', style: 'bold', margin: [0, 40, 0, 0] }
      ],
      styles: this.getStyles()
    };

    pdfMake.createPdf(docDefinition).download(`facture-${factureData.numero}.pdf`);
  }

  // Dans pdf-generator.service.ts

// Méthode spécifique pour les bons fournisseurs
async generateBonFournisseur(bonData: any): Promise<void> {
  try {
    const validatedArticles = this.validateArticlesData(bonData.articles);
    const header = await this.getHeader();

    // Valider le fournisseur
    const fournisseurData = this.validateFournisseurData(bonData.fournisseur);

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      header: header,
      footer: this.getFooter(),
      content: [
        { text: 'BON DE COMMANDE', style: 'title' }, // Titre différent
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'FOURNISSEUR', style: 'bold', margin: [0, 10, 0, 5] },
                { text: fournisseurData.nomComplet, style: 'normal' },
                { text: fournisseurData.adresse, style: 'normal' },
                { text: fournisseurData.telephone, style: 'normal' },
                { text: fournisseurData.email, style: 'normal' }
              ]
            },
            {
              width: '50%',
              stack: [
                { text: 'BON DE COMMANDE', style: 'bold', margin: [0, 10, 0, 5] },
                { text: `Nº: ${bonData.numero || 'N/A'}`, style: 'normal' },
                { text: `Date: ${new Date(bonData.date || new Date()).toLocaleDateString()}`, style: 'normal' },
                { text: `Livraison prévue: ${new Date(bonData.dateLivraison || new Date()).toLocaleDateString()}`, style: 'normal' }
              ]
            }
          ]
        },
        { text: 'DÉTAIL DES ARTICLES', style: 'bold', margin: [0, 20, 0, 10] },
        this.generateDetailedArticlesTable(validatedArticles),
        this.generateTotals(bonData.totaux || {}),
        { text: 'Conditions de livraison: ' + (bonData.conditionsLivraison || 'Livraison sous 7 jours'), style: 'normal', margin: [0, 20, 0, 0] },
        { text: 'Signature', style: 'bold', margin: [0, 40, 0, 0] }
      ],
      styles: this.getStyles()
    };

    pdfMake.createPdf(docDefinition).download(`bon-commande-${bonData.numero || 'sans-numero'}.pdf`);
  } catch (error) {
    console.error('Erreur génération bon fournisseur:', error);
    throw error;
  }
}

// Méthode pour valider les données fournisseur
private validateFournisseurData(fournisseur: any): any {
  if (!fournisseur) {
    return {
      nomComplet: 'Fournisseur non spécifié',
      adresse: '',
      telephone: '',
      email: ''
    };
  }

  return {
    nomComplet: fournisseur.nomComplet || fournisseur.nom || 'Fournisseur non spécifié',
    adresse: fournisseur.adresse || '',
    telephone: fournisseur.telephone || '',
    email: fournisseur.email || ''
  };
}
  // Générer un relevé fournisseur
  async generateReleveFournisseur(releveData: any): Promise<void> {
    // Valider les données avant génération
    const validatedOperations = this.validateOperationsData(releveData.operations);
    const header = await this.getHeader();

    const docDefinition : TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      header: header,
      footer: this.getFooter(),
      content: [
        { text: 'RELEVÉ FOURNISSEUR', style: 'title' },
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'FOURNISSEUR', style: 'bold', margin: [0, 10, 0, 5] },
                { text: releveData.fournisseur.nomComplet || '', style: 'normal' },
                { text: releveData.fournisseur.adresse || '', style: 'normal' },
                { text: releveData.fournisseur.telephone || '', style: 'normal' },
                { text: releveData.fournisseur.email || '', style: 'normal' }
              ]
            },
            {
              width: '50%',
              stack: [
                { text: 'RELEVÉ', style: 'bold', margin: [0, 10, 0, 5] },
                { text: `Période: ${releveData.periode}`, style: 'normal' },
                { text: `Date d'édition: ${new Date().toLocaleDateString()}`, style: 'normal' },
                { text: `Solde: ${releveData.solde} F CFA`, style: 'bold' }
              ]
            }
          ]
        },
        { text: 'OPÉRATIONS', style: 'bold', margin: [0, 20, 0, 10] },
        this.generateOperationsTable(validatedOperations),
        this.generateSyntheseFournisseur(releveData.synthese)
      ],
      styles: this.getStyles()
    };

    pdfMake.createPdf(docDefinition).download(`releve-${releveData.fournisseur.nomComplet}-${releveData.periode}.pdf`);
  }

 private generateArticlesTable(articles: any[]): any {
  // Vérifier si articles est défini et est un tableau
  if (!articles || !Array.isArray(articles)) {
    articles = [];
  }

  const tableBody : TableCell[][] = [
    [
      { text: 'Article', style: 'tableHeader' },
      { text: 'Qte', style: 'tableHeader' },
      { text: 'Total', style: 'tableHeader' }
    ]
  ];

  // Ajouter les articles avec validation
  articles.forEach(article => {
    if (article) { // Vérifier que l'article n'est pas null/undefined
      tableBody.push([
        article.produit?.designation ||article.Produit?.designation || 'N/A',
        article.quantite || 0,
        { text: `${article.total || 0} F CFA`, alignment: 'right' }
      ]);
    }
  });

  // Si aucun article valide, ajouter une ligne vide
  if (tableBody.length === 1) {
    tableBody.push([
      { text: 'Aucun article', colSpan: 3, alignment: 'center' },
      '', ''
    ]);
  }

  return {
    table: {
      widths: ['*', 'auto', 'auto'],
      body: tableBody
    },
    layout: 'lightHorizontalLines'
  };
}

  private generateDetailedArticlesTable(articles: any[]): any {
  // Vérifier si articles est défini et est un tableau
  if (!articles || !Array.isArray(articles)) {
    articles = [];
  }

  const tableBody: TableCell[][] = [
    [
      { text: 'Article', style: 'tableHeader' },
      { text: 'Prix U.', style: 'tableHeader' },
      { text: 'Qte', style: 'tableHeader' },
      { text: 'TVA', style: 'tableHeader' },
      { text: 'Total', style: 'tableHeader' }
    ]
  ];

  // Ajouter les articles avec validation
  articles.forEach(article => {
    if (article) { // Vérifier que l'article n'est pas null/undefined
      tableBody.push([
        article.produit.designation ||article.Produit.designation || 'N/A',
        { text: `${article.prixUnitaire || 0} F CFA`, alignment: 'right' },
        { text: article.quantite || 0, alignment: 'center' },
        { text: `${article.tva || 0}%`, alignment: 'center' },
        { text: `${article.total || 0} F CFA`, alignment: 'right' }
      ]);
    }
  });

  // Si aucun article valide, ajouter une ligne vide
  if (tableBody.length === 1) {
    tableBody.push([
      { text: 'Aucun article', colSpan: 5, alignment: 'center' },
      '', '', '', ''
    ]);
  }

  return {
    table: {
      widths: ['*', 'auto', 'auto', 'auto', 'auto'],
      body: tableBody
    },
    layout: 'lightHorizontalLines'
  };
}

private generateOperationsTable(operations: any[]): any {
  // Vérifier si operations est défini et est un tableau
  if (!operations || !Array.isArray(operations)) {
    operations = [];
  }

  const tableBody: TableCell[][] = [
    [
      { text: 'Date', style: 'tableHeader' },
      { text: 'Type', style: 'tableHeader' },
      { text: 'Référence', style: 'tableHeader' },
      { text: 'Montant', style: 'tableHeader' }
    ]
  ];

  // Ajouter les opérations avec validation
  operations.forEach(op => {
    if (op) { // Vérifier que l'opération n'est pas null/undefined
      tableBody.push([
        op.date ? new Date(op.date).toLocaleDateString() : 'N/A',
        op.type || 'N/A',
        op.numeroVersement || op.Bon.numero || 'N/A',
        { text: `${op.montant || 0} F CFA`, alignment: 'right' }
      ]);
    }
  });

  // Si aucune opération valide, ajouter une ligne vide
  if (tableBody.length === 1) {
    tableBody.push([
      { text: 'Aucune opération', colSpan: 4, alignment: 'center' },
      '', '', ''
    ]);
  }

  return {
    table: {
      widths: ['*', 'auto', 'auto', 'auto'],
      body: tableBody
    },
    layout: 'lightHorizontalLines'
  };
}

  private generateTotals(totaux: any): any {
    return {
      table: {
        widths: ['*', 'auto'],
        body: [
          [
            { text: 'Sous-total HT:', style: 'bold' },
            { text: `${totaux.sousTotal} F CFA`, alignment: 'right', style: 'bold' }
          ],
          [
            { text: `TVA (${totaux.tauxTVA}%):`, style: 'bold' },
            { text: `${totaux.montantTVA} F CFA`, alignment: 'right', style: 'bold' }
          ],
          [
            { text: 'Total TTC:', style: 'total' },
            { text: `${totaux.totalTTC} F CFA`, alignment: 'right', style: 'total' }
          ]
        ]
      },
      margin: [0, 20, 0, 0],
      layout: 'noBorders'
    };
  }

  private generateSyntheseFournisseur(synthese: any): any {
    return {
      table: {
        widths: ['*', 'auto'],
        body: [
          [
            { text: 'Total des commandes:', style: 'bold' },
            { text: `${synthese.totalCommandes} F CFA`, alignment: 'right', style: 'bold' }
          ],
          [
            { text: 'Total des versements:', style: 'bold' },
            { text: `${synthese.totalVersements} F CFA`, alignment: 'right', style: 'bold' }
          ],
          [
            { text: 'Solde à payer:', style: 'total' },
            { text: `${synthese.solde} F CFA`, alignment: 'right', style: 'total' }
          ]
        ]
      },
      margin: [0, 20, 0, 0],
      layout: 'noBorders'
    };
  }


  private validateArticlesData(articles: any[]): any[] {
  if (!articles || !Array.isArray(articles)) {
    return [];
  }

  return articles
    .filter(article => article != null) // Supprimer les null/undefined
    .map(article => ({
      // Assurez-vous que toutes les propriétés nécessaires sont présentes
      ...article,
      designation: article.produit.designation ||article.Produit.designation || 'Produit sans nom',
      prixUnitaire: Number(article.prixUnitaire) || 0,
      quantite: Number(article.quantite) || 0,
      tva: Number(article.tva) || 0,
      total: Number(article.total) || 0,
      
    }));
}

private validateOperationsData(operations: any[]): any[] {
  if (!operations || !Array.isArray(operations)) {
    return [];
  }

  return operations
    .filter(op => op != null) // Supprimer les null/undefined
    .map(op => ({
      date: op.date || new Date(),
      type: op.type || 'NON SPECIFIE',
      reference: op.numeroVersement || op.Bon.numero || 'N/A',
      montant: Number(op.montant) || 0,
      // Assurez-vous que toutes les propriétés nécessaires sont présentes
      ...op
    }));
}


}
