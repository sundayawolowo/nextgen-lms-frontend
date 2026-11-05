import { describe, expect, it } from 'vitest'
import { formatDuration, formatPrice, humanise, toMinor } from './format'

describe('formatPrice', () => {
  it('shows free courses as Free', () => {
    expect(formatPrice(0)).toBe('Free')
  })

  it('converts kobo to naira with two decimals', () => {
    expect(formatPrice(250000, 'NGN')).toBe('₦2,500.00')
    expect(formatPrice(99, 'NGN')).toBe('₦0.99')
  })

  it('supports dollars', () => {
    expect(formatPrice(1999, 'USD')).toBe('$19.99')
  })
})

describe('toMinor', () => {
  it('turns typed naira into kobo', () => {
    expect(toMinor('2,500')).toBe(250000)
    expect(toMinor('₦ 12.5')).toBe(1250)
    expect(toMinor('')).toBe(0)
  })

  it('rejects things that are not prices', () => {
    expect(toMinor('abc')).toBeNull()
    expect(toMinor('-5')).toBeNull()
  })

  it('avoids floating point drift', () => {
    expect(toMinor('19.99')).toBe(1999)
  })
})

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(0)).toBe('0m')
    expect(formatDuration(45)).toBe('1m')
    expect(formatDuration(300)).toBe('5m')
    expect(formatDuration(3725)).toBe('1h 2m')
  })
})

describe('humanise', () => {
  it('turns role slugs into words', () => {
    expect(humanise('teaching-assistant')).toBe('Teaching assistant')
    expect(humanise('in_review')).toBe('In review')
  })
})
