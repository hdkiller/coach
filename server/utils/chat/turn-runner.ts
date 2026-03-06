import { randomUUID } from 'node:crypto'
import { executeChatTurn } from './turn-executor'
import { chatTurnService } from '../services/chatTurnService'

const DEFAULT_POLL_INTERVAL_MS = 250
const DEFAULT_RECOVERY_INTERVAL_MS = 30_000
const DEFAULT_CONCURRENCY = 2

class ChatTurnRunner {
  private readonly workerId = randomUUID()
  private readonly pollIntervalMs = Number(
    process.env.CHAT_TURN_POLL_INTERVAL_MS || DEFAULT_POLL_INTERVAL_MS
  )
  private readonly recoveryIntervalMs = Number(
    process.env.CHAT_TURN_RECOVERY_INTERVAL_MS || DEFAULT_RECOVERY_INTERVAL_MS
  )
  private readonly concurrency = Math.max(
    1,
    Number(process.env.CHAT_TURN_WORKER_CONCURRENCY || DEFAULT_CONCURRENCY)
  )

  private pumpTimer: ReturnType<typeof setInterval> | null = null
  private recoveryTimer: ReturnType<typeof setInterval> | null = null
  private runningCount = 0
  private pumping = false
  private recovering = false
  private started = false

  start() {
    if (this.started) return
    this.started = true

    this.pumpTimer = setInterval(() => {
      void this.pump()
    }, this.pollIntervalMs)

    this.recoveryTimer = setInterval(() => {
      void this.recoverStaleTurns()
    }, this.recoveryIntervalMs)

    void this.pump()
    void this.recoverStaleTurns()
  }

  stop() {
    if (this.pumpTimer) {
      clearInterval(this.pumpTimer)
      this.pumpTimer = null
    }

    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer)
      this.recoveryTimer = null
    }

    this.started = false
  }

  private async pump() {
    if (this.pumping) return
    this.pumping = true

    try {
      while (this.runningCount < this.concurrency) {
        const turn = await chatTurnService.claimNextQueuedTurn(this.workerId)
        if (!turn) break

        this.runningCount += 1
        void this.runTurn(turn.id)
      }
    } finally {
      this.pumping = false
    }
  }

  private async runTurn(turnId: string) {
    try {
      await executeChatTurn(turnId)
    } catch (error) {
      console.error('[ChatTurnRunner] Turn execution failed:', { turnId, error })
    } finally {
      this.runningCount = Math.max(0, this.runningCount - 1)
      void this.pump()
    }
  }

  private async recoverStaleTurns() {
    if (this.recovering) return
    this.recovering = true

    try {
      const interruptedCount = await chatTurnService.markStaleTurnsInterrupted()
      if (interruptedCount > 0) {
        void this.pump()
      }
    } catch (error) {
      console.error('[ChatTurnRunner] Stale turn recovery failed:', error)
    } finally {
      this.recovering = false
    }
  }
}

declare global {
  var __coachWattzChatTurnRunner: ChatTurnRunner | undefined
}

export function getChatTurnRunner() {
  if (!globalThis.__coachWattzChatTurnRunner) {
    globalThis.__coachWattzChatTurnRunner = new ChatTurnRunner()
  }

  return globalThis.__coachWattzChatTurnRunner
}
