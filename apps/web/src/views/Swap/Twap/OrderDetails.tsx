import { Flex, FlexGap, QuestionHelperV2, SwapHorizIcon, Text } from '@pancakeswap/uikit'
import { RowFixed } from 'components/Layout/Row'
import React, { ReactNode, useMemo, useState } from 'react'
import { styled } from 'styled-components'
import { DetailsTitle } from 'views/SwapSimplify/InfinitySwap/AdvancedSwapDetails'
import { twapHooks } from './hooks'
import { useTranslation } from '@pancakeswap/localization'
import { CurrencyAmount, Currency, UnifiedCurrency } from '@pancakeswap/swap-sdk-core'
import tryParseAmount from '@pancakeswap/utils/tryParseAmount'
import { formatAmount } from '@pancakeswap/utils/formatFractions'
import { formatNumber } from '@pancakeswap/utils/formatBalance'

import BigNumber from 'bignumber.js'
import { useSpot } from '@orbs-network/spot-react'
import { useAllTypeBestTrade } from 'quoter/hook/useAllTypeBestTrade'
import { useActiveChainId } from 'hooks/useAccountActiveChain'
import { RefreshButton } from 'views/SwapSimplify/InfinitySwap/RefreshButton'

const OrderDetailRow = styled(Flex)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
  width: 100%;
`

const RowItemValue = styled(Text)`
  font-size: 14px;
`

type RowItemProps = {
  tooltip?: string
  label: string
  children: ReactNode
}

export const PriceRow = ({
  amountRaw,
  currencyAmount,
  inputCurrency,
  outputCurrency,
}: {
  amountRaw?: string
  currencyAmount?: CurrencyAmount<Currency>
  inputCurrency?: UnifiedCurrency
  outputCurrency?: UnifiedCurrency
}) => {
  const [inverted, setInverted] = useState(false)
  const { amount: amountRawAmount } = twapHooks.useParseCurrencyAmountRaw(amountRaw, outputCurrency)
  const amount = currencyAmount ?? amountRawAmount

  const leftCurrency = inverted ? outputCurrency : inputCurrency
  const rightCurrency = inverted ? inputCurrency : outputCurrency

  const price = useMemo(() => {
    if (!amount || !inputCurrency || !outputCurrency) return '0'
    const invertedAmount = tryParseAmount(
      new BigNumber(1).div(amount.toSignificant(outputCurrency.decimals)).toFixed(),
      outputCurrency,
    ) as CurrencyAmount<Currency>
    return formatAmount(inverted ? invertedAmount : amount, 5)
  }, [amount, inverted, inputCurrency, outputCurrency])

  return (
    <FlexGap justifyContent="center" alignItems="center">
      <>1 {leftCurrency?.symbol}</>
      <SwapHorizIcon
        onClick={() => setInverted(!inverted)}
        style={{ cursor: 'pointer' }}
        width="18px"
        height="18px"
        color="primary"
        ml="4px"
        mr="4px"
      />
      <>
        {price} {rightCurrency?.symbol}
      </>
    </FlexGap>
  )
}

const RowItem = ({ tooltip, label, children }: RowItemProps) => {
  return (
    <OrderDetailRow>
      {tooltip ? (
        <RowFixed>
          <QuestionHelperV2 text={<Text>{tooltip}</Text>} placement="top">
            <DetailsTitle>{label}</DetailsTitle>
          </QuestionHelperV2>
        </RowFixed>
      ) : (
        <Text fontSize="14px" color="textSubtle">
          {label}
        </Text>
      )}

      {children}
    </OrderDetailRow>
  )
}

const MinReceivedRow = ({
  rawValue,
  outputCurrency,
  tradesAmount,
}: {
  rawValue: string
  outputCurrency?: UnifiedCurrency
  tradesAmount: number
}) => {
  const { formatted: minReceived } = twapHooks.useParseCurrencyAmountRaw(rawValue, outputCurrency)
  const { t } = useTranslation()

  return (
    <RowItem
      tooltip="This is the minimum number of tokens that may be received. NOTE: This minimum only refers to executed trades. Some trades may not be executed if the limit price is higher than the available market prices and your order may only be partially filled."
      label={tradesAmount === 1 ? t('Minimum received') : t('Minimum received per trade')}
    >
      <RowItemValue>
        {minReceived} {outputCurrency?.symbol}
      </RowItemValue>
    </RowItem>
  )
}

const InputSizePerTradeRow = ({ rawValue, inputCurrency }: { rawValue: string; inputCurrency?: UnifiedCurrency }) => {
  const { t } = useTranslation()
  const { formatted: srcAmountPerTrade } = twapHooks.useParseCurrencyAmountRaw(rawValue, inputCurrency)

  return (
    <RowItem
      tooltip={t(
        'The number of input tokens that will be removed from your balance and swapped for the output token in each individual trade.',
      )}
      label={t('Size Per Trade')}
    >
      <RowItemValue>
        {srcAmountPerTrade ?? '0'} {inputCurrency?.symbol}
      </RowItemValue>
    </RowItem>
  )
}

const TradesAmountRow = ({ tradesAmount }: { tradesAmount: number }) => {
  const { t } = useTranslation()

  return (
    <RowItem
      tooltip={t(
        'The total number of individual trades that will be scheduled as part of your order. Note that in limit orders, not all trades that are scheduled will be executed.',
      )}
      label={t('No. of trades')}
    >
      <RowItemValue>{tradesAmount}</RowItemValue>
    </RowItem>
  )
}

const LimitPriceRow = ({
  limitPrice,
  inputCurrency,
  outputCurrency,
}: {
  limitPrice?: string
  inputCurrency?: UnifiedCurrency
  outputCurrency?: UnifiedCurrency
}) => {
  const { t } = useTranslation()

  return (
    <RowItem
      label={t('Limit Price')}
      tooltip={t(
        'Trades will only execute if the available market price is better than the limit price, potentially resulting in partial fills or orders remaining unfilled upon expiration.',
      )}
    >
      <RowItemValue>
        <PriceRow
          amountRaw={limitPrice}
          inputCurrency={inputCurrency ?? undefined}
          outputCurrency={outputCurrency ?? undefined}
        />
      </RowItemValue>
    </RowItem>
  )
}

const TriggerPriceRow = ({
  triggerPrice,
  inputCurrency,
  outputCurrency,
}: {
  triggerPrice: string
  inputCurrency?: UnifiedCurrency
  outputCurrency?: UnifiedCurrency
}) => {
  const { t } = useTranslation()

  return (
    <RowItem
      label={t('Trigger Price')}
      tooltip={t(
        'The price at which the order will be executed. If the market price is higher than the trigger price, the order will be executed at the market price.',
      )}
    >
      <RowItemValue>
        <PriceRow
          amountRaw={triggerPrice}
          inputCurrency={inputCurrency ?? undefined}
          outputCurrency={outputCurrency ?? undefined}
        />
      </RowItemValue>
    </RowItem>
  )
}

const TradeIntervalRow = ({ fillDelayMs }: { fillDelayMs: number }) => {
  const { t } = useTranslation()
  const intervalLabel = twapHooks.useFormatMillisecondsToTimeCallback()

  return (
    <RowItem
      label={t('Trade Interval')}
      tooltip={t(
        'The estimated time that will elapse between each trade in your order. Note that as this time includes an allowance of two minutes for bidder auction and block settlement, which cannot be predicted exactly, actual time may vary.',
      )}
    >
      <RowItemValue>{intervalLabel(fillDelayMs)}</RowItemValue>
    </RowItem>
  )
}

const ExpirationRow = ({ deadlineMs }: { deadlineMs: number }) => {
  const { t } = useTranslation()

  const deadlineStr = twapHooks.useFormattedDate(deadlineMs)
  return (
    <RowItem
      label={t('Expiration')}
      tooltip={t(
        'This is the date and time marking the end of the period which you have selected for your order to be executed.',
      )}
    >
      <RowItemValue>{deadlineStr}</RowItemValue>
    </RowItem>
  )
}

const FeeRow = ({ usdValue }: { usdValue: string }) => {
  const { t } = useTranslation()
  return (
    <RowItem label={t('Fee')}>
      <RowItemValue>${formatNumber(Number(usdValue ?? 0), 2)} USD</RowItemValue>
    </RowItem>
  )
}

export const OrderPricing = ({
  inputCurrency,
  outputCurrency,
}: {
  inputCurrency?: UnifiedCurrency
  outputCurrency?: UnifiedCurrency
}) => {
  const { refreshOrder, tradeLoaded, refreshDisabled } = useAllTypeBestTrade()
  const { valueWei } = useSpot().dstTokenPanel

  const { chainId: activeChianId } = useActiveChainId()

  const { amount } = twapHooks.useParseCurrencyAmountRaw(valueWei, outputCurrency)

  if (!amount) return null

  return (
    <Flex alignItems="center" style={{ gap: '8px' }}>
      <RefreshButton
        onRefresh={refreshOrder}
        refreshDisabled={refreshDisabled}
        chainId={activeChianId}
        loading={!tradeLoaded}
      />
      <PriceRow currencyAmount={amount} inputCurrency={inputCurrency} outputCurrency={outputCurrency} />
    </Flex>
  )
}

export const OrderDetails = {
  MinReceivedRow,
  InputSizePerTradeRow,
  TradesAmountRow,
  RowItem,
  PriceRow,
  LimitPriceRow,
  TriggerPriceRow,
  TradeIntervalRow,
  ExpirationRow,
  FeeRow,
  OrderPricing,
}
