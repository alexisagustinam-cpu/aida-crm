import { describe, expect, it } from 'vitest'
import { INDUSTRIES } from './industry-catalog'

describe('industry catalog', () => {
  it('offers the approved Spanish industry taxonomy exactly', () => {
    expect(INDUSTRIES).toEqual([
      'Restaurantes y cafeterías',
      'Panaderías, pastelerías y postres',
      'Catering y servicios de alimentación',
      'Comercio minorista',
      'Comercio mayorista',
      'Salud y bienestar',
      'Educación',
      'Servicios profesionales',
      'Tecnología y software',
      'Inmobiliario y construcción',
      'Turismo y hospitalidad',
      'Transporte y logística',
      'Manufactura',
      'Agricultura y agroindustria',
      'Finanzas y seguros',
      'Belleza y cuidado personal',
      'Entretenimiento y eventos',
      'Automotriz',
      'Medios y marketing',
      'ONG/fundación',
      'Gobierno/institución pública',
      'Otro',
    ])
  })
})
