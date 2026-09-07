/**
 * CONCE — Serviço de Engenharia e Consultoria LTDA
 * Tabela Oficial de Encargos Sociais por UF (27 Estados)
 * Referência: SINAPI / Caixa Econômica Federal & Lei 12.546/2011
 */

import { SocialChargesStateConfig } from '@/types/budgetEngine'

export const BRAZIL_STATES_CHARGES: Record<string, SocialChargesStateConfig> = {
  AC: {
    uf: 'AC',
    stateName: 'Acre',
    region: 'Norte',
    nonRelieved: { groupA: 16.8, groupB: 47.95, groupC: 14.85, groupD: 8.05, total: 87.65 },
    relieved: { groupA: 12.3, groupB: 47.95, groupC: 14.85, groupD: 5.9, total: 81.0 },
  },
  AL: {
    uf: 'AL',
    stateName: 'Alagoas',
    region: 'Nordeste',
    nonRelieved: { groupA: 16.8, groupB: 46.8, groupC: 14.7, groupD: 7.86, total: 86.16 },
    relieved: { groupA: 12.3, groupB: 46.8, groupC: 14.7, groupD: 5.76, total: 79.56 },
  },
  AP: {
    uf: 'AP',
    stateName: 'Amapá',
    region: 'Norte',
    nonRelieved: { groupA: 16.8, groupB: 47.1, groupC: 14.9, groupD: 7.91, total: 86.71 },
    relieved: { groupA: 12.3, groupB: 47.1, groupC: 14.9, groupD: 5.79, total: 80.09 },
  },
  AM: {
    uf: 'AM',
    stateName: 'Amazonas',
    region: 'Norte',
    nonRelieved: { groupA: 16.8, groupB: 47.3, groupC: 14.8, groupD: 7.95, total: 86.85 },
    relieved: { groupA: 12.3, groupB: 47.3, groupC: 14.8, groupD: 5.82, total: 80.22 },
  },
  BA: {
    uf: 'BA',
    stateName: 'Bahia',
    region: 'Nordeste',
    nonRelieved: { groupA: 16.8, groupB: 46.9, groupC: 14.75, groupD: 7.88, total: 86.33 },
    relieved: { groupA: 12.3, groupB: 46.9, groupC: 14.75, groupD: 5.77, total: 79.72 },
  },
  CE: {
    uf: 'CE',
    stateName: 'Ceará',
    region: 'Nordeste',
    nonRelieved: { groupA: 16.8, groupB: 47.2, groupC: 14.8, groupD: 7.93, total: 86.73 },
    relieved: { groupA: 12.3, groupB: 47.2, groupC: 14.8, groupD: 5.81, total: 80.11 },
  },
  DF: {
    uf: 'DF',
    stateName: 'Distrito Federal',
    region: 'Centro-Oeste',
    nonRelieved: { groupA: 16.8, groupB: 46.5, groupC: 14.6, groupD: 7.81, total: 85.71 },
    relieved: { groupA: 12.3, groupB: 46.5, groupC: 14.6, groupD: 5.72, total: 79.12 },
  },
  ES: {
    uf: 'ES',
    stateName: 'Espírito Santo',
    region: 'Sudeste',
    nonRelieved: { groupA: 16.8, groupB: 46.4, groupC: 14.65, groupD: 7.8, total: 85.65 },
    relieved: { groupA: 12.3, groupB: 46.4, groupC: 14.65, groupD: 5.71, total: 79.06 },
  },
  GO: {
    uf: 'GO',
    stateName: 'Goiás',
    region: 'Centro-Oeste',
    nonRelieved: { groupA: 16.8, groupB: 46.7, groupC: 14.7, groupD: 7.85, total: 86.05 },
    relieved: { groupA: 12.3, groupB: 46.7, groupC: 14.7, groupD: 5.74, total: 79.44 },
  },
  MA: {
    uf: 'MA',
    stateName: 'Maranhão',
    region: 'Nordeste',
    nonRelieved: { groupA: 16.8, groupB: 47.4, groupC: 14.9, groupD: 7.96, total: 87.06 },
    relieved: { groupA: 12.3, groupB: 47.4, groupC: 14.9, groupD: 5.83, total: 80.43 },
  },
  MT: {
    uf: 'MT',
    stateName: 'Mato Grosso',
    region: 'Centro-Oeste',
    nonRelieved: { groupA: 16.8, groupB: 46.6, groupC: 14.65, groupD: 7.83, total: 85.88 },
    relieved: { groupA: 12.3, groupB: 46.6, groupC: 14.65, groupD: 5.73, total: 79.28 },
  },
  MS: {
    uf: 'MS',
    stateName: 'Mato Grosso do Sul',
    region: 'Centro-Oeste',
    nonRelieved: { groupA: 16.8, groupB: 46.55, groupC: 14.6, groupD: 7.82, total: 85.77 },
    relieved: { groupA: 12.3, groupB: 46.55, groupC: 14.6, groupD: 5.73, total: 79.18 },
  },
  MG: {
    uf: 'MG',
    stateName: 'Minas Gerais',
    region: 'Sudeste',
    nonRelieved: { groupA: 16.8, groupB: 46.3, groupC: 14.55, groupD: 7.78, total: 85.43 },
    relieved: { groupA: 12.3, groupB: 46.3, groupC: 14.55, groupD: 5.69, total: 78.84 },
  },
  PA: {
    uf: 'PA',
    stateName: 'Pará',
    region: 'Norte',
    nonRelieved: { groupA: 16.8, groupB: 47.5, groupC: 14.95, groupD: 7.98, total: 87.23 },
    relieved: { groupA: 12.3, groupB: 47.5, groupC: 14.95, groupD: 5.84, total: 80.59 },
  },
  PB: {
    uf: 'PB',
    stateName: 'Paraíba',
    region: 'Nordeste',
    nonRelieved: { groupA: 16.8, groupB: 47.05, groupC: 14.8, groupD: 7.9, total: 86.55 },
    relieved: { groupA: 12.3, groupB: 47.05, groupC: 14.8, groupD: 5.79, total: 79.94 },
  },
  PR: {
    uf: 'PR',
    stateName: 'Paraná',
    region: 'Sul',
    nonRelieved: { groupA: 16.8, groupB: 45.9, groupC: 14.45, groupD: 7.71, total: 84.86 },
    relieved: { groupA: 12.3, groupB: 45.9, groupC: 14.45, groupD: 5.65, total: 78.3 },
  },
  PE: {
    uf: 'PE',
    stateName: 'Pernambuco',
    region: 'Nordeste',
    nonRelieved: { groupA: 16.8, groupB: 47.15, groupC: 14.85, groupD: 7.92, total: 86.72 },
    relieved: { groupA: 12.3, groupB: 47.15, groupC: 14.85, groupD: 5.8, total: 80.1 },
  },
  PI: {
    uf: 'PI',
    stateName: 'Piauí',
    region: 'Nordeste',
    nonRelieved: { groupA: 16.8, groupB: 47.35, groupC: 14.9, groupD: 7.95, total: 87.0 },
    relieved: { groupA: 12.3, groupB: 47.35, groupC: 14.9, groupD: 5.82, total: 80.37 },
  },
  RJ: {
    uf: 'RJ',
    stateName: 'Rio de Janeiro',
    region: 'Sudeste',
    nonRelieved: { groupA: 16.8, groupB: 46.1, groupC: 14.5, groupD: 7.74, total: 85.14 },
    relieved: { groupA: 12.3, groupB: 46.1, groupC: 14.5, groupD: 5.67, total: 78.57 },
  },
  RN: {
    uf: 'RN',
    stateName: 'Rio Grande do Norte',
    region: 'Nordeste',
    nonRelieved: { groupA: 16.8, groupB: 47.0, groupC: 14.75, groupD: 7.9, total: 86.45 },
    relieved: { groupA: 12.3, groupB: 47.0, groupC: 14.75, groupD: 5.78, total: 79.83 },
  },
  RS: {
    uf: 'RS',
    stateName: 'Rio Grande do Sul',
    region: 'Sul',
    nonRelieved: { groupA: 16.8, groupB: 45.8, groupC: 14.4, groupD: 7.69, total: 84.69 },
    relieved: { groupA: 12.3, groupB: 45.8, groupC: 14.4, groupD: 5.63, total: 78.13 },
  },
  RO: {
    uf: 'RO',
    stateName: 'Rondônia',
    region: 'Norte',
    nonRelieved: { groupA: 16.8, groupB: 47.45, groupC: 14.9, groupD: 7.97, total: 87.12 },
    relieved: { groupA: 12.3, groupB: 47.45, groupC: 14.9, groupD: 5.84, total: 80.49 },
  },
  RR: {
    uf: 'RR',
    stateName: 'Roraima',
    region: 'Norte',
    nonRelieved: { groupA: 16.8, groupB: 47.6, groupC: 14.95, groupD: 8.0, total: 87.35 },
    relieved: { groupA: 12.3, groupB: 47.6, groupC: 14.95, groupD: 5.85, total: 80.7 },
  },
  SC: {
    uf: 'SC',
    stateName: 'Santa Catarina',
    region: 'Sul',
    nonRelieved: { groupA: 16.8, groupB: 45.85, groupC: 14.4, groupD: 7.7, total: 84.75 },
    relieved: { groupA: 12.3, groupB: 45.85, groupC: 14.4, groupD: 5.64, total: 78.19 },
  },
  SP: {
    uf: 'SP',
    stateName: 'São Paulo',
    region: 'Sudeste',
    nonRelieved: { groupA: 16.8, groupB: 45.7, groupC: 14.35, groupD: 7.68, total: 84.53 },
    relieved: { groupA: 12.3, groupB: 45.7, groupC: 14.35, groupD: 5.62, total: 77.97 },
  },
  SE: {
    uf: 'SE',
    stateName: 'Sergipe',
    region: 'Nordeste',
    nonRelieved: { groupA: 16.8, groupB: 46.95, groupC: 14.75, groupD: 7.89, total: 86.39 },
    relieved: { groupA: 12.3, groupB: 46.95, groupC: 14.75, groupD: 5.77, total: 79.77 },
  },
  TO: {
    uf: 'TO',
    stateName: 'Tocantins',
    region: 'Norte',
    nonRelieved: { groupA: 16.8, groupB: 47.25, groupC: 14.85, groupD: 7.94, total: 86.84 },
    relieved: { groupA: 12.3, groupB: 47.25, groupC: 14.85, groupD: 5.81, total: 80.21 },
  },
}

export const BRAZIL_STATES_LIST = Object.values(BRAZIL_STATES_CHARGES).sort((a, b) =>
  a.stateName.localeCompare(b.stateName),
)

export function getChargesForState(uf: string, isRelieved: boolean) {
  const normalized = (uf || 'SP').toUpperCase()
  const stateData = BRAZIL_STATES_CHARGES[normalized] || BRAZIL_STATES_CHARGES['SP']
  return isRelieved ? stateData.relieved : stateData.nonRelieved
}
