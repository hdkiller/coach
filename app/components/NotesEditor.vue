<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800"
  >
    <div class="flex items-center justify-between mb-8">
      <h2
        class="text-base font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2"
      >
        <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-primary-500" />
        Personal Session Notes
      </h2>
      <UButton
        v-if="!isEditing"
        icon="i-heroicons-pencil"
        color="neutral"
        variant="ghost"
        size="sm"
        class="font-black uppercase tracking-widest text-[10px]"
        @click="startEditing"
      >
        {{ hasNotes ? 'Edit' : 'Add Notes' }}
      </UButton>
      <div v-else class="flex gap-2">
        <UButton
          icon="i-heroicons-check"
          color="primary"
          size="sm"
          class="font-black uppercase tracking-widest text-[10px]"
          :loading="saving"
          :disabled="saving"
          @click="saveNotes"
        >
          Save
        </UButton>
        <UButton
          icon="i-heroicons-x-mark"
          color="neutral"
          variant="ghost"
          size="sm"
          class="font-black uppercase tracking-widest text-[10px]"
          :disabled="saving"
          @click="cancelEditing"
        >
          Cancel
        </UButton>
      </div>
    </div>

    <!-- Empty State (not editing, no notes) -->
    <div
      v-if="!isEditing && !hasNotes"
      class="text-center py-12 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800"
    >
      <div class="text-gray-500 dark:text-gray-400">
        <div
          class="w-16 h-16 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <UIcon name="i-heroicons-document-text" class="w-8 h-8 opacity-30" />
        </div>
        <p class="text-sm font-black uppercase tracking-widest text-gray-500">
          Telemetry Log Empty
        </p>
        <p class="text-xs mt-2 text-gray-400 max-w-xs mx-auto uppercase font-bold tracking-widest">
          Capture your subjective insights, equipment notes, or metabolic observations.
        </p>
        <UButton
          size="xs"
          color="primary"
          variant="soft"
          class="mt-6 font-black uppercase tracking-widest text-[9px]"
          @click="startEditing"
        >
          Initialize Note
        </UButton>
      </div>
    </div>

    <!-- Display Notes (not editing, has notes) - Rendered HTML -->
    <div v-if="!isEditing && hasNotes" class="space-y-4">
      <div
        class="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-6"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div
          class="prose prose-sm dark:prose-invert max-w-none font-medium leading-relaxed text-gray-700 dark:text-gray-300"
          v-html="renderedNotes"
        />
      </div>
      <div
        v-if="notesUpdatedAt"
        class="flex items-center justify-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest pt-2"
      >
        <UIcon name="i-heroicons-clock" class="w-3 h-3" />
        <span>Log Synchronized • {{ formatDate(notesUpdatedAt) }}</span>
      </div>
    </div>

    <!-- Editor (is editing) -->
    <div v-if="isEditing" class="space-y-4">
      <div
        class="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950 shadow-inner"
      >
        <!-- Custom Toolbar -->
        <div
          v-if="editor"
          class="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 flex flex-wrap gap-1.5"
        >
          <!-- Bold -->
          <UButton
            icon="i-lucide-bold"
            size="xs"
            color="neutral"
            variant="ghost"
            class="hover:bg-primary-50 dark:hover:bg-primary-950"
            :class="{
              'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400':
                editor.isActive('bold')
            }"
            @click="editor.chain().focus().toggleBold().run()"
          />
          <!-- Italic -->
          <UButton
            icon="i-lucide-italic"
            size="xs"
            color="neutral"
            variant="ghost"
            class="hover:bg-primary-50 dark:hover:bg-primary-950"
            :class="{
              'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400':
                editor.isActive('italic')
            }"
            @click="editor.chain().focus().toggleItalic().run()"
          />

          <div class="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1 align-middle" />

          <!-- Heading -->
          <UButton
            icon="i-lucide-heading-2"
            size="xs"
            color="neutral"
            variant="ghost"
            class="hover:bg-primary-50 dark:hover:bg-primary-950"
            :class="{
              'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400':
                editor.isActive('heading', { level: 2 })
            }"
            @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
          />

          <div class="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1" />

          <!-- Bullet List -->
          <UButton
            icon="i-lucide-list"
            size="xs"
            color="neutral"
            variant="ghost"
            class="hover:bg-primary-50 dark:hover:bg-primary-950"
            :class="{
              'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400':
                editor.isActive('bulletList')
            }"
            @click="editor.chain().focus().toggleBulletList().run()"
          />
          <!-- Ordered List -->
          <UButton
            icon="i-lucide-list-ordered"
            size="xs"
            color="neutral"
            variant="ghost"
            class="hover:bg-primary-50 dark:hover:bg-primary-950"
            :class="{
              'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400':
                editor.isActive('orderedList')
            }"
            @click="editor.chain().focus().toggleOrderedList().run()"
          />

          <div class="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1" />

          <!-- Undo -->
          <UButton
            icon="i-lucide-undo"
            size="xs"
            color="neutral"
            variant="ghost"
            class="hover:bg-primary-50 dark:hover:bg-primary-950"
            :disabled="!editor.can().undo()"
            @click="editor.chain().focus().undo().run()"
          />
        </div>

        <!-- Editor Content -->
        <EditorContent :editor="editor" class="px-6 py-4 min-h-[250px]" />
      </div>
      <div
        class="flex items-start gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30"
      >
        <UIcon
          name="i-heroicons-information-circle"
          class="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0"
        />
        <div class="space-y-1">
          <p
            class="text-[10px] font-black uppercase tracking-widest text-blue-900 dark:text-blue-300"
          >
            Format Instructions
          </p>
          <p class="text-[10px] font-medium text-blue-800 dark:text-blue-200 leading-relaxed">
            Use standard markdown or the toolbar above. Keyboard shortcuts supported:
            <span class="font-black">CMD+B</span> (Bold),
            <span class="font-black">CMD+I</span> (Italic),
            <span class="font-black">CMD+ENTER</span> (Save).
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useEditor, EditorContent } from '@tiptap/vue-3'
  import StarterKit from '@tiptap/starter-kit'
  import Placeholder from '@tiptap/extension-placeholder'
  import TurndownService from 'turndown'
  import { marked } from 'marked'

  const { formatDateTime } = useFormat()

  const props = defineProps<{
    modelValue: string | null
    notesUpdatedAt?: string | Date | null
    apiEndpoint: string
  }>()

  // Initialize Turndown for HTML to Markdown conversion
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  })

  const emit = defineEmits<{
    'update:modelValue': [value: string | null]
    'update:notesUpdatedAt': [value: Date | null]
  }>()

  const toast = useToast()

  const isEditing = ref(false)
  const saving = ref(false)

  const hasNotes = computed(() => {
    return props.modelValue && props.modelValue.trim().length > 0
  })

  // Convert markdown to HTML for display
  const renderedNotes = computed(() => {
    if (!props.modelValue) return ''
    return marked.parse(props.modelValue) as string
  })

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Add your personal notes, observations, or insights here...'
      })
    ],
    content: '',
    editable: true,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px]'
      }
    }
  })

  function startEditing() {
    isEditing.value = true
    nextTick(() => {
      if (editor.value) {
        // Convert markdown to HTML for editing
        const htmlContent = props.modelValue ? (marked.parse(props.modelValue) as string) : ''
        editor.value.commands.setContent(htmlContent)
        editor.value.commands.focus()
      }
    })
  }

  function cancelEditing() {
    isEditing.value = false
    if (editor.value) {
      editor.value.commands.setContent('')
    }
  }

  async function saveNotes() {
    if (!editor.value) return

    saving.value = true
    try {
      // Convert HTML to Markdown before saving
      let content: string | null = null
      if (editor.value.getText().trim()) {
        const html = editor.value.getHTML()
        content = turndownService.turndown(html)
      }

      const response = (await $fetch(props.apiEndpoint, {
        method: 'PATCH',
        body: {
          notes: content
        }
      })) as any

      if (response?.success) {
        emit('update:modelValue', content)

        if (response.workout?.notesUpdatedAt) {
          emit('update:notesUpdatedAt', response.workout.notesUpdatedAt)
        } else if (response.nutrition?.notesUpdatedAt) {
          emit('update:notesUpdatedAt', response.nutrition.notesUpdatedAt)
        }

        isEditing.value = false

        toast.add({
          title: 'Notes Saved',
          description: 'Your notes have been saved successfully',
          color: 'success',
          icon: 'i-heroicons-check-circle'
        })
      }
    } catch (e: any) {
      console.error('Error saving notes:', e)
      toast.add({
        title: 'Save Failed',
        description: e.data?.message || e.message || 'Failed to save notes',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle'
      })
    } finally {
      saving.value = false
    }
  }

  function formatDate(date: string | Date) {
    return formatDateTime(date, 'MMMM d, yyyy h:mm a')
  }

  onBeforeUnmount(() => {
    if (editor.value) {
      editor.value.destroy()
    }
  })
</script>

<style scoped>
  :deep(.ProseMirror) {
    outline: none;
  }

  :deep(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: rgb(156 163 175);
    pointer-events: none;
    height: 0;
  }
</style>
