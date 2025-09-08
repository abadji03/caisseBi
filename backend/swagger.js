const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Configuration de Swagger
const options = {
  definition: {
    openapi: '3.0.0', // Version OpenAPI
    info: {
      title: 'API de Gestion de Caisse',
      version: '1.0.0',
      description: 'Documentation de l’API pour la gestion des ventes, stocks et utilisateurs',
    },
    servers: [
      {
        url: 'http://localhost:5000/api', // URL de base de ton API
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.js'], // Chemin vers tes fichiers de routes avec les commentaires JSDoc
};

const swaggerSpec = swaggerJSDoc(options);

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = setupSwagger;
