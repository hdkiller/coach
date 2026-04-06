import { describe, expect, it } from 'vitest'
import {
  mergeYazioNutritionWithExisting,
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

  it('marks normalized Yazio items with source metadata for future merges', () => {
    const summary: YazioDailySummary = {
      meals: {
        breakfast: {
          nutrients: {
            'energy.energy': 95,
            'nutrient.carb': 25
          }
        }
      }
    }

    const items: YazioConsumedItemsResponse = {
      products: [],
      simple_products: [
        {
          id: 'simple-1',
          date: '2026-04-03T08:15:00.000Z',
          name: 'Water',
          type: 'simple_product',
          daytime: 'breakfast',
          nutrients: {
            'energy.energy': 0
          }
        }
      ],
      recipe_portions: []
    }

    const result = normalizeYazioData(summary, items, 'user-1', '2026-04-03')

    expect(result.breakfast).toEqual([
      expect.objectContaining({
        id: 'simple-1',
        source: 'yazio'
      })
    ])
  })
})

describe('mergeYazioNutritionWithExisting', () => {
  it('preserves app-managed items that are not part of the incoming Yazio payload', () => {
    const incoming = {
      userId: 'user-1',
      date: new Date('2026-04-03T00:00:00.000Z'),
      breakfast: [
        {
          id: 'yazio-1',
          source: 'yazio',
          name: 'Eggs',
          calories: 200,
          protein: 15,
          carbs: 2,
          fat: 14,
          logged_at: '2026-04-03T07:00:00.000Z'
        }
      ],
      lunch: null,
      dinner: null,
      snacks: null
    }

    const existing = {
      userId: 'user-1',
      date: new Date('2026-04-03T00:00:00.000Z'),
      breakfast: [
        {
          id: 'yazio-1',
          source: 'yazio',
          name: 'Eggs',
          calories: 200,
          protein: 15,
          carbs: 2,
          fat: 14,
          logged_at: '2026-04-03T07:00:00.000Z'
        }
      ],
      lunch: null,
      dinner: null,
      snacks: [
        {
          id: 'manual-1',
          source: 'ai',
          name: 'Coffee',
          entryType: 'HYDRATION',
          water_ml: 300,
          fluidMl: 300,
          hydrationFactor: 0.9,
          hydrationContributionMl: 270,
          calories: 5,
          protein: 0,
          carbs: 0,
          fat: 0,
          logged_at: '2026-04-03T06:20:00.000Z'
        }
      ]
    }

    const merged = mergeYazioNutritionWithExisting(incoming, existing)

    expect(merged.snacks).toEqual([
      expect.objectContaining({
        id: 'manual-1',
        source: 'ai',
        water_ml: 300
      })
    ])
    expect(merged.waterMl).toBeGreaterThanOrEqual(270)
  })

  it('preserves manual fluid-unit overrides for matched Yazio items', () => {
    const incoming = {
      userId: 'user-1',
      date: new Date('2026-04-03T00:00:00.000Z'),
      breakfast: [
        {
          id: 'yazio-water-1',
          source: 'yazio',
          name: 'Water',
          unit: 'g',
          amount: 300,
          water_ml: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          logged_at: '2026-04-03T07:15:00.000Z'
        }
      ],
      lunch: null,
      dinner: null,
      snacks: null
    }

    const existing = {
      userId: 'user-1',
      date: new Date('2026-04-03T00:00:00.000Z'),
      breakfast: [
        {
          id: 'yazio-water-1',
          source: 'yazio',
          name: 'Water',
          unit: 'ml',
          amount: 300,
          water_ml: 300,
          fluidMl: 300,
          hydrationFactor: 1,
          hydrationContributionMl: 300,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          logged_at: '2026-04-03T06:15:00.000Z'
        }
      ],
      lunch: null,
      dinner: null,
      snacks: null
    }

    const merged = mergeYazioNutritionWithExisting(incoming, existing)
    const breakfast = merged.breakfast as any[]

    expect(breakfast[0]).toEqual(
      expect.objectContaining({
        id: 'yazio-water-1',
        unit: 'ml',
        amount: 300,
        water_ml: 300,
        hydrationContributionMl: 300,
        logged_at: '2026-04-03T06:15:00.000Z'
      })
    )
  })
})
