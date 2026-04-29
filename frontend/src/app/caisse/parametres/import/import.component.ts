/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ImportService, StructureDetection } from '../../../services/import.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface TypeImport {
  value: string;
  label: string;
  description: string;
  champs: { champ: string; label: string; obligatoire: boolean }[];
}

interface ImportResultDetail {
  ligne?: number;
  type: string;
  id?: number;
  message?: string;
}

interface ImportResult {
  importes: number;
  erreurs: number;
  details: ImportResultDetail[];
}

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import.component.html',
  styleUrl: './import.component.css'
})
export class ImportComponent  implements OnInit{

  private importService = inject(ImportService);
  private toastr = inject(ToastrService);

  // Types d'import disponibles
  typesImport: TypeImport[] = [
    {
      value: 'clients',
      label: 'Clients',
      description: 'Importation des clients avec leurs informations',
      champs: [
        { champ: 'nomComplet', label: 'Nom complet', obligatoire: true },
        { champ: 'telephone', label: 'Téléphone', obligatoire: true },
        { champ: 'email', label: 'Email', obligatoire: false },
        { champ: 'adresse', label: 'Adresse', obligatoire: false },
        { champ: 'plafond', label: 'Plafond', obligatoire: false }
      ]
    },
    {
      value: 'fournisseurs',
      label: 'Fournisseurs',
      description: 'Importation des fournisseurs',
      champs: [
        { champ: 'nomComplet', label: 'Nom complet', obligatoire: true },
        { champ: 'telephone', label: 'Téléphone', obligatoire: true },
        { champ: 'email', label: 'Email', obligatoire: false },
        { champ: 'adresse', label: 'Adresse', obligatoire: false }
      ]
    },
    {
      value: 'produits',
      label: 'Produits',
      description: 'Importation des produits avec leurs prix et stocks',
      champs: [
        { champ: 'designation', label: 'Désignation', obligatoire: true },
        { champ: 'reference', label: 'Référence', obligatoire: true },
        { champ: 'prix_vente', label: 'Prix de vente', obligatoire: true },
        { champ: 'prix_achat', label: "Prix d'achat", obligatoire: true },
        { champ: 'quantite', label: 'Quantité initiale', obligatoire: false },
        { champ: 'categorie', label: 'Catégorie', obligatoire: false },
        { champ: 'unite', label: 'Unité', obligatoire: false }
      ]
    },
    {
      value: 'categories',
      label: 'Catégories',
      description: 'Importation des catégories de produits',
      champs: [
        { champ: 'nom', label: 'Nom', obligatoire: true },
        { champ: 'description', label: 'Description', obligatoire: false }
      ]
    },
    {
      value: 'magasins',
      label: 'Magasins',
      description: 'Importation des magasins',
      champs: [
        { champ: 'nom', label: 'Nom', obligatoire: true },
        { champ: 'adresse', label: 'Adresse', obligatoire: false },
        { champ: 'ville', label: 'Ville', obligatoire: false }
      ]
    },
    {
      value: 'stocks',
      label: 'Stocks',
      description: 'Importation des stocks initiaux',
      champs: [
        { champ: 'reference', label: 'Référence produit', obligatoire: true },
        { champ: 'magasin', label: 'Magasin', obligatoire: true },
        { champ: 'quantite', label: 'Quantité', obligatoire: true }
      ]
    }
  ];

  // État du composant
  typeImportSelectionne = 'clients';
  fichierSelectionne: File | null = null;
  hasHeader = true;
  updateExisting = true;
  isLoading = false;
  isLoadingDetection = false;
  isImporting = false;
  
  // Détection
  detectionResult: StructureDetection | null = null;
  mapping: Record<string, string | null> = {};
  colonnesIgnorees = new Set<string>();
  
  // Aperçu
  showPreview = false;
  showAdvancedOptions = false;
  
  // Résultats
  importResult: ImportResult | null = null;

  ngOnInit(): void {
    // Initialisation
    console.log('Initialisation');
  }

  onTypeImportChange(): void {
    this.reset();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.fichierSelectionne = input.files[0];
      this.reset();
      this.detecterStructure();
    }
  }

  detecterStructure(): void {
    if (!this.fichierSelectionne) return;
    
    this.isLoadingDetection = true;
    this.detectionResult = null;
    
    this.importService.detecterStructure(this.fichierSelectionne).subscribe({
      next: (result) => {
        this.detectionResult = result;
        this.suggererMapping();
        this.isLoadingDetection = false;
        this.toastr.success(`${result.totalLignes} lignes détectées`);
      },
      error: (err) => {
        this.isLoadingDetection = false;
        this.toastr.error(err.error?.message || 'Erreur lors de la détection');
      }
    });
  }

  suggererMapping(): void {
    if (!this.detectionResult) return;
    
    const typeActuel = this.typesImport.find(t => t.value === this.typeImportSelectionne);
    if (!typeActuel) return;
    
    const champsCibles = typeActuel.champs.map(c => c.champ);
    
    // Dictionnaire des correspondances
    const correspondances: Record<string, string[]> = {
      nomComplet: ['nom', 'name', 'fullname', 'client', 'fournisseur', 'nom complet', 'nom_complet'],
      telephone: ['tel', 'phone', 'téléphone', 'mobile', 'contact'],
      email: ['mail', 'email', 'courriel', 'e-mail'],
      adresse: ['address', 'adresse', 'lieu', 'location'],
      plafond: ['plafond', 'limit', 'credit', 'plafond_credit', 'max'],
      designation: ['nom', 'name', 'designation', 'produit', 'product', 'article'],
      reference: ['ref', 'reference', 'code', 'sku', 'réf', 'référence'],
      prix_achat: ['prix achat', 'cost', 'purchase', 'purchase_price', 'prix_achat_ht'],
      prix_vente: ['prix vente', 'price', 'selling', 'sale_price', 'prix_vente_ttc'],
      quantite: ['stock', 'quantity', 'qty', 'quantité', 'quantite_stock'],
      categorie: ['cat', 'categorie', 'category', 'catégorie'],
      unite: ['unit', 'unite', 'uom', 'unité'],
      magasin: ['magasin', 'store', 'shop', 'point de vente', 'succursale'],
      code_barre: ['barcode', 'code barre', 'ean', 'upc', 'code_barre'],
      nom: ['nom', 'name', 'category', 'catégorie', 'categorie']
    };
    
    const mappingSuggere: Record<string, string> = {};
    
    for (const entete of this.detectionResult.entetes) {
      const enteteLower = entete.toLowerCase();
      let champTrouve: string | null = null;
      
      for (const [champ, synonymes] of Object.entries(correspondances)) {
        if (champsCibles.includes(champ)) {
          if (synonymes.some(syn => enteteLower === syn || enteteLower.includes(syn))) {
            champTrouve = champ;
            break;
          }
        }
      }
      
      if (champTrouve) {
        mappingSuggere[entete] = champTrouve;
      }
    }
    
    this.mapping = {};
    for (const entete of this.detectionResult.entetes) {
      this.mapping[entete] = mappingSuggere[entete] || null;
    }
    
    this.mettreAJourChampsNonMappes();
  }

  getOptionsChamps(): { value: string; label: string }[] {
    const typeActuel = this.typesImport.find(t => t.value === this.typeImportSelectionne);
    if (!typeActuel) return [];
    
    return [
      { value: '', label: '-- Ignorer --' },
      ...typeActuel.champs.map(c => ({ value: c.champ, label: c.label }))
    ];
  }

  isChampObligatoire(champ: string): boolean {
    const typeActuel = this.typesImport.find(t => t.value === this.typeImportSelectionne);
    return typeActuel?.champs.find(c => c.champ === champ)?.obligatoire || false;
  }

  getChampLabel(champ: string): string {
    const typeActuel = this.typesImport.find(t => t.value === this.typeImportSelectionne);
    const champInfo = typeActuel?.champs.find(c => c.champ === champ);
    return champInfo?.label || champ;
  }

  getApercuValeur(entete: string): string {
    if (!this.detectionResult?.apercu?.length) return '';
    const premiereLigne = this.detectionResult.apercu[0];
    const valeur = premiereLigne[entete];
    if (valeur === undefined || valeur === null) return '';
    const strValeur = String(valeur);
    return strValeur.length > 50 ? strValeur.substring(0, 50) + '...' : strValeur;
  }

  getMappingProgress(): number {
    const typeActuel = this.typesImport.find(t => t.value === this.typeImportSelectionne);
    if (!typeActuel || !this.detectionResult) return 0;
    
    const champsObligatoires = typeActuel.champs.filter(c => c.obligatoire).length;
    if (champsObligatoires === 0) return 100;
    
    const champsMappes = Object.values(this.mapping).filter(v => v !== null).length;
    return Math.round((champsMappes / champsObligatoires) * 100);
  }

  obtenirErreursMapping(): string[] {
    const typeActuel = this.typesImport.find(t => t.value === this.typeImportSelectionne);
    if (!typeActuel || !this.detectionResult) return [];
    
    const champsObligatoires = typeActuel.champs.filter(c => c.obligatoire).map(c => c.champ);
    const champsMappes = Object.values(this.mapping).filter(v => v !== null);
    
    return champsObligatoires.filter(champ => !champsMappes.includes(champ))
      .map(champ => this.getChampLabel(champ));
  }

  getChampsMappes(): string[] {
    const champsMappes = Object.values(this.mapping).filter(v => v !== null) as string[];
    return [...new Set(champsMappes)]; // Supprimer les doublons
  }

  getEnteteByChamp(champ: string): string | null {
    for (const [entete, valeur] of Object.entries(this.mapping)) {
      if (valeur === champ) {
        return entete;
      }
    }
    return null;
  }

  onMappingChange(): void {
    this.mettreAJourChampsNonMappes();
  }

  toggleIgnorerColonne(entete: string): void {
    if (this.colonnesIgnorees.has(entete)) {
      this.colonnesIgnorees.delete(entete);
    } else {
      this.colonnesIgnorees.add(entete);
      this.mapping[entete] = null;
    }
    this.mettreAJourChampsNonMappes();
  }

  toggleAllColonnes(checked: boolean): void {
    if (!this.detectionResult) return;
    
    if (checked) {
      for (const entete of this.detectionResult.entetes) {
        if (!this.colonnesIgnorees.has(entete)) {
          this.colonnesIgnorees.add(entete);
          this.mapping[entete] = null;
        }
      }
    } else {
      this.colonnesIgnorees.clear();
    }
    this.mettreAJourChampsNonMappes();
  }

  autoMapper(): void {
    this.suggererMapping();
    this.toastr.info('Mapping automatique appliqué');
  }

  mettreAJourChampsNonMappes(): void {
    // Cette méthode est gérée par obtenirErreursMapping()
  }

  reset(): void {
    this.detectionResult = null;
    this.mapping = {};
    this.colonnesIgnorees.clear();
    this.importResult = null;
    this.showPreview = false;
  }

  importer(): void {
    if (!this.fichierSelectionne) {
      this.toastr.warning('Veuillez sélectionner un fichier');
      return;
    }
    
    const erreursMapping = this.obtenirErreursMapping();
    if (erreursMapping.length > 0) {
      this.toastr.warning(`Veuillez mapper les champs obligatoires: ${erreursMapping.join(', ')}`);
      return;
    }
    
    // Nettoyer le mapping pour exclure les colonnes ignorées
    const mappingPropre: Record<string, string> = {};
    for (const [colonne, champ] of Object.entries(this.mapping)) {
      if (champ && !this.colonnesIgnorees.has(colonne)) {
        mappingPropre[colonne] = champ;
      }
    }
    
    this.isImporting = true;
    
    this.importService.importer(
      this.fichierSelectionne,
      this.typeImportSelectionne,
      mappingPropre,
      {
        updateExisting: this.updateExisting,
        hasHeader: this.hasHeader
      }
    ).subscribe({
      next: (result) => {
        this.importResult = result.results as ImportResult;
        this.isImporting = false;
        
        if (result.results.erreurs === 0) {
          this.toastr.success(result.message);
        } else if (result.results.importes > 0) {
          this.toastr.warning(result.message);
        } else {
          this.toastr.error(result.message);
        }
      },
      error: (err) => {
        this.isImporting = false;
        this.toastr.error(err.error?.message || 'Erreur lors de l\'import');
      }
    });
  }

  // Pour la gestion du clavier (accessibilité)
  onCardKeydown(event: KeyboardEvent, type: any): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.typeImportSelectionne = type.value;
      this.onTypeImportChange();
    }
  }

  onButtonKeydown(event: KeyboardEvent, callback: () => void): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  }

  toggleAdvancedOptions(): void {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  toggleAdvancedOptionsBis(): void {
    this.showPreview = !this.showPreview;
  }

  toggleAdvancedOptionsTer(): void {
    this.showPreview = false;
  }

  getValeurParChamp(row: any, champ: string): string {
    const entete = this.getEnteteByChamp(champ);
    if (!entete) return '';
    const valeur = row[entete];
    if (valeur === undefined || valeur === null) return '';
    return String(valeur);
  }

}
