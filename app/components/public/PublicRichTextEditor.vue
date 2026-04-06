<template>
  <div class="overflow-hidden rounded-2xl border border-default/70 bg-default shadow-sm">
    <div
      v-if="editor"
      class="flex flex-wrap gap-1 border-b border-default/70 bg-muted/30 px-3 py-2"
    >
      <UButton
        icon="i-lucide-type"
        size="xs"
        color="neutral"
        variant="ghost"
        :class="{ 'bg-primary/10 text-primary': editor.isActive('paragraph') }"
        @click="editor.chain().focus().setParagraph().run()"
      />
      <UButton
        icon="i-lucide-heading-2"
        size="xs"
        color="neutral"
        variant="ghost"
        :class="{ 'bg-primary/10 text-primary': editor.isActive('heading', { level: 2 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      />
      <div class="mx-1 h-5 w-px bg-default/70" />
      <UButton
        icon="i-lucide-bold"
        size="xs"
        color="neutral"
        variant="ghost"
        :class="{ 'bg-primary/10 text-primary': editor.isActive('bold') }"
        @click="editor.chain().focus().toggleBold().run()"
      />
      <UButton
        icon="i-lucide-italic"
        size="xs"
        color="neutral"
        variant="ghost"
        :class="{ 'bg-primary/10 text-primary': editor.isActive('italic') }"
        @click="editor.chain().focus().toggleItalic().run()"
      />
      <div class="mx-1 h-5 w-px bg-default/70" />
      <UButton
        icon="i-lucide-list"
        size="xs"
        color="neutral"
        variant="ghost"
        :class="{ 'bg-primary/10 text-primary': editor.isActive('bulletList') }"
        @click="editor.chain().focus().toggleBulletList().run()"
      />
      <UButton
        icon="i-lucide-list-ordered"
        size="xs"
        color="neutral"
        variant="ghost"
        :class="{ 'bg-primary/10 text-primary': editor.isActive('orderedList') }"
        @click="editor.chain().focus().toggleOrderedList().run()"
      />
      <div class="mx-1 h-5 w-px bg-default/70" />
      <UButton
        icon="i-lucide-undo"
        size="xs"
        color="neutral"
        variant="ghost"
        :disabled="!editor.can().undo()"
        @click="editor.chain().focus().undo().run()"
      />
      <div class="mx-1 h-5 w-px bg-default/70" />
      <label class="inline-flex">
        <input
          ref="imageInputRef"
          class="hidden"
          type="file"
          accept="image/*"
          @change="onImageUpload"
        />
        <span class="inline-flex">
          <UButton
            icon="i-lucide-image-plus"
            size="xs"
            color="neutral"
            variant="ghost"
            :loading="uploadingImage"
            @click="triggerImageUpload"
          />
        </span>
      </label>
    </div>

    <EditorContent :editor="editor" class="min-h-[220px] px-4 py-4" />
  </div>
</template>

<script setup lang="ts">
  import Image from '@tiptap/extension-image'
  import { EditorContent, useEditor } from '@tiptap/vue-3'
  import Placeholder from '@tiptap/extension-placeholder'
  import StarterKit from '@tiptap/starter-kit'
  import { marked } from 'marked'
  import TurndownService from 'turndown'

  const props = withDefaults(
    defineProps<{
      modelValue?: string | null
      placeholder?: string
    }>(),
    {
      modelValue: null,
      placeholder: 'Write something compelling here...'
    }
  )

  const emit = defineEmits<{
    'update:modelValue': [value: string | null]
  }>()

  const toast = useToast()
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  })
  const imageInputRef = ref<HTMLInputElement | null>(null)
  const lastSyncedValue = ref<string | null>(null)
  const uploadingImage = ref(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: false,
        allowBase64: false
      }),
      Placeholder.configure({
        placeholder: props.placeholder
      })
    ],
    content: '',
    editable: true,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[220px] text-highlighted dark:prose-invert prose-img:rounded-2xl prose-img:border prose-img:border-default/70 prose-img:shadow-sm'
      }
    },
    onUpdate: ({ editor }) => {
      let content: string | null = null
      if (editor.getText().trim()) {
        content = turndownService.turndown(editor.getHTML())
      }
      lastSyncedValue.value = content
      emit('update:modelValue', content)
    }
  })

  watch(
    () => props.modelValue,
    (value) => {
      if (!editor.value) return
      if ((value || null) === lastSyncedValue.value) return
      const htmlContent = value ? (marked.parse(value) as string) : ''
      editor.value.commands.setContent(htmlContent, { emitUpdate: false })
      lastSyncedValue.value = value || null
    },
    { immediate: true }
  )

  function triggerImageUpload() {
    imageInputRef.value?.click()
  }

  async function onImageUpload(event: Event) {
    const input = event.target as HTMLInputElement | null
    const file = input?.files?.[0]
    if (!file || !editor.value) return

    uploadingImage.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await $fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      })
      const url = (result as any)?.url
      if (!url) {
        throw new Error('No image URL returned from upload.')
      }
      const alt = file.name.replace(/\.[^.]+$/, '')
      editor.value.chain().focus().setImage({ src: url, alt }).run()
    } catch (error: any) {
      toast.add({
        title: 'Image upload failed',
        description: error?.data?.message || error?.message || 'Could not upload this image.',
        color: 'error'
      })
    } finally {
      uploadingImage.value = false
      if (input) input.value = ''
    }
  }

  onBeforeUnmount(() => {
    editor.value?.destroy()
  })
</script>

<style scoped>
  :deep(.ProseMirror) {
    outline: none;
  }

  :deep(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: rgb(148 163 184);
    pointer-events: none;
    height: 0;
  }
</style>
