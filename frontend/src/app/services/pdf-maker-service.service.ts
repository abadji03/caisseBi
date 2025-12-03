/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { Structure } from '../modeles/structure.model';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { TableCell } from 'pdfmake/interfaces';
import { ImageConverterService } from './image-converter.service';
import { ArticlePanier } from '../modeles/panier.model';
import { Operation } from '../modeles/operation.model';
import { Fournisseur } from '../modeles/fournisseur.model';


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

// Mettre à jour la méthode de génération du bon fournisseur
async generateBonFournisseur(bonData: any): Promise<void> {
  try {
    console.log('Génération du bon fournisseur avec les données:', bonData);
    
    // Valider et sécuriser les données
    const validatedArticles = this.validateArticlesData(bonData.articles || []);
    const header = await this.getHeader();
    const fournisseurData = this.validateFournisseurData(bonData.fournisseur);

    console.log('Données validées pour le bon fournisseur:', {
      articles: validatedArticles,
      fournisseur: fournisseurData,
      totaux: bonData.totaux
    });

    // --- NOUVEAU : textes dynamiques selon le type de bon ---
    const typeBon = (bonData.typeBon || 'commande').toLowerCase();
    const dateBon = new Date(bonData.dateBon || new Date());

    const livraisonInfo = this.getDynamicLivraisonInfo(typeBon, dateBon);
    const conditionsLivraison = this.getDynamicConditions(typeBon);

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      header: header,
      footer: this.getFooter(),
      content: [
        { text: bonData.titre, style: 'title' },
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
                { text: bonData.titre, style: 'bold', margin: [0, 10, 0, 5] },
                { text: `Nº: ${bonData.numero || 'N/A'}`, style: 'normal' },
                { text: `Date: ${new Date(bonData.date || new Date()).toLocaleDateString()}`, style: 'normal' },
                //{ text: `Livraison prévue: ${new Date().toLocaleDateString()}`, style: 'normal' } // Date fixe pour l'instant
                { text: livraisonInfo, style: 'normal' },
                ...(bonData.statut ? [
                  { text: `Statut: ${bonData.statut}`, style: 'normal' }
                ] : [])
              ]
            }
          ]
        },
        { text: 'DÉTAIL DES ARTICLES', style: 'bold', margin: [0, 20, 0, 10] },
        this.generateDetailedArticlesTable(validatedArticles),
        this.generateTotals(bonData.totaux || {}),
        ...(conditionsLivraison
          ? [{ text: conditionsLivraison, style: 'normal', margin: [0, 20, 0, 0] }]
          : []
        ),
        ...(bonData.commentaire
          ? [{ text: `Commentaire: ${bonData.commentaire}`, style: 'normal', margin: [0, 20, 0, 0] }]
          : []
        ),
        { text: 'Signature', style: 'bold', margin: [0, 40, 0, 0] }
      ],
      styles: this.getStyles()
    };

    console.log('Document definition créé avec succès');
    pdfMake.createPdf(docDefinition).download(`bon-${bonData.typeBon}-${bonData.numero || 'sans-numero'}.pdf`);
  } catch (error) {
    console.error('Erreur génération bon fournisseur:', error);
    // Fallback: générer un PDF basique
    await this.generateBonFournisseurFallback(bonData);
  }
}
private getDynamicConditions(type: string): string | null {
  switch (type) {
    case 'commande':
      return 'Conditions : Livraison estimée sous 7 jours à compter de la date du bon.';
    case 'livraison':
      return null; // pas de condition
    case 'retour':
      return 'Conditions : Retour du matériel conforme aux normes.';
    default:
      return null;
  }
}

private getDynamicLivraisonInfo(type: string, dateBon: Date): string {
  switch (type) {
    case 'commande':
      // eslint-disable-next-line no-case-declarations
      const datePlus7 = new Date(dateBon);
      datePlus7.setDate(datePlus7.getDate() + 7);
      return `Livraison prévue le : ${datePlus7.toLocaleDateString()}`;

    case 'livraison':
      return `Date de livraison : ${new Date().toLocaleDateString()}`;

    case 'retour':
      return `Date de retour : ${new Date().toLocaleDateString()}`;

    default:
      return '';
  }
}

// Méthode de secours
private async generateBonFournisseurFallback(bonData: any): Promise<void> {
  try {
    const validatedArticles = this.validateArticlesData(bonData.articles || []);
    const fournisseurData = this.validateFournisseurData(bonData.fournisseur);

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      content: [
        { text: 'BON DE COMMANDE', style: 'title' },
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
                { text: `Date: ${new Date(bonData.date || new Date()).toLocaleDateString()}`, style: 'normal' }
              ]
            }
          ]
        },
        { text: 'DÉTAIL DES ARTICLES', style: 'bold', margin: [0, 20, 0, 10] },
        this.generateDetailedArticlesTable(validatedArticles),
        { text: `Total: ${this.safeNumber(bonData.totaux?.totalTTC)} F CFA`, style: 'total', margin: [0, 20, 0, 0] },
        { text: 'Signature', style: 'bold', margin: [0, 40, 0, 0] }
      ],
      styles: this.getStyles()
    };

    pdfMake.createPdf(docDefinition).download(`bon-commande-${bonData.numero || 'sans-numero'}-fallback.pdf`);
  } catch (fallbackError) {
    console.error('Erreur même avec fallback:', fallbackError);
    throw new Error('Impossible de générer le PDF');
  }
}

// Méthode pour valider les données fournisseur
private validateFournisseurData(fournisseur: Fournisseur): any {
  if (!fournisseur) {
    return {
      nomComplet: 'Fournisseur non spécifié',
      adresse: '',
      telephone: '',
      email: ''
    };
  }

  return {
    nomComplet: fournisseur.nomComplet || 'Fournisseur non spécifié',
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

 private generateArticlesTable(articles: ArticlePanier[]): any {
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
      const total = (this.safeNumber(article.prixUnitaire )&& this.safeNumber(article.quantite) ? this.safeNumber(article.prixUnitaire) * this.safeNumber(article.quantite) : 0);
      tableBody.push([
        article.produit?.designation ||article.Produit?.designation || 'N/A',
        article.quantite || 0,
        { text: `${total || 0} F CFA`, alignment: 'right' }
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

  // Méthode pour sécuriser les nombres
private generateDetailedArticlesTable(articles: ArticlePanier[]): any {
  // Vérifier si articles est défini et est un tableau
  if (!articles || !Array.isArray(articles)) {
    articles = [];
  }

  const tableBody: TableCell[][] = [
    [
      { text: 'Article', style: 'tableHeader' },
      { text: 'Prix U.', style: 'tableHeader' },
      { text: 'Qte', style: 'tableHeader' },
      { text: 'Total', style: 'tableHeader' }
    ]
  ];

  // Ajouter les articles avec validation
  articles.forEach(article => {
    if (article) {
      // Sécuriser les calculs
      const prixUnitaire = this.safeNumber(article.prixUnitaire);
      const quantite = this.safeNumber(article.quantite);
      const total = prixUnitaire * quantite;

      tableBody.push([
        article?.produit?.designation || article?.Produit?.designation || 'N/A',
        { text: `${prixUnitaire} F CFA`, alignment: 'right' },
        { text: `${quantite}`, alignment: 'center' },
        { text: `${total} F CFA`, alignment: 'right' }
      ]);
    }
  });

  // Si aucun article valide, ajouter une ligne vide
  if (tableBody.length === 1) {
    tableBody.push([
      { text: 'Aucun article', colSpan: 4, alignment: 'center' },
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

private generateOperationsTable(operations: Operation[]): any {
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
        op.dateOperation ? new Date(op.dateOperation).toLocaleDateString() : 'N/A',
        op.type || 'N/A',
        op.numeroVersement || op?.Bon?.numero || 'N/A',
        { text: `${this.safeNumber(op.montantPaye) || this.safeNumber(op.Bon?.montantTotal )||this.safeNumber(op.Bon?.Panier?.totalTTC ) || 0} F CFA`, alignment: 'right' }
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
  // Sécuriser les totaux
  const safeTotaux = {
    sousTotal: this.safeNumber(totaux?.sousTotal || totaux?.totalHT),
    tauxTVA: this.safeNumber(totaux?.tauxTVA),
    montantTVA: this.safeNumber(totaux?.montantTVA || totaux?.tva),
    totalTTC: this.safeNumber(totaux?.totalTTC)
  };

  console.log('Totaux sécurisés pour PDF:', safeTotaux);

  return {
    table: {
      widths: ['*', 'auto'],
      body: [
        [
          { text: 'Sous-total HT:', style: 'bold' },
          { text: `${safeTotaux.sousTotal} F CFA`, alignment: 'right', style: 'bold' }
        ],
        [
          { text: `TVA (${safeTotaux.tauxTVA}%):`, style: 'bold' },
          { text: `${safeTotaux.montantTVA} F CFA`, alignment: 'right', style: 'bold' }
        ],
        [
          { text: 'Total TTC:', style: 'total' },
          { text: `${safeTotaux.totalTTC} F CFA`, alignment: 'right', style: 'total' }
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


  private validateArticlesData(articles: ArticlePanier[]): ArticlePanier[] {
  if (!articles || !Array.isArray(articles)) {
    return [];
  }

  return articles
    .filter(article => article != null) // Supprimer les null/undefined
    .map(article => ({
      // Assurez-vous que toutes les propriétés nécessaires sont présentes
      ...article,
      designation: article.produit?.designation ||article.Produit?.designation || 'Produit sans nom',
      prixUnitaire: this.safeNumber(article.prixUnitaire) || 0,
      quantite: this.safeNumber(article.quantite) || 0,
      //tva: this.safeNumber(panier?.tva) || 0,
      total: this.safeNumber(article.prixUnitaire * article.quantite ) || 0,
      
    }));
}

private validateOperationsData(operations: Operation[]): Operation[] {
  if (!operations || !Array.isArray(operations)) {
    return [];
  }

  return operations
    .filter(op => op != null) // Supprimer les null/undefined
    .map(op => ({
      date: op.dateOperation || new Date(),
      type: op.type || 'NON SPECIFIE',
      reference: op.numeroVersement || op?.Bon?.numero || 'N/A',
      montant: this.safeNumber(op.montantPaye) || this.safeNumber(op?.Bon?.montantTotal)|| 0,
      // Assurez-vous que toutes les propriétés nécessaires sont présentes
      ...op
    }));
}

private safeNumber(value: any): number {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

// Dans pdf-maker-service.service.ts

// Générer un ticket de versement
async generateTicketVersement(versementData: any): Promise<void> {
  try {
    console.log('Génération ticket versement:', versementData);
    
    const header = await this.getHeader();
    
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A5',
      pageMargins: [15, 20, 15, 20],
      header: header,
      content: [
        { 
          //text: 'TICKET DE VERSEMENT', style: 'title', alignment: 'center' 
          text: [
            { text: 'TICKET DE VERSEMENT', style: 'title', alignment: 'center' },
          ],
          margin: [0, 20, 0, 0]

        },
        
        // Informations du fournisseur
        { 
          text: [
            { text: 'Fournisseur: ', style: 'bold' },
            versementData.fournisseur?.nomComplet || 'Non spécifié'
          ],
          margin: [0, 10, 0, 0]
        },
        
        // Ligne séparatrice
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }], margin: [0, 10, 0, 10] },
        
        // Détails du versement
        {
          table: {
            widths: ['*', '*'],
            body: [
              [
                { text: 'Date du versement:', style: 'bold' },
                { text: new Date(versementData.date || new Date()).toLocaleDateString(), alignment: 'right' }
              ],
              [
                { text: 'Heure:', style: 'bold' },
                { text: new Date(versementData.date || new Date()).toLocaleTimeString(), alignment: 'right' }
              ],
              [
                { text: 'Nº de référence:', style: 'bold' },
                { text: versementData.numeroReference || 'N/A', alignment: 'right' }
              ],
              [
                { text: 'Moyen de paiement:', style: 'bold' },
                { text: versementData.moyenPaiement || 'Non spécifié', alignment: 'right' }
              ]
            ]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 15]
        },
        
        // Montants
        {
          table: {
            widths: ['*', '*'],
            body: [
              [
                { text: 'Montant versé:', style: 'bold', fontSize: 12 },
                { text: `${this.safeNumber(versementData.montantVerse)} F CFA`, 
                  alignment: 'right', style: 'bold', fontSize: 12 }
              ],
              [
                { text: 'Solde précédent:', style: 'normal' },
                { text: `${this.safeNumber(versementData.soldePrecedent)} F CFA`, alignment: 'right' }
              ],
              [
                { text: 'Nouveau solde:', style: 'bold', fontSize: 11, fillColor: '#f0f0f0' },
                { text: `${this.safeNumber(versementData.nouveauSolde)} F CFA`, 
                  alignment: 'right', style: 'bold', fontSize: 11, fillColor: '#f0f0f0' }
              ]
            ]
          },
          layout: {
            hLineWidth: function(i, node) {
              return (i === 0 || i === node.table.body.length) ? 0 : 1;
            },
            vLineWidth: () => 0,
            paddingLeft: () => 5,
            paddingRight: () => 5,
            paddingTop: () => 3,
            paddingBottom: () => 3
          },
          margin: [0, 0, 0, 15]
        },
        
        // Description
        ...(versementData.description ? [{
          text: [
            { text: 'Description: ', style: 'bold' },
            versementData.description || ''
          ],
          margin: [0, 0, 0, 10] as [number, number, number, number]
        }] : []),
        
        // Agent
        ...(versementData.agent ? [{
          text: [
            { text: 'Agent: ', style: 'bold' },
            versementData.agent || ''
          ],
          margin: [0, 0, 0, 10] as [number, number, number, number]
        }] : []),
        
        // Message de confirmation
        { 
          text: 'Versement enregistré avec succès', 
          style: 'normal', 
          alignment: 'center',
          margin: [0, 15, 0, 0]
        },
        
        // Signature
        {
          columns: [
            { text: '', width: '*' },
            {
              stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 1 }] },
                { text: 'Signature', style: 'subheader', alignment: 'center', margin: [0, 2, 0, 0] }
              ],
              width: 'auto'
            }
          ],
          margin: [0, 20, 0, 0]
        },
        
        // Pied de page
        { 
          text: 'Conservez ce ticket comme preuve de versement', 
          style: 'subheader', 
          alignment: 'center',
          margin: [0, 20, 0, 0],
          fontSize: 8
        }
      ],
      styles: {
        ...this.getStyles(),
        title: {
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 10],
          alignment: 'center'
        }
      }
    };

    pdfMake.createPdf(docDefinition).open();
    
  } catch (error) {
    console.error('Erreur génération ticket versement:', error);
    // Fallback simple
    this.generateTicketVersementFallback(versementData);
  }
}

// Méthode de secours pour le ticket de versement
private generateTicketVersementFallback(versementData: any): void {
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A6',
    pageMargins: [15, 20, 15, 20],
    content: [
      { text: 'TICKET DE VERSEMENT', style: 'title', alignment: 'center' },
      { text: `Fournisseur: ${versementData.fournisseur?.nomComplet || 'Non spécifié'}`, margin: [0, 5, 0, 0] },
      { text: `Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, margin: [0, 5, 0, 0] },
      { text: `Montant versé: ${this.safeNumber(versementData.montantVerse)} F CFA`, style: 'bold', margin: [0, 10, 0, 0] },
      { text: `Solde restant: ${this.safeNumber(versementData.nouveauSolde)} F CFA`, style: 'bold', margin: [0, 5, 0, 0] },
      { text: `Référence: ${versementData.numeroReference || 'N/A'}`, margin: [0, 5, 0, 0] },
      { text: 'Conservez ce ticket comme preuve', alignment: 'center', margin: [0, 15, 0, 0], fontSize: 8 }
    ],
    styles: {
      title: {
        fontSize: 14,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      bold: {
        bold: true,
        fontSize: 10
      }
    }
  };

  pdfMake.createPdf(docDefinition).open();
}
}
