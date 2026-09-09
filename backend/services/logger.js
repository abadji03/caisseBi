/**
 * Logger léger centralisé pour le backend.
 *
 * Objectifs (chantier 8) :
 * - remplacer les appels `console.log/error/warn` éparpillés par une API homogène ;
 * - ajouter un timestamp et un contexte (fichier) pour faciliter le diagnostic ;
 * - permettre de désactiver/limiter les logs en production via LOG_ENABLED.
 */
'use strict';

/* eslint-disable no-console */

const ENABLE_LOGS = process.env.LOG_ENABLED !== 'false';

function ts() {
  return new Date().toISOString();
}

function build(context) {
  return `${ts()} [${context || 'app'}]`;
}

module.exports = {
  info(context, message, ...args) {
    if (!ENABLE_LOGS) return;
    console.log(build(context), message, ...args);
  },

  /** Alias de info (les migrations console.log -> logger.log passent par ici). */
  log(context, message, ...args) {
    if (!ENABLE_LOGS) return;
    console.log(build(context), message, ...args);
  },

  error(context, message, ...args) {
    if (!ENABLE_LOGS) return;
    console.error(build(context), message, ...args);
  },

  warn(context, message, ...args) {
    if (!ENABLE_LOGS) return;
    console.warn(build(context), message, ...args);
  },
};