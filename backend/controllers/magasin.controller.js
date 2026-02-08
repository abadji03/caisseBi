const db = require('../models');
const Magasin = db.Magasin;
const User = db.Users;

// Créer un magasin
exports.createMagasin = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const data = req.body;

    // Vérifie si le magasin existe déjà par téléphone
    const existingMagasin = await Magasin.findOne({ where: { telephone: data.telephone } });

    if (existingMagasin) {
      return res
        .status(400)
        .json({ message: 'Un magasin avec ce numéro de téléphone  existe déjà.' });
    }

    const magasin = await Magasin.create(data);
    res.status(201).json(magasin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la création du magasin' });
  }
};

// Modifier un magasin
exports.updateMagasin = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const id = req.params.id;
    const magasin = await Magasin.findByPk(id);
    if (!magasin) return res.status(404).json({ message: 'Magasin non trouvé' });

    await magasin.update(req.body);
    res.json({ message: 'Magasin mis à jour', magasin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
};

// Supprimer un magasin
exports.deleteMagasin = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const id = req.params.id;
    const magasin = await Magasin.findByPk(id);
    if (!magasin) return res.status(404).json({ message: 'Magasin non trouvé' });

    await magasin.destroy();
    res.json({ message: 'Magasin supprimé' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
};

// Lister les magasins d'une structure
exports.getMagasinsByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure } = req.params;
    const magasins = await Magasin.findAll(
      {
        where: { code_structure },
        include: [
        { 
          model:db.Users,
          attributes: ['id', 'nom'],
          include: [{
            model: db.role,
            attributes: ['id', 'nom']
          }]
        }
      ],
        order: [['createdAt', 'DESC']],
      },
      
  );
    res.json(magasins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des magasins' });
  }
};
// Obtenir un magasin spécifique
exports.getMagasinById = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id } = req.params;
    const magasin = await Magasin.findByPk(id);
    if (!magasin) return res.status(404).json({ message: 'Magasin non trouvé' });

    res.json(magasin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération du magasin' });
  }
};
// Mettre à jour le statut d’un magasin
/* exports.updateStatutMagasin = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!['Actif', 'Inactif'].includes(statut)) {
      return res.status(400).json({ message: "Statut invalide. Utilisez 'Actif' ou 'Inactif'" });
    }

    const magasin = await Magasin.findByPk(id);
    if (!magasin) return res.status(404).json({ message: 'Magasin non trouvé' });

    magasin.statut = statut;
    magasin.derniereMiseAJour = new Date();
    await magasin.save();

    res.json({ message: 'Statut mis à jour', magasin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du statut' });
  }
}; */
// Obtenir tous les magasins
exports.getAllMagasins = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const magasins = await Magasin.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.json(magasins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des magasins' });
  }
};

//Mettre àjour le status de la structure

// Mettre à jour le statut d’un magasin
exports.updateStatutMagasin = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id } = req.params;
    const { statut } = req.body;

    const magasin = await Magasin.findByPk(id, { transaction });

    if (!magasin) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Magasin non trouvé' });
    }

    // 1️⃣ Mise à jour du magasin
    await magasin.update({ statut }, { transaction });

    // 2️⃣ Mise à jour des utilisateurs du magasin
    await User.update(
      { status:statut },
      {
        where: {
          magasinId: magasin.id
        },
        transaction
      }
    );

    await transaction.commit();

    res.status(200).json({
      message: 'Statut du magasin et des utilisateurs mis à jour avec succès',
      magasin
    });

  } catch (err) {
    await transaction.rollback();
    console.error(err);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour du statut du magasin'
    });
  }
};
  