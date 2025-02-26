const express = require('express')
const bodyParser = require('body-parser')
const cors  = require('cors');
require('dotenv').config();

const userRoutes = require('./routers/userAccountRoutes');  // Routes des utilisateurs

//creer une variable server
const server = express()
server.use(bodyParser.json());
server.use(express.json());
server.use(cors());



// Utiliser les routes importées
server.use('/api/users', userRoutes);  // Préfixe des utilisateurs


//Etablir le port

const port = 8080
server.listen(port,function check(error){

    if(error) console.log("Erreur :" +error.stack);
    else console.log("Démarrage du serveur....."+port)
});


//Insertion de données étudiant
/* server.post("/api/etudiant/add", (req, res) => {
    let details = {
      nom: req.body.nom,
      cours: req.body.cours,
      frais: req.body.frais
    };

    let sql = "INSERT INTO etudiant SET ?";
    connection.query(sql, details, (error) => {
        console.log(req.body.nom);
      if (error) {
        res.send({ status: false, message: "Echec de l'enregistrement de l'étudiant "+error.message });
        //console.log(error.stack)
      } else {
        res.send({ status: true, message: "Etudiant enregistré avec succés" });
      }
    });
  }); */

//Lister les étiudiants
/* server.get("/api/etudiant", (req, res) => {
    let sql = "SELECT * FROM etudiant";
    connection.query(sql, function (error, result) {
      if (error) {
        console.log("Error Connecting to DB");
      } else {
        res.send({ status: true, data: result });
      }
    });
  }); */

//Chercher un étudiant
/* server.get("/api/etudiant/:id", (req, res) => {
    let studentid = req.params.id;
    let sql = "SELECT * FROM etudiant WHERE id=" + studentid;
    connection.query(sql, function (error, result) {
      if (error) {
        console.log("Error Connecting to DB"+error.message);
      }
      else {
        res.send({ status: true, data: result });
      }
    });
  }); */

//Mise à jour étudiant
/* server.put("/api/etudiant/update/:id", (req, res) => {
    let sql =
      "UPDATE etudiant SET nom='" +
      req.body.nom +
      "', cours='" +
      req.body.cours +
      "',frais='" +
      req.body.frais +
      "'  WHERE id=" +
      req.params.id;

    let a = connection.query(sql, (error, result) => {
      if (error) {
        res.send({ status: false, message: "Echec de la mise à jour de l'étudiant" });
      } else {
        res.send({ status: true, message: "Etudioant mis à jour avec succès" });
      }
    });
  }); */
  //Delete the Records
  /* server.delete("/api/etudiant/delete/:id", (req, res) => {
    let sql = "DELETE FROM etudiant WHERE id=" + req.params.id + "";
    let query = connection.query(sql, (error) => {
      if (error) {
        res.send({ status: false, message: "Echec de la suppression de l'étudiant" });
      } else {
        res.send({ status: true, message: "Etudiant supprimé avec succès" });
      }
    });
  });   */