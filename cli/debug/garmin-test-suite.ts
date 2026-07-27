import 'dotenv/config'
import { Command } from 'commander'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import chalk from 'chalk'
import { generateCodeVerifier, generateCodeChallenge } from '../../server/utils/pkce'
import {
  fetchGarminData,
  refreshGarminToken,
  refreshGarminIntegrationPermissions
} from '../../server/utils/garmin'
import { GarminService } from '../../server/utils/services/garminService'

interface DiagnosticStep {
  name: string
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP'
  details: string
}

const garminTestCommand = new Command('garmin-test')
  .description('Comprehensive diagnostic suite to test Garmin OAuth & API integration')
  .argument('[userIdentifier]', 'User ID or Email (optional for OAuth static checks)')
  .option('--prod', 'Use production database and site URL')
  .action(async (userIdentifier, options) => {
    const isProd = options.prod
    if (isProd && process.env.DATABASE_URL_PROD) {
      process.env.DATABASE_URL = process.env.DATABASE_URL_PROD
    }
    const diagnostics: DiagnosticStep[] = []

    console.log(chalk.bold.cyan('\n=================================================='))
    console.log(chalk.bold.cyan('        GARMIN API COMPREHENSIVE TEST SUITE       '))
    console.log(chalk.bold.cyan('==================================================\n'))

    // 1. Environment & PKCE Configuration Check
    console.log(chalk.bold.blue('1. OAuth & PKCE Configuration Check'))
    const clientId = process.env.GARMIN_CLIENT_ID
    const clientSecret = process.env.GARMIN_CLIENT_SECRET
    const siteUrlRaw = isProd
      ? process.env.NUXT_PUBLIC_SITE_URL || 'https://coachwatts.com'
      : process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const siteUrl = siteUrlRaw.replace(/\/+$/, '')
    const redirectUri = `${siteUrl}/api/integrations/garmin/callback`

    if (!clientId || !clientSecret) {
      diagnostics.push({
        name: 'OAuth Client Credentials',
        status: 'FAIL',
        details: 'GARMIN_CLIENT_ID or GARMIN_CLIENT_SECRET missing'
      })
      console.log(chalk.red('  ✘ Client Credentials: MISSING in environment'))
    } else {
      diagnostics.push({
        name: 'OAuth Client Credentials',
        status: 'PASS',
        details: `Client ID: ${clientId.slice(0, 8)}...`
      })
      console.log(chalk.green('  ✔ Client Credentials: CONFIGURED'))
    }

    try {
      const verifier = generateCodeVerifier()
      const challenge = generateCodeChallenge(verifier)
      diagnostics.push({
        name: 'PKCE Generator',
        status: 'PASS',
        details: `Verifier len: ${verifier.length}, Challenge len: ${challenge.length}`
      })
      console.log(chalk.green('  ✔ PKCE Verifier & S256 Challenge Generation: OK'))

      const sampleAuthUrl = new URL('https://connect.garmin.com/oauth2Confirm')
      sampleAuthUrl.searchParams.set('client_id', clientId || 'CLIENT_ID')
      sampleAuthUrl.searchParams.set('redirect_uri', redirectUri)
      sampleAuthUrl.searchParams.set('response_type', 'code')
      sampleAuthUrl.searchParams.set('code_challenge', challenge)
      sampleAuthUrl.searchParams.set('code_challenge_method', 'S256')

      console.log(chalk.gray(`  -> Redirect URI: ${redirectUri}`))
      console.log(chalk.gray(`  -> Auth URL: ${sampleAuthUrl.toString().slice(0, 80)}...`))
    } catch (e: any) {
      diagnostics.push({
        name: 'PKCE Generator',
        status: 'FAIL',
        details: e.message
      })
      console.log(chalk.red(`  ✘ PKCE Generator Failed: ${e.message}`))
    }

    if (!userIdentifier) {
      console.log(
        chalk.yellow(
          '\nNo userIdentifier provided. Skipping user-specific integration & API tests.'
        )
      )
      console.log(chalk.gray('Usage: pnpm cw:cli debug garmin-test <userEmailOrId> [--prod]'))
      printSummary(diagnostics)
      return
    }

    // 2. Database Connection & User Lookup
    console.log(chalk.bold.blue('\n2. User & Garmin Integration Database Check'))
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
    if (!connectionString) {
      console.error(chalk.red('Missing DATABASE_URL or DATABASE_URL_PROD in environment'))
      process.exit(1)
    }

    console.log(chalk.gray(`  Using ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} database...`))
    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })
    ;(globalThis as any).prismaGlobalV2 = prisma

    try {
      const user = await prisma.user.findFirst({
        where: { OR: [{ id: userIdentifier }, { email: userIdentifier }] }
      })

      if (!user) {
        console.log(chalk.red(`  ✘ User not found: ${userIdentifier}`))
        diagnostics.push({ name: 'User Lookup', status: 'FAIL', details: 'User not found' })
        printSummary(diagnostics)
        return
      }

      console.log(chalk.green(`  ✔ Found User: ${user.email} (${user.id})`))
      diagnostics.push({ name: 'User Lookup', status: 'PASS', details: user.email })

      let integration = await prisma.integration.findUnique({
        where: { userId_provider: { userId: user.id, provider: 'garmin' } }
      })

      if (!integration) {
        console.log(chalk.red('  ✘ No Garmin integration record for user'))
        diagnostics.push({
          name: 'Integration Lookup',
          status: 'FAIL',
          details: 'No Garmin integration'
        })
        printSummary(diagnostics)
        return
      }

      console.log(
        chalk.green(`  ✔ Found Garmin Integration (External ID: ${integration.externalUserId})`)
      )
      diagnostics.push({
        name: 'Integration Lookup',
        status: 'PASS',
        details: `ExternalUserId: ${integration.externalUserId}`
      })

      // 3. Token Validity & Token Refresh Test
      console.log(chalk.bold.blue('\n3. Garmin OAuth Token Refresh Test'))
      try {
        const refreshed = await refreshGarminToken(integration)
        integration = refreshed
        console.log(
          chalk.green(`  ✔ Token Refresh: SUCCESS (Expires: ${refreshed.expiresAt?.toISOString()})`)
        )
        diagnostics.push({
          name: 'OAuth Token Refresh',
          status: 'PASS',
          details: `Refreshed token ok, expires ${refreshed.expiresAt?.toISOString()}`
        })
      } catch (e: any) {
        console.log(chalk.red(`  ✘ Token Refresh Failed: ${e.message}`))
        diagnostics.push({
          name: 'OAuth Token Refresh',
          status: 'FAIL',
          details: e.message
        })
      }

      // 4. Garmin Health API Endpoints Check
      console.log(chalk.bold.blue('\n4. Garmin Health API Endpoints Verification'))

      try {
        const userIdRes = await fetchGarminData(
          integration,
          'https://apis.garmin.com/wellness-api/rest/user/id'
        )
        console.log(chalk.green(`  ✔ User ID Endpoint: ${userIdRes.userId}`))
        diagnostics.push({
          name: 'API User ID Endpoint',
          status: 'PASS',
          details: `Garmin User ID: ${userIdRes.userId}`
        })
      } catch (e: any) {
        console.log(chalk.red(`  ✘ User ID Endpoint Failed: ${e.message}`))
        diagnostics.push({ name: 'API User ID Endpoint', status: 'FAIL', details: e.message })
      }

      try {
        const updatedInt = await refreshGarminIntegrationPermissions(integration)
        console.log(chalk.green(`  ✔ Permissions Endpoint: Scope [${updatedInt.scope || 'empty'}]`))
        diagnostics.push({
          name: 'API Permissions Endpoint',
          status: 'PASS',
          details: updatedInt.scope || 'No scopes returned'
        })
      } catch (e: any) {
        console.log(chalk.red(`  ✘ Permissions Endpoint Failed: ${e.message}`))
        diagnostics.push({ name: 'API Permissions Endpoint', status: 'FAIL', details: e.message })
      }

      // 5. Summary Push Activity Simulation (Verify no invalid REST file calls)
      console.log(chalk.bold.blue('\n5. Activity Summary Webhook Processing Simulation'))
      try {
        const mockNow = Math.floor(Date.now() / 1000)
        const mockSummaryId = `DIAG_SUMMARY_${mockNow}`
        const mockActivities = [
          {
            userId: integration.externalUserId,
            summaryId: mockSummaryId,
            activityType: 'RUNNING',
            activityName: 'Diagnostic Run Test',
            startTimeInSeconds: mockNow - 1800,
            durationInSeconds: 1800,
            distanceInMeters: 5000,
            averageHeartRateInBeatsPerMinute: 145,
            activeKilocalories: 350
          }
        ]

        await GarminService.processActivities(user.id, mockActivities, integration)
        console.log(
          chalk.green('  ✔ Processed Activity Summary without invalid REST file download errors')
        )
        diagnostics.push({
          name: 'Activity Summary Push',
          status: 'PASS',
          details: `Ingested ${mockSummaryId}`
        })
      } catch (e: any) {
        console.log(chalk.red(`  ✘ Activity Summary Processing Failed: ${e.message}`))
        diagnostics.push({ name: 'Activity Summary Push', status: 'FAIL', details: e.message })
      }

      printSummary(diagnostics)
    } catch (error: any) {
      console.error(chalk.red('\nFatal Test Suite Error:'), error.message)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

function printSummary(steps: DiagnosticStep[]) {
  console.log(chalk.bold.cyan('\n=================================================='))
  console.log(chalk.bold.cyan('                DIAGNOSTIC SUMMARY                '))
  console.log(chalk.bold.cyan('=================================================='))

  steps.forEach((step) => {
    let icon = chalk.green('✔ PASS')
    if (step.status === 'FAIL') icon = chalk.red('✘ FAIL')
    if (step.status === 'WARN') icon = chalk.yellow('! WARN')
    if (step.status === 'SKIP') icon = chalk.gray('- SKIP')

    console.log(`${icon} | ${chalk.bold(step.name.padEnd(28))} | ${step.details}`)
  })
  console.log(chalk.bold.cyan('==================================================\n'))
}

export default garminTestCommand
