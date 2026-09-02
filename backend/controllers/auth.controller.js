const db = require('../models');
const User = db.Users;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const HistoriqueService = require('../services/historique.service'); 


// Secret JWT
const JWT_SECRET = process.env.JWT_SECRET;

// Connexion utilisateur
exports.connexion = async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIp = HistoriqueService.getClientIp(req); // Récupérer l'IP

    console.log('=== DEBUG CONNEXION ===');
    console.log('Email tenté:', email);
    console.log('IP:', clientIp);
    console.log('Mot de passe fourni:', password);

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('DEBUG: Utilisateur non trouvé');
      // Enregistrer une tentative de connexion échouée (optionnel)
      await HistoriqueService.enregistrerAction(
        null, 
        `Tentative de connexion échouée - email: ${email}`, 
        clientIp,
        { success: false, reason: 'user_not_found' }
      );
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }
    console.log('DEBUG: Utilisateur trouvé');
    console.log('- ID:', user.id);
    console.log('- Email:', user.email);
    console.log('- Mot de passe hashé stocké:', user.password ? `[${user.password.length} chars]` : 'NULL');
    if (user.password) {
      console.log('- Début du hash:', user.password.substring(0, 30));
    }
    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('DEBUG: Résultat bcrypt.compare:', isMatch);

    if (!isMatch) {
      console.log('DEBUG: Mot de passe incorrect');
      // Test supplémentaire
      const testHash = await bcrypt.hash(password, 10);
      console.log('DEBUG: Hash du mot de passe fourni:', testHash.substring(0, 30));
      console.log('DEBUG: Correspondance avec hash stocké?', testHash === user.password);

      await HistoriqueService.enregistrerAction(
        user.id,
        `Tentative de connexion échouée - mot de passe incorrect`,
        clientIp,
        { success: false, reason: 'invalid_password' }
      );
      return res.status(401).json({ message: 'Mot de passe incorrect' });
      
    }
    console.log('DEBUG: Connexion réussie');

    // ENREGISTRER L'HISTORIQUE DE CONNEXION
    await HistoriqueService.enregistrerConnexion(user.id, clientIp);
    
    // ENREGISTRER L'ACTION DE CONNEXION
    await HistoriqueService.enregistrerAction(
      user.id,
      `Connexion réussie`,
      clientIp,
      { success: true, timestamp: new Date() }
    );
    // Générer un token JWT avec les données essentielles pour éviter
    // une requête DB lourde (roles + permissions) à chaque requête
    const userWithRoles = await User.findByPk(user.id, {
      include: [{
        model: db.Role,
        through: { attributes: [] },
        include: [{
          model: db.Permission,
          through: { attributes: [] },
        }],
      }],
    });

    const rolesPayload = (userWithRoles.roles || []).map(r => ({
      id: r.id,
      nom: r.nom,
      permissions: (r.permissions || []).map(p => ({ id: p.id, nom: p.nom, type: p.type })),
    }));

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        nom: user.nom,
        code_structure: user.code_structure,
        structure_id: user.structure_id,
        magasinId: user.magasinId,
        roles: rolesPayload,
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Optionnel : enregistrer la dernière connexion
    user.derniereConnexion = new Date();
    await user.save();

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        code_structure: user.code_structure,
        magasinId: user.magasinId,
        roles: rolesPayload,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Récupérer l'utilisateur connecté
exports.getMe = async (req, res) => {
  try {
     const user = await db.Users.findByPk(req.user.id, {
      include: [
        {
          model: db.Role,
          through: { attributes: [] }, // ignore les colonnes de la table user_role
          include: [
              {
                model: db.Permission,
                through: { attributes: [] } // ignore les colonnes de role_permissions
              }
            ]
        },
        {
          model:db.Magasin,
          attributes: ['id', 'nom']
        }
      ]
    });
    res.json({
      id: user.id,
      nom: user.nom,
      email: user.email,
      photoProfil: user.photoProfil,
      status: user.status,
      magasinId: user.magasinId,
      magasin: user.Magasin ? { id: user.Magasin.id, nom: user.Magasin.nom } : null,
      /* roles: user.roles.map((role) => ({
        nom: role.nom,
        //roles: user.roles.map(r => r.nom), // récupère juste le nom des rôles
        permissions: role.permissions.map((perm) => perm.nom), // noms des permissions
      })), */
      roles: (user.roles || []).map(role => ({
        id: role.id,
        nom: role.nom,
        permissions: (role.permissions || []).map(p =>({
           id: p.id,
           nom: p.nom,
           type: p.type
      })),
      })),
      structure_id: user.structure_id,
      code_structure: user.code_structure,
      isGeneralAdmin: !user.structure_id, // Ajouter ce flag

    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Déconnexion utilisateur (optionnel)
exports.deconnexion = async (req, res) => {
  try {
    const clientIp = HistoriqueService.getClientIp(req);
    
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Déconnexion`,
        clientIp,
        { timestamp: new Date() }
      );
    }
    
    res.json({ message: 'Déconnexion réussie' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
