import { Orders, TWAP as PancakeTWAP } from '@orbs-network/twap-ui-pancake'
import { Currency, CurrencyAmount, TradeType } from '@pancakeswap/swap-sdk-core'
import { ChartDisableIcon, ChartIcon, Flex, IconButton, useMatchBreakpoints, useModal } from '@pancakeswap/uikit'
import replaceBrowserHistory from '@pancakeswap/utils/replaceBrowserHistory'
import { useUserSingleHopOnly } from '@pancakeswap/utils/user'
import { useWeb3React } from '@pancakeswap/wagmi'
import { Swap } from '@pancakeswap/widgets-internal'
import { BodyWrapper } from 'components/App/AppBody'
import ConnectWalletButton from 'components/ConnectWalletButton'
import CurrencySearchModal from 'components/SearchModal/CurrencySearchModal'
import { CommonBasesType } from 'components/SearchModal/types'
import { useAllTokens, useCurrency } from 'hooks/Tokens'
import { useBestAMMTrade } from 'hooks/useBestAMMTrade'
import useNativeCurrency from 'hooks/useNativeCurrency'
import { useStablecoinPrice } from 'hooks/useStablecoinPrice'
import { useTheme } from 'next-themes'
import { useCallback, useContext, useMemo } from 'react'
import { Field } from 'state/swap/actions'
import { useSwapState } from 'state/swap/hooks'
import { useSwapActionHandlers } from 'state/swap/useSwapActionHandlers'
import {
  useUserSplitRouteEnable,
  useUserStableSwapEnable,
  useUserV2SwapEnable,
  useUserV3SwapEnable,
} from 'state/user/smartRouter'
import { styled } from 'styled-components'
import currencyId from 'utils/currencyId'
import { useAccount } from 'wagmi'
import { Wrapper } from './components/styleds'
import useWarningImport from './hooks/useWarningImport'
import { useDerivedBestTradeWithMM } from './MMLinkPools/hooks/useDerivedSwapInfoWithMM'
import { SwapFeaturesContext } from './SwapFeaturesContext'
import { FormContainer } from './V3Swap/components'

const useBestTrade = (fromToken?: string, toToken?: string, value?: string) => {
  const independentCurrency = useCurrency(fromToken)

  const amount = useMemo(() => {
    if (!independentCurrency || !value) return undefined
    if (value !== '0') {
      return CurrencyAmount.fromRawAmount(independentCurrency, BigInt(value))
    }
    return undefined
  }, [independentCurrency, value])

  const dependentCurrency = useCurrency(toToken)
  const [singleHopOnly] = useUserSingleHopOnly()
  const [split] = useUserSplitRouteEnable()
  const [v2Swap] = useUserV2SwapEnable()
  const [v3Swap] = useUserV3SwapEnable()
  const [stableSwap] = useUserStableSwapEnable()

  const { isLoading, trade } = useBestAMMTrade({
    amount,
    currency: dependentCurrency,
    baseCurrency: independentCurrency,
    tradeType: TradeType.EXACT_INPUT,
    maxHops: singleHopOnly ? 1 : undefined,
    maxSplits: split ? undefined : 0,
    v2Swap,
    v3Swap,
    stableSwap,
    type: 'auto',
    trackPerf: true,
  })

  const mm = useDerivedBestTradeWithMM(trade)
  const finalTrade = !value ? undefined : mm.isMMBetter ? mm?.mmTradeInfo?.trade : trade

  return {
    isLoading: !value ? false : isLoading,
    outAmount: value ? finalTrade?.outputAmount.numerator.toString() : '0',
  }
}

const useUsd = (address?: string) => {
  const currency = useCurrency(address)
  const price = useStablecoinPrice(currency)

  return parseFloat(price?.toSignificant() || '0')
}

const ColoredIconButton = styled(IconButton)`
  color: ${({ theme }) => theme.colors.textSubtle};
  overflow: hidden;
`

const useTokenModal = (
  onCurrencySelect: (value: Currency) => void,
  selectedCurrency?: Currency,
  otherSelectedCurrency?: Currency,
) => {
  const [onPresentCurrencyModal] = useModal(
    <CurrencySearchModal
      onCurrencySelect={onCurrencySelect}
      selectedCurrency={selectedCurrency}
      otherSelectedCurrency={otherSelectedCurrency}
      showCommonBases
      commonBasesType={CommonBasesType.SWAP_LIMITORDER}
      showSearchInput
      mode="swap-currency-input"
    />,
  )

  return onPresentCurrencyModal
}

export function TWAPPanel({ limit }: { limit?: boolean }) {
  const { isDesktop } = useMatchBreakpoints()
  const { account, chainId } = useWeb3React()
  const tokens = useAllTokens()
  const { connector } = useAccount()
  const { resolvedTheme } = useTheme()

  const {
    [Field.INPUT]: { currencyId: inputCurrencyId },
    [Field.OUTPUT]: { currencyId: outputCurrencyId },
  } = useSwapState()
  const { onCurrencySelection } = useSwapActionHandlers()
  const warningSwapHandler = useWarningImport()
  const native = useNativeCurrency()

  const handleCurrencySelect = useCallback(
    (isInput: boolean, newCurrency: Currency) => {
      onCurrencySelection(isInput ? Field.INPUT : Field.OUTPUT, newCurrency)
      warningSwapHandler(newCurrency)

      const oldCurrencyId = isInput ? inputCurrencyId : outputCurrencyId
      const otherCurrencyId = isInput ? outputCurrencyId : inputCurrencyId
      const newCurrencyId = currencyId(newCurrency)
      if (newCurrencyId === otherCurrencyId) {
        replaceBrowserHistory(isInput ? 'outputCurrency' : 'inputCurrency', oldCurrencyId)
      }
      replaceBrowserHistory(isInput ? 'inputCurrency' : 'outputCurrency', newCurrencyId)
    },
    [onCurrencySelection, warningSwapHandler, inputCurrencyId, outputCurrencyId],
  )

  const { isChartSupported, isChartDisplayed, setIsChartDisplayed } = useContext(SwapFeaturesContext)

  const toggleChartDisplayed = () => {
    setIsChartDisplayed?.((currentIsChartDisplayed) => !currentIsChartDisplayed)
  }

  const onSrcTokenSelected = useCallback(
    (token: Currency) => {
      handleCurrencySelect(true, token)
    },
    [handleCurrencySelect],
  )

  const onDstTokenSelected = useCallback(
    (token: Currency) => {
      handleCurrencySelect(false, token)
    },
    [handleCurrencySelect],
  )

  return (
    <>
      <div>
        <Swap.CurrencyInputHeader
          title={
            <Flex alignItems="center" width="100%" justifyContent="space-between">
              <Swap.CurrencyInputHeaderTitle>{limit ? 'LIMIT' : 'TWAP'}</Swap.CurrencyInputHeaderTitle>
              {isChartSupported && (
                <ColoredIconButton
                  onClick={() => {
                    toggleChartDisplayed()
                  }}
                  variant="text"
                  scale="sm"
                  data-dd-action-name="Price chart button"
                >
                  {isChartDisplayed ? (
                    <ChartDisableIcon color="textSubtle" />
                  ) : (
                    <ChartIcon width="24px" color="textSubtle" />
                  )}
                </ColoredIconButton>
              )}
            </Flex>
          }
          subtitle={<></>}
        />
      </div>

      <FormContainer>
        <PancakeTWAP
          ConnectButton={ConnectWalletButton}
          connectedChainId={chainId}
          account={account}
          limit={limit}
          usePriceUSD={useUsd}
          useTrade={useBestTrade}
          dappTokens={tokens}
          isDarkTheme={resolvedTheme === 'dark'}
          srcToken={inputCurrencyId}
          dstToken={outputCurrencyId}
          useTokenModal={useTokenModal}
          onSrcTokenSelected={onSrcTokenSelected}
          onDstTokenSelected={onDstTokenSelected}
          ordersId={!isDesktop ? 'twap-order-history-mobile' : undefined}
          nativeToken={native}
          connector={connector}
        />
      </FormContainer>
    </>
  )
}

export const OrderHistory = () => {
  const { isDesktop } = useMatchBreakpoints()

  return (
    <BodyWrapper style={{ maxWidth: 'unset', marginTop: isDesktop ? 0 : 20 }}>
      <Wrapper id="swap-page" style={{ padding: 0 }}>
        <Orders />{' '}
      </Wrapper>
    </BodyWrapper>
  )
}

export const TWAP_SUPPORTED_CHAINS = [56]

export const isTwapSupported = (chainId?: number) => {
  return TWAP_SUPPORTED_CHAINS.includes(chainId || 0)
}
