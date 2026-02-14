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
      }
    ]

    console.log(chalk.blue('Seeding MealOptionCatalog...'))

    for (const template of templates) {
      await prisma.mealOptionCatalog.create({
        data: template
      })
    }

    console.log(chalk.green('Successfully seeded catalog with 5 templates.'))
  })

export default seedCatalogCommand
