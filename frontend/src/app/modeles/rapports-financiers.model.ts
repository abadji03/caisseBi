// models/rapport-financier.model.ts

export interface EtatFinancier {
  actif: number;
  passif: number;
  capitauxPropres: number;
}

export interface CompteResultat {
  revenus: number;
  charges: number;
  beneficeNet: number;
}

export interface FluxTresorerie {
  entree: number;
  sortie: number;
}

export interface AnalyseCoutsBenefices {
  coutsFixes: number;
  coutsVariables: number;
  benefices: number;
}

export interface PrevisionsFinancieres {
  revenusPrevus: number;
  chargesPrevisibles: number;
  beneficePrevu: number;
}
