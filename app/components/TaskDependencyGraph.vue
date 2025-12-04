<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Data Pipeline Status</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track the status of data syncing and AI analysis processes
          </p>
        </div>
        
        <button
          @click="startFullSync"
          :disabled="isRunning"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          <svg v-if="isRunning" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span v-if="isRunning">Running... {{ overallProgress }}%</span>
          <span v-else>🔄 Update All Data</span>
        </button>
      </div>

      <!-- Overall Progress Bar -->
      <div v-if="isRunning || overallProgress > 0" class="mb-4">
        <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>{{ currentPhaseLabel }}</span>
          <span>{{ overallProgress }}%</span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-500"
            :style="{ width: overallProgress + '%' }"
          ></div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="errorMessage" class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div class="flex items-start gap-2">
          <svg class="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          <div class="flex-1">
            <p class="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
            <p class="text-sm text-red-700 dark:text-red-300 mt-1">{{ errorMessage }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Task Groups by Category -->
    <div class="space-y-6">
      <div v-for="category in categories" :key="category.id" class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div class="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
                {{ category.icon }} {{ category.name }}
              </h3>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {{ category.description }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ getCategoryProgress(category.id) }}
              </span>
              <div :class="getCategoryStatusClass(category.id)">
                {{ getCategoryStatus(category.id) }}
              </div>
            </div>
          </div>
        </div>

        <div class="p-4 space-y-3">
          <div
            v-for="task in getTasksByCategory(category.id)"
            :key="task.id"
            class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <div class="flex items-start gap-3">
              <!-- Status Icon -->
              <div class="flex-shrink-0 mt-1">
                <div v-if="getTaskState(task.id)?.status === 'completed'" class="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <div v-else-if="getTaskState(task.id)?.status === 'running'" class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <svg class="animate-spin w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div v-else-if="getTaskState(task.id)?.status === 'failed'" class="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <svg class="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <div v-else class="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <div class="w-3 h-3 rounded-full border-2 border-gray-400 dark:border-gray-500"></div>
                </div>
              </div>

              <!-- Task Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <h4 class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ task.name }}
                  </h4>
                  <span :class="getTaskStatusBadgeClass(task.id)">
                    {{ getTaskStatusLabel(task.id) }}
                  </span>
                </div>
                <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {{ task.description }}
                </p>

                <!-- Additional Task Info -->
                <div v-if="Object.keys(taskMetadata).length > 0" class="mt-2 flex flex-wrap gap-2">
                  <template v-if="getTaskMetadata(task.id)">
                    <span v-if="getTaskMetadata(task.id)!.pendingCount !== undefined && getTaskMetadata(task.id)!.pendingCount! > 0" class="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded">
                      {{ getTaskMetadata(task.id)!.pendingCount }} pending analysis
                    </span>
                    <span v-if="getTaskMetadata(task.id)!.lastSync" class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                      Last: {{ formatRelativeTime(getTaskMetadata(task.id)!.lastSync!) }}
                    </span>
                    <span v-if="getTaskMetadata(task.id)!.totalCount !== undefined && getTaskMetadata(task.id)!.totalCount! > 0" class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                      {{ getTaskMetadata(task.id)!.totalCount }} total
                    </span>
                  </template>
                </div>

                <!-- Dependencies -->
                <div v-if="task.dependsOn.length > 0" class="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                  </svg>
                  <span>Requires:</span>
                  <span class="font-medium">
                    {{ task.dependsOn.map((id: string) => getTaskName(id)).join(', ') }}
                  </span>
                </div>

                <!-- Progress Bar for Running Tasks -->
                <div v-if="getTaskState(task.id)?.status === 'running'" class="mt-2">
                  <div class="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>{{ getTaskState(task.id)?.message || 'Processing...' }}</span>
                    <span>{{ getTaskState(task.id)?.progress || 0 }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      class="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      :style="{ width: (getTaskState(task.id)?.progress || 0) + '%' }"
                    ></div>
                  </div>
                </div>

                <!-- Error Message -->
                <div v-if="getTaskState(task.id)?.error" class="mt-2 text-xs text-red-600 dark:text-red-400">
                  Error: {{ getTaskState(task.id)?.error }}
                </div>

                <!-- Timestamp -->
                <div v-if="getTaskState(task.id)?.endTime" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span v-if="getTaskState(task.id)?.status === 'completed'">
                    Completed {{ formatTime(getTaskState(task.id)!.endTime!) }}
                  </span>
                  <span v-else-if="getTaskState(task.id)?.status === 'failed'">
                    Failed {{ formatTime(getTaskState(task.id)!.endTime!) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { TASK_DEPENDENCIES, type TaskExecutionState, type TaskDefinition, calculateOverallProgress } from '../../types/task-dependencies'

const toast = useToast()

// State
const taskStates = ref<Record<string, TaskExecutionState>>({})
const isRunning = ref(false)
const overallProgress = ref(0)
const currentPhase = ref('')
const errorMessage = ref('')
const eventSource = ref<EventSource | null>(null)
const taskMetadata = ref<Record<string, { pendingCount?: number; totalCount?: number; lastSync?: Date }>>({})

// Categories configuration
const categories = [
  {
    id: 'ingestion',
    name: 'Data Ingestion',
    icon: '📥',
    description: 'Sync data from connected integrations'
  },
  {
    id: 'analysis',
    name: 'AI Analysis',
    icon: '🤖',
    description: 'Analyze individual workouts and nutrition entries'
  },
  {
    id: 'profile',
    name: 'Athlete Profile',
    icon: '👤',
    description: 'Generate comprehensive athlete profile'
  },
  {
    id: 'reports',
    name: 'Reports',
    icon: '📊',
    description: 'Generate performance reports'
  },
  {
    id: 'planning',
    name: 'Training Planning',
    icon: '📅',
    description: 'Create training plans and recommendations'
  },
  {
    id: 'insights',
    name: 'Performance Insights',
    icon: '💡',
    description: 'Generate detailed scoring explanations'
  }
]

const currentPhaseLabel = computed(() => {
  if (!isRunning.value) return ''
  
  const runningTasks = Object.values(taskStates.value).filter(t => t.status === 'running')
  if (runningTasks.length > 0) {
    const taskIds = runningTasks.map(t => t.taskId)
    const taskNames = taskIds.map(id => TASK_DEPENDENCIES[id]?.name || id)
    return `Running: ${taskNames.join(', ')}`
  }
  
  return currentPhase.value || 'Preparing...'
})

// Helper functions
function getTasksByCategory(categoryId: string): TaskDefinition[] {
  return Object.values(TASK_DEPENDENCIES).filter((task: TaskDefinition) => task.category === categoryId)
}

function getTaskState(taskId: string): TaskExecutionState | undefined {
  return taskStates.value[taskId]
}

function getTaskName(taskId: string): string {
  return TASK_DEPENDENCIES[taskId]?.name || taskId
}

function getTaskStatusLabel(taskId: string): string {
  const state = taskStates.value[taskId]
  if (!state) return 'Pending'
  
  switch (state.status) {
    case 'completed': return 'Completed'
    case 'running': return 'Running'
    case 'failed': return 'Failed'
    case 'skipped': return 'Skipped'
    default: return 'Pending'
  }
}

function getTaskStatusBadgeClass(taskId: string): string {
  const state = taskStates.value[taskId]
  const baseClass = 'px-2 py-1 rounded text-xs font-medium whitespace-nowrap'
  
  if (!state || state.status === 'pending') {
    return `${baseClass} bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300`
  }
  
  switch (state.status) {
    case 'completed':
      return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
    case 'running':
      return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
    case 'failed':
      return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
    case 'skipped':
      return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
    default:
      return `${baseClass} bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300`
  }
}

function getCategoryProgress(categoryId: string): string {
  const tasks = getTasksByCategory(categoryId)
  const completed = tasks.filter(t => taskStates.value[t.id]?.status === 'completed').length
  return `${completed}/${tasks.length}`
}

function getCategoryStatus(categoryId: string): string {
  const tasks = getTasksByCategory(categoryId)
  const states = tasks.map(t => taskStates.value[t.id]?.status)
  
  if (states.every(s => s === 'completed')) return 'Complete'
  if (states.some(s => s === 'running')) return 'Running'
  if (states.some(s => s === 'failed')) return 'Failed'
  return 'Pending'
}

function getCategoryStatusClass(categoryId: string): string {
  const status = getCategoryStatus(categoryId)
  const baseClass = 'px-2 py-1 rounded text-xs font-medium'
  
  switch (status) {
    case 'Complete':
      return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
    case 'Running':
      return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
    case 'Failed':
      return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
    default:
      return `${baseClass} bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300`
  }
}

function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m ago`
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const diff = now.getTime() - targetDate.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (hours < 1) return 'less than 1h ago'
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  
  return targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getTaskMetadata(taskId: string) {
  return taskMetadata.value[taskId]
}

async function fetchTaskMetadata() {
  try {
    const response: any = await $fetch('/api/orchestrate/metadata')
    console.log('Fetched metadata:', response)
    
    // Convert date strings to Date objects
    const metadata = response.metadata || {}
    for (const taskId in metadata) {
      if (metadata[taskId].lastSync) {
        metadata[taskId].lastSync = new Date(metadata[taskId].lastSync)
      }
    }
    
    taskMetadata.value = metadata
    console.log('Processed metadata:', taskMetadata.value)
  } catch (error) {
    console.error('Error fetching task metadata:', error)
  }
}

// Start full sync
async function startFullSync() {
  if (isRunning.value) return
  
  try {
    isRunning.value = true
    errorMessage.value = ''
    overallProgress.value = 0
    
    // Initialize all tasks as pending
    const initialStates: Record<string, TaskExecutionState> = {}
    Object.keys(TASK_DEPENDENCIES).forEach(taskId => {
      initialStates[taskId] = {
        taskId,
        status: 'pending'
      }
    })
    taskStates.value = initialStates
    
    toast.add({
      title: 'Starting Full Data Sync',
      description: 'This may take several minutes to complete',
      color: 'info',
      icon: 'i-heroicons-information-circle'
    })
    
    // Connect to SSE endpoint for real-time updates
    connectToProgressStream()
    
    // Trigger the orchestrated sync
    const response: any = await $fetch('/api/orchestrate/full-sync', {
      method: 'POST'
    })
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to start sync')
    }
    
  } catch (error: any) {
    console.error('Error starting full sync:', error)
    errorMessage.value = error.data?.message || error.message || 'Failed to start sync'
    isRunning.value = false
    
    toast.add({
      title: 'Sync Failed',
      description: errorMessage.value,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  }
}

// Connect to progress stream
function connectToProgressStream() {
  if (eventSource.value) {
    eventSource.value.close()
  }
  
  eventSource.value = new EventSource('/api/orchestrate/progress')
  
  eventSource.value.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      
      if (data.type === 'task_update') {
        // Update specific task state
        taskStates.value[data.taskId] = {
          ...taskStates.value[data.taskId],
          ...data.state
        }
      } else if (data.type === 'progress') {
        overallProgress.value = data.progress
        currentPhase.value = data.phase || ''
      } else if (data.type === 'complete') {
        isRunning.value = false
        overallProgress.value = 100
        
        toast.add({
          title: 'Sync Completed',
          description: 'All data has been successfully synced and analyzed',
          color: 'success',
          icon: 'i-heroicons-check-badge'
        })
        
        disconnectProgressStream()
      } else if (data.type === 'error') {
        errorMessage.value = data.error
        isRunning.value = false
        
        toast.add({
          title: 'Sync Error',
          description: data.error,
          color: 'error',
          icon: 'i-heroicons-exclamation-circle'
        })
        
        disconnectProgressStream()
      }
    } catch (error) {
      console.error('Error parsing SSE message:', error)
    }
  }
  
  eventSource.value.onerror = (error) => {
    console.error('SSE connection error:', error)
    disconnectProgressStream()
  }
}

function disconnectProgressStream() {
  if (eventSource.value) {
    eventSource.value.close()
    eventSource.value = null
  }
}

// Lifecycle
onMounted(() => {
  fetchTaskMetadata()
})

onUnmounted(() => {
  disconnectProgressStream()
})
</script>