const mysql  = require('mysql');

//établir une connexion à la BD

const connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'db_cmp'
  });

connection.connect(function(err) {
    if (err) {
        console.error('Echec de la connexion à la base: ' + err.stack);
        return;
    }else {
        console.log('Connexion à la base réussie ' + connection.threadId);
    }
});

module.exports = connection;