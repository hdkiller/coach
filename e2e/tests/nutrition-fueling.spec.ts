import { test, expect } from '../fixtures/test-fixtures.ts'
import { E2E_ATHLETE_EMAIL } from '../seed.ts'
import { createE2ePrisma } from '../helpers/db.ts'
import type { Page } from '@playwright/test'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coach_wattz_e2e'

const ATHLETE_WEIGHT_KG = 80

/**
 * End-to-end coverage for the day-level fueling engine.
 *
 * These exercise the behaviours that unit tests cannot: that a real request produces windows with
 * stable keys, that locking a meal writes one row per window, and that the weekly plan renders the
 * result in clock order.
 */
test.describe('Nutrition fueling plan', () => {
  test.describe.configure({ mode: 'serial' })

  let prisma: ReturnType<typeof createE2ePrisma>['prisma']
  let cleanupPool: ReturnType<typeof createE2ePrisma>['pool']
  let athleteId: string

  /** Monday of the current week, so the weekly-plan UI shows the days we seed. */
  const weekStart = (() => {
    const now = new Date()
    const utcMidnight = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    )
    const dayOfWeek = (utcMidnight.getUTCDay() + 6) % 7 // Monday = 0
    return new Date(utcMidnight.getTime() - dayOfWeek * 86400000)
  })()

  const dayOffset = (offset: number) => new Date(weekStart.getTime() + offset * 86400000)
  const dateKey = (date: Date) => date.toISOString().slice(0, 10)

  const STACKED_DAY = dayOffset(1) // two sessions back to back
  const SPLIT_DAY = dayOffset(2) // morning and evening sessions
  const REST_DAY = dayOffset(3) // no training at all

  async function clearDay(date: Date) {
    const key = dateKey(date)
    await prisma.plannedWorkout.deleteMany({ where: { userId: athleteId, date } })
    await prisma.workout.deleteMany({
      where: {
        userId: athleteId,
        date: { gte: new Date(`${key}T00:00:00.000Z`), lte: new Date(`${key}T23:59:59.999Z`) }
      }
    })
    await prisma.nutrition.deleteMany({ where: { userId: athleteId, date } })
  }

  async function seedPlanned(
    date: Date,
    workouts: Array<{
      id: string
      title: string
      type: string
      durationSec: number
      startTime: string
      workIntensity: number
      tss?: number
    }>
  ) {
    for (const workout of workouts) {
      await prisma.plannedWorkout.upsert({
        where: { id: workout.id },
        update: { ...workout, userId: athleteId, date, externalId: workout.id, completed: false },
        create: { ...workout, userId: athleteId, date, externalId: workout.id, completed: false }
      })
    }
  }

  /** Forces a fresh plan for the date and returns the persisted day. */
  async function buildPlan(page: Page, date: Date) {
    const key = dateKey(date)
    const generated = await page.request.post('/api/nutrition/generate-plan', {
      data: { date: `${key}T00:00:00.000Z` }
    })
    expect(generated.ok(), await generated.text()).toBeTruthy()

    const day = await page.request.get(`/api/nutrition/${key}`)
    expect(day.ok(), await day.text()).toBeTruthy()
    return day.json()
  }

  const windowsOf = (plan: any) => (plan?.fuelingPlan?.windows ?? []) as any[]
  const keysOf = (plan: any) => windowsOf(plan).map((w) => w.windowKey)
  const ofType = (plan: any, type: string) => windowsOf(plan).filter((w) => w.type === type)

  test.beforeAll(async () => {
    const db = createE2ePrisma(DATABASE_URL)
    prisma = db.prisma
    cleanupPool = db.pool

    const athlete = await prisma.user.findUnique({ where: { email: E2E_ATHLETE_EMAIL } })
    expect(athlete).toBeTruthy()
    athleteId = athlete!.id

    // Pin the inputs the engine reads so the assertions are about behaviour, not defaults.
    await prisma.user.update({
      where: { id: athleteId },
      data: { weight: ATHLETE_WEIGHT_KG, ftp: 250, timezone: 'UTC' }
    })

    await prisma.userNutritionSettings.upsert({
      where: { userId: athleteId },
      update: {
        preWorkoutWindow: 90,
        postWorkoutWindow: 60,
        currentCarbMax: 90,
        mealPattern: [
          { name: 'Breakfast', time: '07:00' },
          { name: 'Lunch', time: '12:00' },
          { name: 'Dinner', time: '19:00' }
        ]
      },
      create: {
        userId: athleteId,
        preWorkoutWindow: 90,
        postWorkoutWindow: 60,
        currentCarbMax: 90,
        mealPattern: [
          { name: 'Breakfast', time: '07:00' },
          { name: 'Lunch', time: '12:00' },
          { name: 'Dinner', time: '19:00' }
        ]
      }
    })

    // The draft planner picks from this catalog; INTRA templates are what used to be missing.
    const templates = [
      {
        title: 'E2E Pre Oats',
        windowType: 'PRE',
        absorptionType: 'BALANCED',
        baseMacros: { carbs: 60, protein: 8, fat: 5, kcal: 320 },
        keyIngredient: 'Oats',
        ingredients: [{ item: 'Oats', quantity: 60, unit: 'g', isScalable: true }],
        prepMinutes: 5
      },
      {
        title: 'E2E Intra Drink Mix',
        windowType: 'INTRA',
        absorptionType: 'RAPID',
        baseMacros: { carbs: 60, protein: 0, fat: 0, kcal: 240 },
        keyIngredient: 'Carb Powder',
        ingredients: [{ item: 'Carb Powder', quantity: 65, unit: 'g', isScalable: true }],
        prepMinutes: 2
      },
      {
        title: 'E2E Post Rice Bowl',
        windowType: 'POST',
        absorptionType: 'BALANCED',
        baseMacros: { carbs: 65, protein: 40, fat: 9, kcal: 500 },
        keyIngredient: 'Rice',
        ingredients: [{ item: 'Rice', quantity: 85, unit: 'g', isScalable: true }],
        prepMinutes: 20
      },
      {
        title: 'E2E Base Pasta',
        windowType: 'BASE',
        absorptionType: 'BALANCED',
        baseMacros: { carbs: 80, protein: 35, fat: 12, kcal: 580 },
        keyIngredient: 'Pasta',
        ingredients: [{ item: 'Pasta', quantity: 100, unit: 'g', isScalable: true }],
        prepMinutes: 20
      }
    ]

    for (const template of templates) {
      const existing = await prisma.mealOptionCatalog.findFirst({
        where: { title: template.title }
      })
      const data = { ...template, dietaryBuckets: [], constraintTags: [], source: 'SYSTEM' }
      if (existing) {
        await prisma.mealOptionCatalog.update({ where: { id: existing.id }, data })
      } else {
        await prisma.mealOptionCatalog.create({ data })
      }
    }

    for (const date of [STACKED_DAY, SPLIT_DAY, REST_DAY]) {
      await clearDay(date)
    }

    await prisma.nutritionPlanMeal.deleteMany({
      where: { plan: { userId: athleteId } }
    })
    await prisma.nutritionPlan.deleteMany({ where: { userId: athleteId } })

    await seedPlanned(STACKED_DAY, [
      {
        id: 'e2e-fuel-stacked-a',
        title: 'E2E Treadmill Warmup',
        type: 'Run',
        durationSec: 1800,
        startTime: '08:00',
        workIntensity: 0.65,
        tss: 24
      },
      {
        id: 'e2e-fuel-stacked-b',
        title: 'E2E Full-Body Strength',
        type: 'WeightTraining',
        durationSec: 3600,
        startTime: '08:40',
        workIntensity: 0.8,
        tss: 42
      },
      {
        // 31 TSS in 8 minutes implies IF ~1.5, which used to promote the whole day to state 3.
        id: 'e2e-fuel-stacked-c',
        title: 'E2E Strength Finisher',
        type: 'WeightTraining',
        durationSec: 480,
        startTime: '09:45',
        workIntensity: 1.5,
        tss: 31
      }
    ])

    await seedPlanned(SPLIT_DAY, [
      {
        id: 'e2e-fuel-split-am',
        title: 'E2E Morning Endurance Ride',
        type: 'Ride',
        durationSec: 5400,
        startTime: '06:30',
        workIntensity: 0.7,
        tss: 58
      },
      {
        id: 'e2e-fuel-split-pm',
        title: 'E2E Evening Intervals',
        type: 'Ride',
        durationSec: 4500,
        startTime: '17:00',
        workIntensity: 0.92,
        tss: 95
      }
    ])
  })

  test.afterAll(async () => {
    await prisma.$disconnect()
    await cleanupPool.end()
  })

  test('back-to-back sessions share a single pre and post window', async ({ authedPage }) => {
    const plan = await buildPlan(authedPage, STACKED_DAY)

    expect(ofType(plan, 'PRE_WORKOUT')).toHaveLength(1)
    expect(ofType(plan, 'POST_WORKOUT')).toHaveLength(1)

    // The pre window must cover the whole block, not just the first session.
    const pre = ofType(plan, 'PRE_WORKOUT')[0]
    expect(pre.workoutTitle).toContain('E2E Treadmill Warmup')
    expect(pre.workoutTitle).toContain('E2E Full-Body Strength')
  })

  test('separate sessions get their own windows with unique keys', async ({ authedPage }) => {
    const plan = await buildPlan(authedPage, SPLIT_DAY)

    expect(ofType(plan, 'PRE_WORKOUT')).toHaveLength(2)
    expect(ofType(plan, 'POST_WORKOUT')).toHaveLength(2)

    const keys = keysOf(plan)
    expect(keys).toContain('PRE_WORKOUT#1')
    expect(keys).toContain('PRE_WORKOUT#2')
    expect(new Set(keys).size).toBe(keys.length)
  })

  test('windows are chronological and every one carries a calorie target', async ({
    authedPage
  }) => {
    const plan = await buildPlan(authedPage, SPLIT_DAY)
    const windows = windowsOf(plan)

    expect(windows.length).toBeGreaterThan(0)

    const times = windows.map((w) => new Date(w.startTime).getTime())
    expect(times).toEqual([...times].sort((a, b) => a - b))

    for (const window of windows) {
      expect(window.targetKcal, `${window.windowKey} has no kcal`).toBeGreaterThan(0)
      expect(window.targetKcal).toBe(
        window.targetCarbs * 4 + window.targetProtein * 4 + window.targetFat * 9
      )
    }
  })

  test('a rest day gets baseline windows instead of none at all', async ({ authedPage }) => {
    const plan = await buildPlan(authedPage, REST_DAY)
    const windows = windowsOf(plan)

    expect(windows.length).toBeGreaterThan(0)
    expect(windows.every((w) => w.type === 'DAILY_BASE')).toBeTruthy()
    expect(keysOf(plan)).toContain('DAILY_BASE:breakfast')
    expect(plan.fuelingPlan.dailyTotals.fuelState).toBe(1)
  })

  test('one implausibly short session does not drive the day to state 3', async ({
    authedPage
  }) => {
    const plan = await buildPlan(authedPage, STACKED_DAY)
    expect(plan.fuelingPlan.dailyTotals.fuelState).toBeLessThan(3)
  })

  test('window macros reconcile against the daily targets', async ({ authedPage }) => {
    const plan = await buildPlan(authedPage, SPLIT_DAY)
    const windows = windowsOf(plan)
    const totals = plan.fuelingPlan.dailyTotals

    const sum = (key: string) => windows.reduce((acc, w) => acc + Number(w[key] || 0), 0)

    expect(sum('targetCarbs')).toBe(totals.carbs)
    expect(sum('targetProtein')).toBe(totals.protein)
    expect(sum('targetFat')).toBe(totals.fat)

    // No single sitting may exceed 2 g/kg of carbohydrate.
    for (const window of windows.filter((w) => w.type !== 'INTRA_WORKOUT')) {
      expect(window.targetCarbs).toBeLessThanOrEqual(ATHLETE_WEIGHT_KG * 2 + 1)
    }
  })

  test('locking a meal binds to one window and leaves its sibling unplanned', async ({
    authedPage
  }) => {
    await buildPlan(authedPage, SPLIT_DAY)
    const key = dateKey(SPLIT_DAY)

    const locked = await authedPage.request.post('/api/nutrition/plan/meal', {
      data: {
        date: key,
        windowType: 'PRE_WORKOUT',
        windowKey: 'PRE_WORKOUT#2',
        meal: { title: 'E2E Evening Pre Meal', totals: { carbs: 60, protein: 20, kcal: 400 } }
      }
    })
    expect(locked.ok(), await locked.text()).toBeTruthy()

    const meals = await prisma.nutritionPlanMeal.findMany({
      where: { plan: { userId: athleteId }, date: new Date(`${key}T00:00:00.000Z`) }
    })

    const preMeals = meals.filter((m) => m.windowType.startsWith('PRE_WORKOUT'))
    expect(preMeals).toHaveLength(1)
    expect(preMeals[0]!.windowType).toBe('PRE_WORKOUT#2')

    // The plan the UI reads must show only the second window as planned.
    const planResponse = await authedPage.request.get(`/api/nutrition/plan?start=${key}&end=${key}`)
    expect(planResponse.ok()).toBeTruthy()
    const planPayload = await planResponse.json()
    const returned = (planPayload?.plan?.meals ?? planPayload?.meals ?? []) as any[]
    expect(returned.filter((m) => m.windowType === 'PRE_WORKOUT#1')).toHaveLength(0)
  })

  test('draft generation fills every window from the catalog, including intra', async ({
    authedPage
  }) => {
    const start = dateKey(STACKED_DAY)
    const end = dateKey(SPLIT_DAY)

    const generated = await authedPage.request.post('/api/nutrition/plan/generate', {
      data: { startDate: start, endDate: end }
    })
    expect(generated.ok(), await generated.text()).toBeTruthy()

    const meals = await prisma.nutritionPlanMeal.findMany({
      where: {
        plan: { userId: athleteId },
        date: { gte: new Date(`${start}T00:00:00.000Z`), lte: new Date(`${end}T00:00:00.000Z`) }
      }
    })

    const windowTypes = meals.map((m) => m.windowType)

    // Baseline slots and intra windows both used to be unreachable for the draft planner.
    expect(windowTypes.some((t) => t.startsWith('DAILY_BASE:'))).toBeTruthy()
    expect(windowTypes.some((t) => t.startsWith('INTRA_WORKOUT'))).toBeTruthy()

    // Two pre windows on the split day must not collapse onto one row.
    const splitPre = meals.filter(
      (m) => m.date.toISOString().slice(0, 10) === end && m.windowType.startsWith('PRE_WORKOUT')
    )
    expect(splitPre.length).toBe(2)
  })

  test('weekly plan renders windows in clock order with times and calories', async ({
    authedPage
  }) => {
    await buildPlan(authedPage, SPLIT_DAY)

    // The weekly tab renders the draft snapshot, so the day needs one before it shows anything.
    const draft = await authedPage.request.post('/api/nutrition/plan/generate', {
      data: { startDate: dateKey(SPLIT_DAY), endDate: dateKey(SPLIT_DAY) }
    })
    expect(draft.ok(), await draft.text()).toBeTruthy()

    await authedPage.goto('/nutrition', { waitUntil: 'domcontentloaded' })

    // The tabs are client-rendered; clicking before hydration silently does nothing.
    const planTab = authedPage.getByRole('tab', { name: /weekly plan/i })
    await expect(planTab).toBeVisible({ timeout: 20000 })
    await expect(async () => {
      await planTab.click()
      await expect(planTab).toHaveAttribute('aria-selected', 'true', { timeout: 2000 })
    }).toPass({ timeout: 20000 })

    const dayRow = authedPage.locator(
      `[data-testid="plan-day-row"][data-date="${dateKey(SPLIT_DAY)}"]`
    )

    await expect(dayRow).toBeVisible({ timeout: 20000 })
    // Rows render before the plan request settles; opening the drawer first would show an empty day.
    await expect(dayRow).toHaveAttribute('data-loaded', 'true', { timeout: 20000 })
    await dayRow.click()

    const windowRows = authedPage.locator('[data-testid="plan-window-row"]')
    await expect(windowRows.first()).toBeVisible({ timeout: 15000 })

    const count = await windowRows.count()
    expect(count).toBeGreaterThan(1)

    const starts: number[] = []
    for (let i = 0; i < count; i++) {
      const row = windowRows.nth(i)
      const kcal = Number(await row.getAttribute('data-window-kcal'))
      const start = await row.getAttribute('data-window-start')

      // "0 KCAL" on every card was the visible symptom of windows carrying no calorie target.
      expect(kcal, `window ${i} rendered without calories`).toBeGreaterThan(0)
      expect(start).toBeTruthy()
      starts.push(new Date(start!).getTime())

      await expect(row.locator('[data-testid="plan-window-time"]')).toBeVisible()
    }

    expect(starts).toEqual([...starts].sort((a, b) => a - b))
  })
})
