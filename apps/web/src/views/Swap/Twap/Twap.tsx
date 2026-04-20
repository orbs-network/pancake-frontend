import { SpotProvider, Module, Partners, Order, OnCancelOrderSuccess } from '@orbs-network/spot-react'
import { Flex, Text, useToast } from '@pancakeswap/uikit'
import { SwapUIV2 } from '@pancakeswap/widgets-internal'
import { useUnifiedCurrency } from 'hooks/Tokens'
import { useActiveChainId } from 'hooks/useActiveChainId'
import { QuoteProvider } from 'quoter/QuoteProvider'

import { useCallback, useMemo, useState } from 'react'
import { Field } from 'state/swap/actions'
import { useDefaultsFromURLSearch, useSwapState } from 'state/swap/hooks'
import { useAccount, useWalletClient } from 'wagmi'
import { useRouter } from 'next/router'

import useWarningImport from '../hooks/useWarningImport'

import { useAllTypeBestTrade } from 'quoter/hook/useAllTypeBestTrade'
import { useUnifiedCurrencyBalance } from 'hooks/useUnifiedCurrencyBalance'
import { twapHooks } from './hooks'
import { TwapOrdersPortal } from './Orders/Orders'
import { SubmitOrderModal } from './SubmitOrderModal/SubmitOrderModal'
import { InterfaceOrder } from '../utils'
import { PriceProtection, useUserPriceProtection } from './PriceProtection'
import {
  ModuleTabs,
  TokenInputsSection,
  PriceConfigSection,
  DurationSection,
  TradeSizeSection,
  TradeIntervalSection,
  TradeDetails,
  OrderDisclaimer,
  TwapPoweredBy,
} from './FormSections'
import { FormContainer } from 'views/SwapSimplify/InfinitySwap/FormContainer'
import { twapUtils } from './utils'
import { ToastDescriptionWithTx } from 'components/Toast'
import { useTranslation } from '@pancakeswap/localization'

const FEES = 0.25

// ============ Hooks (reused from existing integration) ============

const useCallbacks = () => {
  const { toastSuccess } = useToast()
  const { t } = useTranslation()
  const getOrderTitle = twapHooks.useOrderTitleCallback()
  const onOrderFilled = useCallback(
    (order: Order) => {
      const title = getOrderTitle(order.type)
      toastSuccess(t('Order Executed'), <Text as="p">{t('Your %title% order has been executed', { title })}</Text>)
    },
    [t, toastSuccess, getOrderTitle],
  )

  const onCancelOrderSuccess = useCallback(
    (props: OnCancelOrderSuccess) => {
      const title = getOrderTitle(props.order.type)
      toastSuccess(t('%title% Order Cancelled', { title }), <ToastDescriptionWithTx txHash={props.txHash} />)
    },
    [t, toastSuccess, getOrderTitle],
  )

  return {
    onOrderFilled,
    onCancelOrderSuccess,
  }
}

const useMarketReferencePrice = (order: InterfaceOrder | null) => {
  const { typedValue } = useSwapState()
  const { tradeLoaded } = useAllTypeBestTrade()

  const marketReferencePrice = useMemo(() => {
    return {
      value: !typedValue ? '' : order?.trade?.outputAmount?.numerator.toString(),
      isLoading: typedValue !== '' && !tradeLoaded,
    }
  }, [order, typedValue, tradeLoaded])
  return marketReferencePrice
}

const useModuleFromQuery = (moduleProp?: Module) => {
  const router = useRouter()
  return useMemo(() => {
    if (moduleProp !== undefined) return moduleProp
    const tab = router.query.module as string | undefined
    if (tab === 'limit') return Module.LIMIT
    if (tab === 'stop-loss') return Module.STOP_LOSS
    if (tab === 'take-profit') return Module.TAKE_PROFIT
    return Module.TWAP
  }, [router.query.module])
}

export function TWAPPanel({ module: moduleProp }: { module?: Module }) {
  const { chainId } = useActiveChainId()
  const { address } = useAccount()
  const { bestOrder } = useAllTypeBestTrade()
  const [acceptedOrder, setAcceptedOrder] = useState<InterfaceOrder | null>(null)

  // Module from query param or prop
  const module = useModuleFromQuery(moduleProp)
  const { priceProtection } = useUserPriceProtection()

  const {
    [Field.INPUT]: { currencyId: inputCurrencyId, chainId: inputChainId },
    [Field.OUTPUT]: { currencyId: outputCurrencyId, chainId: outputChainId },
    typedValue = '',
  } = useSwapState()

  const loadedUrlParams = useDefaultsFromURLSearch()
  useWarningImport()

  const inputCurrency = useUnifiedCurrency(inputCurrencyId, inputChainId)
  const outputCurrency = useUnifiedCurrency(outputCurrencyId, outputChainId)

  const srcToken = useMemo(() => twapUtils.parseUnifiedToken(inputCurrency), [inputCurrency])
  const dstToken = useMemo(() => twapUtils.parseUnifiedToken(outputCurrency), [outputCurrency])

  const srcBalance = useUnifiedCurrencyBalance(inputCurrency)
  const dstBalance = useUnifiedCurrencyBalance(outputCurrency)

  const srcUsd = twapHooks.useUsdPrice(inputCurrencyId)
  const dstUsd = twapHooks.useUsdPrice(outputCurrencyId)

  const order = useMemo(() => acceptedOrder ?? bestOrder, [acceptedOrder, bestOrder])
  const marketReferencePrice = useMarketReferencePrice(order ?? null)
  const minChunkSizeUsd = twapHooks.useMinChunksSizeUsd()
  const callbacks = useCallbacks()
  const walletInteractions = twapHooks.useWalletInteractions()

  return (
    <QuoteProvider>
      <SpotProvider
        partner={Partners.Pancake}
        module={module}
        chainId={chainId}
        account={address}
        walletInteractions={walletInteractions}
        typedInputAmount={typedValue}
        marketReferencePrice={marketReferencePrice}
        srcToken={srcToken}
        dstToken={dstToken}
        srcBalance={srcBalance?.numerator.toString()}
        dstBalance={dstBalance?.numerator.toString()}
        srcUsd1Token={srcUsd?.toString()}
        dstUsd1Token={dstUsd?.toString()}
        priceProtection={priceProtection / 100}
        minChunkSizeUsd={minChunkSizeUsd}
        fees={FEES}
        callbacks={callbacks}
      >
        <SwapUIV2.SwapFormWrapper>
          <SwapUIV2.SwapTabAndInputPanelWrapper>
            <FormContainer>
              <ModuleTabs module={module} />
              <TokenInputsSection currencyLoading={!loadedUrlParams} />
            </FormContainer>
          </SwapUIV2.SwapTabAndInputPanelWrapper>
          <FormContainer>
            <PriceConfigSection module={module} />
          </FormContainer>

          <FormContainer>
            {module !== Module.TWAP && <DurationSection />}
            {module === Module.TWAP && <TradeSizeSection />}
            {module === Module.TWAP && <TradeIntervalSection />}
          </FormContainer>
          <FormContainer>
            <Flex flexDirection="column" style={{ gap: '8px' }}>
              <PriceProtection />
              <SubmitOrderModal
                setAcceptedOrder={setAcceptedOrder}
                bestOrder={bestOrder ?? null}
                acceptedOrder={acceptedOrder ?? null}
              />
              {order && <TradeDetails outputCurrency={outputCurrency} />}
            </Flex>
          </FormContainer>
          <OrderDisclaimer />
          <TwapPoweredBy />
        </SwapUIV2.SwapFormWrapper>
        <TwapOrdersPortal />
      </SpotProvider>
    </QuoteProvider>
  )
}
