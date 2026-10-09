import { describe, it, expect } from 'vitest'
import { canonicalizeUnit, areUnitsEquivalent, normalizeUnit } from './measurementUnits'

describe('canonicalizeUnit (Normalização de Unidades para Engenharia de Custos)', () => {
  it('normaliza m² e variações para m2', () => {
    expect(canonicalizeUnit('m²')).toBe('m2')
    expect(canonicalizeUnit('m2')).toBe('m2')
    expect(canonicalizeUnit('M2')).toBe('m2')
    expect(canonicalizeUnit('M²')).toBe('m2')
    expect(canonicalizeUnit('m^2')).toBe('m2')
    expect(canonicalizeUnit(' m² ')).toBe('m2')
    expect(canonicalizeUnit('metro quadrado')).toBe('m2')
    expect(canonicalizeUnit('metros quadrados')).toBe('m2')
  })

  it('normaliza m³ e variações para m3', () => {
    expect(canonicalizeUnit('m³')).toBe('m3')
    expect(canonicalizeUnit('m3')).toBe('m3')
    expect(canonicalizeUnit('M3')).toBe('m3')
    expect(canonicalizeUnit('M³')).toBe('m3')
    expect(canonicalizeUnit('m^3')).toBe('m3')
    expect(canonicalizeUnit('metro cubico')).toBe('m3')
    expect(canonicalizeUnit('metro cúbico')).toBe('m3')
  })

  it('normaliza unidade / peça / item para un', () => {
    expect(canonicalizeUnit('un')).toBe('un')
    expect(canonicalizeUnit('UN')).toBe('un')
    expect(canonicalizeUnit('und')).toBe('un')
    expect(canonicalizeUnit('UND')).toBe('un')
    expect(canonicalizeUnit('unid')).toBe('un')
    expect(canonicalizeUnit('UNID')).toBe('un')
    expect(canonicalizeUnit('unid.')).toBe('un')
    expect(canonicalizeUnit('und.')).toBe('un')
    expect(canonicalizeUnit('un.')).toBe('un')
    expect(canonicalizeUnit('unidade')).toBe('un')
    expect(canonicalizeUnit('unidades')).toBe('un')
    expect(canonicalizeUnit('pç')).toBe('un')
    expect(canonicalizeUnit('peça')).toBe('un')
    expect(canonicalizeUnit('peca')).toBe('un')
    expect(canonicalizeUnit('item')).toBe('un')
  })

  it('normaliza massa e peso (kg, t, g)', () => {
    expect(canonicalizeUnit('kg')).toBe('kg')
    expect(canonicalizeUnit('KG')).toBe('kg')
    expect(canonicalizeUnit('kg.')).toBe('kg')
    expect(canonicalizeUnit('quilo')).toBe('kg')
    expect(canonicalizeUnit('quilograma')).toBe('kg')
    expect(canonicalizeUnit('kilo')).toBe('kg')
    expect(canonicalizeUnit('t')).toBe('t')
    expect(canonicalizeUnit('ton')).toBe('t')
    expect(canonicalizeUnit('tonelada')).toBe('t')
    expect(canonicalizeUnit('g')).toBe('g')
  })

  it('normaliza tempo (h, dia, mes)', () => {
    expect(canonicalizeUnit('h')).toBe('h')
    expect(canonicalizeUnit('hr')).toBe('h')
    expect(canonicalizeUnit('hrs')).toBe('h')
    expect(canonicalizeUnit('hora')).toBe('h')
    expect(canonicalizeUnit('horas')).toBe('h')
    expect(canonicalizeUnit('dia')).toBe('dia')
    expect(canonicalizeUnit('diária')).toBe('dia')
    expect(canonicalizeUnit('diaria')).toBe('dia')
    expect(canonicalizeUnit('mês')).toBe('mes')
    expect(canonicalizeUnit('mes')).toBe('mes')
    expect(canonicalizeUnit('meses')).toBe('mes')
  })

  it('normaliza verba e percentual', () => {
    expect(canonicalizeUnit('vb')).toBe('vb')
    expect(canonicalizeUnit('vb.')).toBe('vb')
    expect(canonicalizeUnit('verba')).toBe('vb')
    expect(canonicalizeUnit('%')).toBe('%')
  })

  it('preserva ml (mililitro) e não confunde com m (metro linear)', () => {
    expect(canonicalizeUnit('ml')).toBe('ml')
    expect(canonicalizeUnit('ML')).toBe('ml')
    expect(canonicalizeUnit('m')).toBe('m')
    expect(canonicalizeUnit('metro')).toBe('m')
    expect(canonicalizeUnit('metro linear')).toBe('m')
  })

  it('retorna string vazia para entradas vazias, nulas ou indefinidas', () => {
    expect(canonicalizeUnit('')).toBe('')
    expect(canonicalizeUnit('   ')).toBe('')
    expect(canonicalizeUnit(null)).toBe('')
    expect(canonicalizeUnit(undefined)).toBe('')
  })
})

describe('areUnitsEquivalent (Comparador Semântico de Unidades)', () => {
  it('reconhece equivalência entre m² e m2 em qualquer variação', () => {
    expect(areUnitsEquivalent('m²', 'm2')).toBe(true)
    expect(areUnitsEquivalent('M2', 'm²')).toBe(true)
    expect(areUnitsEquivalent('m²', 'm²')).toBe(true)
    expect(areUnitsEquivalent('m2', 'm2')).toBe(true)
    expect(areUnitsEquivalent('m²', ' m2 ')).toBe(true)
    expect(areUnitsEquivalent('M²', 'M2')).toBe(true)
  })

  it('reconhece equivalência entre m³ e m3', () => {
    expect(areUnitsEquivalent('m³', 'm3')).toBe(true)
    expect(areUnitsEquivalent('M3', 'm³')).toBe(true)
    expect(areUnitsEquivalent('m³', 'm³')).toBe(true)
    expect(areUnitsEquivalent('m3', 'm3')).toBe(true)
  })

  it('reconhece equivalência entre variações de unidade (un, und, unid, unid., etc.)', () => {
    expect(areUnitsEquivalent('un', 'und')).toBe(true)
    expect(areUnitsEquivalent('un', 'unid')).toBe(true)
    expect(areUnitsEquivalent('un', 'unid.')).toBe(true)
    expect(areUnitsEquivalent('UND', 'un')).toBe(true)
    expect(areUnitsEquivalent('unid.', 'UND')).toBe(true)
    expect(areUnitsEquivalent('unidade', 'un')).toBe(true)
    expect(areUnitsEquivalent('peça', 'un')).toBe(true)
  })

  it('rejeita unidades genuinamente incompatíveis', () => {
    expect(areUnitsEquivalent('m', 'm²')).toBe(false)
    expect(areUnitsEquivalent('m²', 'm³')).toBe(false)
    expect(areUnitsEquivalent('kg', 'un')).toBe(false)
    expect(areUnitsEquivalent('vb', 'm2')).toBe(false)
    expect(areUnitsEquivalent('h', 'un')).toBe(false)
    expect(areUnitsEquivalent('m', 'ml')).toBe(false)
  })

  it('rejeita quando qualquer unidade for vazia, nula ou indefinida', () => {
    expect(areUnitsEquivalent('', 'm²')).toBe(false)
    expect(areUnitsEquivalent('m²', '')).toBe(false)
    expect(areUnitsEquivalent(null, 'm²')).toBe(false)
    expect(areUnitsEquivalent('m²', undefined)).toBe(false)
    expect(areUnitsEquivalent('', '')).toBe(false)
    expect(areUnitsEquivalent(null, null)).toBe(false)
  })
})

describe('normalizeUnit (Retrocompatibilidade de Exibição)', () => {
  it('converte m2 para m² para exibição padrão', () => {
    expect(normalizeUnit('m2')).toBe('m²')
    expect(normalizeUnit('m²')).toBe('m²')
  })

  it('converte m3 para m³ para exibição padrão', () => {
    expect(normalizeUnit('m3')).toBe('m³')
    expect(normalizeUnit('m³')).toBe('m³')
  })

  it('converte und / unid para un', () => {
    expect(normalizeUnit('und')).toBe('un')
    expect(normalizeUnit('unid')).toBe('un')
    expect(normalizeUnit('unidade')).toBe('un')
  })

  it('retorna un para strings vazias', () => {
    expect(normalizeUnit('')).toBe('un')
    expect(normalizeUnit(undefined)).toBe('un')
  })
})
