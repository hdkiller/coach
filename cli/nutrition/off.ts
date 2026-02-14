import { Command } from 'commander'
import { OpenFoodFacts } from '@openfoodfacts/openfoodfacts-nodejs'
import chalk from 'chalk'
import Table from 'cli-table3'

const offCommand = new Command('off').description('Interact with Open Food Facts API')

const off = new OpenFoodFacts(globalThis.fetch as any)

offCommand
  .command('product <barcode>')
  .description('Get product details by barcode')
  .action(async (barcode) => {
    try {
      console.log(chalk.blue(`Fetching product with barcode: ${barcode}...`))
      const { data, error } = await off.getProductV2(barcode)

      if (error) {
        console.error(chalk.red('API Error:'), error)
        return
      }

      if (!data?.product) {
        console.log(chalk.yellow('Product not found.'))
        return
      }

      const p = data.product as any
      console.log(chalk.green(`\nFound: ${p.product_name || 'Unknown Product'}`))
      console.log(chalk.dim(`Barcode: ${p.code}`))
      console.log(chalk.dim(`Brands: ${p.brands || 'N/A'}`))

      const table = new Table({
        head: [chalk.cyan('Metric'), chalk.cyan('Value per 100g')],
        colWidths: [25, 40]
      })

      const nutrients = p.nutriments || {}
      table.push(
        ['Energy', `${nutrients.energy_100g || 0} ${nutrients.energy_unit || 'kcal'}`],
        ['Fat', `${nutrients.fat_100g || 0} g`],
        ['Carbohydrates', `${nutrients.carbohydrates_100g || 0} g`],
        ['Sugars', `${nutrients.sugars_100g || 0} g`],
        ['Proteins', `${nutrients.proteins_100g || 0} g`],
        ['Salt', `${nutrients.salt_100g || 0} g`]
      )

      console.log(table.toString())

      if (p.ingredients_text) {
        console.log(chalk.cyan('\nIngredients:'))
        console.log(p.ingredients_text)
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error)
    }
  })

offCommand
  .command('search <query>')
  .description('Search for products by name')
  .option('-p, --page <number>', 'Page number', '1')
  .option('-s, --pageSize <number>', 'Page size', '10')
  .action(async (query, options) => {
    try {
      console.log(
        chalk.blue(`Searching for: ${query} (Page ${options.page}, Size ${options.pageSize})...`)
      )
      const { data, error } = await off.search({
        search_terms: query,
        page: parseInt(options.page),
        page_size: parseInt(options.pageSize)
      } as any)

      if (error) {
        console.error(chalk.red('Search API Error:'), error)
        return
      }

      if (!data?.products || data.products.length === 0) {
        console.log(chalk.yellow('No products found.'))
        return
      }

      console.log(chalk.green(`\nFound ${data.count} products (showing ${data.products.length}):`))

      const table = new Table({
        head: [chalk.cyan('Barcode'), chalk.cyan('Product Name'), chalk.cyan('Brands')],
        colWidths: [15, 50, 30]
      })

      data.products.forEach((p: any) => {
        table.push([
          p.code || 'N/A',
          (p.product_name || 'Unknown').substring(0, 48),
          (p.brands || 'N/A').substring(0, 28)
        ])
      })

      console.log(table.toString())
    } catch (error) {
      console.error(chalk.red('Error:'), error)
    }
  })

export default offCommand
