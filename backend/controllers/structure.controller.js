// controllers/structure.controller.js
const db = require('../models');
const Structure = db.Structure;
const fs = require('fs');
const path = require('path');

//Fonction utilitaire pour générer un code unique basé sur le nom
function generateCodeStructure(nom) {
  const sanitized = nom.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); // Garde lettres et chiffres
  const shortCode = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 caractères
  return `${sanitized.slice(0,12)}-${shortCode}`; // Limite à 8 lettres du nom
}
//Création d'une structure
exports.createStructure = async (req, res) => {
  try {
    const {
      nom_structure, proprietaire, nombre_magasins, type_structure,
      devise, email, telephone, adresse, numero_identification_fiscale,
      registre_commerce, statut_juridique, banque, numero_compte,
      fournisseur_mobile_money, nombre_employes, responsable_administratif,
      horaires_ouverture, jours_fermeture, site_web, reseaux_sociaux,
      personne_confiance, assurances_souscrites, date_creation, description
    } = req.body;

    const logo = req.file ? req.file.filename : null;

    const code_structure = generateCodeStructure(nom_structure); // On génère le code

    const structure = await Structure.create({
      code_structure, //Ajout dans la base
      nom_structure, proprietaire, nombre_magasins, type_structure,
      devise, email, telephone, adresse, numero_identification_fiscale,
      registre_commerce, statut_juridique, banque, numero_compte,
      fournisseur_mobile_money, nombre_employes, responsable_administratif,
      horaires_ouverture, jours_fermeture, site_web, reseaux_sociaux,
      personne_confiance, assurances_souscrites, date_creation, description,
      logo
    });

    res.status(201).json(structure);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la création de la structure." });
  }
};

//Modification d'une structure
exports.updateStructure = async (req, res) => {
  try {
    const id = req.params.id;
    const structure = await Structure.findByPk(id); // Cherche la structure par son ID

    if (!structure) return res.status(404).json({ message: "Structure non trouvée" });

    // Si nouveau logo, supprimer l'ancien
    if (req.file && structure.logo) {
      const oldPath = path.join('uploads', structure.logo); // Chemin de l’ancien fichier
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); // Suppression du fichier existant
    }

    const updatedData = { ...req.body }; // Copie les données envoyées dans la requête
    if (req.file) updatedData.logo = req.file.filename; // Si nouveau fichier, on met à jour le champ logo

    await structure.update(updatedData); // Mise à jour dans la base

    res.json({ message: "Structure mise à jour", structure });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
};

//Suppression d'une structure
exports.deleteStructure = async (req, res) => {
  try {
    const id = req.params.id;
    const structure = await Structure.findByPk(id); // Récupère la structure par ID

    if (!structure) return res.status(404).json({ message: "Structure non trouvée" });

    // Supprimer le logo associé
    if (structure.logo) {
      const filePath = path.join('uploads', structure.logo);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await structure.destroy(); // Supprime la structure de la base

    res.json({ message: "Structure supprimée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
};
