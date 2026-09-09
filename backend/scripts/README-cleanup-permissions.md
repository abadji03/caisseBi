# Checklist de retrait des libellés (nettoyage final RBAC)

Les codes de permission stables sont la seule référence du contrôle d'accès.
La compatibilité avec les libellés français est **transitoire**. Ce document
décrit comment la supprimer proprement, sans risque.

## Étape 0 — Conditions préalables

1. `node scripts/migratePermissionCodes.js` : la colonne `code` doit être
   remplie pour **toutes** les permissions (aucune ligne "sans code").
2. L'application doit tourner avec cette version : le middleware émet un
   `logger.warn('auth.middleware', 'Libellé de permission déprécié ...')`
   pour chaque usage résiduel d'un libellé. **Attendre que plus aucun
   avertissement n'apparaisse dans `backend/logs/`** (au moins une semaine
   d'activité, incluant les connexions de tous les rôles).

## Étape 1 — Backend

1. `constants/permissions.js` : supprimer `LABEL_TO_CODE` (garder
   `CODE_TO_LABEL` pour l'affichage si utile).
2. `middlewares/auth.middleware.js` :
   - supprimer les normalisations `LABEL_TO_CODE[...]` dans
     `requirePermission` et `requireStructureAccess` (comparer `p.code` seul) ;
   - supprimer `warnDeprecatedLabel` et les appels associés ;
   - l'argument des routes étant déjà en codes, rien d'autre à changer.
3. `tests/permission.middleware.test.js` : remplacer les arguments libellés
   par les codes (`'Gérer les produits'` → `'products.manage'`, etc.).
4. Rendre la colonne `code` NOT NULL : dans `models/permission.model.js`,
   passer `allowNull: false` et faire une migration `changeColumn`.

## Étape 2 — Frontend

1. `services/auth.service.ts` : `hasPermission` — supprimer le fallback
   `p.nom === permission` (comparer `p.code` seul).
2. `roles-permissions` (écran admin) : vérifier que la création/édition de
   permissions renseigne bien le `code` (interdire un `code` vide).

## Étape 3 — Validation

1. Suite backend complète : `npx jest` (142+ tests).
2. Audit : `node scripts/fixRolePermissions.js` (0 MANQUANT attendu).
3. Parcours manuel des 5 rôles.

## Ne PAS faire avant l'étape 0

Supprimer `LABEL_TO_CODE` alors que des permissions en base sont encore sans
code rendrait **tous** les utilisateurs privés de droits (403 partout).
