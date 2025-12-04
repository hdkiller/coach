<template>
  <div class="min-h-screen flex items-center justify-center">
    <UAuthForm
      :fields="fields"
      :providers="providers"
      align="top"
      title="Welcome Back!"
      description="Sign in to your Coach Watts account."
      icon="i-lucide-zap"
      :ui="{
        base: 'w-full max-w-md',
        footer: 'text-sm text-gray-500 dark:text-gray-400',
        header: {
          description: 'mt-2 text-gray-600 dark:text-gray-300',
          icon: 'w-10 h-10 text-primary mb-4',
          title: 'text-3xl font-bold',
        },
      }"
      :loading="loading"
      @submit="onSubmit"
    >
      <template #description>
        <p class="text-center text-gray-600 dark:text-gray-300">
          Sign in to start analyzing your training data and get personalized coaching insights.
        </p>
      </template>

      <template #footer>
        <p class="text-center text-sm text-gray-500 dark:text-gray-400">
          By signing in, you agree to our
          <NuxtLink to="#" class="text-primary hover:underline">Terms of Service</NuxtLink>
          and
          <NuxtLink to="#" class="text-primary hover:underline">Privacy Policy</NuxtLink>.
        </p>
      </template>

      <template #bottom>
        <div class="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Don't have an account? <NuxtLink to="#" class="text-primary hover:underline">Sign up here</NuxtLink>.
        </div>
      </template>
    </UAuthForm>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'

const { signIn } = useAuth()
const toast = useToast()

definePageMeta({
  layout: 'home',
  middleware: ['guest'],
  auth: false // Explicitly disable auth middleware for this page
})

const loading = ref(false)

// Dummy fields for email/password for UAuthForm. 
// Real implementation would use credentials provider.
const fields = [{
  name: 'email',
  type: 'text',
  label: 'Email',
  placeholder: 'Enter your email'
}, {
  name: 'password',
  type: 'password',
  label: 'Password',
  placeholder: 'Enter your password'
}]

const providers = [{
  label: 'Continue with Google',
  icon: 'i-lucide-chrome' as const,
  color: 'gray' as const,
  variant: 'outline' as const,
  click: () => {
    loading.value = true
    signIn('google', { callbackUrl: '/dashboard' })
  }
}]

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Must be at least 8 characters')
})

type Schema = z.output<typeof schema>

async function onSubmit(data: any) {
  loading.value = true
  try {
    // This part would typically call signIn('credentials', data)
    // For now, it's a placeholder to demonstrate form submission.
    console.log('Form submitted with:', data)
    toast.add({
      title: 'Login Attempt',
      description: 'Email/password login is not yet configured.',
      color: 'info'
    })
  } catch (error: any) {
    toast.add({
      title: 'Login Failed',
      description: error.data?.message || 'An unexpected error occurred.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>
