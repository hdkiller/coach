import { task } from '@trigger.dev/sdk/v3'

export const nutritionLastCallTask = task({
  id: 'nutrition-last-call',
  run: async () => {
    // Temporarily disabled until User Settings are implemented
    console.log('Nutrition Last Call trigger is currently disabled.')
    return { success: true, disabled: true }
  }
})
