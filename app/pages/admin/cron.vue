<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 p-8">
    <div class="max-w-7xl mx-auto space-y-8">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-gray-800 pb-6">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Scheduled Tasks & Automations</h1>
          <p class="text-gray-400 mt-2">Manage background cron jobs and system automations.</p>
        </div>
        <div class="flex items-center space-x-4">
          <UButton
            icon="i-heroicons-arrow-path"
            variant="ghost"
            color="neutral"
            :loading="status === 'pending'"
            @click="refresh"
          >
            Refresh
          </UButton>
        </div>
      </div>

      <!-- Content -->
      <div v-if="status === 'pending' && !tasks" class="space-y-4">
        <USkeleton class="h-32 w-full bg-gray-800" />
        <USkeleton class="h-32 w-full bg-gray-800" />
      </div>

      <div
        v-else-if="error"
        class="bg-red-900/20 text-red-400 p-4 rounded-xl border border-red-900/50"
      >
        Failed to load tasks: {{ error.message }}
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <UCard
          v-for="task in tasks"
          :key="task.id"
          class="bg-gray-900 border-gray-800 ring-gray-800 hover:ring-gray-700 transition-all"
        >
          <template #header>
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-semibold text-lg">{{ task.displayName }}</h3>
                <p class="text-sm text-gray-500 font-mono mt-1">{{ task.taskName }}</p>
              </div>
              <UToggle
                v-model="task.enabled"
                color="primary"
                @change="updateTask(task.id, { enabled: task.enabled })"
              />
            </div>
          </template>

          <div class="space-y-4 text-sm">
            <!-- Status -->
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Status</span>
              <UBadge v-if="!task.enabled" color="neutral" variant="soft">DISABLED</UBadge>
              <UBadge v-else-if="task.lastStatus === 'SUCCESS'" color="success" variant="soft"
                >SUCCESS</UBadge
              >
              <UBadge v-else-if="task.lastStatus === 'FAILED'" color="error" variant="soft"
                >FAILED</UBadge
              >
              <UBadge v-else color="neutral" variant="soft">UNKNOWN</UBadge>
            </div>

            <!-- Schedule -->
            <div class="space-y-1">
              <span class="text-gray-400 block">Schedule (Cron)</span>
              <div class="flex space-x-2">
                <UInput
                  v-model="task.cronExpression"
                  class="flex-1 font-mono"
                  @blur="updateTask(task.id, { cronExpression: task.cronExpression })"
                />
              </div>
              <p v-if="task.cronExpression" class="text-xs text-gray-500 mt-1">
                {{ formatCron(task.cronExpression) }}
              </p>
            </div>

            <!-- Last Run -->
            <div class="flex justify-between items-center pt-2 border-t border-gray-800">
              <span class="text-gray-400 text-xs">Last Run</span>
              <span class="text-xs text-gray-300" :title="task.lastRunAt">
                {{ task.lastRunAt ? useTimeAgo(new Date(task.lastRunAt)).value : 'Never' }}
              </span>
            </div>

            <div
              v-if="task.lastError"
              class="text-xs text-red-400 bg-red-950/30 p-2 rounded truncate"
              :title="task.lastError"
            >
              {{ task.lastError }}
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end">
              <UButton
                color="primary"
                variant="solid"
                icon="i-heroicons-play"
                :loading="runningTasks.has(task.taskName)"
                @click="runTask(task.taskName)"
              >
                Run Now
              </UButton>
            </div>
          </template>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useTimeAgo } from '@vueuse/core'
  import cronstrue from 'cronstrue'

  // Meta
  definePageMeta({
    middleware: 'auth'
    // In a real setup, we'd have an 'admin' middleware
  })

  const toast = useToast()
  const runningTasks = ref(new Set<string>())

  // Fetch tasks
  const { data: tasks, status, error, refresh } = await useFetch<any[]>('/api/admin/cron')

  // Helper for human-readable cron
  const formatCron = (expr: string) => {
    try {
      return cronstrue.toString(expr)
    } catch (e) {
      return 'Invalid cron expression'
    }
  }

  // Update task
  const updateTask = async (id: string, updates: Record<string, any>) => {
    try {
      await $fetch(`/api/admin/cron/${id}`, {
        method: 'PATCH',
        body: updates
      })
      toast.add({
        title: 'Task updated',
        description: 'Configuration saved successfully.',
        color: 'success'
      })
    } catch (err: any) {
      toast.add({
        title: 'Update failed',
        description: err.data?.statusMessage || err.message,
        color: 'error'
      })
      // Revert local state by refreshing
      refresh()
    }
  }

  // Manual run
  const runTask = async (taskName: string) => {
    if (runningTasks.value.has(taskName)) return

    runningTasks.value.add(taskName)
    toast.add({ title: 'Running task...', description: `Triggering ${taskName}` })

    try {
      const res = await $fetch('/api/admin/cron/run', {
        method: 'POST',
        body: { taskName }
      })

      toast.add({
        title: 'Task Completed',
        description: 'Check status for results.',
        color: 'success'
      })
    } catch (err: any) {
      toast.add({
        title: 'Task Failed',
        description: err.data?.data || err.data?.statusMessage || err.message,
        color: 'error'
      })
    } finally {
      runningTasks.value.delete(taskName)
      refresh()
    }
  }
</script>
