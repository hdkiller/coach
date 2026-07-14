const hex = (value: number) => value.toString(16).padStart(2, '0')

export function safeRandomUUID(): string {
  const cryptoObj = (globalThis as any)?.crypto as Crypto | undefined

  if (typeof cryptoObj?.randomUUID === 'function') {
    return cryptoObj.randomUUID()
  }

  const getRandomValues = cryptoObj?.getRandomValues?.bind(cryptoObj)
  if (typeof getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    getRandomValues(bytes)

    // RFC 4122 v4
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80

    return (
      `${hex(bytes[0]!) + hex(bytes[1]!) + hex(bytes[2]!) + hex(bytes[3]!)}-` +
      `${hex(bytes[4]!) + hex(bytes[5]!)}-` +
      `${hex(bytes[6]!) + hex(bytes[7]!)}-` +
      `${hex(bytes[8]!) + hex(bytes[9]!)}-` +
      `${hex(bytes[10]!) + hex(bytes[11]!) + hex(bytes[12]!) + hex(bytes[13]!) + hex(bytes[14]!) + hex(bytes[15]!)}`
    )
  }

  // Last resort: uniqueness only (not cryptographically secure)
  return `fallback-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}
