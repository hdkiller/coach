import { beforeEach, describe, expect, it, vi } from 'vitest'

import { parseFitFile, toFitParserArrayBuffer } from '../../../../server/utils/fit'

const { parseMock, FitParserMock } = vi.hoisted(() => {
  const parseMock = vi.fn((_content: ArrayBuffer, callback: (error: any, data: any) => void) => {
    callback(undefined, {
      protocolVersion: 1,
      profileVersion: 1,
      activity: {},
      sessions: [],
      laps: [],
      records: [],
      events: [],
      device_infos: []
    })
  })
  class FitParserMock {
    parse = parseMock
  }
  return { parseMock, FitParserMock }
})

vi.mock('fit-file-parser', () => ({
  default: FitParserMock
}))

describe('toFitParserArrayBuffer', () => {
  it('returns the underlying ArrayBuffer without copying when Buffer owns it fully', () => {
    const owned = Buffer.allocUnsafe(64 * 1024)
    owned.fill(0xab)

    const result = toFitParserArrayBuffer(owned)

    expect(result).toBe(owned.buffer)
    expect(result.byteLength).toBe(owned.byteLength)
  })

  it('slices a copy when Buffer is a view into a larger ArrayBuffer', () => {
    const slab = new ArrayBuffer(32)
    const view = Buffer.from(slab, 8, 16)
    view.fill(0xcd)

    const result = toFitParserArrayBuffer(view)

    expect(result).not.toBe(slab)
    expect(result.byteLength).toBe(16)
    expect(new Uint8Array(result).every((b) => b === 0xcd)).toBe(true)
  })
})

describe('parseFitFile', () => {
  beforeEach(() => {
    parseMock.mockClear()
  })

  it('passes the owned ArrayBuffer through without an intermediate slice copy', async () => {
    const owned = Buffer.allocUnsafe(128 * 1024)
    owned.fill(0x11)

    await parseFitFile(owned)

    expect(parseMock).toHaveBeenCalledTimes(1)
    const passed = parseMock.mock.calls[0]?.[0]
    expect(passed).toBe(owned.buffer)
    expect(passed).toBeInstanceOf(ArrayBuffer)
  })

  it('passes a correctly sized ArrayBuffer copy for pooled/offset Buffer views', async () => {
    const slab = new ArrayBuffer(48)
    new Uint8Array(slab).fill(0x00)
    const view = Buffer.from(slab, 4, 20)
    view.fill(0x22)

    await parseFitFile(view)

    expect(parseMock).toHaveBeenCalledTimes(1)
    const passed = parseMock.mock.calls[0]?.[0] as ArrayBuffer
    expect(passed).toBeInstanceOf(ArrayBuffer)
    expect(passed).not.toBe(slab)
    expect(passed.byteLength).toBe(20)
    expect(new Uint8Array(passed).every((b) => b === 0x22)).toBe(true)
  })
})
