import { describe, it, expect } from 'vitest'
import {
  multiStringParam,
  multiIntParam,
  multiFloatParam,
} from './multiParams.js'

describe('multiStringParam', () => {
  it('encodes array of strings', () => {
    const param = multiStringParam()
    expect(param.encode(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('encodes default value as empty array', () => {
    const param = multiStringParam(['a', 'b'])
    expect(param.encode(['a', 'b'])).toEqual([])
  })

  it('encodes empty array as empty array when default is empty', () => {
    const param = multiStringParam()
    expect(param.encode([])).toEqual([])
  })

  it('decodes array of strings', () => {
    const param = multiStringParam()
    expect(param.decode(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('decodes empty array as default', () => {
    const param = multiStringParam(['x', 'y'])
    expect(param.decode([])).toEqual(['x', 'y'])
  })

  it('roundtrips', () => {
    const param = multiStringParam()
    const values = ['hello', 'world']
    expect(param.decode(param.encode(values))).toEqual(values)
  })
})

describe('multiIntParam', () => {
  it('encodes array of integers as strings', () => {
    const param = multiIntParam()
    expect(param.encode([1, 2, 3])).toEqual(['1', '2', '3'])
  })

  it('encodes default value as empty array', () => {
    const param = multiIntParam([1, 2])
    expect(param.encode([1, 2])).toEqual([])
  })

  it('decodes strings to integers', () => {
    const param = multiIntParam()
    expect(param.decode(['1', '2', '3'])).toEqual([1, 2, 3])
  })

  it('decodes empty array as default', () => {
    const param = multiIntParam([10, 20])
    expect(param.decode([])).toEqual([10, 20])
  })

  it('handles negative numbers', () => {
    const param = multiIntParam()
    expect(param.encode([-1, -2])).toEqual(['-1', '-2'])
    expect(param.decode(['-1', '-2'])).toEqual([-1, -2])
  })

  it('roundtrips', () => {
    const param = multiIntParam()
    const values = [42, 100, -5]
    expect(param.decode(param.encode(values))).toEqual(values)
  })
})

describe('multiFloatParam', () => {
  it('encodes array of floats as strings', () => {
    const param = multiFloatParam()
    expect(param.encode([1.5, 2.7, 3.14])).toEqual(['1.5', '2.7', '3.14'])
  })

  it('encodes default value as empty array', () => {
    const param = multiFloatParam([1.5, 2.5])
    expect(param.encode([1.5, 2.5])).toEqual([])
  })

  it('decodes strings to floats', () => {
    const param = multiFloatParam()
    const result = param.decode(['1.5', '2.7'])
    expect(result[0]).toBeCloseTo(1.5)
    expect(result[1]).toBeCloseTo(2.7)
  })

  it('decodes empty array as default', () => {
    const param = multiFloatParam([1.5, 2.5])
    expect(param.decode([])).toEqual([1.5, 2.5])
  })

  it('roundtrips', () => {
    const param = multiFloatParam()
    const values = [3.14, 2.718]
    const result = param.decode(param.encode(values))
    expect(result[0]).toBeCloseTo(3.14)
    expect(result[1]).toBeCloseTo(2.718)
  })
})
