import { Orders, ToastProps, TWAP as PancakeTWAP } from '@orbs-network/twap-ui-pancake'
import { Currency, CurrencyAmount, TradeType } from '@pancakeswap/swap-sdk-core'
import { Button, useMatchBreakpoints, useModal, useToast, useTooltip } from '@pancakeswap/uikit'
import replaceBrowserHistoryMultiple from '@pancakeswap/utils/replaceBrowserHistoryMultiple'
import { useUserSingleHopOnly } from '@pancakeswap/utils/user'
import ConnectWalletButton from 'components/ConnectWalletButton'
import CurrencySearchModal from 'components/SearchModal/CurrencySearchModal'
import { CommonBasesType } from 'components/SearchModal/types'
import { useAllTokens, useCurrency } from 'hooks/Tokens'
import { useActiveChainId } from 'hooks/useActiveChainId'
import { useBestAMMTrade } from 'hooks/useBestAMMTrade'
import { useCurrencyUsdPrice } from 'hooks/useCurrencyUsdPrice'
import useNativeCurrency from 'hooks/useNativeCurrency'
import { useTheme } from 'next-themes'
import { useCallback, useMemo } from 'react'
import { Field } from 'state/swap/actions'
import { useSwapState } from 'state/swap/hooks'
import { useSwapActionHandlers } from 'state/swap/useSwapActionHandlers'

import {
  useUserSplitRouteEnable,
  useUserStableSwapEnable,
  useUserV2SwapEnable,
  useUserV3SwapEnable,
} from 'state/user/smartRouter'
import currencyId from 'utils/currencyId'
import { useAccount } from 'wagmi'
import { Wrapper } from '../components/styleds'
import { SwapTransactionErrorContent } from '../components/SwapTransactionErrorContent'
import useWarningImport from '../hooks/useWarningImport'

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

  const { trade } = useBestAMMTrade({
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
    autoRevalidate: false,
  })

  const inCurrency = useCurrency(fromToken)
  const outCurrency = useCurrency(toToken)

  const loading = useMemo(() => {
    if (!inCurrency || !outCurrency || !trade) return true
    return (
      !trade?.inputAmount.equalTo(amount?.numerator.toString() || '') ||
      !trade.inputAmount.currency.equals(inCurrency) ||
      !trade.outputAmount.currency.equals(outCurrency)
    )
  }, [inCurrency, outCurrency, trade, amount])

  return {
    isLoading: !value ? false : loading,
    outAmount: value ? trade?.outputAmount.numerator.toString() : '0',
  }
}

const useUsd = (address?: string) => {
  const currency = useCurrency(address)
  return useCurrencyUsdPrice(currency).data
}

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

const TransactionErrorContent = ({ onClick, message }: { onClick: () => void; message?: string }) => {
  return <SwapTransactionErrorContent onDismiss={onClick} message={message || ''} openSettingModal={undefined} />
}

const useTwapToast = () => {
  const { toastSuccess, toastWarning, toastError } = useToast()

  return useCallback(
    (props: ToastProps) => {
      const toast = props.variant === 'error' ? toastError : props.variant === 'warning' ? toastWarning : toastSuccess
      toast(props.title, props.message, { duration: props.autoCloseMillis })
    },
    [toastError, toastSuccess, toastWarning],
  )
}

export function TWAPPanel({ limit }: { limit?: boolean }) {
  const { isDesktop } = useMatchBreakpoints()
  const { chainId } = useActiveChainId()
  const tokens = useAllTokens()
  const { connector, address } = useAccount()
  const { resolvedTheme } = useTheme()
  const native = useNativeCurrency()
  const { onCurrencySelection } = useSwapActionHandlers()
  const warningSwapHandler = useWarningImport()
  const toast = useTwapToast()
  const {
    [Field.INPUT]: { currencyId: inputCurrencyId },
    [Field.OUTPUT]: { currencyId: outputCurrencyId },
  } = useSwapState()

  const handleCurrencySelect = useCallback(
    (isInput: boolean, newCurrency?: Currency) => {
      onCurrencySelection(isInput ? Field.INPUT : Field.OUTPUT, newCurrency)
      warningSwapHandler(newCurrency)

      const oldCurrencyId = isInput ? inputCurrencyId : outputCurrencyId
      const otherCurrencyId = isInput ? outputCurrencyId : inputCurrencyId
      const newCurrencyId = newCurrency ? currencyId(newCurrency) : undefined
      replaceBrowserHistoryMultiple({
        ...(newCurrencyId === otherCurrencyId && { [isInput ? 'outputCurrency' : 'inputCurrency']: oldCurrencyId }),
        [isInput ? 'inputCurrency' : 'outputCurrency']: newCurrencyId,
      })
    },
    [onCurrencySelection, warningSwapHandler, inputCurrencyId, outputCurrencyId],
  )

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

  const inputCurrency = useCurrency(inputCurrencyId)
  const outputCurrency = useCurrency(outputCurrencyId)

  return (
    <PancakeTWAP
      ConnectButton={ConnectWalletButton}
      connectedChainId={chainId}
      account={address}
      limit={limit}
      usePriceUSD={useUsd}
      useTrade={useBestTrade}
      dappTokens={tokens}
      isDarkTheme={resolvedTheme === 'dark'}
      srcToken={inputCurrency as any}
      dstToken={outputCurrency as any}
      useTokenModal={useTokenModal}
      onSrcTokenSelected={onSrcTokenSelected}
      onDstTokenSelected={onDstTokenSelected}
      isMobile={!isDesktop}
      nativeToken={native}
      connector={connector}
      useTooltip={useTooltip}
      Button={Button}
      TransactionErrorContent={TransactionErrorContent}
      toast={toast}
    />
  )
}

export const OrderHistory = () => {
  const { isDesktop } = useMatchBreakpoints()

  return (
    <div style={{ maxWidth: 'unset', marginTop: isDesktop ? 0 : 20 }}>
      <Wrapper id="swap-page" style={{ padding: 0 }}>
        <Orders />
      </Wrapper>
    </div>
  )
}
