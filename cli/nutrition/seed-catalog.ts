import { Command } from 'commander'
import { prisma } from '../../server/utils/db'
import chalk from 'chalk'

const seedCatalogCommand = new Command('seed-catalog')
  .description('Seed the MealOptionCatalog with initial reference meal templates')
  .action(async () => {
    const templates = [
      {
        title: 'Oatmeal with Banana and Honey',
        windowType: 'PRE',
        absorptionType: 'BALANCED',
        dietaryBuckets: ['VEGAN', 'DAIRY_FREE'],
        baseMacros: { carbs: 60, protein: 8, fat: 5, kcal: 320 },
        keyIngredient: 'Oats',
        ingredients: [
          { item: 'Rolled Oats', quantity: 60, unit: 'g', isScalable: true },
          { item: 'Banana', quantity: 1, unit: 'piece', isScalable: false },
          { item: 'Honey', quantity: 15, unit: 'ml', isScalable: true },
          { item: 'Water/Almond Milk', quantity: 200, unit: 'ml', isScalable: true }
        ],
        prepMinutes: 5,
        constraintTags: ['low-fat', 'high-carb']
      },
      {
        title: 'White Bread with Jam',
        windowType: 'PRE',
        absorptionType: 'FAST',
        dietaryBuckets: ['VEGAN', 'DAIRY_FREE'],
        baseMacros: { carbs: 45, protein: 4, fat: 2, kcal: 210 },
        keyIngredient: 'Bread',
        ingredients: [
          { item: 'White Bread', quantity: 2, unit: 'slices', isScalable: true },
          { item: 'Strawberry Jam', quantity: 30, unit: 'g', isScalable: true }
        ],
        prepMinutes: 2,
        constraintTags: ['low-fiber', 'fast-energy']
      },
      {
        title: 'Recovery Smoothie',
        windowType: 'POST',
        absorptionType: 'RAPID',
        dietaryBuckets: ['VEGETARIAN'],
        baseMacros: { carbs: 50, protein: 25, fat: 2, kcal: 320 },
        keyIngredient: 'Banana',
        ingredients: [
          { item: 'Whey Protein', quantity: 30, unit: 'g', isScalable: false },
          { item: 'Banana', quantity: 1, unit: 'piece', isScalable: true },
          { item: 'Skim Milk', quantity: 250, unit: 'ml', isScalable: true },
          { item: 'Maple Syrup', quantity: 10, unit: 'ml', isScalable: true }
        ],
        prepMinutes: 3,
        constraintTags: ['high-protein', 'rapid-recovery']
      },
      {
        title: 'Pasta with Tomato Sauce and Chicken',
        windowType: 'BASE',
        absorptionType: 'BALANCED',
        dietaryBuckets: [],
        baseMacros: { carbs: 80, protein: 35, fat: 12, kcal: 580 },
        keyIngredient: 'Pasta',
        ingredients: [
          { item: 'Pasta', quantity: 100, unit: 'g', isScalable: true },
          { item: 'Chicken Breast', quantity: 120, unit: 'g', isScalable: true },
          { item: 'Tomato Sauce', quantity: 150, unit: 'ml', isScalable: false },
          { item: 'Olive Oil', quantity: 5, unit: 'ml', isScalable: false }
        ],
        prepMinutes: 20,
        constraintTags: ['balanced-meal', 'high-carb']
      },
      {
        title: 'Rice Cake with Peanut Butter and Honey',
        windowType: 'PRE',
        absorptionType: 'FAST',
        dietaryBuckets: ['VEGETARIAN'],
        baseMacros: { carbs: 35, protein: 6, fat: 10, kcal: 250 },
        keyIngredient: 'Rice Cake',
        ingredients: [
          { item: 'Rice Cake', quantity: 3, unit: 'piece', isScalable: true },
          { item: 'Peanut Butter', quantity: 20, unit: 'g', isScalable: false },
          { item: 'Honey', quantity: 10, unit: 'ml', isScalable: true }
        ],
        prepMinutes: 2,
        constraintTags: ['quick-snack']
      },
      {
        title: 'Porridge with Berries and Yoghurt',
        windowType: 'PRE',
        absorptionType: 'BALANCED',
        dietaryBuckets: ['VEGETARIAN'],
        baseMacros: { carbs: 55, protein: 18, fat: 8, kcal: 380 },
        keyIngredient: 'Oats',
        ingredients: [
          { item: 'Rolled Oats', quantity: 55, unit: 'g', isScalable: true },
          { item: 'Greek Yoghurt', quantity: 120, unit: 'g', isScalable: true },
          { item: 'Mixed Berries', quantity: 80, unit: 'g', isScalable: true }
        ],
        prepMinutes: 6,
        constraintTags: ['balanced-meal']
      },
      // INTRA templates: without these, every in-session suggestion fell through to the LLM.
      {
        title: 'Energy Gels and Water',
        windowType: 'INTRA',
        absorptionType: 'RAPID',
        dietaryBuckets: ['VEGAN', 'DAIRY_FREE', 'GLUTEN_FREE'],
        baseMacros: { carbs: 50, protein: 0, fat: 0, kcal: 200 },
        keyIngredient: 'Energy Gel',
        ingredients: [
          { item: 'Energy Gel', quantity: 2, unit: 'piece', isScalable: true },
          { item: 'Water', quantity: 500, unit: 'ml', isScalable: true }
        ],
        prepMinutes: 1,
        constraintTags: ['low-fiber', 'fast-energy']
      },
      {
        title: 'Carb Drink Mix',
        windowType: 'INTRA',
        absorptionType: 'RAPID',
        dietaryBuckets: ['VEGAN', 'DAIRY_FREE', 'GLUTEN_FREE'],
        baseMacros: { carbs: 60, protein: 0, fat: 0, kcal: 240 },
        keyIngredient: 'Carb Powder',
        ingredients: [
          { item: 'Carbohydrate Drink Powder', quantity: 65, unit: 'g', isScalable: true },
          { item: 'Water', quantity: 750, unit: 'ml', isScalable: true },
          { item: 'Electrolyte Tablet', quantity: 1, unit: 'piece', isScalable: false }
        ],
        prepMinutes: 2,
        constraintTags: ['low-fiber', 'liquid-only', 'fast-energy']
      },
      {
        title: 'Banana and Rice Cakes On The Bike',
        windowType: 'INTRA',
        absorptionType: 'FAST',
        dietaryBuckets: ['VEGAN', 'DAIRY_FREE'],
        baseMacros: { carbs: 45, protein: 3, fat: 2, kcal: 210 },
        keyIngredient: 'Banana',
        ingredients: [
          { item: 'Banana', quantity: 1, unit: 'piece', isScalable: true },
          { item: 'Rice Cake', quantity: 2, unit: 'piece', isScalable: true },
          { item: 'Water', quantity: 500, unit: 'ml', isScalable: true }
        ],
        prepMinutes: 2,
        constraintTags: ['real-food', 'fast-energy']
      },
      {
        title: 'Rice with Salmon and Vegetables',
        windowType: 'BASE',
        absorptionType: 'BALANCED',
        dietaryBuckets: ['DAIRY_FREE', 'GLUTEN_FREE'],
        baseMacros: { carbs: 70, protein: 34, fat: 16, kcal: 560 },
        keyIngredient: 'Rice',
        ingredients: [
          { item: 'White Rice', quantity: 90, unit: 'g', isScalable: true },
          { item: 'Salmon Fillet', quantity: 130, unit: 'g', isScalable: true },
          { item: 'Mixed Vegetables', quantity: 150, unit: 'g', isScalable: true },
          { item: 'Olive Oil', quantity: 8, unit: 'ml', isScalable: false }
        ],
        prepMinutes: 25,
        constraintTags: ['balanced-meal']
      },
      {
        title: 'Lentil and Sweet Potato Bowl',
        windowType: 'BASE',
        absorptionType: 'DENSE',
        dietaryBuckets: ['VEGAN', 'VEGETARIAN', 'DAIRY_FREE', 'GLUTEN_FREE'],
        baseMacros: { carbs: 75, protein: 24, fat: 10, kcal: 510 },
        keyIngredient: 'Sweet Potato',
        ingredients: [
          { item: 'Sweet Potato', quantity: 250, unit: 'g', isScalable: true },
          { item: 'Cooked Lentils', quantity: 180, unit: 'g', isScalable: true },
          { item: 'Spinach', quantity: 80, unit: 'g', isScalable: true },
          { item: 'Olive Oil', quantity: 8, unit: 'ml', isScalable: false }
        ],
        prepMinutes: 30,
        constraintTags: ['balanced-meal', 'plant-based']
      },
      {
        title: 'Chicken Rice Bowl',
        windowType: 'POST',
        absorptionType: 'BALANCED',
        dietaryBuckets: ['DAIRY_FREE', 'GLUTEN_FREE'],
        baseMacros: { carbs: 65, protein: 40, fat: 9, kcal: 500 },
        keyIngredient: 'Rice',
        ingredients: [
          { item: 'White Rice', quantity: 85, unit: 'g', isScalable: true },
          { item: 'Chicken Breast', quantity: 150, unit: 'g', isScalable: true },
          { item: 'Soy Sauce', quantity: 10, unit: 'ml', isScalable: false }
        ],
        prepMinutes: 20,
        constraintTags: ['high-protein']
      },
      {
        title: 'Chocolate Milk and Bagel',
        windowType: 'POST',
        absorptionType: 'FAST',
        dietaryBuckets: ['VEGETARIAN'],
        baseMacros: { carbs: 70, protein: 20, fat: 8, kcal: 430 },
        keyIngredient: 'Bagel',
        ingredients: [
          { item: 'Bagel', quantity: 1, unit: 'piece', isScalable: true },
          { item: 'Chocolate Milk', quantity: 400, unit: 'ml', isScalable: true }
        ],
        prepMinutes: 2,
        constraintTags: ['rapid-recovery']
      }
    ]

    console.log(chalk.blue('Seeding MealOptionCatalog...'))

    let created = 0
    let updated = 0

    // Idempotent: re-running the seed refreshes templates instead of duplicating them.
    for (const template of templates) {
      const existing = await prisma.mealOptionCatalog.findFirst({
        where: { title: template.title, source: 'SYSTEM' }
      })

      if (existing) {
        await prisma.mealOptionCatalog.update({ where: { id: existing.id }, data: template })
        updated += 1
        continue
      }

      await prisma.mealOptionCatalog.create({ data: template })
      created += 1
    }

    console.log(
      chalk.green(
        `Catalog seeded: ${created} created, ${updated} updated (${templates.length} total).`
      )
    )
  })

export default seedCatalogCommand
