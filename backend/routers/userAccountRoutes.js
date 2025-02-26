const express = require('express');
const router = express.Router();
const connection = require('../connexionBD/db'); // Importer la connexion à la base de données


 /* Définir les Routes */

/* Ajouter un nouveau utilisateur */

router.post("/add", (req, res) => {

    const { nom, prenom,telephone, email, password, adresse,type_user } = req.body;

    connection.query('INSERT INTO utilisateurs (nom, prenom,telephone, email, password, adresse,type_user) VALUES (?, ?, ?,?, ?, ?,?)', [nom, prenom,telephone, email, password, adresse,type_user], (err, result) => {

      if (err) {

        res.status(500).send('Erreur lors de la création du compte :'+err.message);
        return;

      }
      /* else {
        res.status(201).send("Compte créé avec succès");
        return;
      } */

      const userId = result.insertId;

       connection.query('SELECT * FROM utilisateurs WHERE id_user = ?', userId, (err, result) => {

        if (err) {

          res.status(500).send('Erreur lors de l\'ajout de l\'utilisateur');

          return;

        }

        res.status(201).json(result[0]);

      });

    });

  });

  /* Lister tous les utilisateurs */

  router.get('/findAll', (req, res) => {

    connection.query('SELECT * FROM utilisateurs', (err, results) => {

      if (err) {

        res.status(500).send('Erreur lors de la récupération des données sur les utilisateurs :'+err.message);

        return;

      }

      res.json(results);

    });

  });

  /* Chercher un utilisateur particulier selon son email */

  router.get('/findEmail/:email', (req, res) => {

    const userEmail = req.params.email;

    connection.query('SELECT email FROM utilisateurs WHERE email = ?', userEmail, (err, result) => {

      if (err) {

        res.status(500).send('Erreur lors de la recherche de l\'utlisateur');

        return;

      }

      if (result.length === 0) {

        res.status(404).send('Aucun utilisateur avec cet email');

        return;

      }

      res.json(result[0]);

    });

  });

  /* Chercher un utilisateur particulier */

  router.get('/find/:id', (req, res) => {

    const userId = req.params.id;

    connection.query('SELECT * FROM utilisateurs WHERE id_user = ?', userId, (err, result) => {

      if (err) {

        res.status(500).send('Erreur lors de la recherche de l\'utlisateur');

        return;

      }

      if (result.length === 0) {

        res.status(404).send('Utilisateur non trouvé');

        return;

      }

      res.json(result[0]);

    });

  });

  /* Mettre à jour un utilisateur */

  router.put('/update/:id', (req, res) => {

    const userId = req.params.id;

    const { nom, prenom,telephone, email, password, adresse,type_user } = req.body;

    connection.query('UPDATE  utilisateurs SET nom = ?, prenom = ?,telephone = ?,email = ?, password = ?,adresse = ?,type_user = ? WHERE id_user = ?', [nom, prenom,telephone, email, password, adresse,type_user, userId], err => {

      if (err) {

        res.status(500).send('Erreur lors de la mise à jour de l\'utilisateur '+err.message);

        return;

      }

     connection.query('SELECT * FROM utilisateurs WHERE id_user = ?', userId, (err, result) => {

        if (err) {

          res.status(500).send('Erreur lors de la récupération des données sur l\'utilisateur ');

          return;

        }

        res.json(result[0]);

      });

    });

  });

  /* Supprimer un utilisateur */

  router.delete('/delete/:id', (req, res) => {

    const userId = req.params.id;

    connection.query('DELETE FROM utilisateurs WHERE id = ?', userId, err => {

      if (err) {

        res.status(500).send('Erreur lors de la suppression ');

        return;

      }

      res.status(200).json({ msg: 'Utilisateur supprimer avec succès' });

    });

  });

  module.exports = router;