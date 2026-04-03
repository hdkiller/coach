import { describe, expect, it } from 'vitest'
import {
  normalizeYazioData,
  type YazioConsumedItemsResponse,
  type YazioDailySummary
} from '../../../../server/utils/yazio'

describe('normalizeYazioData', () => {
  it('keeps recipe portions in the detailed meal log', () => {
    const summary: YazioDailySummary = {
      water_intake: 1200,
      goals: {
        'energy.energy': 2000
      },
      meals: {
        lunch: {
          nutrients: {
            'energy.energy': 600,
            'nutrient.carb': 56.1,
            'nutrient.protein': 21,
            'nutrient.fat': 30.3
          }
        }
      }
    }

    const items: YazioConsumedItemsResponse = {
      products: [],
      simple_products: [],
      recipe_portions: [
        {
          id: 'recipe-1',
          date: '2026-03-12T12:15:00.000Z',
          daytime: 'lunch',
          type: 'recipe_portion',
          recipe_name: 'Quinoa met rode bieten',
          serving: '1 portion',
          serving_quantity: 1,
          nutrients: {
            'energy.energy': 600,
            'nutrient.carb': 56.1,
            'nutrient.protein': 21,
            'nutrient.fat': 30.3
          }
        }
      ]
    }

    const result = normalizeYazioData(summary, items, 'user-1', '2026-03-12')

    expect(result.calories).toBe(600)
    expect(result.lunch).toEqual([
      expect.objectContaining({
        id: 'recipe-1',
        type: 'recipe_portion',
        product_name: 'Quinoa met rode bieten',
        calories: 600,
        carbs: 56.1,
        protein: 21,
        fat: 30.3,
        logged_at: '2026-03-12T12:15:00.000Z'
      })
    ])
  })

  it('recovers recipe portion macros from meal totals when Yazio omits them', () => {
    const summary: YazioDailySummary = {
      meals: {
        lunch: {
          nutrients: {
            'energy.energy': 600.1395,
            'nutrient.carb': 56.149425,
            'nutrient.protein': 20.976225,
            'nutrient.fat': 30.333175
          }
        }
      }
    }

    const items: YazioConsumedItemsResponse = {
      products: [],
      simple_products: [],
      recipe_portions: [
        {
          id: 'recipe-1',
          date: '2026-04-02 12:25:17',
          daytime: 'lunch',
          type: 'recipe_portion'
        }
      ]
    }

    const result = normalizeYazioData(summary, items, 'user-1', '2026-04-02')

    expect(result.lunch).toEqual([
      expect.objectContaining({
        id: 'recipe-1',
        type: 'recipe_portion',
        product_name: 'Recipe',
        calories: 600.1395,
        carbs: 56.149425,
        protein: 20.976225,
        fat: 30.333175,
        logged_at: '2026-04-02 12:25:17',
        nutrients: expect.objectContaining({
          'energy.energy': 600.1395,
          'nutrient.carb': 56.149425,
          'nutrient.protein': 20.976225,
          'nutrient.fat': 30.333175
        })
      })
    ])
  })

  it('assigns only the missing meal remainder to sparse recipe portions', () => {
    const summary: YazioDailySummary = {
      meals: {
        lunch: {
          nutrients: {
            'energy.energy': 600,
            'nutrient.carb': 56.1,
            'nutrient.protein': 21,
            'nutrient.fat': 30.3
          }
        }
      }
    }

    const items: YazioConsumedItemsResponse = {
      products: [
        {
          id: 'prod-1',
          date: '2026-03-12T12:00:00.000Z',
          daytime: 'lunch',
          type: 'product',
          amount: 1,
          serving: 'portion',
          product_id: 'product-1',
          serving_quantity: 1,
          product_nutrients: {
            'energy.energy': 150,
            'nutrient.carb': 10,
            'nutrient.protein': 5,
            'nutrient.fat': 2
          }
        } as any
      ],
      simple_products: [],
      recipe_portions: [
        {
          id: 'recipe-1',
          date: '2026-03-12T12:15:00.000Z',
          daytime: 'lunch',
          type: 'recipe_portion'
        }
      ]
    }

    const result = normalizeYazioData(summary, items, 'user-1', '2026-03-12')
    const lunch = result.lunch || []

    expect(lunch).toHaveLength(2)
    expect(lunch[1]).toEqual(
      expect.objectContaining({
        id: 'recipe-1',
        calories: 450,
        carbs: 46.1,
        protein: 16,
        fat: 28.3
      })
    )
  })
})
