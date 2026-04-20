import {
  Module,
  TimeUnit,
  Token,
  InputErrors,
  InputError,
  useSpot,
  ORBS_WEBSITE_URL,
  ORBS_LOGO,
  Disclaimer,
  ORBS_TWAP_FAQ_URL,
} from '@orbs-network/spot-react'
import { useTranslation } from '@pancakeswap/localization'
import { Percent } from '@pancakeswap/sdk'
import { Currency, UnifiedCurrency } from '@pancakeswap/swap-sdk-core'
import {
  ArrowUpDownIcon,
  Box,
  ButtonMenu,
  ButtonMenuItem,
  Flex,
  InfoIcon,
  Link,
  Select,
  Skeleton,
  Slider,
  Text,
  Toggle,
  WarningIcon,
  useMatchBreakpoints,
  useTooltip,
} from '@pancakeswap/uikit'
import { NumericalInput, PoweredBy } from '@pancakeswap/widgets-internal'
import replaceBrowserHistoryMultiple from '@pancakeswap/utils/replaceBrowserHistoryMultiple'
import { formatNumber } from '@pancakeswap/utils/formatBalance'
import CurrencyInputPanelSimplify from 'components/CurrencyInputPanelSimplify'
import { CommonBasesType } from 'components/SearchModal/types'
import { useSwitchNetwork } from 'hooks/useSwitchNetwork'
import { useRouter } from 'next/router'
import { Suspense, useCallback, useMemo } from 'react'
import { Field } from 'state/swap/actions'
import { useSwapState } from 'state/swap/hooks'
import { useSwapActionHandlers } from 'state/swap/useSwapActionHandlers'
import { useCurrencyBalance } from 'state/wallet/hooks'
import { styled } from 'styled-components'
import { maxAmountSpend } from 'utils/maxAmountSpend'
import { useAccount } from 'wagmi'
import { UnsafeCurrency } from 'config/constants/types'
import { handleCurrencySelectFn } from '../../SwapSimplify/InfinitySwap/FormMainInfinity'
import { FlipButton } from 'views/SwapSimplify/InfinitySwap/FlipButton'
import {
  PanelCard,
  PanelCardFocus,
  MediumInput,
  LabelWithTooltip,
  ResetButton,
  PricePill,
  PercentPill,
  PriceConfigSectionWrapper,
} from './styles'
import { twapHooks } from './hooks'
import { OrderDetails } from './OrderDetails'
import { FormContainer } from 'views/SwapSimplify/InfinitySwap/FormContainer'

// ─── Constants ───────────────────────────────────────────────────

const useTimeUnitOptions = () => {
  const { t } = useTranslation()
  return useMemo(
    () => [
      { value: TimeUnit.Minutes, label: t('Minutes') },
      { value: TimeUnit.Hours, label: t('Hours') },
      { value: TimeUnit.Days, label: t('Days') },
      { value: TimeUnit.Weeks, label: t('Weeks') },
    ],
    [t],
  )
}

// ─── Slider styled components ────────────────────────────────────

const SliderWrapper = styled(Box)`
  position: relative;

  /* BunnySlider > BarProgress */
  > div > div:nth-child(2) > div:nth-child(2) {
    border-radius: 0px;
  }
  /* BunnySlider > BarBackground */
  > div > div:nth-child(2) > div:nth-child(1) {
    background: rgb(85, 73, 110);
    top: 20px !important;
  }

  /* BunnyButt */
  > div > div:nth-child(1),
  /* BunnySlider */
  > div > div:nth-child(2) {
    z-index: 40;
  }
`

const SliderDots = styled(Flex)`
  position: absolute;
  top: 18px;
  width: 100%;
  left: 14px;
  left: 0;
  justify-content: space-between;
  pointer-events: none;
  padding: 0px;
  z-index: 1;
`

const SliderDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(85, 73, 110);
  flex-shrink: 0;
  transform: translateY(-1px);
`

// ─── Error handling ──────────────────────────────────────────────

const useParseErrorMessage = (error?: InputError) => {
  const { t } = useTranslation()
  const formatMillisecondsToTime = twapHooks.useFormatMillisecondsToTimeCallback()

  return useMemo(() => {
    switch (error?.type) {
      case InputErrors.MIN_CHUNKS:
        return t('Minimum number of trades is %min%', { min: 1 })
      case InputErrors.MAX_CHUNKS:
        return t('Maximum number of trades is %max%', { max: error.value })
      case InputErrors.MIN_TRADE_SIZE:
        return t('Minimum Trade Size is %size% USD', { size: error.value })
      case InputErrors.MIN_FILL_DELAY:
        return t('Minimum Trade Interval is %interval%', { interval: formatMillisecondsToTime(Number(error.value)) })
      case InputErrors.MAX_FILL_DELAY:
        return t('Maximum Trade Interval is %interval%', { interval: formatMillisecondsToTime(Number(error.value)) })
      case InputErrors.MAX_ORDER_DURATION:
        return t('Maximum Order Duration is %duration%', { duration: formatMillisecondsToTime(Number(error.value)) })
      case InputErrors.MIN_ORDER_DURATION:
        return t('Minimum Order Duration is %duration%', { duration: formatMillisecondsToTime(Number(error.value)) })
      default:
        return undefined
    }
  }, [error?.type, error?.value, t])
}

const ErrorMessage = ({ error }: { error?: InputError }) => {
  const errorMsg = useParseErrorMessage(error)
  if (!errorMsg) return null
  return (
    <Flex alignItems="start" style={{ gap: 4 }}>
      <WarningIcon width="16px" color="failure" style={{ verticalAlign: 'middle', display: 'inline' }} />
      <Text fontSize="13px" color="failure" style={{ flex: 1 }}>
        {errorMsg}
      </Text>
    </Flex>
  )
}

// ─── Module Tabs ─────────────────────────────────────────────────

const TabWithTooltip = ({
  label,
  tooltipText,
  ...props
}: { label: string; tooltipText: string } & Record<string, any>) => {
  const { targetRef, tooltip, tooltipVisible } = useTooltip(<Text>{tooltipText}</Text>, { placement: 'top' })
  return (
    <ButtonMenuItem ref={targetRef} style={{ fontSize: '14px' }} {...props}>
      {label}
      {tooltipVisible && tooltip}
    </ButtonMenuItem>
  )
}

export const ModuleTabs = ({ module }: { module: Module }) => {
  const router = useRouter()
  const { t } = useTranslation()
  const { isMobile } = useMatchBreakpoints()
  const modules = [Module.TWAP, Module.LIMIT, Module.STOP_LOSS, Module.TAKE_PROFIT]
  const labels = [t('TWAP'), t('Limit'), t('Stop-Loss'), t('Take-Profit')]
  const tooltips = [
    t(
      'TWAP (Time-Weighted Average Price) splits large orders into smaller trades over time to minimize market impact.',
    ),
    t('Set a target price and your order will execute when the market reaches it.'),
    t('Automatically sell when the price drops to a specified level to limit losses.'),
    t('Automatically sell when the price rises to a specified level to lock in profits.'),
  ]
  const activeIndex = modules.indexOf(module)

  const tabMap: Record<Module, string> = {
    [Module.TWAP]: 'twap',
    [Module.LIMIT]: 'limit',
    [Module.STOP_LOSS]: 'stop-loss',
    [Module.TAKE_PROFIT]: 'take-profit',
  }

  const onModuleChange = useCallback(
    (newModule: Module) => {
      router.push({ pathname: router.pathname, query: { ...router.query, module: tabMap[newModule] } }, undefined, {
        shallow: true,
      })
    },
    [router],
  )

  if (isMobile) {
    const options = modules.map((m, i) => ({ label: labels[i], value: tabMap[m] }))
    return (
      <Box mb="20px" width="fit-content">
        <Select
          options={options}
          defaultOptionIndex={activeIndex}
          onOptionChange={(option) => {
            const idx = options.findIndex((o) => o.value === option.value)
            if (idx >= 0) onModuleChange(modules[idx])
          }}
        />
      </Box>
    )
  }

  return (
    <ButtonMenu
      scale="sm"
      activeIndex={activeIndex}
      onItemClick={(index) => onModuleChange(modules[index])}
      variant="subtle"
      fullWidth
      style={{ marginBottom: '20px' }}
    >
      {labels.map((label, i) => (
        <TabWithTooltip key={label} label={label} tooltipText={tooltips[i]} />
      ))}
    </ButtonMenu>
  )
}

// ─── Token Inputs ────────────────────────────────────────────────

const useCurrencySelect = () => {
  const { onCurrencySelection } = useSwapActionHandlers()
  const { canSwitchToChain, switchNetwork } = useSwitchNetwork()
  const router = useRouter()

  const {
    [Field.INPUT]: { currencyId: inputCurrencyId, chainId: inputChainId },
    [Field.OUTPUT]: { currencyId: outputCurrencyId, chainId: outputChainId },
  } = useSwapState()

  return useCallback(
    async (newCurrency: Currency, field: Field) => {
      return handleCurrencySelectFn({
        onCurrencySelection,
        canSwitchToChain,
        switchNetwork,
        outputChainId,
        inputChainId,
        inputCurrencyId,
        outputCurrencyId,
        router,
        replaceBrowserHistoryMultiple,
        newCurrency,
        field,
      })
    },
    [
      onCurrencySelection,
      canSwitchToChain,
      switchNetwork,
      outputChainId,
      inputChainId,
      inputCurrencyId,
      outputCurrencyId,
      router,
    ],
  )
}

export const TokenInputsSection = ({ currencyLoading }: { currencyLoading: boolean }) => {
  const dstPanel = useSpot().dstTokenPanel
  const { address: account } = useAccount()
  const { t } = useTranslation()
  const { onUserInput } = useSwapActionHandlers()
  const handleCurrencySelect = useCurrencySelect()
  const {
    derivedFormData: { srcToken, dstToken, srcAmountUI: typedValue },
  } = useSpot()

  const inputCurrency = twapHooks.useUnifiedCurrencyFromAddress(srcToken?.address)
  const outputCurrency = twapHooks.useUnifiedCurrencyFromAddress(dstToken?.address)
  const inputBalance = useCurrencyBalance(account, inputCurrency)
  const maxAmountInput = useMemo(() => maxAmountSpend(inputBalance), [inputBalance])

  const handleSrcInput = useCallback((value: string) => onUserInput(Field.INPUT, value), [onUserInput])
  const onSrcTokenSelected = useCallback(
    (token: UnifiedCurrency) => {
      handleCurrencySelect(token as Currency, Field.INPUT)
    },
    [handleCurrencySelect],
  )

  const onDstTokenSelected = useCallback(
    (token: UnifiedCurrency) => {
      handleCurrencySelect(token as Currency, Field.OUTPUT)
    },
    [handleCurrencySelect],
  )

  const handlePercentInput = useCallback(
    (percent: number) => {
      if (maxAmountInput) {
        onUserInput(Field.INPUT, maxAmountInput.multiply(new Percent(percent, 100)).toExact())
      }
    },
    [maxAmountInput, onUserInput],
  )

  const handleMaxInput = useCallback(() => {
    if (maxAmountInput) {
      onUserInput(Field.INPUT, maxAmountInput.toExact())
    }
  }, [maxAmountInput, onUserInput])

  const parsedDstAmount = twapHooks.useParseCurrencyAmountRaw(dstPanel.valueWei || '', outputCurrency)
  const dstDisplayValue = typedValue && Number(typedValue) > 0 ? parsedDstAmount?.formatted : ''

  return (
    <>
      <Suspense fallback={<Skeleton animation="pulse" variant="round" width="100%" height="80px" />}>
        <CurrencyInputPanelSimplify
          id="swap-currency-input"
          showUSDPrice
          showMaxButton
          showCommonBases
          currencyLoading={currencyLoading}
          label={t('From')}
          defaultValue={typedValue}
          maxAmount={maxAmountInput}
          showQuickInputButton
          currency={inputCurrency}
          onUserInput={handleSrcInput}
          onPercentInput={handlePercentInput}
          onMax={handleMaxInput}
          onCurrencySelect={onSrcTokenSelected}
          otherCurrency={outputCurrency}
          commonBasesType={CommonBasesType.LIMIT_ORDER}
          title={
            <Text color="textSubtle" fontSize={12} bold>
              {t('From')}
            </Text>
          }
          modalTitle={t('From')}
          showSearchHeader
        />
      </Suspense>

      <FlipButton />

      <Suspense fallback={<Skeleton animation="pulse" variant="round" width="100%" height="80px" />}>
        <CurrencyInputPanelSimplify
          id="swap-currency-output"
          showUSDPrice
          showMaxButton={false}
          disabled
          showCommonBases
          inputLoading={dstPanel.isLoading}
          currencyLoading={currencyLoading}
          label={t('To')}
          defaultValue={dstDisplayValue}
          currency={outputCurrency}
          onUserInput={() => {}}
          onCurrencySelect={onDstTokenSelected}
          otherCurrency={inputCurrency}
          commonBasesType={CommonBasesType.LIMIT_ORDER}
          title={
            <Text color="textSubtle" fontSize={12} bold>
              {t('To')}
            </Text>
          }
          modalTitle={t('To')}
          showSearchHeader
        />
      </Suspense>
    </>
  )
}

// ─── Price Row (shared by limit/trigger) ─────────────────────────

const PriceRow = ({
  token,
  price,
  usd,
  onPriceChange,
  percentage,
  onPercentageChange,
  isTypedValue,
  percentageLabel,
}: {
  token?: Token
  price: string
  usd?: string
  onPriceChange: (val: string) => void
  percentage: string
  onPercentageChange: (val: string) => void
  isTypedValue: boolean
  percentageLabel?: string
}) => {
  const formattedUsd = formatNumber(Number(usd ?? 0), 2)
  const { t } = useTranslation()
  const currency = twapHooks.useUnifiedCurrencyFromAddress(token?.address as string)
  const { formatted: formattedPrice } = twapHooks.useParseCurrencyAmountUi(price, currency)
  const { isMobile } = useMatchBreakpoints()

  return (
    <Flex style={{ gap: 8, width: '100%' }}>
      <PricePill>
        <Text
          fontSize={isMobile ? '14px' : '20px'}
          fontWeight={600}
          color="textSubtle"
          style={{ whiteSpace: 'nowrap' }}
        >
          {token?.symbol}
        </Text>
        <Flex flexDirection="column" alignItems="flex-end" style={{ flex: 1 }}>
          <NumericalInput
            value={isTypedValue ? price : formattedPrice}
            onUserInput={onPriceChange}
            style={{ textAlign: 'right', fontSize: isMobile ? '16px' : '19px', fontWeight: 600, width: '100%' }}
          />
          <Text fontSize={isMobile ? '10px' : '12px'} color="textSubtle">
            ~{formattedUsd ?? '0'} USD
          </Text>
        </Flex>
      </PricePill>
      <PercentPill style={isMobile ? { width: 110, padding: '8px 10px' } : undefined}>
        <Text
          fontSize={isMobile ? '12px' : '16px'}
          fontWeight={600}
          color="textSubtle"
          style={{ whiteSpace: 'nowrap' }}
        >
          {percentageLabel ?? t('Gain')}
        </Text>
        <Flex alignItems="center" flex={1}>
          <NumericalInput
            value={percentage}
            onUserInput={onPercentageChange}
            style={{ textAlign: 'right', fontSize: isMobile ? '16px' : '19px', fontWeight: 600 }}
            placeholder="0.0"
          />
          <Text fontSize={isMobile ? '12px' : '16px'} fontWeight={600}>
            %
          </Text>
        </Flex>
      </PercentPill>
    </Flex>
  )
}

// ─── Trigger Price ───────────────────────────────────────────────

const TriggerPriceSection = () => {
  const { module, triggerPricePanel } = useSpot()
  const { t } = useTranslation()

  const tooltip = useMemo(() => {
    if (module === Module.STOP_LOSS) {
      return t('The trigger price at which your stop-loss order will be activated.')
    }
    if (module === Module.TAKE_PROFIT) {
      return t('The trigger price at which your take-profit order will be activated.')
    }
    return undefined
  }, [module, t])

  return (
    <Flex flexDirection="column" style={{ gap: 12 }}>
      <Flex justifyContent="space-between" alignItems="center">
        <LabelWithTooltip label={t('Trigger Price')} tooltip={tooltip} />
        <ResetButton onClick={triggerPricePanel.onReset} label={t('Set to default')} />
      </Flex>
      <PriceRow
        token={triggerPricePanel.invertedDstToken}
        price={triggerPricePanel.priceUI}
        usd={triggerPricePanel.usd}
        onPriceChange={(val) => triggerPricePanel.onInputChange(val)}
        percentage={triggerPricePanel.percentage}
        onPercentageChange={(val) => triggerPricePanel.onPercentageChange(val)}
        isTypedValue={triggerPricePanel.isTypedValue}
        percentageLabel={module === Module.STOP_LOSS ? t('Max Loss') : undefined}
      />
    </Flex>
  )
}

// ─── Limit Price ─────────────────────────────────────────────────

const LimitPriceSection = ({ module }: { module: Module }) => {
  const { limitPricePanel } = useSpot()
  const { t } = useTranslation()

  return (
    <Flex flexDirection="column" style={{ gap: 12 }}>
      <Flex justifyContent="space-between" alignItems="center">
        <Flex alignItems="center" style={{ gap: 12 }}>
          {module !== Module.LIMIT && (
            <Toggle
              scale="sm"
              checked={Boolean(limitPricePanel.isLimitPrice)}
              onChange={limitPricePanel.toggleLimitPrice}
            />
          )}
          <LabelWithTooltip
            label={t('Limit Price')}
            tooltip={t(
              'Trades will only execute if the available market price is better than the limit price, potentially resulting in partial fills or orders remaining unfilled upon expiration.',
            )}
          />
        </Flex>
        {limitPricePanel.isLimitPrice && <ResetButton onClick={limitPricePanel.onReset} label={t('Set to default')} />}
      </Flex>
      {limitPricePanel.isLimitPrice && (
        <PriceRow
          token={limitPricePanel.invertedDstToken}
          price={limitPricePanel.priceUI}
          usd={limitPricePanel.usd}
          onPriceChange={(val) => limitPricePanel.onInputChange(val)}
          percentage={limitPricePanel.percentage}
          onPercentageChange={(val) => limitPricePanel.onPercentageChange(val)}
          isTypedValue={limitPricePanel.isTypedValue}
          percentageLabel={module === Module.STOP_LOSS ? t('Max Loss') : undefined}
        />
      )}
    </Flex>
  )
}

// ─── Combined Price Config ───────────────────────────────────────

export const PriceConfigSection = ({ module }: { module: Module }) => {
  const { pricePanel } = useSpot()
  const { isMarketPrice, onInvert, fromToken, isInverted } = pricePanel
  const { t } = useTranslation()
  const showTrigger = module === Module.STOP_LOSS || module === Module.TAKE_PROFIT
  const hidePriceInvert = isMarketPrice && !showTrigger

  return (
    <PriceConfigSectionWrapper>
      <Flex justifyContent="space-between" alignItems="center">
        <Text fontSize="13px" color="textSubtle">
          {isInverted ? t('Buy') : t('Sell')} {fromToken?.symbol} {isMarketPrice ? t('at market rate') : t('at rate')}
        </Text>
        {!hidePriceInvert && (
          <ArrowUpDownIcon
            style={{ cursor: 'pointer', width: '24px', height: '24px', transform: 'rotate(90deg)' }}
            color="primary"
            onClick={onInvert}
          />
        )}
      </Flex>

      {showTrigger && <TriggerPriceSection />}
      <LimitPriceSection module={module} />
    </PriceConfigSectionWrapper>
  )
}

// ─── Duration Section ────────────────────────────────────────────

export const DurationSection = () => {
  const { t } = useTranslation()
  const { duration, onInputChange, onUnitSelect, error } = useSpot().durationPanel
  const timeUnitOptions = useTimeUnitOptions()
  const defaultIndex = useMemo(() => timeUnitOptions.findIndex((o) => o.value === duration.unit), [duration.unit])
  return (
    <PanelCardFocus error={!!error}>
      <LabelWithTooltip
        label={t('Expiration')}
        tooltip={t(
          'This is the date and time marking the end of the period which you have selected for your order to be executed.',
        )}
      />
      <Flex alignItems="center" style={{ gap: 8, width: '100%' }}>
        <Flex flex={1}>
          <MediumInput value={duration.value?.toString() ?? ''} onUserInput={(val: string) => onInputChange(val)} />
        </Flex>
        <Select
          options={timeUnitOptions}
          defaultOptionIndex={defaultIndex + 1}
          onOptionChange={(opt) => onUnitSelect(Number(opt.value))}
          width="auto"
          style={{ width: 'auto' }}
        />
      </Flex>
      <ErrorMessage error={error} />
    </PanelCardFocus>
  )
}

// ─── Trade Size Section ──────────────────────────────────────────

export const TradeSizeSection = () => {
  const { amountPerTrade, totalTrades, maxTrades, onChange, error, fromToken } = useSpot().tradesAmountPanel
  const { t } = useTranslation()
  const sliderMax = useMemo(() => Math.max(maxTrades, 1), [maxTrades])
  const inputCurrency = twapHooks.useUnifiedCurrencyFromAddress(fromToken?.address as string)

  const { formatted: formattedAmountPerTrade } = twapHooks.useParseCurrencyAmountRaw(amountPerTrade, inputCurrency)

  const handleSliderChange = useCallback(
    (val: number) => {
      onChange(Math.round(val))
    },
    [onChange],
  )

  return (
    <PanelCardFocus error={!!error}>
      <Flex justifyContent="space-between" alignItems="center">
        <LabelWithTooltip
          label={t('Total Trades')}
          tooltip={t(
            'The total number of individual trades that will be scheduled as part of your order. Note that in limit orders, not all trades that are scheduled will be executed.',
          )}
        />
        <Text fontSize="13px" color="textSubtle" style={{ whiteSpace: 'nowrap' }}>
          {t('Size Per Trade')}: {formattedAmountPerTrade} {fromToken?.symbol}
        </Text>
      </Flex>
      <Flex alignItems="center" style={{ gap: 12 }}>
        <Flex style={{ width: '70px', flexShrink: 0 }}>
          <NumericalInput
            value={totalTrades?.toString() ?? ''}
            onUserInput={(val: string) => onChange(Number(val))}
            style={{ fontSize: '24px', fontWeight: 600, textAlign: 'left' }}
          />
        </Flex>
        <SliderWrapper style={{ flex: 1 }}>
          <Slider
            name="trades"
            min={0}
            max={sliderMax}
            value={totalTrades > 1 ? Math.min(totalTrades, sliderMax) : 0}
            onValueChanged={handleSliderChange}
            step={1}
            style={{ zIndex: 10, position: 'relative' }}
          />
          <SliderDots>
            <SliderDot />
            <SliderDot />
            <SliderDot />
            <SliderDot />
          </SliderDots>
        </SliderWrapper>
      </Flex>
      <ErrorMessage error={error} />
    </PanelCardFocus>
  )
}

// ─── Trade Interval Section ──────────────────────────────────────

export const TradeIntervalSection = () => {
  const { t } = useTranslation()
  const { fillDelay, onInputChange, onUnitSelect, error } = useSpot().fillDelayPanel
  const timeUnitOptions = useTimeUnitOptions()
  const defaultIndex = useMemo(() => timeUnitOptions.findIndex((o) => o.value === fillDelay.unit), [fillDelay.unit])
  return (
    <PanelCardFocus error={!!error}>
      <LabelWithTooltip
        label={t('Trade Interval')}
        tooltip={t(
          'The estimated time that will elapse between each trade in your order. Note that as this time includes an allowance of two minutes for bidder auction and block settlement, which cannot be predicted exactly, actual time may vary.',
        )}
      />
      <Flex alignItems="center" style={{ gap: 8 }}>
        <Flex flex={1}>
          <MediumInput value={fillDelay.value?.toString() ?? ''} onUserInput={(val: string) => onInputChange(val)} />
        </Flex>
        <Select
          options={timeUnitOptions}
          defaultOptionIndex={defaultIndex + 1}
          onOptionChange={(opt) => onUnitSelect(Number(opt.value))}
          width="auto"
          style={{ width: 'auto' }}
        />
      </Flex>
      <ErrorMessage error={error} />
    </PanelCardFocus>
  )
}

export const TradeDetails = ({ outputCurrency }: { outputCurrency?: UnifiedCurrency }) => {
  const { derivedFormData } = useSpot()
  return (
    <Flex flexDirection="column" style={{ gap: '8px', paddingTop: '10px' }}>
      {!derivedFormData.isMarketOrder && (
        <OrderDetails.MinReceivedRow
          tradesAmount={derivedFormData.totalTrades}
          rawValue={derivedFormData.minDestAmountPerTrade}
          outputCurrency={outputCurrency}
        />
      )}
      <OrderDetails.FeeRow usdValue={derivedFormData.feesUsd} />
    </Flex>
  )
}

export const OrderDisclaimer = () => {
  const { t } = useTranslation()
  const disclaimer = useSpot().disclaimerPanel

  const disclaimerText = useMemo(() => {
    if (disclaimer === Disclaimer.LIMIT_PRICE) {
      return t(
        "Limit orders may not execute when the token's price is equal or close to the limit price, due to gas and standard swap fees. ",
      )
    }
    if (disclaimer === Disclaimer.TRIGGER_MARKET_PRICE) {
      return t(
        'In extreme market movements, slippage may occur and the executed price of the market order may be worse than the specified trigger price.',
      )
    }
    if (disclaimer === Disclaimer.MARKET_PRICE) {
      return t(
        'Each individual trade in this order will be filled at the current market price at the time of execution.',
      )
    }
  }, [t, disclaimer])

  if (!disclaimer) return null
  return (
    <FormContainer>
      <Flex alignItems="stat" style={{ gap: 8 }}>
        <WarningIcon
          style={{ alignSelf: 'flex-start', width: '20px', height: '20px', position: 'relative', top: '2px' }}
        />
        <Text fontSize="14px" style={{ flex: 1 }}>
          {disclaimerText}{' '}
          <Link
            href={ORBS_TWAP_FAQ_URL}
            external
            style={{
              display: 'inline-block',
              marginLeft: '4px',
            }}
          >
            {t('Learn more')}.
          </Link>
        </Text>
      </Flex>
    </FormContainer>
  )
}

export const TwapPoweredBy = () => {
  return (
    <PoweredBy href={ORBS_WEBSITE_URL}>
      <Flex flexDirection="row" alignItems="center" style={{ gap: '0.25rem' }}>
        Orbs <img src={ORBS_LOGO} alt="Orbs" style={{ width: '20px', height: '20px' }} />
      </Flex>
    </PoweredBy>
  )
}
