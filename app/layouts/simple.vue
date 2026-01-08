<template>
  <div
    class="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900"
  >
    <div class="sm:mx-auto sm:w-full sm:max-w-[480px]">
      <div
        class="bg-white dark:bg-gray-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-800"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
