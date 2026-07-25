export const $fetch = (...args: any[]) => {
  if (typeof globalThis.$fetch === 'function') {
    return (globalThis.$fetch as any)(...args)
  }
  throw new Error(`$fetch called in unit test without global $fetch stub: ${args[0]}`)
}

export default $fetch
