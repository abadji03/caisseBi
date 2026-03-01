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
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';



pdfMake.vfs = (pdfFonts as any).vfs;
(pdfMake as any).fonts = {
   Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    }
  };


@Injectable({
  providedIn: 'root'
})
export class PdfMakerServiceService {

  private structureInfo: Structure | null = null;
  private defaultLogo = ''; // Logo par défaut en base64

private imageConverter = inject(ImageConverterService)

private apiUrl = 'http://localhost:5000/api/kpi-caisse';
  
private http = inject(HttpClient);

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

  private async getHeader(isCompact= false): Promise<any> {
  // Si pas de structure info, retourner un header minimal
  if (!this.structureInfo) {
    return {
      text: 'ENTREPRISE NON CONFIGURÉE',
      style: 'header',
      alignment: 'center',
      margin: [0, 0, 0, 10]
    };
  }

  let logoData = '';
  
  // Convertir le logo en base64 si disponible
  if (this.structureInfo.logo && this.imageConverter.isValidImageUrl(this.structureInfo.logo)) {
    try {
      logoData = await this.imageConverter.imageUrlToBase64(this.structureInfo.logo);
    } catch (error) {
      console.warn('Erreur chargement logo, utilisation du logo par défaut', error);
      logoData = this.defaultLogo;
    }
  } else {
    logoData = this.defaultLogo;
  }

  // Header compact pour tickets (A7/A6)
  if (isCompact) {
    return {
      columns: [
        // Logo seulement si disponible
        ...(logoData ? [{
          image: logoData,
          width: 30,
          height: 30,
          margin: [0, 0, 5, 0]
        }] : []),
        {
          width: '*',
          stack: [
            { 
              text: this.structureInfo.nom_structure || 'Entreprise', 
              style: 'compactHeader',
              alignment: 'center'
            },
            ...(this.structureInfo.telephone ? [
              { 
                text: `Tél: ${this.structureInfo.telephone}`, 
                style: 'compactSubheader',
                alignment: 'center'
              }
            ] : []),
            ...(this.structureInfo.adresse ? [
              { 
                text: this.structureInfo.adresse, 
                style: 'compactSubheader',
                alignment: 'center',
                fontSize: 6
              }
            ] : [])
          ],
          alignment: 'center'
        }
      ],
      margin: [0, 0, 0, 10]
    };
  }

  // Header complet pour factures (A4)
  return {
    columns: [
      {
        width: 'auto',
        stack: [
          ...(logoData ? [{
            image: logoData,
            width: 60,
            height: 60,
            margin: [0, 0, 10, 0]
          }] : [])
        ]
      },
      {
        width: '*',
        stack: [
          { 
            text: this.structureInfo.nom_structure || 'Nom de la structure', 
            style: 'header',
            alignment: 'left'
          },
          /* ...(this.structureInfo.devise ? [
            { 
              text: this.structureInfo.devise, 
              style: 'slogan',
              alignment: 'left'
            }
          ] : []), */
          ...(this.structureInfo.adresse ? [
            { 
              text: this.structureInfo.adresse, 
              style: 'subheader',
              alignment: 'left'
            }
          ] : []),
          ...(this.structureInfo.telephone ? [
            { 
              text: `Tél: ${this.structureInfo.telephone}`, 
              style: 'subheader',
              alignment: 'left'
            }
          ] : []),
          ...(this.structureInfo.email ? [
            { 
              text: `Email: ${this.structureInfo.email}`, 
              style: 'subheader',
              alignment: 'left'
            }
          ] : []),
          ...(this.structureInfo.registreCommerce ? [
            { 
              text: `RC: ${this.structureInfo.registreCommerce}`, 
              style: 'subheader',
              alignment: 'left'
            }
          ] : []),
          ...(this.structureInfo.numero_identification_fiscale ? [
            { 
              text: `NINEA: ${this.structureInfo.numero_identification_fiscale}`, 
              style: 'subheader',
              alignment: 'left'
            }
          ] : [])
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
    compactHeader: {
      fontSize: 10,
      bold: true,
      margin: [0, 0, 0, 2]
    },
    subheader: {
      fontSize: 9,
      margin: [0, 0, 0, 2],
      color: '#555555'
    },
    compactSubheader: {
      fontSize: 7,
      margin: [0, 0, 0, 1],
      color: '#666666'
    },
    slogan: {
      fontSize: 10,
      italic: true,
      color: '#888888',
      margin: [0, 0, 0, 5]
    },
    title: {
      fontSize: 14,
      bold: true,
      margin: [0, 10, 0, 10],
      alignment: 'center'
    },
    tableHeader: {
      bold: true,
      fontSize: 9,
      fillColor: '#f5f5f5'
    },
    normal: {
      fontSize: 9
    },
    bold: {
      bold: true,
      fontSize: 9
    },
    total: {
      bold: true,
      fontSize: 10,
      fillColor: '#f0f0f0'
    },
    footerText: {
      fontSize: 8,
      color: '#777777'
    }
  };
}

  // Générer un ticket de vente
  generateTicket(venteData: any): void {
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A7',
      pageMargins: [10, 10, 10, 10],
      content: [
        this.getHeader(true),
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
  const header = await this.getHeader(false);

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
    const header = await this.getHeader(false);
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
    const header = await this.getHeader(false);

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
      { text: 'Remise', style: 'tableHeader' },
      { text: 'TVA', style: 'tableHeader' },
      { text: 'Total HT', style: 'tableHeader' },
      { text: 'Total TTC', style: 'tableHeader' }
    ]
  ];

  // Ajouter les articles avec validation
  articles.forEach(article => {
    if (article) {
      
      tableBody.push([
        //article?.produit?.designation || article?.Produit?.designation || 'N/A',
        { text: `${article?.produit?.designation || article?.Produit?.designation} `, style:'normal', alignment: 'left' },
        { text: `${this.safeNumber(article.prixUnitaire)} F CFA`, style:'normal', alignment: 'right' },
        { text: `${article.quantite}`,style:'normal', alignment: 'center' },
        { text: `${this.safeNumber(article.montantRemise)} F CFA`,style:'normal', alignment: 'right' },
        { text: `${this.safeNumber(article.montantTVA)} F CFA`,style:'normal', alignment: 'right' },
        { text: `${this.safeNumber(article.totalHT)} F CFA`,style:'normal', alignment: 'right' },
        { text: `${this.safeNumber(article.totalTTC)} F CFA`,style:'normal', alignment: 'right' }
      ]);
    }
  });

  // Si aucun article valide, ajouter une ligne vide
  if (tableBody.length === 1) {
    tableBody.push([
      { text: 'Aucun article', colSpan: 7, alignment: 'center' },
      '', '', '', '', '', ''
    ]);
  }

  return {
    table: {
      widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
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
      { text: 'Date et Heure', style: 'tableHeader' },
      { text: 'Type', style: 'tableHeader' },
      { text: 'Description', style: 'tableHeader' },
      { text: 'Référence', style: 'tableHeader' },
      { text: 'Montant', style: 'tableHeader' }
    ]
  ];

  // Ajouter les opérations avec validation
  operations.forEach(op => {
    if (op) { // Vérifier que l'opération n'est pas null/undefined
      tableBody.push([
        { 
          text: `${op.dateOperation ? 
            new Date(op.dateOperation).toLocaleString('fr-FR', { 
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }).replace(',', ' à') : 'N/A'}`, 
          style:'normal', 
          alignment: 'left' 
        },        
        { text: `${op.type || 'N/A'}`, style:'normal', alignment: 'center' },
        { text: `${op.commentaire || 'N/A'}`, style:'normal', alignment: 'center' },
        { text: `${op.numeroVersement || op?.Bon?.numero || 'N/A'}`, style:'normal', alignment: 'left' },
        { text: `${this.safeNumber(op.montantPaye) || this.safeNumber(op.Bon?.montantTotal )||this.safeNumber(op.Bon?.Panier?.totalTTC ) || 0} F CFA`, style:'normal', alignment: 'center' }
      ]);
    }
  });

  // Si aucune opération valide, ajouter une ligne vide
  if (tableBody.length === 1) {
    tableBody.push([
      { text: 'Aucune opération', colSpan: 5, alignment: 'center' },
      '', '', ''
    ]);
  }

  return {
    table: {
      widths: ['*', 'auto', 'auto', 'auto','auto'],
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
          { text: `TVA :`, style: 'bold' },
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
            { text: 'Total des livraisons:', style: 'bold' },
            { text: `${synthese.totalLivraison} F CFA`, alignment: 'right', style: 'bold' }
          ],
          [
            { text: 'Total des retours:', style: 'bold' },
            { text: `${synthese.totalRetours} F CFA`, alignment: 'right', style: 'bold' }
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

private validateArticlesData(articles: any[]): ArticlePanier[] {
  if (!articles || !Array.isArray(articles)) {
    return [];
  }

  return articles
    .filter(article => article != null)
    .map(articleData => {
      // Créer une instance de ArticlePanier à partir des données
      const articlePanier = new ArticlePanier({
        id: articleData.id,
        produitId: articleData.produitId,
        panierId: articleData.panierId,
        produit: articleData.produit || articleData.Produit,
        prixUnitaire: this.safeNumber(articleData.prixUnitaire) || 0,
        quantite: this.safeNumber(articleData.quantite) || 0,
        prixVenteUnitaire: articleData.prixVenteUnitaire || 0,
        prixAchatUnitaire: articleData.prixAchatUnitaire || 0,
        stock: articleData.stock,
        remise: articleData.remise || 0,
        tauxTVA: articleData.tauxTVA || 0,
        montantTVA: articleData.montantTVA,
        montantRemise: articleData.montantRemise,
        totalHT: articleData.totalHT,
        totalTTC: articleData.totalTTC
      });

      // Calculer les totaux si nécessaire
      if (!articleData.totalHT || !articleData.totalTTC) {
        articlePanier.calculerTotauxArticle();
      }

      return articlePanier;
    });
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
    
    const header = await this.getHeader(false);
    
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
                { text: new Date(versementData.date || new Date()).toLocaleDateString(),style:'normal', alignment: 'right' }
              ],
              [
                { text: 'Heure:', style: 'bold' },
                { text: new Date(versementData.date || new Date()).toLocaleTimeString(),style:'normal', alignment: 'right' }
              ],
              [
                { text: 'Nº de référence:', style: 'bold' },
                { text: versementData.numeroReference || 'N/A',style:'normal', alignment: 'right' }
              ],
              [
                { text: 'Moyen de paiement:', style: 'bold' },
                { text: versementData.moyenPaiement || 'Non spécifié',style:'normal', alignment: 'right' }
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
                { text: `${this.safeNumber(versementData.soldePrecedent)} F CFA`,style:'normal', alignment: 'right' }
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
          ], style:'normal',
          margin: [0, 0, 0, 10] as [number, number, number, number]
        }] : []),
        
        // Agent
        ...(versementData.agent ? [{
          text: [
            { text: 'Agent: ', style: 'bold' },
            versementData.agent || ''
          ], style: 'normal',
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

//...........................Méthodes pour la vente dans le composant Caisse......................

/**
 * Génère un ticket de caisse automatique (sans infos client)
 */
async generateTicketCaisse(panier: any, agent?: any): Promise<void> {
  try {
    const header = await this.getHeader(true);
    const currentDate = new Date();
    
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A6',
      pageMargins: [15, 15, 15, 15],
      content: [
        header,
        { text: 'TICKET DE CAISSE', style: 'title', alignment: 'center' },
        
        // Informations de base
        {
          columns: [
            { text: 'Date:', style: 'bold', width: 'auto' },
            { text: currentDate.toLocaleDateString(), style: 'normal', width: '*' }
          ]
        },
        {
          columns: [
            { text: 'Heure:', style: 'bold', width: 'auto' },
            { text: currentDate.toLocaleTimeString(), style: 'normal', width: '*' }
          ]
        },
        {
          columns: [
            { text: 'Ticket Nº:', style: 'bold', width: 'auto' },
            { text: panier.id || 'N/A', style: 'normal', width: '*' }
          ]
        },
        ...(agent ? [{
          columns: [
            { text: 'Caissier:', style: 'bold', width: 'auto' },
            { text: agent.nom || 'N/A', style: 'normal', width: '*' }
          ]
        }] : []),
        
        // Ligne séparatrice
        //{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1 }], margin: [0, 5, 0, 5] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 250, y2: 0, lineWidth: 1 }], margin: [0, 5, 0, 5] },
        // Articles
        { text: 'Articles:', style: 'bold', margin: [0, 5, 0, 2] },
        this.generateDetailedTicketTable(panier.articles || panier.ArticlePaniers || []),
        
        // Totaux
        { text: 'Récapitulatif:', style: 'bold', margin: [0, 5, 0, 2] },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              /* ...(panier.remise > 0 ? [
                [
                  { text: 'Remise:', style: 'normal' },
                  { text: `-${this.safeNumber(panier.remise)} F CFA`,style: 'normal', alignment: 'right' }
                ]
              ] : []), */
              [
                { text: 'Sous-total:', style: 'normal' },
                { text: `${this.safeNumber(panier.totalHT)} F CFA`,style: 'normal', alignment: 'right' }
              ],
              /* ...(panier.tva > 0 ? [
                [
                  { text: `TVA:`, style: 'normal' },
                  { text: `${this.safeNumber(panier.tva)} F CFA`,style: 'normal', alignment: 'right' }
                ]
              ] : []), */
              [
                { text: 'Total TTC:', style: 'bold' },
                { text: `${this.safeNumber(panier.totalTTC)} F CFA`, alignment: 'right', style: 'bold' }
              ]
            ]
          },
          layout: 'noBorders'
        },
        
        // Mode de paiement
        ...(panier.Paiements?.length > 0 ? [{
          columns: [
            { text: 'Mode de Paiement:', style: 'bold', width: 'auto' },
            { text: panier.Paiements[0]?.methodePaiement || 'Espèce', style: 'normal', width: '*' }
          ],
          margin: [0, 5, 0, 0]
        }] : []),
        
        // Message de fin
        { text: 'Merci de votre visite !', style: 'normal', alignment: 'center', margin: [0, 10, 0, 0] },
        { text: this.structureInfo?.telephone || '', style: 'subheader', alignment: 'center', fontSize: 8 }
      ],
      styles: {
        ...this.getStyles(),
        title: {
          fontSize: 12,
          bold: true,
          margin: [0, 0, 0, 5],
          alignment: 'center'
        }
      }
    };

    // Ouvrir dans un nouvel onglet pour impression
    pdfMake.createPdf(docDefinition).open();
    
  } catch (error) {
    console.error('Erreur génération ticket caisse:', error);
    this.generateTicketCaisseFallback(panier);
  }
}

/**
 * Génère un ticket de vente avec informations client
 */
async generateTicketVente(panier: any, client: any, agent?: any): Promise<void> {
  try {
    const header = await this.getHeader(true);
    const currentDate = new Date();
    
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A6',
      pageMargins: [15, 15, 15, 15],
      content: [
        header,
        { text: 'TICKET DE VENTE', style: 'title', alignment: 'center' },
        
        // Informations client
        { text: 'CLIENT', style: 'subheader', margin: [0, 5, 0, 2] },
        {
          stack: [
            { text: client.nomComplet || 'Client non enregistré', style: 'bold' },
            ...(client.telephone ? [{ text: `Tél: ${client.telephone}`, style: 'normal' }] : []),
            ...(client.adresse ? [{ text: `Adr: ${client.adresse}`, style: 'normal' }] : [])
          ],
          margin: [0, 0, 0, 5]
        },
        
        // Informations transaction
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'Date:', style: 'bold' },
                { text: currentDate.toLocaleDateString(), style: 'normal' }
              ]
            },
            {
              width: '50%',
              stack: [
                { text: 'Heure:', style: 'bold' },
                { text: currentDate.toLocaleTimeString(), style: 'normal' }
              ]
            }
          ]
        },
        {
          columns: [
            { text: 'Ticket Nº:', style: 'bold', width: 'auto' },
            { text: panier.id || 'N/A', style: 'normal', width: '*' }
          ]
        },
        
        // Ligne séparatrice
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 250, y2: 0, lineWidth: 1 }], margin: [0, 5, 0, 5] },
        
        // Articles détaillés
        { text: 'DÉTAIL DE LA VENTE', style: 'bold', margin: [0, 5, 0, 2] },
        this.generateDetailedTicketTable(panier.articles || panier.ArticlePaniers || []),
        
        // Récapitulatif
        { text: 'RÉCAPITULATIF', style: 'bold', margin: [0, 5, 0, 2] },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              /* ...(panier.remise > 0 ? [
                [
                  { text: 'Remise:', style: 'normal' },
                  { text: `-${this.safeNumber(panier.remise)} F CFA`,style: 'normal', alignment: 'right' }
                ]
              ] : []), */
              [
                { text: 'Total HT:', style: 'normal' },
                { text: `${this.safeNumber(panier.totalHT)} F CFA`,style: 'normal', alignment: 'right' }
              ],
              /* ...(panier.tva > 0 ? [
                [
                  { text: 'TVA:', style: 'normal' },
                  { text: `${this.safeNumber(panier.tva)} F CFA`, style: 'normal', alignment: 'right' }
                ]
              ] : []), */
              [
                { text: 'Total TTC:', style: 'total' },
                { text: `${this.safeNumber(panier.totalTTC)} F CFA`, alignment: 'right', style: 'total' }
              ],
              ...(panier.Paiements?.length > 0 ? [
                [
                  { text: 'Mode paiement:', style: 'bold' },
                  { text: panier.Paiements[0]?.methodePaiement || 'Espèce', alignment: 'right', style: 'bold' }
                ]
              ] : [])
            ]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 10]
        },
        
        // Agent et signature
        {
          columns: [
            { text: `Caissier: ${agent?.nom || 'N/A'}`, style: 'normal', width: '*' },
            {
              stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 80, y2: 0, lineWidth: 1 }] },
                { text: 'Signature', style: 'subheader', alignment: 'center', fontSize: 7 }
              ],
              width: 'auto'
            }
          ]
        },
        
        // Message
        { text: 'Merci pour votre confiance !', style: 'normal', alignment: 'center', margin: [0, 10, 0, 0] },
        { text: 'Service après-vente disponible', style: 'subheader', alignment: 'center', fontSize: 7 }
      ],
      styles: {
        ...this.getStyles(),
        title: {
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 5],
          alignment: 'center'
        },
        subheader: {
          fontSize: 9,
          bold: true,
          margin: [0, 0, 0, 2]
        }
      }
    };

    pdfMake.createPdf(docDefinition).open();
    
  } catch (error) {
    console.error('Erreur génération ticket vente:', error);
    this.generateTicketVenteFallback(panier, client);
  }
}

/**
 * Tableau détaillé pour ticket avec client
 */
private generateDetailedTicketTable(articles: any[]): any {
  const validatedArticles = this.validateArticlesData(articles);
  
  const tableBody: TableCell[][] = [
    [
      { text: 'Désignation', style: 'tableHeader', fontSize: 7 },
      { text: 'Qte', style: 'tableHeader', fontSize: 7 },
      { text: 'P.U.', style: 'tableHeader', fontSize: 7 },
      { text: 'Remise', style: 'tableHeader', fontSize: 7 },
      { text: 'TVA', style: 'tableHeader', fontSize: 7 },
      { text: 'Total', style: 'tableHeader', fontSize: 7 }
    ]
  ];
  
  validatedArticles.forEach(article => {
    tableBody.push([
      { text: (article.produit?.designation || article.Produit?.designation || 'Article').substring(0, 20), fontSize: 7 },
      { text: `${article.quantite}`, fontSize: 7, alignment: 'center' },
      { text: `${this.safeNumber(article.prixUnitaire)}`, fontSize: 7, alignment: 'right' },
      { text: `${this.safeNumber(article.montantRemise)}`, fontSize: 7, alignment: 'right' },
      { text: `${this.safeNumber(article.montantTVA)}`, fontSize: 7, alignment: 'right' },
      { text: `${this.safeNumber(article.totalTTC)}`, fontSize: 7, alignment: 'right' }
    ]);
  });
  
  return {
    table: {
      widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
      body: tableBody
    },
    layout: 'lightHorizontalLines'
  };
}

/**
 * Méthodes de secours
 */
private generateTicketCaisseFallback(panier: any): void {
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A7',
    pageMargins: [5, 5, 5, 5],
    content: [
      { text: 'TICKET DE CAISSE', style: 'title', alignment: 'center' },
      { text: `Nº: ${panier.id || 'N/A'}`, alignment: 'center' },
      { text: `Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, fontSize: 8 },
      { text: '---', alignment: 'center', fontSize: 8 },
      ...((panier.articles || panier.ArticlePaniers || []).map((article: any) => ({
        text: `${article.quantite} x ${article.produit?.designation || 'Article'} = ${article.totalTTC || 0} F CFA`,
        fontSize: 8
      }))),
      { text: '---', alignment: 'center', fontSize: 8 },
      { text: `TOTAL: ${panier.totalTTC || 0} F CFA`, style: 'bold', alignment: 'center' },
      { text: 'Merci !', alignment: 'center', fontSize: 8 }
    ],
    styles: {
      title: { fontSize: 10, bold: true, margin: [0, 0, 0, 5] },
      bold: { bold: true, fontSize: 9 }
    }
  };
  
  pdfMake.createPdf(docDefinition).open();
}

private generateTicketVenteFallback(panier: any, client: any): void {
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A6',
    pageMargins: [10, 10, 10, 10],
    content: [
      { text: 'TICKET DE VENTE', style: 'title', alignment: 'center' },
      { text: `Client: ${client.nomComplet || 'Non enregistré'}`, fontSize: 9 },
      { text: `Date: ${new Date().toLocaleString()}`, fontSize: 8 },
      { text: '---', alignment: 'center', fontSize: 8 },
      { text: `Total: ${panier.totalTTC || 0} F CFA`, style: 'bold', alignment: 'center' },
      { text: 'Merci pour votre confiance !', alignment: 'center', fontSize: 8 }
    ],
    styles: {
      title: { fontSize: 12, bold: true, margin: [0, 0, 0, 5] }
    }
  };
  
  pdfMake.createPdf(docDefinition).open();
}

//...........................Méthodes pour la vente dans le composant Client......................
/**
 * Génère un relevé client détaillé
 */
async generateReleveClient(releveData: any): Promise<void> {
  try {
    console.log('Génération relevé client avec données:', releveData);
    
    const header = await this.getHeader(false);
    const currentDate = new Date();
    
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      header: header,
      footer: this.getFooter(),
      content: [
        { text: 'RELEVÉ CLIENT', style: 'title' },
        
        // Informations client
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'CLIENT', style: 'bold', margin: [0, 10, 0, 5] },
                { text: releveData.client.nomComplet || 'N/A', style: 'normal' },
                { text: releveData.client.adresse || '', style: 'normal' },
                { text: releveData.client.telephone || '', style: 'normal' },
                { text: releveData.client.email || '', style: 'normal' },
                { text: `Plafond: ${releveData.client.plafond || 0} F CFA`, style: 'normal' }
              ]
            },
            {
              width: '50%',
              stack: [
                { text: 'RELEVÉ', style: 'bold', margin: [0, 10, 0, 5] },
                { text: `Période: ${releveData.periode}`, style: 'normal' },
                { text: `Date d'édition: ${currentDate.toLocaleDateString()}`, style: 'normal' },
                { text: `Heure: ${currentDate.toLocaleTimeString()}`, style: 'normal' },
                { text: `Solde: ${releveData.solde || 0} F CFA`, style: 'bold' }
              ]
            }
          ]
        },
        
        { text: 'OPÉRATIONS', style: 'bold', margin: [0, 20, 0, 10] },
        this.generateOperationsTableClient(releveData.operations),
        this.generateSyntheseClient(releveData.synthese),
        
        // Conditions et mentions
        { 
          text: 'Ce relevé fait foi des transactions effectuées.', 
          style: 'normal', 
          margin: [0, 20, 0, 0] 
        },
        { 
          text: 'En cas de divergence, prière de contacter le service client.', 
          style: 'normal', 
          margin: [0, 5, 0, 0] 
        }
      ],
      styles: this.getStyles()
    };

    const fileName = `releve-client-${releveData.client.nomComplet?.replace(/\s+/g, '-') || 'client'}-${releveData.periode.replace(/\//g, '-')}.pdf`;
    pdfMake.createPdf(docDefinition).download(fileName);
    
  } catch (error) {
    console.error('Erreur génération relevé client:', error);
    //this.toastr.error('Erreur lors de la génération du relevé');
  }
}

/**
 * Tableau d'opérations adapté pour les clients
 */
private generateOperationsTableClient(operations: any[]): any {
  if (!operations || !Array.isArray(operations)) {
    operations = [];
  }

  const tableBody: TableCell[][] = [
    [
      { text: 'Date', style: 'tableHeader' },
      { text: 'Type', style: 'tableHeader' },
      { text: 'Référence', style: 'tableHeader' },
      { text: 'Description', style: 'tableHeader' },
      { text: 'Montant', style: 'tableHeader' },
      /* { text: 'Crédit', style: 'tableHeader' } */
    ]
  ];

  // Ajouter les opérations avec validation
  operations.forEach(op => {
    if (op) {
      const dateStr = op.dateOperation ? 
                      new Date(op.dateOperation).toLocaleString('fr-FR', { 
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).replace(',', ' à') : 'N/A';
      const type = op.type || 'N/A';
      const reference = op.numeroVersement || op?.Bon?.numero || op.id || 'N/A';
      const description = op.commentaire || op?.Bon?.description || 'Opération';
      const montant = op.montantPaye || 0;
      
      // Déterminer débit/crédit selon le type d'opération
      /* const montant = this.safeNumber(op.montantPaye) || this.safeNumber(op?.Bon?.Panier?.totalTTC) || 0;
      let debit = '';
      let credit = '';
      
      if (type === 'COMMANDE' || type === 'VENTE') {
        debit = `${montant} F CFA`;
      } else if (type === 'VERSEMENT' || type === 'REGLEMENT') {
        credit = `${montant} F CFA`;
      } */

      tableBody.push([
        { text: dateStr, style: 'normal', alignment: 'left' },
        { text: type, style: 'normal', alignment: 'left' },
        { text: reference, style: 'normal', alignment: 'left' },
        { text: description, style: 'normal', alignment: 'center' },
        { text: montant,style:'normal', alignment: 'right' }
      ]);
    }
  });

  // Si aucune opération valide, ajouter une ligne vide
  if (tableBody.length === 1) {
    tableBody.push([
      { text: 'Aucune opération', colSpan: 5, alignment: 'center' },
      '', '', '', ''
    ]);
  }

  return {
    table: {
      widths: ['*', 'auto', 'auto', '*', 'auto'],
      body: tableBody
    },
    layout: 'lightHorizontalLines'
  };
}

/**
 * Synthèse financière pour client
 */
private generateSyntheseClient(synthese: any): any {
  return {
    table: {
      widths: ['*', 'auto'],
      body: [
        [
          { text: 'Total des achats:', style: 'bold' },
          { text: `${synthese.totalAchats || 0} F CFA`, alignment: 'right', style: 'bold' }
        ],
        [
          { text: 'Total des versements:', style: 'bold' },
          { text: `${synthese.totalVersements || 0} F CFA`, alignment: 'right', style: 'bold' }
        ],
        // [
        //   { text: 'Solde initial:', style: 'normal' },
        //   { text: `${synthese.soldeInitial || 0} F CFA`, alignment: 'right' }
        // ],
        [
          { text: 'Solde:', style: 'total' },
          { text: `${synthese.nouveauSolde || 0} F CFA`, alignment: 'right', style: 'total' }
        ]
      ]
    },
    margin: [0, 20, 0, 0],
    layout: 'noBorders'
  };
}

/**
 * Génère une facture client détaillée
 */
async generateFactureClient(factureData: any): Promise<void> {
  try {
    console.log('Génération facture client avec données:', factureData);
    
    const header = await this.getHeader(false);
    //const currentDate = new Date();
    
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      header: header,
      footer: this.getFooter(),
      content: [
        { text: 'FACTURE', style: 'title' },
        
        // Informations client
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'CLIENT', style: 'bold', margin: [0, 10, 0, 5] },
                { text: factureData.client.nomComplet || 'N/A', style: 'normal' },
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
                { text: `Date échéance: ${new Date(factureData.dateEcheance).toLocaleDateString()}`, style: 'normal' },
                { text: `Réf bon: ${factureData.refBon || 'N/A'}`, style: 'normal' }
              ]
            }
          ]
        },
        
        { text: 'DÉTAIL DES ARTICLES', style: 'bold', margin: [0, 20, 0, 10] },
        this.generateDetailedArticlesTable(factureData.articles),
        this.generateTotals(factureData.totaux),
        
        // Conditions de paiement
        {
          stack: [
            { text: 'Conditions de paiement:', style: 'bold', margin: [0, 10, 0, 5] },
            { text: factureData.conditionsPaiement || 'Paiement à réception de la facture', style: 'normal',alignment:'right' }
          ]
        },
        
        // Mentions légales
        {
          stack: [
            { text: 'Mentions légales:', style: 'bold', margin: [0, 20, 0, 5] },
            { text: 'Cette facture est établie conformément aux dispositions légales en vigueur.', style: 'normal', fontSize: 9 },
            { text: 'Toute contestation doit être notifiée par écrit dans les 8 jours suivant réception.', style: 'normal', fontSize: 9 }
          ]
        },
        
        // Signature
        {
          columns: [
            { text: '', width: '*' },
            {
              stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1 }] },
                { text: 'Signature et cachet', style: 'subheader', alignment: 'center', margin: [0, 5, 0, 0] }
              ],
              width: 'auto',
              margin: [0, 40, 0, 0]
            }
          ]
        }
      ],
      styles: this.getStyles()
    };

    const fileName = `facture-${factureData.numero}-${factureData.client.nomComplet?.replace(/\s+/g, '-') || 'client'}.pdf`;
    pdfMake.createPdf(docDefinition).download(fileName);
    
  } catch (error) {
    console.error('Erreur génération facture client:', error);
    //this.toastr.error('Erreur lors de la génération de la facture');
  }
}

/**
 * Génère un bon de commande client
 */
async generateBonClient(bonData: any): Promise<void> {
  try {
    console.log('Génération bon client avec données:', bonData);
    
    const header = await this.getHeader(false);

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
        { text: bonData.titre || 'BON DE COMMANDE', style: 'title' },
        
        // Informations client
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'CLIENT', style: 'bold', margin: [0, 10, 0, 5] },
                { text: bonData.client.nomComplet || 'N/A', style: 'normal' },
                { text: bonData.client.adresse || '', style: 'normal' },
                { text: bonData.client.telephone || '', style: 'normal' },
                { text: bonData.client.email || '', style: 'normal' }
              ]
            },
            {
              width: '50%',
              stack: [
                { text: bonData.titre, style: 'bold', margin: [0, 10, 0, 5] },
                { text: `Nº: ${bonData.numero || 'N/A'}`, style: 'normal' },
                { text: `Date: ${new Date(bonData.date || new Date()).toLocaleDateString()}`, style: 'normal' },
                { text: `Date livraison prévue: ${new Date(bonData.dateLivraisonPrevue || new Date()).toLocaleDateString()}`, style: 'normal' },
                { text: livraisonInfo, style: 'normal' },
                ...(bonData.statut ? [
                  { text: `Statut: ${bonData.statut}`, style: 'normal' }
                ] : [])
              ]
            }
          ]
        },
        
        { text: 'DÉTAIL DES ARTICLES', style: 'bold', margin: [0, 20, 0, 10] },
        this.generateDetailedArticlesTable(bonData.articles),
        this.generateTotals(bonData.totaux),
        ...(conditionsLivraison
          ? [{ text: conditionsLivraison, style: 'normal', margin: [0, 20, 0, 0] }]
          : []
        ),
        ...(bonData.commentaire
          ? [{ text: `Commentaire: ${bonData.commentaire}`, style: 'normal', margin: [0, 20, 0, 0] }]
          : []
        ),
        
        // Conditions et informations
        /* {
          stack: [
            { text: 'Conditions de livraison:', style: 'bold', margin: [0, 10, 0, 5] },
            { text: bonData.conditionsLivraison || 'Livraison à l\'adresse indiquée', style: 'normal' }
          ]
        },
        
        {
          stack: [
            { text: 'Instructions spéciales:', style: 'bold', margin: [0, 10, 0, 5] },
            { text: bonData.instructions || 'Aucune instruction particulière', style: 'normal' }
          ]
        }, */
        
        // Signature
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'Pour le client:', style: 'bold', margin: [0, 20, 0, 5] },
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1 }] },
                { text: 'Signature', style: 'subheader', alignment: 'left' }
              ]
            },
            {
              width: '50%',
              stack: [
                { text: 'Pour ' + (this.structureInfo?.nom_structure || 'l\'entreprise') + ':', style: 'bold', margin: [0, 20, 0, 5] },
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1 }] },
                { text: 'Signature et cachet', style: 'subheader', alignment: 'left' }
              ]
            }
          ]
        }
      ],
      styles: this.getStyles()
    };

    const fileName = `bon-${bonData.typeBon || 'commande'}-${bonData.numero || 'sans-numero'}.pdf`;
    pdfMake.createPdf(docDefinition).download(fileName);
    
  } catch (error) {
    console.error('Erreur génération bon client:', error);
    //this.toastr.error('Erreur lors de la génération du bon');
  }
}

/**
 * Génère un ticket de versement/règlement client
 */
async generateTicketVersementClient(versementData: any): Promise<void> {
  try {
    console.log('Génération ticket versement client:', versementData);
    
    const header = await this.getHeader(true);
    const currentDate = new Date();
    
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A5',
      pageMargins: [15, 20, 15, 20],
      header: header,
      content: [
        { 
          text: 'QUITTANCE DE PAIEMENT', 
          style: 'title', 
          alignment: 'center' 
        },
        
        // Informations du client
        { 
          text: [
            { text: 'Client: ', style: 'bold' },
            versementData.client?.nomComplet || 'Non spécifié'
          ],
          margin: [0, 10, 0, 0]
        },
        
        // Ligne séparatrice
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }], margin: [0, 10, 0, 10] },
        
        // Détails du paiement
        {
          table: {
            widths: ['*', '*'],
            body: [
              [
                { text: 'Date du règlement:', style: 'bold' },
                { text: new Date(versementData.date || new Date()).toLocaleDateString(), style: 'normal', alignment: 'right' }
              ],
              [
                { text: 'Heure:', style: 'bold' },
                { text: currentDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), style: 'normal', alignment: 'right' }
              ],
              [
                { text: 'Nº de quittance:', style: 'bold' },
                { text: versementData.numeroReference || `QUITT-${Date.now()}`,style: 'normal', alignment: 'right' }
              ],
              [
                { text: 'Moyen de paiement:', style: 'bold' },
                { text: versementData.moyenPaiement || 'Non spécifié',style: 'normal', alignment: 'right' }
              ]
              // [
              //   { text: 'Type:', style: 'bold' },
              //   { text: versementData.type || 'Règlement',style: 'normal', alignment: 'right' }
              // ]
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
                { text: 'Montant réglé:', style: 'bold', fontSize: 14 },
                { text: `${this.safeNumber(versementData.montantVerse)} F CFA`, 
                  alignment: 'right', style: 'bold', fontSize: 14, color: '#28a745' }
              ],
              [
                { text: 'Solde précédent:', style: 'normal' },
                { text: `${this.safeNumber(versementData.soldePrecedent)} F CFA`,style: 'normal', alignment: 'right' }
              ],
              [
                { text: 'Nouveau solde:', style: 'bold', fontSize: 12, fillColor: '#f0f0f0' },
                { text: `${this.safeNumber(versementData.nouveauSolde)} F CFA`, 
                  alignment: 'right', style: 'bold', fontSize: 12, fillColor: '#f0f0f0' }
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
            versementData.description || '',
          ], style:'normal',
          margin: [0, 0, 0, 10] as [number, number, number, number]
        }] : []),
        
        // Agent
        ...(versementData.agent ? [{
          text: [
            { text: 'Encaissé par: ', style: 'bold' },
            versementData.agent || ''
          ],style:'normal',
          margin: [0, 0, 0, 10] as [number, number, number, number]
        }] : []),
        
        // Message de remerciement
        { 
          text: 'Nous vous remercions de votre confiance', 
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
          text: 'Cette quittance fait foi de règlement. À conserver précieusement.', 
          style: 'subheader', 
          alignment: 'center',
          margin: [0, 20, 0, 0],
          fontSize: 8
        }
      ],
      styles: {
        ...this.getStyles(),
        title: {
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 10],
          alignment: 'center'
        }
      }
    };

    pdfMake.createPdf(docDefinition).open();
    
  } catch (error) {
    console.error('Erreur génération ticket versement client:', error);
    this.generateTicketVersementClientFallback(versementData);
  }
}

/**
 * Méthode de secours pour ticket versement client
 */
private generateTicketVersementClientFallback(versementData: any): void {
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A6',
    pageMargins: [10, 15, 10, 15],
    content: [
      { text: 'QUITTANCE CLIENT', style: 'title', alignment: 'center' },
      { text: `Client: ${versementData.client?.nomComplet || 'Non spécifié'}`, fontSize: 10 },
      { text: `Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, fontSize: 9 },
      { text: `Référence: ${versementData.numeroReference || 'N/A'}`, fontSize: 9 },
      { text: '---', alignment: 'center', fontSize: 8 },
      { text: `Montant réglé: ${this.safeNumber(versementData.montantVerse)} F CFA`, style: 'bold', fontSize: 12, alignment: 'center' },
      { text: `Nouveau solde: ${this.safeNumber(versementData.nouveauSolde)} F CFA`, style: 'bold', fontSize: 10 },
      { text: '---', alignment: 'center', fontSize: 8 },
      { text: 'Merci pour votre règlement', alignment: 'center', fontSize: 9, margin: [0, 10, 0, 0] },
      { text: this.structureInfo?.nom_structure || 'L\'entreprise', alignment: 'center', fontSize: 8 }
    ],
    styles: {
      title: {
        fontSize: 14,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      bold: {
        bold: true,
        fontSize: 11
      }
    }
  };

  pdfMake.createPdf(docDefinition).open();
}

//.....................................Génération rapport financier.........................

/**
   * Génère un PDF de rapport de vente
   */
  generateRapportVentePDF(params: any): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/pdf`, {
      params: params,
      responseType: 'blob'
    });
  }

  /**
   * Sauvegarde le PDF sur le disque
   */
  savePDF(blob: Blob, filename= 'rapport-vente.pdf'): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Ouvre le PDF dans un nouvel onglet
   */
  openPDF(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

/**
 * Génère un rapport financier complet
 */
async generateRapportFinancier(rapportData: any): Promise<void> {
  try {
    console.log('Génération rapport financier avec données:', rapportData);
    
    const header = await this.getHeader(true);
    const currentDate = new Date();

    // Obtenir les couleurs dynamiquement
    const colors = this.getRapportColors();
    const styles = this.getRapportStyles(colors);

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [30, 80, 30, 60],
      header: this.getRapportHeader(header, rapportData, colors),
      footer: this.getRapportFooter(),
      content: [
        // Page de couverture
        this.getCouverturePage(rapportData, currentDate, colors),
        
        // Table des matières (optionnel)
        // this.getTableDesMatieres(),

        // 1. Synthèse des indicateurs
        this.getSectionIndicateurs(rapportData, colors),
        
        // 2. Flux de trésorerie
        this.getSectionFluxTresorerie(rapportData, colors),
        
        // 3. Répartition des dépenses
        this.getSectionRepartitionDepenses(rapportData, colors),
        
        // 4. Répartition des recettes
        this.getSectionRepartitionRecettes(rapportData, colors),
        
        // 5. Modes de paiement
        this.getSectionModesPaiement(rapportData, colors),
        
        // 6. Données comparatives
        this.getSectionDonneesComparatives(rapportData, colors),
        
        // 7. Détails des transactions
        this.getSectionDetailsTransactions(rapportData, colors),
        
        // Page de conclusion
        this.getConclusionPage(rapportData, currentDate, colors)
      ],
      styles: styles,
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        lineHeight: 1.3
      },
      pageBreakBefore: (currentNode, followingNodesOnPage, _nodesOnNextPage, _previousNodesOnPage) => {
        // Logique pour éviter les coupures inappropriées
        if (currentNode.headlineLevel === 1 && followingNodesOnPage.length === 0) {
          return true;
        }
        return false;
      }
    };

    const fileName = this.generateFileName(rapportData, currentDate);
    pdfMake.createPdf(docDefinition).download(fileName);
    
  } catch (error) {
    console.error('Erreur génération rapport financier:', error);
    throw new Error('Impossible de générer le rapport PDF');
  }
}

/**
 * Obtenir les couleurs pour le rapport
 */
private getRapportColors(): any {
  return {
    primary: '#2c3e50',       // Bleu foncé pour titres
    secondary: '#3498db',     // Bleu clair pour sous-titres
    success: '#27ae60',       // Vert pour positif
    danger: '#e74c3c',        // Rouge pour négatif
    warning: '#f39c12',       // Orange pour avertissements
    info: '#17a2b8',          // Bleu info
    light: '#ecf0f1',         // Gris clair pour fond
    dark: '#2c3e50',          // Gris foncé
    white: '#ffffff'
  };
}

/**
 * Obtenir les styles pour le rapport
 */
private getRapportStyles(colors: any): any {
  return {
    header: {
      fontSize: 24,
      bold: true,
      color: colors.primary,
      margin: [0, 0, 0, 10]
    },
    subheader: {
      fontSize: 18,
      bold: true,
      color: colors.secondary,
      margin: [0, 10, 0, 5]
    },
    sectionTitle: {
      fontSize: 16,
      bold: true,
      color: colors.primary,
      margin: [0, 20, 0, 10],
      background: colors.light,
      padding: [10, 5]
    },
    subsectionTitle: {
      fontSize: 14,
      bold: true,
      color: colors.dark,
      margin: [0, 15, 0, 8]
    },
    normal: {
      fontSize: 10,
      margin: [0, 2, 0, 2]
    },
    bold: {
      fontSize: 10,
      bold: true
    },
    small: {
      fontSize: 9,
      color: '#666666'
    },
    tableHeader: {
      bold: true,
      fontSize: 9,
      color: colors.white,
      fillColor: colors.primary
    },
    tableRowEven: {
      fillColor: '#f8f9fa'
    },
    tableRowOdd: {
      fillColor: colors.white
    },
    positive: {
      color: colors.success,
      bold: true
    },
    negative: {
      color: colors.danger,
      bold: true
    },
    neutral: {
      color: colors.dark
    },
    totalRow: {
      bold: true,
      fontSize: 10,
      fillColor: colors.light
    },
    footerText: {
      fontSize: 8,
      color: '#777777',
      alignment: 'center'
    }
  };
}

/**
 * En-tête du rapport
 */

private getRapportHeader(header: any, rapportData: any, _colors: any): any {
  return (currentPage: number, pageCount: number) => {
    return {
      stack: [
        // =========================
        // 1️⃣ Header structure (logo + infos)
        // =========================
        {
          ...header,
          margin: [30, 20, 30, 10]
        },

        // Ligne de séparation
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: 515,
              y2: 0,
              lineWidth: 1
            }
          ],
          margin: [30, 5, 30, 10]
        },

        // =========================
        // 2️⃣ Header du rapport
        // =========================
        {
          columns: [
            {
              width: '70%',
              stack: [
                {
                  text: 'RAPPORT FINANCIER',
                  style: 'header'
                },
                {
                  text: rapportData.periode || 'Période non spécifiée',
                  style: 'subheader',
                  fontSize: 13
                }
              ]
            },
            {
              width: '30%',
              stack: [
                {
                  text: `Page ${currentPage} sur ${pageCount}`,
                  style: 'small',
                  alignment: 'right'
                },
                {
                  text: new Date().toLocaleDateString('fr-FR'),
                  style: 'small',
                  alignment: 'right'
                }
              ]
            }
          ],
          margin: [30, 0, 30, 0]
        }
      ]
    };
  };
}

/**
 * Pied de page du rapport
 */
private getRapportFooter(): any {
  return (currentPage: number, pageCount: number) => {
    return {
      columns: [
        {
          text: this.structureInfo?.nom_structure || 'Structure',
          style: 'footerText',
          width: '33%'
        },
        {
          text: `Page ${currentPage} sur ${pageCount}`,
          style: 'footerText',
          alignment: 'center',
          width: '34%'
        },
        {
          text: `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
          style: 'footerText',
          alignment: 'right',
          width: '33%'
        }
      ],
      margin: [30, 10, 30, 20]
    };
  };
}

/**
 * Page de couverture
 */
private getCouverturePage(rapportData: any, currentDate: Date, colors: any): any {
  return {
    stack: [
      {
        text: 'RAPPORT FINANCIER',
        style: 'header',
        fontSize: 28,
        bold: true,
        alignment: 'center',
        margin: [0, 100, 0, 20]
      },
      {
        text: rapportData.periode || 'Période analysée',
        style: 'subheader',
        fontSize: 20,
        alignment: 'center',
        margin: [0, 0, 0, 40]
      },
      {
        text: this.structureInfo?.nom_structure || 'Structure',
        style: 'normal',
        fontSize: 16,
        alignment: 'center',
        margin: [0, 0, 0, 10]
      },
      {
        text: `Date de génération: ${currentDate.toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`,
        style: 'small',
        alignment: 'center',
        margin: [0, 0, 0, 50]
      },
      // Ligne décorative
      {
        canvas: [{ 
          type: 'line', 
          x1: 100, 
          y1: 0, 
          x2: 400, 
          y2: 0, 
          lineWidth: 2,
          lineColor: colors.primary 
        }],
        margin: [0, 30, 0, 30]
      },
      {
        text: 'DOCUMENT CONFIDENTIEL',
        style: 'bold',
        fontSize: 12,
        color: colors.danger,
        alignment: 'center',
        margin: [0, 0, 0, 100]
      }
    ],
    pageBreak: 'after'
    
  };
}

/**
 * Section indicateurs clés
 */
private getSectionIndicateurs(rapportData: any, colors: any): any {
  const indicateurs = rapportData.indicateursFinanciers;
  if (!indicateurs) return { text: 'Aucune donnée disponible', style: 'normal' };

  return {
    stack: [
      { text: '1. SYNTHÈSE DES INDICATEURS CLÉS', style: 'sectionTitle' },
      
      // Cartes d'indicateurs
      {
        columns: [
          // Chiffre d'affaires
          {
            width: '33%',
            stack: [
              {
                text: 'CHIFFRE D\'AFFAIRES',
                style: 'subsectionTitle',
                alignment: 'center'
              },
              {
                text: `${this.formatCurrency(indicateurs.chiffreAffaires)}`,
                style: 'header',
                fontSize: 18,
                color: colors.primary,
                alignment: 'center',
                margin: [0, 5, 0, 2]
              },
              {
                text: `${indicateurs.nbVentes || 0} transactions`,
                style: 'small',
                alignment: 'center'
              },
              this.getEvolutionBadge(indicateurs.evolutionCA, colors)
            ],
            margin: [0, 0, 10, 0]
          },
          
          // Dépenses totales
          {
            width: '33%',
            stack: [
              {
                text: 'DÉPENSES TOTALES',
                style: 'subsectionTitle',
                alignment: 'center'
              },
              {
                text: `${this.formatCurrency(indicateurs.totalDepenses)}`,
                style: 'header',
                fontSize: 18,
                color: colors.danger,
                alignment: 'center',
                margin: [0, 5, 0, 2]
              },
              {
                text: `${indicateurs.nbDepenses || 0} transactions`,
                style: 'small',
                alignment: 'center'
              }
            ],
            margin: [0, 0, 10, 0]
          },
          
          // Bénéfice net
          {
            width: '33%',
            stack: [
              {
                text: 'BÉNÉFICE NET',
                style: 'subsectionTitle',
                alignment: 'center'
              },
              {
                text: `${this.formatCurrency(indicateurs.beneficeNet)}`,
                style: 'header',
                fontSize: 18,
                color: indicateurs.beneficeNet >= 0 ? colors.success : colors.danger,
                alignment: 'center',
                margin: [0, 5, 0, 2]
              },
              {
                text: `Marge: ${((indicateurs.beneficeNet / (indicateurs.chiffreAffaires + indicateurs.autresRecettes)) * 100).toFixed(1)}%`,
                style: 'small',
                alignment: 'center'
              }
            ]
          }
        ],
        margin: [0, 0, 0, 20]
      },
      
      // Tableau récapitulatif
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            [
              { text: 'Indicateur', style: 'tableHeader' },
              { text: 'Montant', style: 'tableHeader', alignment: 'right' },
              { text: 'Transactions', style: 'tableHeader', alignment: 'center' },
              { text: 'Évolution', style: 'tableHeader', alignment: 'center' }
            ],
            [
              'Chiffre d\'affaires',
              { text: this.formatCurrency(indicateurs.chiffreAffaires), alignment: 'right' },
              { text: indicateurs.nbVentes || 0, alignment: 'center' },
              this.getEvolutionCell(indicateurs.evolutionCA, colors)
            ],
            [
              'Autres recettes',
              { text: this.formatCurrency(indicateurs.autresRecettes), alignment: 'right' },
              { text: indicateurs.nbAutresRecettes || 0, alignment: 'center' },
              ''
            ],
            [
              'Dépenses totales',
              { text: this.formatCurrency(indicateurs.totalDepenses), alignment: 'right' },
              { text: indicateurs.nbDepenses || 0, alignment: 'center' },
              ''
            ],
            [
              'Solde trésorerie',
              { 
                text: this.formatCurrency(indicateurs.soldeTresorerie), 
                alignment: 'right',
                style: indicateurs.soldeTresorerie >= 0 ? 'positive' : 'negative'
              },
              '',
              ''
            ]
          ]
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: (i:number) => i === 0 ? colors.primary : '#dddddd',
          vLineColor: () => '#dddddd',
          paddingLeft: () => 5,
          paddingRight: () => 5,
          paddingTop: () => 3,
          paddingBottom: () => 3
        },
        margin: [0, 0, 0, 20]
      }
    ],
    //pageBreak: 'after'
  };
}

/**
 * Section flux de trésorerie
 */
private getSectionFluxTresorerie(rapportData: any, colors: any): any {
  const flux = rapportData.indicateursFinanciers?.fluxTresorerie;
  if (!flux) return { text: 'Aucune donnée disponible', style: 'normal' };

  return {
    stack: [
      { text: '2. FLUX DE TRÉSORERIE', style: 'sectionTitle' },
      
      // Diagramme visuel (simulé avec des barres)
      {
        columns: [
          // Solde initial
          {
            width: '25%',
            stack: [
              {
                text: 'SOLDE INITIAL',
                style: 'subsectionTitle',
                alignment: 'center'
              },
              {
                text: this.formatCurrency(flux.soldeInitial),
                style: 'normal',
                fontSize: 12,
                alignment: 'center',
                margin: [0, 5, 0, 2]
              },
              this.getSoldeIndicator(flux.soldeInitial, colors)
            ]
          },
          
          // Entrées
          {
            width: '25%',
            stack: [
              {
                text: 'ENTRÉES',
                style: 'subsectionTitle',
                alignment: 'center',
                color: colors.success
              },
              {
                text: `+ ${this.formatCurrency(flux.recettesPeriod)}`,
                style: 'positive',
                fontSize: 12,
                alignment: 'center',
                margin: [0, 5, 0, 2]
              }
            ]
          },
          
          // Sorties
          {
            width: '25%',
            stack: [
              {
                text: 'SORTIES',
                style: 'subsectionTitle',
                alignment: 'center',
                color: colors.danger
              },
              {
                text: `- ${this.formatCurrency(flux.depensesPeriod)}`,
                style: 'negative',
                fontSize: 12,
                alignment: 'center',
                margin: [0, 5, 0, 2]
              }
            ]
          },
          
          // Solde final
          {
            width: '25%',
            stack: [
              {
                text: 'SOLDE FINAL',
                style: 'subsectionTitle',
                alignment: 'center'
              },
              {
                text: this.formatCurrency(flux.soldeFinal),
                style: flux.soldeFinal >= 0 ? 'positive' : 'negative',
                fontSize: 12,
                alignment: 'center',
                margin: [0, 5, 0, 2]
              },
              this.getSoldeIndicator(flux.soldeFinal, colors)
            ]
          }
        ],
        margin: [0, 0, 0, 20]
      },
      
      // Tableau détaillé
      {
        table: {
          widths: ['40%', '30%', '30%'],
          body: [
            [
              { text: 'Description', style: 'tableHeader' },
              { text: 'Montant', style: 'tableHeader', alignment: 'right' },
              { text: 'Variation', style: 'tableHeader', alignment: 'right' }
            ],
            [
              'Solde initial',
              { text: this.formatCurrency(flux.soldeInitial), alignment: 'right' },
              ''
            ],
            [
              'Recettes de la période',
              { text: `+ ${this.formatCurrency(flux.recettesPeriod)}`, alignment: 'right', style: 'positive' },
              ''
            ],
            [
              'Dépenses de la période',
              { text: `- ${this.formatCurrency(flux.depensesPeriod)}`, alignment: 'right', style: 'negative' },
              ''
            ],
            [
              { text: 'Solde final', style: 'totalRow' },
              { 
                text: this.formatCurrency(flux.soldeFinal), 
                alignment: 'right', 
                style: flux.soldeFinal >= 0 ? 'positive' : 'negative'
              },
              { 
                text: this.formatCurrency(flux.soldeFinal - flux.soldeInitial), 
                alignment: 'right',
                style: (flux.soldeFinal - flux.soldeInitial) >= 0 ? 'positive' : 'negative'
              }
            ]
          ]
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: (i: number, node: any) => i === 0 || i === node.table.body.length ? colors.primary : '#dddddd',
          vLineColor: () => '#dddddd'
        }
      }
    ],
    //pageBreak: 'after'
  };
}

/**
 * Section répartition des dépenses
 */
private getSectionRepartitionDepenses(rapportData: any, colors: any): any {
  const repartition = rapportData.repartitionDepenses;
  if (!repartition || !repartition.repartition?.length) {
    return { text: '3. RÉPARTITION DES DÉPENSES\n\nAucune donnée disponible', style: 'sectionTitle' };
  }

  const tableBody: any[] = [
    [
      { text: 'Catégorie', style: 'tableHeader' },
      { text: 'Montant', style: 'tableHeader', alignment: 'right' },
      { text: 'Pourcentage', style: 'tableHeader', alignment: 'right' },
      { text: 'Transactions', style: 'tableHeader', alignment: 'center' }
    ]
  ];

  // Ajouter les catégories
  repartition.repartition.forEach((cat: any, _index: number) => {
    tableBody.push([
      cat.categorieName || 'Non classé',
      { text: this.formatCurrency(cat.montantTotal), alignment: 'right' },
      { text: `${cat.pourcentage.toFixed(1)}%`, alignment: 'right' },
      { text: cat.occurrences || 0, alignment: 'center' }
    ]);
  });

  // Ligne total
  tableBody.push([
    { text: 'TOTAL DÉPENSES', style: 'totalRow' },
    { text: this.formatCurrency(repartition.totalDepenses), alignment: 'right', style: 'totalRow' },
    { text: '100%', alignment: 'right', style: 'totalRow' },
    { text: repartition.repartition.reduce((sum: number, cat: any) => sum + (cat.occurrences || 0), 0), 
      alignment: 'center', style: 'totalRow' }
  ]);

  return {
    stack: [
      { text: '3. RÉPARTITION DES DÉPENSES', style: 'sectionTitle' },
      
      // Graphique en barres (simulé)
      //this.createBarChart(repartition.repartition, 'montantTotal', colors),
      
      // Tableau détaillé
      {
        table: {
          widths: ['45%', '20%', '20%', '15%'],
          body: tableBody
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length - 1) ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: (i: number,node: any) => i === 0 || i === node.table.body.length - 1 ? colors.primary : '#dddddd',
          vLineColor: () => '#dddddd',
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0 || rowIndex === tableBody.length - 1) return colors.light;
            return rowIndex % 2 === 0 ? '#f8f9fa' : colors.white;
          }
        },
        margin: [0, 20, 0, 20]
      },
      
      // Analyse
      {
        text: 'Analyse :',
        style: 'subsectionTitle',
        margin: [0, 10, 0, 5]
      },
      {
        text: this.getAnalyseDepenses(repartition),
        style: 'normal'
      }
    ],
    //pageBreak: 'after'
  };
}

/**
 * Section répartition des recettes
 */
private getSectionRepartitionRecettes(rapportData: any, colors: any): any {
  const repartition = rapportData.repartitionRecettes;
  if (!repartition || !repartition.repartition?.length) {
    return { text: '4. SOURCES DE REVENUS\n\nAucune donnée disponible', style: 'sectionTitle' };
  }

  const tableBody: any[] = [
    [
      { text: 'Source de revenus', style: 'tableHeader' },
      { text: 'Montant', style: 'tableHeader', alignment: 'right' },
      { text: 'Pourcentage', style: 'tableHeader', alignment: 'right' },
      { text: 'Transactions', style: 'tableHeader', alignment: 'center' }
    ]
  ];

  // Ajouter les catégories
  repartition.repartition.forEach((cat: any, _index: number) => {
    tableBody.push([
      cat.categorieName || 'Non classé',
      { text: this.formatCurrency(cat.montantTotal), alignment: 'right' },
      { text: `${cat.pourcentage.toFixed(1)}%`, alignment: 'right' },
      { text: cat.occurrences || 0, alignment: 'center' }
    ]);
  });

  // Ligne total
  tableBody.push([
    { text: 'TOTAL RECETTES', style: 'totalRow' },
    { text: this.formatCurrency(repartition.totalRecettes), alignment: 'right', style: 'totalRow' },
    { text: '100%', alignment: 'right', style: 'totalRow' },
    { text: repartition.repartition.reduce((sum: number, cat: any) => sum + (cat.occurrences || 0), 0), 
      alignment: 'center', style: 'totalRow' }
  ]);

  return {
    stack: [
      { text: '4. SOURCES DE REVENUS', style: 'sectionTitle' },
      
      // Graphique en camembert (simulé)
      //this.createPieChart(repartition.repartition, colors),
      
      // Tableau détaillé
      {
        table: {
          widths: ['45%', '20%', '20%', '15%'],
          body: tableBody
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length - 1) ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: (i: number,node: any) => i === 0 || i === node.table.body.length - 1 ? colors.primary : '#dddddd',
          vLineColor: () => '#dddddd'
        },
        margin: [0, 20, 0, 20]
      },
      
      // Analyse
      {
        text: 'Analyse :',
        style: 'subsectionTitle',
        margin: [0, 10, 0, 5]
      },
      {
        text: this.getAnalyseRecettes(repartition),
        style: 'normal'
      }
    ],
    //pageBreak: 'after'
  };
}


/**
 * Section modes de paiement
 */
private getSectionModesPaiement(rapportData: any, colors: any): any {
  const modesPaiement = rapportData.modesPaiementStats;
  if (!modesPaiement || !modesPaiement.modesPaiement?.length) {
    return { text: '5. MODES DE PAIEMENT\n\nAucune donnée disponible', style: 'sectionTitle' };
  }

  const tableBody: any[] = [
    [
      { text: 'Mode de paiement', style: 'tableHeader' },
      { text: 'Montant total', style: 'tableHeader', alignment: 'right' },
      { text: 'Transactions', style: 'tableHeader', alignment: 'center' },
      { text: 'Part de marché', style: 'tableHeader', alignment: 'right' }
    ]
  ];

  // Ajouter les modes de paiement
  modesPaiement.modesPaiement.forEach((mode: any) => {
    tableBody.push([
      this.getIconForPaymentMode(mode.mode) + ' ' + mode.mode,
      { text: this.formatCurrency(mode.montantTotal), alignment: 'right' },
      { text: mode.occurrences || 0, alignment: 'center' },
      { text: `${mode.pourcentage.toFixed(1)}%`, alignment: 'right' }
    ]);
  });

  return {
    stack: [
      { text: '5. MODES DE PAIEMENT', style: 'sectionTitle' },
      
      // Statistiques résumées
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Total transactions:', style: 'bold' },
              { text: `${modesPaiement.totalTransactions || 0}`, style: 'normal', fontSize: 12 }
            ]
          },
          {
            width: '50%',
            stack: [
              { text: 'Mode le plus utilisé:', style: 'bold' },
              { 
                text: this.getMostUsedPaymentMode(modesPaiement.modesPaiement), 
                style: 'normal',
                fontSize: 12 
              }
            ]
          }
        ],
        margin: [0, 0, 0, 20]
      },
      
      // Tableau détaillé
      {
        table: {
          widths: ['40%', '20%', '20%', '20%'],
          body: tableBody
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: (i: number) => i === 0 ? colors.primary : '#dddddd',
          vLineColor: () => '#dddddd'
        }
      }
    ],
    //pageBreak: 'after'
  };
}

/**
 * Section données comparatives
 */
private getSectionDonneesComparatives(rapportData: any, colors: any): any {
  const comparatives = rapportData.donneesComparatives;
  if (!comparatives || !comparatives.donneesPeriodes?.length) {
    return { text: '6. ANALYSE COMPARATIVE\n\nAucune donnée disponible', style: 'sectionTitle' };
  }

  const tableBody: any[] = [
    [
      { text: 'Période', style: 'tableHeader' },
      { text: 'Chiffre d\'affaires', style: 'tableHeader', alignment: 'right' },
      { text: 'Dépenses', style: 'tableHeader', alignment: 'right' },
      { text: 'Bénéfice', style: 'tableHeader', alignment: 'right' },
      { text: 'Marge', style: 'tableHeader', alignment: 'center' }
    ]
  ];

  // Ajouter les périodes
  comparatives.donneesPeriodes.forEach((periode: any) => {
    const marge = ((periode.beneficeNet / (periode.chiffreAffaires + periode.autresRecettes)) * 100) || 0;
    
    tableBody.push([
      periode.libelle || 'Période',
      { text: this.formatCurrency(periode.chiffreAffaires), alignment: 'right' },
      { text: this.formatCurrency(periode.totalDepenses), alignment: 'right' },
      { 
        text: this.formatCurrency(periode.beneficeNet), 
        alignment: 'right',
        style: periode.beneficeNet >= 0 ? 'positive' : 'negative'
      },
      { 
        text: `${marge.toFixed(1)}%`, 
        alignment: 'center',
        style: marge >= 0 ? 'positive' : 'negative'
      }
    ]);
  });

  return {
    stack: [
      { text: '6. ANALYSE COMPARATIVE', style: 'sectionTitle' },
      { 
        text: `Comparaison sur ${comparatives.nombrePeriodes || 0} périodes`, 
        style: 'normal',
        margin: [0, 0, 0, 10]
      },
      
      // Tableau comparatif
      {
        table: {
          widths: ['30%', '18%', '18%', '18%', '16%'],
          body: tableBody
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: (i: number) => i === 0 ? colors.primary : '#dddddd',
          vLineColor: () => '#dddddd',
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0) return colors.primary;
            return rowIndex % 2 === 0 ? '#f8f9fa' : colors.white;
          }
        },
        margin: [0, 0, 0, 20]
      },
      
      // Tendances
      this.getAnalyseTendances(comparatives, colors)
    ],
    //pageBreak: 'after'
  };
}

/**
 * Section détails des transactions
 */
private getSectionDetailsTransactions(rapportData: any, colors: any): any {

  const depenses = rapportData.depensesDetaillees?.depenses || [];
  const recettes = rapportData.recettesDetaillees?.recettes || [];

  if (depenses.length === 0 && recettes.length === 0) {
    return { text: '7. DÉTAILS DES TRANSACTIONS\n\nAucune transaction disponible', style: 'sectionTitle' };
  }

  const sections = [];

  // Dépenses
  if (depenses.length > 0) {
    sections.push(
      { text: '7.1. DÉTAILS DES DÉPENSES', style: 'subsectionTitle' },
      this.createTransactionsTable(depenses, colors, 'DÉPENSE'),
      { text: '\n' }
    );
  }

  // Recettes
  if (recettes.length > 0) {
    sections.push(
      { text: '7.2. DÉTAILS DES RECETTES', style: 'subsectionTitle' },
      this.createTransactionsTable(recettes, colors, 'RECETTE')
    );
  }

  return {
    stack: [
      { text: '7. DÉTAILS DES TRANSACTIONS', style: 'sectionTitle' },
      ...sections
    ]
  };
}

/**
 * Page de conclusion
 */
private getConclusionPage(rapportData: any, currentDate: Date, _colors: any): any {
  const indicateurs = rapportData.indicateursFinanciers;
  
  return {
    stack: [
      { text: 'CONCLUSION ET RECOMMANDATIONS', style: 'sectionTitle', pageBreak: 'before' },
      
      // Résumé exécutif
      {
        text: 'Résumé exécutif :',
        style: 'subsectionTitle',
        margin: [0, 10, 0, 5]
      },
      {
        text: this.getResumeExecutif(indicateurs),
        style: 'normal',
        margin: [0, 0, 0, 15]
      },
      
      // Points forts
      {
        text: 'Points forts :',
        style: 'subsectionTitle',
        margin: [0, 10, 0, 5]
      },
      this.getPointsForts(indicateurs),
      
      // Points d'amélioration
      {
        text: 'Points d\'amélioration :',
        style: 'subsectionTitle',
        margin: [0, 10, 0, 5]
      },
      this.getPointsAmelioration(indicateurs),
      
      // Recommandations
      {
        text: 'Recommandations :',
        style: 'subsectionTitle',
        margin: [0, 10, 0, 5]
      },
      this.getRecommandations(indicateurs),
      
      // Signature
      {
        columns: [
          { width: '50%', text: '' },
          {
            width: '50%',
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1 }] },
              { text: 'Signature', style: 'normal', alignment: 'center', margin: [0, 5, 0, 0] },
              { text: 'Directeur Financier', style: 'small', alignment: 'center' }
            ]
          }
        ],
        margin: [0, 40, 0, 0]
      },
      
      // Mentions finales
      {
        text: [
          { text: 'Document généré le ', style: 'small' },
          { text: currentDate.toLocaleDateString('fr-FR'), style: 'small', bold: true },
          { text: ' par le système de gestion financière.', style: 'small' }
        ],
        style: 'footerText',
        margin: [0, 20, 0, 0]
      }
    ]
  };
}

/**
 * Méthodes utilitaires
 */
/* private formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0).replace('XOF', 'F CFA');
} */
formatCurrency(value: number | string): string {
  if (value === null || value === undefined) return '0';

  // 1️⃣ Convertir en string brute
  let str = typeof value === 'number'
    ? value.toString()
    : value.toString();

  // 2️⃣ Supprimer TOUS les espaces Unicode (insécables, fines, etc.)
  str = str.replace(/[\u00A0\u202F\u2007]/g, ' ');

  // 3️⃣ Nettoyer tout sauf chiffres, point et virgule
  str = str.replace(/[^0-9.,-]/g, '');

  // 4️⃣ Si number → format manuel
  const num = Number(str.replace(',', '.'));
  if (!isNaN(num)) {
    str = num
      .toFixed(2)
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  return str;
}


private getEvolutionBadge(evolution: any, colors: any): any {
  if (!evolution) return '';
  
  const icon = evolution.tendance === 'hausse' ? '+' : 
               evolution.tendance === 'baisse' ? '-' : '=';
  const color = evolution.tendance === 'hausse' ? colors.success : 
                evolution.tendance === 'baisse' ? colors.danger : colors.dark;
  
  return {
    text: `${icon} ${evolution.pourcentage || 0}%`,
    style: 'normal',
    color: color,
    alignment: 'center',
    fontSize: 9
  };
}

private getEvolutionCell(evolution: any, colors: any): any {
  if (!evolution) return '';
  
  const icon = evolution.tendance === 'hausse' ? '+' : 
               evolution.tendance === 'baisse' ? '-' : '=';
  const color = evolution.tendance === 'hausse' ? colors.success : 
                evolution.tendance === 'baisse' ? colors.danger : colors.dark;
  
  return {
    text: `${icon} ${evolution.pourcentage || 0}%`,
    alignment: 'center',
    color: color
  };
}

private getSoldeIndicator(solde: number, colors: any): any {
  const color = solde >= 0 ? colors.success : colors.danger;
  const symbol = solde >= 0 ? '+' : '-'; // Utilisez des symboles Unicode
  const text = solde >= 0 ? 'POSITIF' : 'NÉGATIF';
  
  return {
    text: `${symbol} ${text}`,
    style: 'small',
    color: color,
    alignment: 'center',
    bold: true
  };
}

/* private createBarChart(data: any[], field: string, colors: any): any {
  // SIMPLIFIEZ : utilisez un tableau au lieu de canvas
  const bars = data.map(item => {
    const value = item[field] || 0;
    
    return {
      columns: [
        {
          width: '70%',
          stack: [
            {
              text: item.categorieName || 'Catégorie',
              style: 'small'
            },
            // REMPLACEZ le canvas par une barre textuelle
            {
              text: '▮'.repeat(Math.min(20, Math.round((value / 100000) * 20))), // Barre Unicode
              color: colors.secondary,
              fontSize: 12
            }
          ]
        },
        {
          width: '30%',
          text: this.formatCurrency(value),
          alignment: 'right',
          style: 'small'
        }
      ],
      margin: [0, 0, 0, 5]
    };
  });

  return {
    stack: bars,
    margin: [0, 0, 0, 15]
  };
}

private createPieChart(data: any[], _colors: any): any {
  // SIMPLIFIEZ : utilisez des symboles Unicode
  const pieSymbols = ['●', '◆', '■', '▲', '★', '✓', '✱', '❖'];
  
  const legend = data.map((item, index) => {
    const percentage = item.pourcentage || 0;
    const symbol = pieSymbols[index % pieSymbols.length];
    const color = this.getChartColor(index);
    
    return {
      columns: [
        {
          width: '10%',
          text: symbol,
          color: color,
          fontSize: 12
        },
        {
          width: '60%',
          text: item.categorieName || 'Catégorie',
          style: 'small'
        },
        {
          width: '30%',
          text: `${percentage.toFixed(1)}%`,
          alignment: 'right',
          style: 'small'
        }
      ],
      margin: [0, 0, 0, 3]
    };
  });

  return {
    stack: legend,
    margin: [0, 0, 0, 15]
  };
}
 */
/**
 * Crée une visualisation de barres avec du texte
 */


/**
 * Obtient une couleur pour les graphiques
 */
private getChartColor(index: number): string {
  const colors = [
    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#d35400', '#34495e', '#7f8c8d', '#c0392b'
  ];
  return colors[index % colors.length];
}

/* private getAnalyseDepenses(repartition: any): string {
  const topCategory = repartition.repartition.reduce((prev: any, current: any) => 
    (prev.montantTotal > current.montantTotal) ? prev : current
  );
  
  return `La catégorie "${topCategory.categorieName}" représente la plus grande part des dépenses avec ${topCategory.pourcentage.toFixed(1)}% du total. Il serait pertinent d'analyser cette catégorie pour identifier des opportunités d'optimisation.`;
}

private getAnalyseRecettes(repartition: any): string {
  const topCategory = repartition.repartition.reduce((prev: any, current: any) => 
    (prev.montantTotal > current.montantTotal) ? prev : current
  );
  
  return `La source de revenus "${topCategory.categorieName}" génère ${topCategory.pourcentage.toFixed(1)}% du chiffre d'affaires. Cette concentration représente à la fois une force et un risque qu'il convient de diversifier.`;
} */
private getAnalyseDepenses(repartition: any): string {
  // CORRECTION : Comparer les valeurs numériques, pas les objets
  const topCategory = repartition.repartition.reduce((prev: any, current: any) => 
    (this.safeNumber(prev.montantTotal) || 0) > (this.safeNumber(current.montantTotal) || 0) ? prev : current
  );
  
  if (!topCategory) return 'Aucune catégorie de dépenses disponible.';
  
  return `La catégorie "${topCategory.categorieName || 'Non classé'}" représente la plus grande part des dépenses avec ${topCategory.pourcentage?.toFixed(1) || 0}% du total. Il serait pertinent d'analyser cette catégorie pour identifier des opportunités d'optimisation.`;
}

private getAnalyseRecettes(repartition: any): string {
  // CORRECTION : Comparer les valeurs numériques, pas les objets
  const topCategory = repartition.repartition.reduce((prev: any, current: any) => 
    (this.safeNumber(prev.montantTotal) || 0) > (this.safeNumber(current.montantTotal )|| 0) ? prev : current
  );
  
  if (!topCategory) return 'Aucune source de revenus disponible.';
  
  return `La source de revenus "${topCategory.categorieName || 'Non classé'}" génère ${topCategory.pourcentage?.toFixed(1) || 0}% du chiffre d'affaires. Cette concentration représente à la fois une force et un risque qu'il convient de diversifier.`;
}

/* private getIconForPaymentMode(mode: string): string {
  const icons: Record<string, string> = {
    'Espèce': '💵',
    'Carte': '💳',
    'Virement': '🏦',
    'Chèque': '📄',
    'Wave': '📱',
    'Orange Money': '📱',
    'Mobile Money': '📱'
  };
  return icons[mode] || '💰';
} */
private getIconForPaymentMode(mode: string): string {
  const labels: Record<string, string> = {
    'Espèce': '[CASH]',
    'Carte': '[CARD]',
    'Chèque': '[CHECK]',
    'Virement': '[BANK]',
    'Wave': '[MOBILE]',
    'Orange Money': '[MOBILE]',
    'Mobile Money': '[MOBILE]'
  };
  return labels[mode] || '[PAY]';
}

private getMostUsedPaymentMode(modes: any[]): string {
  if (!modes.length) return 'Non disponible';
  
  const mostUsed = modes.reduce((prev, current) => 
    (prev.occurrences > current.occurrences) ? prev : current
  );
  
  return `${mostUsed.mode} (${mostUsed.pourcentage.toFixed(1)}%)`;
}

private createTransactionsTable(transactions: any[], colors: any, type: string): any {
  const isDepense = type === 'DÉPENSE';
  
  const tableBody: any[] = [
    [
      { text: 'Date', style: 'tableHeader', width: '15%' },
      { text: 'Description', style: 'tableHeader', width: '35%' },
      { text: 'Catégorie', style: 'tableHeader', width: '20%' },
      { text: 'Mode paiement', style: 'tableHeader', width: '15%' },
      { text: 'Montant', style: 'tableHeader', width: '15%', alignment: 'right' }
    ]
  ];

  // Limiter à 50 transactions pour éviter un PDF trop long
  const limitedTransactions = transactions.slice(0, 50);
  
  limitedTransactions.forEach((transaction, _index) => {
    tableBody.push([
      { 
        text: transaction.date ? 
          new Date(transaction.date).toLocaleDateString('fr-FR') : 'N/A', 
        style: 'small' 
      },
      { text: transaction.description || '-', style: 'small' },
      { text: transaction.categorie?.name || 'Non classé', style: 'small' },
      { text: transaction.paymentMode || 'N/A', style: 'small' },
      { 
        text: this.formatCurrency(transaction.montant || 0), 
        style: 'small',
        alignment: 'right',
        color: isDepense ? colors.danger : colors.success
      }
    ]);
  });

  // Total
  const total = limitedTransactions.reduce((sum, t) => sum + (this.safeNumber(t.montant) || 0), 0);
  tableBody.push([
    { text: `TOTAL ${type}`, colSpan: 4, style: 'totalRow' },
    '', '', '',
    { 
      text: this.formatCurrency(total), 
      style: 'totalRow',
      alignment: 'right',
      color: isDepense ? colors.danger : colors.success
    }
  ]);

  return {
    table: {
      widths: ['15%', '35%', '20%', '15%', '15%'],
      body: tableBody
    },
    layout: {
      hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length - 1) ? 1 : 0.5,
      vLineWidth: () => 0.5,
      hLineColor: (i: number, node: any) => i === 0 || i === node.table.body.length - 1 ? colors.primary : '#dddddd',
      vLineColor: () => '#dddddd'
    },
    margin: [0, 5, 0, 15]
  };
}
private calculateEvolution(current: number, previous: number): number {
  const curr = this.safeNumber(current);
  const prev = this.safeNumber(previous);

  // Cas 1 : tout est à 0
  if (curr === 0 && prev === 0) {
    return 0;
  }

  // Cas 2 : valeur précédente = 0
  if (prev === 0) {
    return curr > 0 ? 100 : -100;
  }

  // Cas normal
  return ((curr - prev) / Math.abs(prev)) * 100;
}

private getAnalyseTendances(comparatives: any, _colors: any): any {
  if (!comparatives.donneesPeriodes || comparatives.donneesPeriodes.length < 2) {
    return { text: 'Données insuffisantes pour l\'analyse des tendances.', style: 'normal' };
  }

  const periodes = comparatives.donneesPeriodes;
  const dernierePeriode = periodes[periodes.length - 1];
  const periodePrecedente = periodes[periodes.length - 2];

  const evolutionCA = this.calculateEvolution(
      dernierePeriode.chiffreAffaires,
      periodePrecedente.chiffreAffaires
  );

  const evolutionBenefice = this.calculateEvolution(
      dernierePeriode.beneficeNet,
      periodePrecedente.beneficeNet
  );

  console.log('Evolution CA',evolutionCA);
  console.log('Evolution bénéfice CA',evolutionBenefice);
  return {
    stack: [
      { text: 'Analyse des tendances :', style: 'subsectionTitle', margin: [0, 10, 0, 5] },
      {
        ul: [
          `Le chiffre d'affaires a ${evolutionCA >= 0 ? 'augmenté' : 'diminué'} de ${Math.abs(evolutionCA).toFixed(1)}% par rapport à la période précédente.`,
          `Le bénéfice net a ${evolutionBenefice >= 0 ? 'augmenté' : 'diminué'} de ${Math.abs(evolutionBenefice).toFixed(1)}%.`,
          evolutionCA > 0 && evolutionBenefice > 0 ? 
            'La performance est positive sur les deux indicateurs clés.' :
            'Une attention particulière est requise sur les indicateurs en baisse.'
        ],
        style: 'normal'
      }
    ]
  };
}

private getResumeExecutif(indicateurs: any): string {
  if (!indicateurs) return 'Aucune donnée disponible.';
  
  const ca = indicateurs.chiffreAffaires || 0;
  const benefice = indicateurs.beneficeNet || 0;
  const marge = ca > 0 ? (benefice / ca) * 100 : 0;
  
  return `La période analysée présente un chiffre d'affaires de ${this.formatCurrency(ca)} avec un bénéfice net de ${this.formatCurrency(benefice)}, soit une marge nette de ${marge.toFixed(1)}%. ${benefice >= 0 ? 'La performance est satisfaisante.' : 'Des améliorations sont nécessaires pour retrouver l\'équilibre.'}`;
}

private getPointsForts(indicateurs: any): any {
  if (!indicateurs) return { text: 'Aucune donnée disponible.', style: 'normal' };
  
  const points = [];
  
  if (indicateurs.beneficeNet > 0) {
    points.push('Bénéfice net positif');
  }
  
  if (indicateurs.evolutionCA?.tendance === 'hausse') {
    points.push('Croissance du chiffre d\'affaires');
  }
  
  if (indicateurs.soldeTresorerie > 0) {
    points.push('Trésorerie positive');
  }
  
  return {
    ul: points.length > 0 ? points : ['Aucun point fort identifié'],
    style: 'normal'
  };
}

private getPointsAmelioration(indicateurs: any): any {
  if (!indicateurs) return { text: 'Aucune donnée disponible.', style: 'normal' };
  
  const points = [];
  
  if (indicateurs.beneficeNet < 0) {
    points.push('Bénéfice net négatif nécessitant une action corrective');
  }
  
  if (indicateurs.evolutionCA?.tendance === 'baisse') {
    points.push('Déclin du chiffre d\'affaires à investiguer');
  }
  
  if (indicateurs.totalDepenses > indicateurs.chiffreAffaires * 0.7) {
    points.push('Ratio dépenses/CA élevé nécessitant une optimisation');
  }
  
  return {
    ul: points.length > 0 ? points : ['Aucun point d\'amélioration critique identifié'],
    style: 'normal'
  };
}

private getRecommandations(indicateurs: any): any {
  if (!indicateurs) return { text: 'Aucune recommandation disponible.', style: 'normal' };
  
  const recommandations = [];
  
  if (indicateurs.beneficeNet < 0) {
    recommandations.push('Réduire les coûts fixes et variables');
    recommandations.push('Revoir la stratégie tarifaire');
  }
  
  if (indicateurs.evolutionCA?.tendance === 'baisse') {
    recommandations.push('Développer de nouvelles sources de revenus');
    recommandations.push('Renforcer les actions marketing');
  }
  
  if (indicateurs.totalDepenses > indicateurs.chiffreAffaires * 0.7) {
    recommandations.push('Auditer les dépenses par catégorie');
    recommandations.push('Négocier de meilleurs termes avec les fournisseurs');
  }
  
  return {
    ul: recommandations.length > 0 ? recommandations : ['Maintenir la stratégie actuelle'],
    style: 'normal'
  };
}

private generateFileName(rapportData: any, currentDate: Date): string {
  const periode = rapportData.periode || 'rapport';
  const dateStr = currentDate.toISOString().slice(0, 10).replace(/-/g, '');
  const structure = this.structureInfo?.nom_structure?.replace(/\s+/g, '-') || 'structure';
  
  return `rapport-financier-${structure}-${periode}-${dateStr}.pdf`.toLowerCase();
}
}
