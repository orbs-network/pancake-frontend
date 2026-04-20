import { Steps, SwapStatus, useSpot } from '@orbs-network/spot-react'
import { useTranslation } from '@pancakeswap/localization'
import { CurrencyAmount, Currency } from '@pancakeswap/swap-sdk-core'
import { useModalV2 } from '@pancakeswap/uikit'
import { formatAmount } from '@pancakeswap/utils/formatFractions'
import { ConfirmModalState } from '@pancakeswap/widgets-internal'
import { useUnifiedCurrencyBalance } from 'hooks/useUnifiedCurrencyBalance'
import { createContext, useCallback, useContext, useMemo } from 'react'
import { Field } from 'state/swap/actions'
import { maxUnifiedAmountSpend } from 'utils/maxAmountSpend'
import { InterfaceOrder } from 'views/Swap/utils'
import { userRejectedError } from 'views/Swap/V3Swap/hooks/useSendSwapTransaction'
import { PendingConfirmModalState } from 'views/Swap/V3Swap/types'
import { twapHooks } from '../hooks'
import { useSwapActionHandlers } from 'state/swap/useSwapActionHandlers'

type ContextType = {
  inputAmount: CurrencyAmount<Currency>
  outputAmount?: CurrencyAmount<Currency>
  formattedInputAmount: string
  formattedOutputAmount: string
  acceptedOrder: InterfaceOrder | null
  swapErrorMessage: string | undefined
  currencyBalances: {
    [Field.INPUT]: CurrencyAmount<Currency>
    [Field.OUTPUT]: CurrencyAmount<Currency>
  }
  inputCurrency: Currency
  outputCurrency: Currency
  isEnoughInputBalance: boolean
  confirmModalState?: ConfirmModalState
  swapStatus: SwapStatus | undefined
  onSubmit: () => void
  pendingModalSteps: PendingConfirmModalState[]
  onConfirm: () => void
  onDismiss: () => void
  isOpen: boolean
  swapButtonLoading: boolean
}

const Context = createContext({} as ContextType)

export const useTwapSubmitModalContext = () => {
  return useContext(Context)
}

const parseSteps = (step?: Steps) => {
  if (!step) return undefined
  if (step === Steps.WRAP) {
    return ConfirmModalState.WRAPPING
  }
  if (step === Steps.APPROVE) {
    return ConfirmModalState.APPROVING_TOKEN
  }
  return ConfirmModalState.PENDING_CONFIRMATION
}

export const TwapSubmitModalProvider = ({
  children,
  acceptedOrder,
  bestOrder,
  setAcceptedOrder,
}: {
  children: React.ReactNode
  acceptedOrder: InterfaceOrder | null
  bestOrder: InterfaceOrder | null
  setAcceptedOrder: (order: InterfaceOrder | null) => void
}) => {
  const modal = useModalV2()
  const { t } = useTranslation()
  const { onUserInput } = useSwapActionHandlers()
  const {
    step,
    status,
    onSubmit,
    pendingSteps = [],
    resetState,
    resetCurrentSwap,
    confirmButtonLoading,
    error,
    isSuccess,
    srcToken,
    dstToken,
  } = useSpot().orderExecutionPanel
  const { derivedFormData } = useSpot()

  const onConfirm = useCallback(() => {
    setAcceptedOrder(bestOrder ?? null)
    modal.onOpen()
  }, [bestOrder, setAcceptedOrder, modal])

  const onDismiss = useCallback(() => {
    modal.onDismiss()
    setTimeout(() => {
      setAcceptedOrder(null)
      if (isSuccess) {
        onUserInput(Field.INPUT, '')
        resetState()
      } else {
        resetCurrentSwap()
      }
    }, 500)
  }, [setAcceptedOrder, modal, isSuccess, onUserInput, resetState, resetCurrentSwap])

  const inputCurrency = twapHooks.useUnifiedCurrencyFromAddress(srcToken?.address)
  const outputCurrency = twapHooks.useUnifiedCurrencyFromAddress(dstToken?.address)
  const inputAmount = bestOrder?.trade.inputAmount
  const { amount: outputAmount } = twapHooks.useParseCurrencyAmountRaw(derivedFormData.dstAmount ?? '0', outputCurrency)

  const srcBalance = useUnifiedCurrencyBalance(inputCurrency)
  const dstBalance = useUnifiedCurrencyBalance(outputCurrency)

  const currencyBalances = useMemo(
    () => ({
      [Field.INPUT]: srcBalance as CurrencyAmount<Currency>,
      [Field.OUTPUT]: dstBalance as CurrencyAmount<Currency>,
    }),
    [srcBalance, dstBalance],
  )

  const isEnoughInputBalance = useMemo(() => {
    if (!inputAmount) return true
    const isInputBalanceExist = !!(currencyBalances && currencyBalances[Field.INPUT])
    const inputCurrencyAmount = isInputBalanceExist ? maxUnifiedAmountSpend(currencyBalances[Field.INPUT]) : null

    return inputCurrencyAmount
      ? inputCurrencyAmount.greaterThan(inputAmount) || inputCurrencyAmount.equalTo(inputAmount)
      : false
  }, [currencyBalances, inputAmount])

  const confirmModalState = useMemo(() => parseSteps(step), [step])

  const pendingModalSteps = useMemo(() => {
    return pendingSteps.map(parseSteps).filter((step) => step !== undefined)
  }, [pendingSteps]) as ConfirmModalState[]

  const swapErrorMessage = useMemo(() => {
    if (userRejectedError(error)) {
      return t('Transaction rejected by user')
    }
    return error?.message
  }, [error])

  return (
    <Context.Provider
      value={{
        inputAmount: inputAmount as CurrencyAmount<Currency>,
        outputAmount: outputAmount as CurrencyAmount<Currency>,
        formattedInputAmount: formatAmount(inputAmount, 5) ?? '',
        formattedOutputAmount: formatAmount(outputAmount, 5) ?? '',
        currencyBalances,
        acceptedOrder,
        swapErrorMessage,
        inputCurrency: acceptedOrder?.trade.inputAmount.currency as Currency,
        outputCurrency: acceptedOrder?.trade.outputAmount.currency as Currency,
        isEnoughInputBalance,
        swapStatus: status,
        confirmModalState,
        onSubmit,
        pendingModalSteps: pendingModalSteps as PendingConfirmModalState[],
        onConfirm,
        onDismiss,
        isOpen: modal.isOpen,
        swapButtonLoading: Boolean(confirmButtonLoading),
      }}
    >
      {children}
    </Context.Provider>
  )
}
