import { useTranslation } from '@pancakeswap/localization'
import { AutoColumn, Box, Button, Flex, InfoIcon, WarningIcon } from '@pancakeswap/uikit'
import { AutoRow } from 'components/Layout/Row'
import { useGasToken } from 'hooks/useGasToken'
import { memo, useMemo } from 'react'
import { styled } from 'styled-components'

import { paymasterInfo } from 'config/paymaster'
import { usePaymaster } from 'hooks/usePaymaster'
import { isAddressEqual } from 'utils'
import { SwapCallbackError } from '../../components/styleds'
import { useTwapSubmitModalContext } from './context'
import { InlineMarkdown } from '../TwapMarkdown'
import { PriceProtection } from '../PriceProtection'
import { useSpot } from '@orbs-network/spot-react'
import { OrderDetails } from '../OrderDetails'
import { twapHooks } from '../hooks'

const SwapModalFooterContainer = styled(AutoColumn)`
  margin-top: 12px;
  padding: 16px;
  border-radius: ${({ theme }) => theme.radii.default};
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  background-color: ${({ theme }) => theme.colors.background};
  gap: 8px;
`

const SameTokenWarningBox = styled(Box)`
  font-size: 13px;
  background-color: #ffb2371a;
  padding: 10px;
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.yellow};
  border: 1px solid ${({ theme }) => theme.colors.yellow};
  border-radius: ${({ theme }) => theme.radii['12px']};
`

const DisclaimerContainer = styled(AutoRow)`
  padding: 16px 0px;
  padding-right: 4px;
  border-radius: ${({ theme }) => theme.radii.default};
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  background-color: ${({ theme }) => theme.colors.backgroundAlt3};
  margin-top: 20px;

  display: flex;
`

const DisclaimerContainerInner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  overflow-y: auto;
  height: 120px;
  padding: 0px 16px;
  svg {
    align-self: unset;
    position: relative;
    top: 2px;
    color: ${({ theme }) => theme.colors.textSubtle};
    width: 20px;
    height: 20px;
  }
`

const StyledWarningIcon = styled(WarningIcon)`
  fill: ${({ theme }) => theme.colors.yellow};
`

const OrderPrice = () => {
  const { derivedFormData } = useSpot()
  const { inputCurrency, outputCurrency } = useTwapSubmitModalContext()
  const { t } = useTranslation()

  const value = derivedFormData.isMarketOrder ? derivedFormData.marketPrice : derivedFormData.limitPrice

  return (
    <OrderDetails.RowItem label={t('Price')}>
      <OrderDetails.PriceRow amountRaw={value} inputCurrency={inputCurrency} outputCurrency={outputCurrency} />
    </OrderDetails.RowItem>
  )
}

const TriggerPrice = () => {
  const { derivedFormData } = useSpot()
  const { inputCurrency, outputCurrency } = useTwapSubmitModalContext()

  if (!derivedFormData.isTriggerPrice) return null

  return (
    <OrderDetails.TriggerPriceRow
      inputCurrency={inputCurrency}
      outputCurrency={outputCurrency}
      triggerPrice={derivedFormData.triggerPrice}
    />
  )
}

const MinimumReceived = () => {
  const { outputCurrency } = useTwapSubmitModalContext()
  const { derivedFormData } = useSpot()

  if (derivedFormData.isMarketOrder) return null

  return (
    <OrderDetails.MinReceivedRow
      tradesAmount={derivedFormData.totalTrades}
      rawValue={derivedFormData.minDestAmountPerTrade}
      outputCurrency={outputCurrency}
    />
  )
}

const Fee = () => {
  const { derivedFormData } = useSpot()

  return <OrderDetails.FeeRow usdValue={derivedFormData.feesUsd} />
}

const TradesAmount = () => {
  const { derivedFormData } = useSpot()

  if (derivedFormData.totalTrades === 1) return null

  return <OrderDetails.TradesAmountRow tradesAmount={derivedFormData.totalTrades} />
}

const AmountPerTrade = () => {
  const { inputCurrency } = useTwapSubmitModalContext()
  const { derivedFormData } = useSpot()

  if (derivedFormData.totalTrades === 1) return null

  return <OrderDetails.InputSizePerTradeRow rawValue={derivedFormData.sizePerTrade} inputCurrency={inputCurrency} />
}

const Expiration = () => {
  const { derivedFormData } = useSpot()

  return <OrderDetails.ExpirationRow deadlineMs={derivedFormData.deadline} />
}

const TradeInterval = () => {
  const { derivedFormData } = useSpot()

  if (derivedFormData.totalTrades === 1) return null

  return <OrderDetails.TradeIntervalRow fillDelayMs={derivedFormData.tradeInterval} />
}

const PlaceOrderButton = () => {
  const { t } = useTranslation()
  const { inputError } = useSpot()
  const { swapErrorMessage, isEnoughInputBalance, onSubmit, swapButtonLoading } = useTwapSubmitModalContext()
  return (
    <AutoRow>
      <Button
        variant={inputError ? 'danger' : 'primary'}
        onClick={onSubmit}
        disabled={!!inputError || swapButtonLoading}
        mt="12px"
        id="confirm-swap-or-send"
        width="100%"
        isLoading={swapButtonLoading}
      >
        {swapButtonLoading
          ? t('Submitting Order')
          : !isEnoughInputBalance
          ? t('Submit Order Anyway')
          : t('Submit Order')}
      </Button>

      {swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null}
    </AutoRow>
  )
}

const SameTokenWarning = () => {
  const { inputAmount } = useTwapSubmitModalContext()

  const { t } = useTranslation()

  const [gasToken] = useGasToken()
  const { isPaymasterAvailable, isPaymasterTokenActive } = usePaymaster()
  const gasTokenInfo = paymasterInfo[gasToken.isToken ? gasToken?.wrapped.address : '']

  const showSameTokenWarning = useMemo(
    () =>
      isPaymasterAvailable &&
      isPaymasterTokenActive &&
      gasTokenInfo?.discount !== 'FREE' &&
      inputAmount.currency?.wrapped.address &&
      !inputAmount.currency.isNative &&
      gasToken.isToken &&
      isAddressEqual(inputAmount.currency.wrapped.address, gasToken.wrapped.address),
    [inputAmount, gasToken, isPaymasterAvailable, isPaymasterTokenActive, gasTokenInfo],
  )

  return showSameTokenWarning ? (
    <SameTokenWarningBox>
      <Flex>
        <StyledWarningIcon marginRight={2} />
        <span>
          {t(
            'Please ensure you leave enough tokens for gas fees when selecting the same token for gas as the input token',
          )}
        </span>
      </Flex>
    </SameTokenWarningBox>
  ) : null
}

const Disclaimer = () => {
  const { t } = useTranslation()
  return (
    <DisclaimerContainer>
      <DisclaimerContainerInner>
        <InfoIcon />
        <InlineMarkdown fontSize="14px" style={{ flex: 1 }}>
          {t(
            'Orders are executed in smaller trades over a specified period of time and are subject to market conditions and other risks. \n\n Your trade may be executed at a price that is significantly different from the current market price (although not below your limit price), which could result in significant losses. If the available market price is lower than the limit price you have set, some of the trades of your order may not be executed, resulting in a partially filled order. \n\n The trades are based on a decentralized TWAP protocol that utilizes off-chain takers which compete to fill orders. These takers are entitled to request a fee, which the protocol removes for the winning taker from the output tokens. Accordingly, the amount of output tokens you will receive may vary in accordance with taker behavior. \n\n Takers may take into account gas fees for your transactions when setting their fees, which may result in fluctuations in the fee amounts. \n\n Note that the protocol has been designed such that the presence of one honest taker (i.e, a taker who charges only reimbursement for gas fees) should result in an output amount that is as close as possible to spot market prices. PancakeSwap and Orbs have implemented automated, decentralized “honest takers”, however, these features are in beta and their use is subject to risk. \n\n   This order will be executed using a decentralized protocol that is in beta and its use is at your own risk. \n\n You can read more about the [TWAP protocol](https://github.com/orbs-network/twap). \n\n Use of this feature is subject to the [terms and conditions](https://github.com/orbs-network/twap/blob/master/TOS.md) set forth.',
          )}
        </InlineMarkdown>
      </DisclaimerContainerInner>
    </DisclaimerContainer>
  )
}

export const TwapSwapModalFooterV2 = memo(function TwapSwapModalFooterV2() {
  return (
    <>
      <SwapModalFooterContainer>
        <OrderPrice />
        <Expiration />
        <TriggerPrice />
        <TradesAmount />
        <AmountPerTrade />
        <PriceProtection />
        <MinimumReceived />
        <TradeInterval />
        <Fee />
      </SwapModalFooterContainer>
      <SameTokenWarning />
      <Disclaimer />
      <PlaceOrderButton />
    </>
  )
})
