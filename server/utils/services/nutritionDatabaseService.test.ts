import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  calculatePortionNutrients,
  nutritionDatabaseService,
  type FoodItem
} from './nutritionDatabaseService'

process.env.NUTRITION_FEEDER_URL = 'http://localhost:8844'
process.env.NUTRITION_FEEDER_API_KEY = 'test-key'

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)
vi.mock('ofetch', () => ({
  ofetch: (...args: any[]) => mockFetch(...args)
}))

describe('calculatePortionNutrients', () => {
  const sampleItem: FoodItem = {
    name: 'Nutella',
    brand: 'Ferrero',
    barcode: '3017620422003',
    serving_size_g: 15,
    serving_description: '1 tbsp (15g)',
    nutrients_per_100g: {
      calories_kcal: 539,
      protein_g: 6.3,
      carbs_g: 57.5,
      fat_g: 30.9,
      fiber_g: 3.0,
      sugar_g: 56.3,
      sodium_mg: 40.0,
      saturated_fat_g: 10.6
    }
  }

  it('calculates exact 100g portion matching nutrients_per_100g', () => {
    const result = calculatePortionNutrients(sampleItem, 100)
    expect(result.calories).toBe(539)
    expect(result.protein_g).toBe(6.3)
    expect(result.carbs_g).toBe(57.5)
    expect(result.fat_g).toBe(30.9)
    expect(result.fiber_g).toBe(3.0)
    expect(result.sugar_g).toBe(56.3)
  })

  it('scales nutrients accurately for a 15g serving', () => {
    const result = calculatePortionNutrients(sampleItem, 15)
    expect(result.calories).toBe(81) // 539 * 0.15 = 80.85 -> 81
    expect(result.protein_g).toBe(0.9) // 6.3 * 0.15 = 0.945 -> 0.9
    expect(result.carbs_g).toBe(8.6) // 57.5 * 0.15 = 8.625 -> 8.6
    expect(result.fat_g).toBe(4.6) // 30.9 * 0.15 = 4.635 -> 4.6
  })
})

describe('nutritionDatabaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('searchFoodDatabase', () => {
    it('returns empty array when query is empty', async () => {
      const res = await nutritionDatabaseService.searchFoodDatabase('')
      expect(res).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('handles direct array response from feeder', async () => {
      const mockItems: FoodItem[] = [
        {
          name: 'Oats',
          nutrients_per_100g: { calories_kcal: 389, protein_g: 16.9, carbs_g: 66.3, fat_g: 6.9 }
        }
      ]
      mockFetch.mockResolvedValueOnce(mockItems)

      const results = await nutritionDatabaseService.searchFoodDatabase('oats', 5)
      expect(results).toHaveLength(1)
      expect(results[0]?.name).toBe('Oats')
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8844/api/v1/nutrition/search?q=oats&limit=5',
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-API-Key': 'test-key' })
        })
      )
    })

    it('handles object with items property', async () => {
      mockFetch.mockResolvedValueOnce({
        items: [
          {
            name: 'Protein Powder',
            nutrients_per_100g: { calories_kcal: 400, protein_g: 80, carbs_g: 5, fat_g: 2 }
          }
        ]
      })

      const results = await nutritionDatabaseService.searchFoodDatabase('protein')
      expect(results).toHaveLength(1)
      expect(results[0]?.name).toBe('Protein Powder')
    })

    it('returns empty array gracefully on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))
      const results = await nutritionDatabaseService.searchFoodDatabase('banana')
      expect(results).toEqual([])
    })
  })

  describe('lookupFoodBarcode', () => {
    it('returns item when barcode matches', async () => {
      const item: FoodItem = {
        name: 'Nutella',
        barcode: '3017620422003',
        nutrients_per_100g: { calories_kcal: 539, protein_g: 6.3, carbs_g: 57.5, fat_g: 30.9 }
      }
      mockFetch.mockResolvedValueOnce(item)

      const result = await nutritionDatabaseService.lookupFoodBarcode('3017620422003')
      expect(result).toEqual(item)
    })

    it('returns null on 404', async () => {
      mockFetch.mockRejectedValueOnce({ statusCode: 404 })
      const result = await nutritionDatabaseService.lookupFoodBarcode('0000000000000')
      expect(result).toBeNull()
    })
  })

  describe('getFoodItemByKey', () => {
    it('fetches item by external key', async () => {
      const item: FoodItem = {
        external_key: 'usda:12345',
        name: 'Apple',
        nutrients_per_100g: { calories_kcal: 52, protein_g: 0.3, carbs_g: 13.8, fat_g: 0.2 }
      }
      mockFetch.mockResolvedValueOnce(item)

      const result = await nutritionDatabaseService.getFoodItemByKey('usda:12345')
      expect(result).toEqual(item)
    })
  })
})
