/* eslint-disable no-cond-assign */
import teams from 'config/constants/teams'
import fs from 'fs'
import Path from 'path'
import { describe, expect, it } from 'vitest'

// FIXME: should move this test file inside localization pkg
import { translations } from '@pancakeswap/localization'

const allTranslationKeys = Object.keys(translations)

// when some keys are hard to be extracted from code
const whitelist = [
  ...teams.map((t) => t.description),
  'Profile Pic',
  'In Wallet',
  `Oopsie daisy! Hiccup's had a bit of an accident. Poor little fella.`,
  'Eggscellent! Celebrating Syrup Storm winning the Easter Battle!',
  'Melting Easter eggs and melting hearts!',
  'Watch out for Flipsie’s spatula smash!',
  'Do you like chocolate with your syrup? Go long!',
  'Happy Niu Year! This bunny’s excited for the year of the bull (market!)',
  'Sunny is always cheerful when there are pancakes around. Smile!',
  `Don't let that dopey smile deceive you... Churro's a master CAKE chef!`,
  `Nommm... Oh hi, I'm just meditating on the meaning of CAKE.`,
  `Three guesses what's put that twinkle in those eyes! (Hint: it's CAKE)`,
  'These bunnies love nothing more than swapping pancakes. Especially on BSC.',
  `It's raining syrup on this bunny, but he doesn't seem to mind. Can you blame him?`,
  `These bunnies like their pancakes with blueberries. What's your favorite topping?`,
  "Love makes the world go 'round... but so do pancakes. And these bunnies know it.",
  `It’s sparkling syrup, pancakes, and even lottery tickets! This bunny really loves it.`,
  'Swap max. %inputAmount% %inputSymbol% for %outputAmount% %outputSymbol%',
  'Swap max. %inputAmount% %inputSymbol% for %outputAmount% %outputSymbol% to %recipientAddress%',
  'Swap %inputAmount% %inputSymbol% for min. %outputAmount% %outputSymbol%',
  'Swap %inputAmount% %inputSymbol% for min. %outputAmount% %outputSymbol% to %recipientAddress%',
  'Unwrap %amount% %wrap% to %native%',
  'Wrap %amount% %native% to %wrap%',
  'Add %amountA% %symbolA% and %amountB% %symbolB%',
  'Remove %amount% %symbol%',
  'Remove %amountA% %symbolA% and %amountB% %symbolB%',
  'Zap %amountA% %symbolA% and %amountB% %symbolB%',
  'Zap in %amount% BNB for %symbol%',
  'Zap in %amount% %symbol% for %lpSymbol%',
  'Zap in for %lpSymbol%',
  'Order cancellation: %inputAmount% %inputTokenSymbol% for %outputAmount% %outputTokenSymbol%',
  'Order cancellation',
  'Launch App',
  'Newest First',
  'Oldest First',
  'Sort Title A-Z',
  'Sort Title Z-A',
  'All articles',
  'Learn basics of PancakeSwap',
  'Learn how',
  'You might also like',
  'Chef’s choice',
  'Recommended Readings by Chefs',
  'Latest News about PancakeSwap and more!',
  'Gaming Announcements',
  'PancakeSwap Gaming Community',
  'Gaming Community',
  'Every Game, Every Chain, One Destination',
  'Build',
  'Games',
  'with',
  'Design Games to Captivate 1.5 Million Potential Players',
  'Build Games with PancakeSwap Now',
  'Bring Your Game to Life on PancakeSwap',
  'Your Complete Developer Infrastructure',
  'Connect with a 1.5 Million Ready-to-Play Community',
  'Join the community and create games with infinite possibilities',
  'Elevate Your Games with Real Utility',
  'Integrate CAKE tokens and NFTs to enrich the gaming experience',
  'Build Games with the most reputable global brand in the industry',
  'Explore Top Blockchains',
  'PancakeSwap operates on 9 popular blockchains, welcoming developers from diverse ecosystems',
  'Maximum Security Assurance',
  'Ensuring maximum protection for your games',
  'Consistent Uptime',
  'Reliable service for your uninterrupted operations',
  'Access Top-Tier Industry and Expertise',
  'Guidance from the leading DEX in the industry',
  'Most User-Friendly UX in DeFi',
  'Elevate your user experiences to new heights',
  'PancakeSwap Gaming Marketplace',
  'Play, Build and Connect on PancakeSwap',
  'Flagship',
  'Published By',
  'Publish Date: %date%',
  'Publisher:',
  'Explore Other Games',
  'trending tags for this game:',
  'Quick Access',
  'NFT marketplace',
  'Buy Squad / Bunnies',
  'Swap Token',
  "Your browser doesn't support iframe",
  'Try it now',
  'This Product is in beta.',
  'Smart contract wallets are currently not supported on Bridge. To continue, please switch back to an EOA (Externally Owned Account) wallet before interacting with the product.',
  ...Object.keys(translations).filter((k) => k.startsWith('twap.')),
]

describe.concurrent('Check translations integrity', () => {
  const scope = ['solana', 'twap']
  const skipEqualTestRegex = new RegExp(`^(${scope.join('|')})\\.[a-z][a-z0-9_]*$`, 'i')
  it.each(allTranslationKeys.filter((key) => !skipEqualTestRegex.test(key)))(
    'Translation key value should be equal',
    (key) => {
      expect(key).toEqual(translations[key])
    },
  )
})

describe('Check translations available', () => {
  const files: string[] = []
  const translationKeys = new Set(allTranslationKeys)

  function throughDirectory(directory, includeJs = false) {
    fs.readdirSync(directory).forEach((file) => {
      const absolute = Path.join(directory, file)
      if (absolute.includes('node_modules')) return null
      if (fs.statSync(absolute).isDirectory()) return throughDirectory(absolute)
      if (
        (absolute.includes('.tsx') || absolute.includes('.ts') || (includeJs && absolute.includes('.js'))) &&
        !absolute.includes('.d.ts')
      ) {
        return files.push(absolute)
      }
      return files.length
    })
  }

  throughDirectory('src/')
  throughDirectory('../../apps/solana')
  throughDirectory('../../apps/aptos')
  throughDirectory('../../apps/bridge')
  throughDirectory('../../packages/uikit/src')
  throughDirectory('../../packages/ui-wallets/src')
  throughDirectory('../../packages/widgets-internal')
  let match: RegExpExecArray | string | null = null

  const extractedFileKeys = new Set<string>()

  const regexWithoutCarriageReturn = /\bt\((["'`])((?:\\1|(?:(?!\1)).)*)(\1)/gm
  const regexWithCarriageReturn = /\bt\([\r\n]\s+(["'`])([^]*?)(\1)/gm

  // eslint-disable-next-line no-restricted-syntax
  for (const file of files) {
    const data = fs.readFileSync(file, { encoding: 'utf8', flag: 'r' })
    while (
      // eslint-disable-next-line no-cond-assign
      (match = regexWithoutCarriageReturn.exec(data)) !== null ||
      // eslint-disable-next-line no-cond-assign
      (match = regexWithCarriageReturn.exec(data)) !== null
    ) {
      if (match[2].trim()) {
        extractedFileKeys.add(match[2])
      }
    }

    const regexWithSearchInput = /<SearchInput ([^']*?) \/>/gm
    const regexWithSearchInputPlaceHolder = /placeholder="([^']*?)"/gm

    while (
      // eslint-disable-next-line no-cond-assign
      (match = regexWithSearchInput.exec(data)) !== null
    ) {
      if (match[1].trim()) {
        const placeHolderMatch = regexWithSearchInputPlaceHolder.exec(match[1])
        if (placeHolderMatch?.[1]) {
          extractedFileKeys.add(placeHolderMatch[1])
        }
      }
    }

    const regexWithTransI18nKey = /i18nKey=(["'`])((?:\1|(?:(?!\1)).)*?)\1/gm

    const regexWithTrans = /<Trans>([^$]*?)<\/Trans>/gm
    const regexWithTransCarriage = /<Trans>([\r\n]\s+([^]*?))<\/Trans>/gm

    while ((match = regexWithTransI18nKey.exec(data)) !== null) {
      if (match[2].trim()) {
        extractedFileKeys.add(match[2].trim())
      }
    }

    while (
      // eslint-disable-next-line no-cond-assign
      (match = regexWithTrans.exec(data)) !== null ||
      // eslint-disable-next-line no-cond-assign
      (match = regexWithTransCarriage.exec(data)) !== null
    ) {
      match = match[1].replace(/\n\s+/g, ' ').trim()
      if (match) {
        extractedFileKeys.add(match)
      }
    }
  }

  const extractedKeys = new Set([...extractedFileKeys, ...whitelist])

  it('Translation key should exist in translations json', () => {
    Array.from(extractedKeys).forEach((key) => {
      if (translationKeys.has(key)) {
        extractedKeys.delete(key)
        translationKeys.delete(key)
      }
    })

    expect(
      extractedKeys.size,
      `Found ${extractedKeys.size} key(s) ${JSON.stringify(
        Array.from(extractedKeys.values()),
        null,
        '\t',
      )} not in translation.json`,
    ).toBe(0)
  })

  it('should use all translation key in translation.json', () => {
    const ignoreReg = new RegExp(/^twap\\./)
    const leftKeys = [...translationKeys]
    leftKeys.forEach((key) => {
      if (ignoreReg.test(key)) {
        translationKeys.delete(key)
      }
    })
    expect(
      translationKeys.size,
      `Found unused ${translationKeys.size} key(s) ${JSON.stringify(
        Array.from(translationKeys.values()),
        null,
        '\t',
      )} in translation.json`,
    ).toBe(0)
  })

  it('should not have keys in whitelist that are actually extracted from code', () => {
    const redundantWhitelistEntries = whitelist.filter((key) => extractedFileKeys.has(key))
    expect(
      redundantWhitelistEntries.length,
      `Found ${
        redundantWhitelistEntries.length
      } key(s) that are both in whitelist and extracted from code: ${JSON.stringify(
        redundantWhitelistEntries,
        null,
        '\t',
      )}. These should be removed from whitelist.`,
    ).toBe(0)
  })
})
