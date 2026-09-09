// scripts/resetAdminPassword.js
//
// Réinitialisation du mot de passe d'un utilisateur (ex. admin) en ligne de commande.
//
// Usage (depuis le dossier backend/) :
//   node scripts/resetAdminPassword.js                          → liste les utilisateurs
//   node scripts/resetAdminPassword.js <email> <nouveauMotDePasse>
//   Exemple :
//   node scripts/resetAdminPassword.js abadji3992@gmail.com MonNouveauMotDePasse123
//
// Le mot de passe est haché avec bcrypt (10 rounds), comme dans
// controllers/users.controller.js — aucune rupture de compatibilité avec la connexion.

const bcrypt = require('bcrypt');
const path = require('path');
const dotenv = require('dotenv');

// Charger l'environnement : backend/.env en priorité, sinon .env à la racine du projet
dotenv.config();
if (!process.env.DB_NAME) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const db = require('../models');

async function listerUtilisateurs() {
  const users = await db.Users.findAll({
    attributes: ['id', 'nom', 'email', 'code_structure', 'status'],
    order: [['id', 'ASC']],
  });
  console.log('\n📋 Utilisateurs :');
  users.forEach((u) => {
    console.log(
      `  #${u.id} — ${u.nom} <${u.email}> — structure: ${u.code_structure ?? '—'} — actif: ${u.status ? 'oui' : 'non'}`
    );
  });
  console.log('\nUsage : node scripts/resetAdminPassword.js <email> <nouveauMotDePasse>\n');
}

async function reinitialiserMotDePasse(email, nouveauMotDePasse) {
  if (!email || !nouveauMotDePasse) {
    console.error('❌ Usage : node scripts/resetAdminPassword.js <email> <nouveauMotDePasse>');
    process.exit(1);
  }
  if (nouveauMotDePasse.length < 8) {
    console.error('❌ Le nouveau mot de passe doit contenir au moins 8 caractères.');
    process.exit(1);
  }

  const user = await db.Users.findOne({ where: { email } });
  if (!user) {
    console.error(`❌ Aucun utilisateur trouvé avec l'email "${email}".`);
    await listerUtilisateurs();
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(nouveauMotDePasse, salt);

  await user.update({ password: hash });

  // Vérification immédiate, comme le fait la route de connexion
  const verif = await bcrypt.compare(nouveauMotDePasse, user.password);
  if (!verif) {
    console.error('❌ ERREUR : la vérification du nouveau mot de passe a échoué (aucun changement fiable).');
    process.exit(1);
  }

  console.log(`✅ Mot de passe réinitialisé pour ${user.nom} <${user.email}> (id #${user.id}).`);
  console.log('   Vous pouvez maintenant vous connecter avec le nouveau mot de passe.');
}

(async () => {
  try {
    const [email, motDePasse] = process.argv.slice(2);

    await db.sequelize.authenticate();
    console.log('🔌 Connecté à la base de données.');

    if (!email) {
      await listerUtilisateurs();
    } else {
      await reinitialiserMotDePasse(email, motDePasse);
    }

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur :', error.message);
    process.exit(1);
  }
})();
