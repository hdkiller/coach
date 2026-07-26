import { ofetch } from 'ofetch'

export interface NutrientsPer100g {
  calories_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  sugar_g?: number
  sodium_mg?: number
  saturated_fat_g?: number
}

export interface FoodItem {
  external_key?: string
  name: string
  brand?: string
  barcode?: string
  categories?: string[]
  serving_size_g?: number
  serving_description?: string
  nutrients_per_100g: NutrientsPer100g
  ingredients_text?: string
  source_url?: string
  attribution?: string
}

export interface CalculatedPortionNutrients {
  gram_amount: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  sugar_g?: number
  sodium_mg?: number
  saturated_fat_g?: number
}

export function calculatePortionNutrients(
  item: FoodItem,
  gramAmount: number
): CalculatedPortionNutrients {
  const factor = gramAmount / 100
  const n = item.nutrients_per_100g || {
    calories_kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0
  }

  const round1 = (val?: number) =>
    val !== undefined ? Math.round(val * factor * 10) / 10 : undefined

  return {
    gram_amount: gramAmount,
    calories: Math.round((n.calories_kcal || 0) * factor),
    protein_g: round1(n.protein_g) ?? 0,
    carbs_g: round1(n.carbs_g) ?? 0,
    fat_g: round1(n.fat_g) ?? 0,
    fiber_g: round1(n.fiber_g),
    sugar_g: round1(n.sugar_g),
    sodium_mg: round1(n.sodium_mg),
    saturated_fat_g: round1(n.saturated_fat_g)
  }
}

export function normalizeFoodItem(item: any): FoodItem {
  if (!item) return item

  let servingSizeG = item.serving_size_g
  let servingDescription = item.serving_description

  if (!servingSizeG && Array.isArray(item.serving_sizes) && item.serving_sizes.length > 0) {
    const first = item.serving_sizes[0]
    if (first.weight_g) {
      servingSizeG = first.weight_g
    }
    if (first.description) {
      servingDescription = first.description
    }
  }

  const nutrients = item.nutrients_per_100g || {}

  return {
    ...item,
    serving_size_g: servingSizeG,
    serving_description: servingDescription,
    nutrients_per_100g: {
      calories_kcal: Number(nutrients.calories_kcal ?? nutrients.calories ?? 0),
      protein_g: Number(nutrients.protein_g ?? nutrients.protein ?? 0),
      carbs_g: Number(nutrients.carbs_g ?? nutrients.carbs ?? 0),
      fat_g: Number(nutrients.fat_g ?? nutrients.fat ?? 0),
      fiber_g: nutrients.fiber_g !== undefined ? Number(nutrients.fiber_g) : undefined,
      sugar_g: nutrients.sugar_g !== undefined ? Number(nutrients.sugar_g) : undefined,
      sodium_mg: nutrients.sodium_mg !== undefined ? Number(nutrients.sodium_mg) : undefined,
      saturated_fat_g:
        nutrients.saturated_fat_g !== undefined ? Number(nutrients.saturated_fat_g) : undefined
    }
  }
}

function getFeederConfig() {
  let feederUrl = process.env.NUTRITION_FEEDER_URL || 'https://feeds.coachwatts.com'
  let feederApiKey = process.env.NUTRITION_FEEDER_API_KEY || ''

  try {
    const config = useRuntimeConfig()
    if (config?.nutritionFeederUrl) {
      feederUrl = config.nutritionFeederUrl
    }
    if (config?.nutritionFeederApiKey !== undefined) {
      feederApiKey = config.nutritionFeederApiKey
    }
  } catch {
    // Fall back to process.env in standalone/test environments
  }

  const baseUrl = feederUrl.replace(/\/+$/, '')
  const headers: Record<string, string> = {
    Accept: 'application/json'
  }

  if (feederApiKey) {
    headers['X-API-Key'] = feederApiKey
  }

  return { baseUrl, headers }
}

export const nutritionDatabaseService = {
  /**
   * Search food items by keyword query from the feeder service
   */
  async searchFoodDatabase(query: string, limit = 10): Promise<FoodItem[]> {
    if (!query || !query.trim()) {
      return []
    }

    try {
      const { baseUrl, headers } = getFeederConfig()
      const url = `${baseUrl}/api/v1/nutrition/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`

      const response = await ofetch<
        FoodItem[] | { items?: FoodItem[]; results?: FoodItem[] } | null
      >(url, {
        method: 'GET',
        headers,
        timeout: 10000
      })

      let rawItems: any[] = []
      if (Array.isArray(response)) {
        rawItems = response
      } else if (response && 'items' in response && Array.isArray(response.items)) {
        rawItems = response.items
      } else if (response && 'results' in response && Array.isArray(response.results)) {
        rawItems = response.results
      }

      return rawItems.map((item) => normalizeFoodItem(item))
    } catch (error) {
      console.warn('[NutritionDatabaseService] searchFoodDatabase failed:', error)
      return []
    }
  },

  /**
   * Lookup food item by barcode (UPC/EAN)
   */
  async lookupFoodBarcode(barcode: string): Promise<FoodItem | null> {
    if (!barcode || !barcode.trim()) {
      return null
    }

    try {
      const { baseUrl, headers } = getFeederConfig()
      const url = `${baseUrl}/api/v1/nutrition/barcode/${encodeURIComponent(barcode.trim())}`

      const response = await ofetch<any>(url, {
        method: 'GET',
        headers,
        timeout: 10000
      })

      return response && response.name ? normalizeFoodItem(response) : null
    } catch (error: any) {
      if (error?.status !== 404 && error?.statusCode !== 404) {
        console.warn('[NutritionDatabaseService] lookupFoodBarcode failed:', error)
      }
      return null
    }
  },

  /**
   * Fetch specific food item by external_key
   */
  async getFoodItemByKey(key: string): Promise<FoodItem | null> {
    if (!key || !key.trim()) {
      return null
    }

    try {
      const { baseUrl, headers } = getFeederConfig()
      const cleanKey = key.replace(/^\/+/, '')
      const url = `${baseUrl}/api/v1/nutrition/item/${cleanKey}`

      const response = await ofetch<any>(url, {
        method: 'GET',
        headers,
        timeout: 10000
      })

      return response && response.name ? normalizeFoodItem(response) : null
    } catch (error: any) {
      if (error?.status !== 404 && error?.statusCode !== 404) {
        console.warn('[NutritionDatabaseService] getFoodItemByKey failed:', error)
      }
      return null
    }
  }
}
