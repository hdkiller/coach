<script setup lang="ts">
  const messages = ref<string[]>([])
  const status = ref('Disconnected')
  const inputMessage = ref('')
  let ws: WebSocket | null = null

  const connect = () => {
    if (ws) {
      ws.close()
    }

    // Use secure websocket if page is loaded via https
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/api/websocket`

    status.value = 'Connecting...'
    messages.value.push(`System: Connecting to ${url}...`)

    try {
      ws = new WebSocket(url)

      ws.onopen = () => {
        status.value = 'Connected'
        messages.value.push('System: Connected')
      }

      ws.onmessage = (event) => {
        try {
          // Try to format JSON nicely if possible
          const data = JSON.parse(event.data)
          messages.value.push(`Received: ${JSON.stringify(data, null, 2)}`)
        } catch (e) {
          messages.value.push(`Received: ${event.data}`)
        }
      }

      ws.onclose = (event) => {
        status.value = 'Disconnected'
        messages.value.push(`System: Disconnected (Code: ${event.code})`)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        messages.value.push('System: Error occurred (check console)')
      }
    } catch (err) {
      messages.value.push(`System: Failed to create WebSocket connection: ${err}`)
      status.value = 'Error'
    }
  }

  const disconnect = () => {
    if (ws) {
      ws.close()
      ws = null
      status.value = 'Disconnected'
    }
  }

  const sendMessage = () => {
    if (ws && ws.readyState === WebSocket.OPEN && inputMessage.value) {
      ws.send(inputMessage.value)
      messages.value.push(`Sent: ${inputMessage.value}`)
      inputMessage.value = ''
    }
  }

  const sendPing = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send('ping')
      messages.value.push('Sent: ping')
    }
  }

  const clearLogs = () => {
    messages.value = []
  }

  onUnmounted(() => {
    if (ws) {
      ws.close()
    }
  })
</script>

<template>
  <UContainer class="py-8">
    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <h1 class="text-xl font-bold">WebSocket Debugger</h1>
          <UBadge
            :color="
              status === 'Connected' ? 'success' : status === 'Connecting...' ? 'warning' : 'error'
            "
          >
            {{ status }}
          </UBadge>
        </div>
      </template>

      <div class="space-y-4">
        <div class="flex flex-wrap gap-4">
          <UButton
            v-if="status === 'Disconnected' || status === 'Error'"
            icon="i-heroicons-bolt"
            color="primary"
            @click="connect"
          >
            Connect
          </UButton>

          <UButton v-else icon="i-heroicons-x-mark" color="neutral" @click="disconnect">
            Disconnect
          </UButton>

          <UButton icon="i-heroicons-trash" color="neutral" variant="ghost" @click="clearLogs">
            Clear Logs
          </UButton>
        </div>

        <div class="flex gap-2">
          <UInput
            v-model="inputMessage"
            placeholder="Type a message..."
            class="flex-1"
            :disabled="status !== 'Connected'"
            @keyup.enter="sendMessage"
          />
          <UButton :disabled="status !== 'Connected' || !inputMessage" @click="sendMessage">
            Send
          </UButton>
          <UButton color="neutral" :disabled="status !== 'Connected'" @click="sendPing">
            Ping
          </UButton>
        </div>

        <div
          class="bg-gray-900 text-green-400 p-4 rounded-md h-96 overflow-y-auto font-mono text-xs shadow-inner"
        >
          <div v-if="messages.length === 0" class="text-gray-500 italic">No logs yet...</div>
          <div
            v-for="(msg, index) in messages"
            :key="index"
            class="mb-1 whitespace-pre-wrap break-all"
          >
            <span class="opacity-50 select-none mr-2">[{{ new Date().toLocaleTimeString() }}]</span>
            {{ msg }}
          </div>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
