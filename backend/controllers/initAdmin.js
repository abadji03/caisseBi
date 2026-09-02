const bcrypt = require('bcrypt');
const db = require('../models');

const initAdmin = async () => {
  const adminEmail = 'abadji3992@gmail.com';

  const existing = await db.Users.findOne({
    where: { email: adminEmail }
  });

  if (!existing) {
    const hashedPassword = await bcrypt.hash('admin_general', 10);

    const admin = await db.Users.create({
      nom: 'Admin Général',
      email: adminEmail,
      password: hashedPassword,
      code_structure: null,
      structure_id: null,
      numeroE: 0 // ⚠️ important si ton hook casse
    });

    // Associer le rôle ADMIN GENERAL
    const role = await db.Role.findOne({
      where: { nom: 'Administrateur Général' }
    });

    if (role) {
      await admin.addRole(role);
    }

    console.log('✅ Admin général créé');
  } else {
    console.log('ℹ️ Admin déjà existant');
  }
};
module.exports = initAdmin;