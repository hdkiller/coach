import { ref, type Ref } from 'vue'

export function useResourceShare(
  resourceType: string,
  resourceId: Ref<string | undefined> | Ref<string | null>
) {
  const shareLink = ref('')
  const generatingShareLink = ref(false)
  const toast = useToast()

  const generateShareLink = async (options?: { expiresIn?: number | null; forceNew?: boolean }) => {
    const id = resourceId.value
    if (!id || generatingShareLink.value) return

    generatingShareLink.value = true
    try {
      // API expects uppercase enum values
      const normalizedType = resourceType.toUpperCase()

      const body: Record<string, any> = {
        resourceType: normalizedType,
        resourceId: id
      }

      if (options?.expiresIn !== undefined) {
        body.expiresIn = options.expiresIn
      }

      if (options?.forceNew) {
        body.forceNew = true
      }

      const response = await $fetch<any>('/api/share/generate', {
        method: 'POST',
        body
      })

      shareLink.value = response.url
      return response.url
    } catch (error: any) {
      console.error('Failed to generate share link:', error)
      toast.add({
        title: 'Error',
        description: error?.data?.message || 'Failed to generate share link. Please try again.',
        color: 'error'
      })
      throw error
    } finally {
      generatingShareLink.value = false
    }
  }

  return {
    shareLink,
    generatingShareLink,
    generateShareLink
  }
}
