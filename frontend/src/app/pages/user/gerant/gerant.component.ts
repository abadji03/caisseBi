import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-gerant',
  standalone:true,
  imports: [CommonModule,  FormsModule, ReactiveFormsModule],
  templateUrl: './gerant.component.html',
  styleUrl: './gerant.component.css'
})
export class GerantComponent {
// Liste des gérants (à remplacer par un appel à un service API)
gerants = [
  { id: 1, nom: 'John Doe', poste: 'Gérant Magasin 1', email: 'johndoe@example.com' },
  { id: 2, nom: 'Jane Smith', poste: 'Gérante Magasin 2', email: 'janesmith@example.com' }
];

// Liste des activités des gérants
activites = [
  { gerantId: 1, date: '2025-01-01', description: 'Réunion d\'équipe' },
  { gerantId: 1, date: '2025-01-05', description: 'Formation des employés' },
  { gerantId: 2, date: '2025-01-02', description: 'Évaluation des performances' }
];
// Modèle pour l'ajout et la modification des gérants
gerant = {
  id: 0,
  nom: '',
  poste: '',
  email: ''
};
// Liste des tâches des gérants
taches = [
  { gerantId: 1, description: 'Gérer les stocks', statut: 'En cours' },
  { gerantId: 1, description: 'Former le personnel', statut: 'Complété' },
  { gerantId: 2, description: 'Analyser les performances', statut: 'En cours' }
];
// Liste des performances des gérants
performances = [
  { gerantId: 1, score: 85 },
  { gerantId: 2, score: 90 }
];

// Méthode pour ajouter ou modifier un gérant
ajouterOuModifierGerant() {
  if (this.gerant.id) {
    // Modification d'un gérant existant
    const index = this.gerants.findIndex(g => g.id === this.gerant.id);
    if (index !== -1) {
      this.gerants[index] = { ...this.gerant };  // Mise à jour du gérant
    }
  } else {
    // Ajout d'un nouveau gérant
    const newId = this.gerants.length + 1;
    this.gerants.push({ ...this.gerant, id: newId });
  }
  this.resetForm();  // Réinitialiser le formulaire après ajout/modification
}

// Méthode pour modifier un gérant
modifierGerant(gerant: any) {
  this.gerant = { ...gerant };
}

// Méthode pour supprimer un gérant
supprimerGerant(id: number) {
  this.gerants = this.gerants.filter(g => g.id !== id);
}

// Méthode pour réinitialiser le formulaire
resetForm() {
  this.gerant = { id: 0, nom: '', poste: '', email: '' };
}

// Méthode pour obtenir la performance d'un gérant
getPerformance(gerantId: number) {
  const performance = this.performances.find(p => p.gerantId === gerantId);
  return performance ? performance.score : 0;  // Retourne un score ou 0 si pas trouvé
}

// Méthode pour obtenir les tâches d'un gérant
getTachesGerant(gerantId: number) {
  return this.taches.filter(t => t.gerantId === gerantId);
}

// Méthode pour obtenir les activités d'un gérant
getActivitesGerant(gerantId: number) {
  return this.activites.filter(a => a.gerantId === gerantId);
}
}
