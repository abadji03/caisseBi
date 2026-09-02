const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Gestion de Caisse',
      version: '1.0.0',
      description: 'Documentation de l\'API pour la gestion des ventes, stocks et utilisateurs',
    },
    servers: [{ url: 'http://localhost:5000/api' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // ── Auth ──
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'admin@caisse.com' },
            password: { type: 'string', example: 'motdepasse123' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                nom: { type: 'string' },
                email: { type: 'string' },
                code_structure: { type: 'string' },
                magasinId: { type: 'integer' },
                roles: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
        // ── User ──
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            nom: { type: 'string' },
            email: { type: 'string' },
            telephone: { type: 'string' },
            status: { type: 'boolean' },
            magasinId: { type: 'integer' },
            code_structure: { type: 'string' },
          },
        },
        // ── Produit ──
        Produit: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            designation: { type: 'string' },
            reference: { type: 'string' },
            prixAchatUnitaire: { type: 'number' },
            prixVenteUnitaire: { type: 'number' },
            unite: { type: 'string' },
            tauxTVA: { type: 'number' },
            statut: { type: 'boolean' },
            code_structure: { type: 'string' },
          },
        },
        // ── Stock ──
        Stock: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            produitId: { type: 'integer' },
            magasinId: { type: 'integer' },
            quantiteTotale: { type: 'number' },
            quantiteReservee: { type: 'number' },
            seuilAlerte: { type: 'number' },
            statutStock: { type: 'string', enum: ['En stock', 'Critique', 'Rupture', 'Réservé', 'Surstock'] },
          },
        },
        // ── Bon ──
        Bon: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            numero: { type: 'string' },
            type: { type: 'string', enum: ['commande', 'livraison', 'retour', 'avoir', 'vente'] },
            typeEntite: { type: 'string', enum: ['client', 'fournisseur'] },
            statutBon: { type: 'string', enum: ['brouillon', 'validé', 'livré', 'retourné', 'facturé', 'annulé'] },
            montantTotal: { type: 'number' },
            remise: { type: 'number' },
            netAPayer: { type: 'number' },
            avance: { type: 'number' },
            resteAPayer: { type: 'number' },
            magasinId: { type: 'integer' },
            clientId: { type: 'integer' },
            fournisseurId: { type: 'integer' },
          },
        },
        // ── Paiement ──
        Paiement: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            montant: { type: 'number' },
            methodePaiement: { type: 'string', enum: ['Espèce', 'Carte', 'Orange Money', 'Wave', 'Chèque', 'Virement', 'Autre'] },
            typePaiement: { type: 'string', enum: ['client', 'fournisseur', 'autre'] },
            date: { type: 'string', format: 'date-time' },
            clientId: { type: 'integer' },
            fournisseurId: { type: 'integer' },
            bonId: { type: 'integer' },
          },
        },
        // ── Erreur ──
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routers/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = setupSwagger;
