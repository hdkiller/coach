export default defineAppConfig({
  ui: {
    colors: {
      primary: 'sky',
      gray: 'slate',
      neutral: 'slate',
      success: 'cyan',
      warning: 'amber',
      error: 'red',
      info: 'cyan'
    },
    // Custom design tokens overrides
    card: {
      slots: {
        // root: 'bg-white dark:bg-gray-900 rounded-xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-800',
        body: 'p-4 sm:p-6',
        header: 'p-4 sm:p-6',
        footer: 'p-4 sm:p-6'
      }
    },
    button: {
      defaultVariants: {
        size: 'md'
      }
    },
    modal: {
      slots: {
        overlay: 'backdrop-blur-sm',
        content: 'rounded-xl shadow-xl ring-1 ring-gray-200 dark:ring-gray-800'
      }
    },
    dashboardNavbar: {
      slots: {
        title:
          'flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-highlighted sm:text-base',
        icon: 'hidden sm:block shrink-0 size-5 self-center me-1.5'
      }
    },
    dashboardSidebarToggle: {
      base: 'size-11 min-h-11 min-w-11'
    }
  },
  // Central brand identity — use useAppConfig().brand.name in components
  brand: {
    name: 'Journey Endurance Coaching',
    shortName: 'Journey',
    tagline: 'AI-powered endurance coaching that adapts to you.'
  },
  // Custom design tokens for consistent usage
  theme: {
    colors: {
      success: 'cyan',
      warning: 'amber',
      error: 'red',
      info: 'cyan'
    }
  }
})
