import { Token } from '@orbs-network/spot-react'
import { UnifiedCurrency } from '@pancakeswap/swap-sdk-core'

function formatDecimals(value?: string, scale = 6, maxDecimals = 8): string {
  if (!value) return ''

  // ─── keep the sign, work with the absolute value ────────────────
  const sign = value.startsWith('-') ? '-' : ''
  const abs = sign ? value.slice(1) : value

  const [intPart, rawDec = ''] = abs.split('.')

  // Fast-path: decimal part is all zeros (or absent) ───────────────
  if (!rawDec || Number(rawDec) === 0) return sign + intPart

  /** Case 1 – |value| ≥ 1 *****************************************/
  if (intPart !== '0') {
    const sliced = rawDec.slice(0, scale)
    const cleaned = sliced.replace(/0+$/, '') // drop trailing zeros
    const trimmed = cleaned ? '.' + cleaned : ''
    return sign + intPart + trimmed
  }

  /** Case 2 – |value| < 1 *****************************************/
  const firstSigIdx = rawDec.search(/[^0]/) // first non-zero position
  if (firstSigIdx === -1) return '0' // decimal part is all zeros
  if (firstSigIdx + 1 > maxDecimals) return '0' // too many leading zeros → 0

  const leadingZeros = rawDec.slice(0, firstSigIdx) // keep them
  const significantRaw = rawDec.slice(firstSigIdx).slice(0, scale)
  const significant = significantRaw.replace(/0+$/, '') // trim trailing zeros

  return significant ? sign + '0.' + leadingZeros + significant : '0'
}

const zeroAddress = '0x0000000000000000000000000000000000000000'

const parseUnifiedToken = (token?: UnifiedCurrency): Token | undefined => {
  if (!token) return undefined
  return {
    address: token.isNative ? zeroAddress : (token as any).address,
    symbol: token.symbol ?? '',
    decimals: token.decimals,
    logoUrl: (token as any).logoUrl ?? (token as any).logoURI ?? '',
  }
}

export const twapUtils = {
  formatDecimals,
  parseUnifiedToken,
}
