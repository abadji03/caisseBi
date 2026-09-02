import { Bon } from "../modeles/bon.model";

export class BonHelper {

  static peutFacturer(bon: Bon): boolean {
    if (!bon) return false;
    if (bon.statutBon === 'facturé') return false;
    if (bon.type === 'avoir') return false;

    const typeEntite = bon.typeEntite || (bon.clientId ? 'client' : bon.fournisseurId ? 'fournisseur' : null);

    const reglesFacturation: Record<string, Record<string, string[]>> = {
      client: {
        commande: ['livré', 'valide'],
        vente: ['validé', 'livré'],
        livraison: ['validé']
      },
      fournisseur: {
        livraison: ['validé'],
        commande: ['livré', 'valide']
      }
    };

    if (reglesFacturation[typeEntite] && reglesFacturation[typeEntite][bon.type]) {
      return reglesFacturation[typeEntite][bon.type].includes(bon.statutBon);
    }
    return false;
  }

  static peutRetourner(bon: Bon): boolean {
    if (!bon) return false;

    const statut = String(bon.statutBon ?? '').trim().toLowerCase();
    const type = String(bon.type ?? '').trim().toLowerCase();
    const avanceRaw = bon?.avance ?? 0;
    const avanceNum = isNaN(Number(String(avanceRaw).trim().replace(',', '.'))) ? 0 : Number(String(avanceRaw).trim().replace(',', '.'));

    if (avanceNum > 0) return false;

    const conditions = [
      { type: 'vente', statut: 'validé' },
      { type: 'commande', statut: 'livré' },
      { type: 'livraison', statut: 'validé' }
    ];

    return conditions.some(c => c.type === type && c.statut === statut);
  }

  static safeNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }
}