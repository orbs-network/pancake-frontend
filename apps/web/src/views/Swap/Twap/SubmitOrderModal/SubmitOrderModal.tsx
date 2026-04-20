import React, { createContext, useCallback, useContext, useMemo } from 'react'
import {
  ApproveModalContent,
  ConfirmationModalContent,
  ConfirmModalState,
  FadePresence,
  StepTitleAnimationContainer,
  SwapPendingModalContent,
} from '@pancakeswap/widgets-internal'
import { SwapStatus, useSpot } from '@orbs-network/spot-react'
import { Currency, CurrencyAmount, TradeType } from '@pancakeswap/swap-sdk-core'
import { useSwapState } from 'state/swap/hooks'
import {
  AutoColumn,
  Box,
  Button,
  CheckmarkCircleIcon,
  Dots,
  Flex,
  Modal,
  ModalV2,
  Text,
  useMatchBreakpoints,
  useModalV2,
} from '@pancakeswap/uikit'
import SwapModalHeaderV2 from '../../components/SwapModalHeaderV2'
import { useTranslation } from '@pancakeswap/localization'
import { TwapSwapModalFooterV2 } from './SubmitOrderModalFooterV2'
import { InterfaceOrder } from 'views/Swap/utils'
import ConnectWalletButton from 'components/ConnectWalletButton'
import { useActiveChainId } from 'hooks/useAccountActiveChain'
import { useAccount } from 'wagmi'
import { TwapSubmitModalProvider, useTwapSubmitModalContext } from './context'
import { ApproveStepFlow } from 'views/Swap/V3Swap/containers/ApproveStepFlow'
import { SwapTransactionErrorContent } from 'views/Swap/components/SwapTransactionErrorContent'
import { useApprovalPhaseStepTitles } from 'views/Swap/V3Swap/containers/ConfirmSwapModalV2'
import { useAllTypeBestTrade } from 'quoter/hook/useAllTypeBestTrade'
import { twapHooks } from '../hooks'

// ─── Review content ──────────────────────────────────────────────

const ModalHeader = () => {
  const { recipient } = useSwapState()
  const { inputAmount, outputAmount, currencyBalances, isEnoughInputBalance } = useTwapSubmitModalContext()

  if (!outputAmount || !inputAmount) {
    return null
  }

  return (
    <SwapModalHeaderV2
      inputAmount={inputAmount}
      outputAmount={outputAmount}
      tradeType={TradeType.EXACT_OUTPUT}
      currencyBalances={currencyBalances}
      isEnoughInputBalance={isEnoughInputBalance}
      recipient={recipient ?? undefined}
      showAcceptChanges={false}
      onAcceptChanges={() => {}}
    />
  )
}

// ─── Modal inner content ─────────────────────────────────────────

const WrapModalContent = () => {
  const { t } = useTranslation()
  const { inputCurrency, outputCurrency, formattedInputAmount, formattedOutputAmount } = useTwapSubmitModalContext()
  return (
    <SwapPendingModalContent
      title={t('Wrap')}
      currencyA={inputCurrency}
      currencyB={outputCurrency?.wrapped}
      amountA={formattedInputAmount}
      amountB={formattedOutputAmount}
      currentStep={ConfirmModalState.PENDING_CONFIRMATION}
    ></SwapPendingModalContent>
  )
}

const useWrapMessage = () => {
  const { t } = useTranslation()
  const { inputCurrency } = useTwapSubmitModalContext()

  return useMemo(() => {
    return t('Note: %symbol% was wrapped to %wrappedSymbol%', {
      symbol: inputCurrency?.symbol,
      wrappedSymbol: inputCurrency.wrapped?.symbol,
    })
  }, [inputCurrency, t])
}

const SwapError = ({ message, handleDismiss }: { message: string; handleDismiss: () => void }) => {
  const { wrapTxHash } = useSpot().orderExecutionPanel

  const wrapMessage = useWrapMessage()

  const msg = useMemo(() => {
    return (
      <>
        <Text fontSize="14px">{message}</Text>
        {wrapTxHash && (
          <Text mt="16px" fontSize="14px">
            {wrapMessage}
          </Text>
        )}
      </>
    )
  }, [wrapTxHash, wrapMessage, message])

  return (
    <Flex width="100%" alignItems="center" height="calc(430px - 73px - 120px)">
      <SwapTransactionErrorContent message={msg} onDismiss={handleDismiss} openSettingModal={undefined} />
    </Flex>
  )
}

const ReviewingContent = () => {
  const modalHeader = useCallback(() => <ModalHeader />, [])
  const modalBottom = useCallback(() => <TwapSwapModalFooterV2 />, [])

  return <ConfirmationModalContent topContent={modalHeader} bottomContent={modalBottom} />
}

const SignOrderContent = () => {
  const { inputCurrency, outputCurrency, formattedInputAmount, formattedOutputAmount } = useTwapSubmitModalContext()
  const title = twapHooks.useSwapTitle()
  return (
    <SwapPendingModalContent
      title={title}
      currencyA={inputCurrency as Currency}
      currencyB={outputCurrency as Currency}
      amountA={formattedInputAmount}
      amountB={formattedOutputAmount}
      currentStep={ConfirmModalState.PENDING_CONFIRMATION}
    ></SwapPendingModalContent>
  )
}

const SwapTransactionReceiptModalContent = () => {
  const { t } = useTranslation()
  const wrapMessage = useWrapMessage()
  const { wrapTxHash } = useSpot().orderExecutionPanel

  return (
    <Box width="100%">
      <FadePresence>
        <Box margin="auto auto 22px auto" width="fit-content">
          <CheckmarkCircleIcon color="success" width={80} height={80} />
        </Box>
      </FadePresence>

      <AutoColumn justify="center">
        <StepTitleAnimationContainer>
          <Text textAlign="center">{t('Order Placed Successfully')}</Text>
          {wrapTxHash && (
            <Text mt="16px" fontSize="15px">
              {wrapMessage}
            </Text>
          )}
        </StepTitleAnimationContainer>
      </AutoColumn>
    </Box>
  )
}

const ModalState = () => {
  const { swapErrorMessage, confirmModalState, swapStatus, acceptedOrder, inputCurrency, onDismiss } =
    useTwapSubmitModalContext()
  const stepContents = useApprovalPhaseStepTitles({ trade: acceptedOrder?.trade })

  if (swapErrorMessage) {
    return <SwapError message={swapErrorMessage ?? ''} handleDismiss={onDismiss} />
  }

  if (swapStatus === SwapStatus.SUCCESS) {
    return <SwapTransactionReceiptModalContent />
  }

  if (confirmModalState === ConfirmModalState.WRAPPING) {
    return <WrapModalContent />
  }
  if (confirmModalState === ConfirmModalState.APPROVING_TOKEN) {
    return (
      <ApproveModalContent
        title={stepContents}
        isX={false}
        isBonus={false}
        currencyA={inputCurrency as Currency}
        asBadge
        currentStep={ConfirmModalState.APPROVING_TOKEN}
        approvalModalSteps={[ConfirmModalState.APPROVING_TOKEN, ConfirmModalState.PERMITTING]}
      />
    )
  }

  if (confirmModalState === ConfirmModalState.PENDING_CONFIRMATION) {
    return <SignOrderContent />
  }

  return <ReviewingContent />
}

const ModalStateWrapper = () => {
  const { swapStatus, swapErrorMessage, confirmModalState, pendingModalSteps, onDismiss } = useTwapSubmitModalContext()
  const { isDesktop } = useMatchBreakpoints()
  const title = twapHooks.useSwapTitle()

  const showSteps =
    confirmModalState &&
    pendingModalSteps.length > 0 &&
    swapStatus !== SwapStatus.SUCCESS &&
    swapStatus !== SwapStatus.FAILED

  const modalTitle = !swapStatus && !swapErrorMessage ? title : undefined

  return (
    <Modal maxHeight="unset" title={modalTitle} onDismiss={onDismiss} width={isDesktop ? '500px' : 'unset'}>
      <Box>
        <ModalState />
      </Box>
      {showSteps && <ApproveStepFlow confirmModalState={confirmModalState} pendingModalSteps={pendingModalSteps} />}
    </Modal>
  )
}

// ─── Commit button ───────────────────────────────────────────────

const CommitButton = () => {
  const { t } = useTranslation()
  const title = twapHooks.useSwapTitle()
  const { address } = useAccount()
  const { chainId } = useActiveChainId()
  const partnerChains = useSpot().supportedChains
  const submitButton = useSpot().submitOrderButton
  const { tradeLoaded } = useAllTypeBestTrade()

  const { isEnoughInputBalance, onConfirm } = useTwapSubmitModalContext()

  const content = useMemo(() => {
    if (!tradeLoaded) {
      return <Dots>{t('Searching For The Best Price')}</Dots>
    }
    if (!isEnoughInputBalance) {
      return t('Insufficient Balance')
    }
    return title
  }, [tradeLoaded, isEnoughInputBalance, title, t])

  if (!address) {
    return <ConnectWalletButton width="100%" />
  }

  if (chainId && !partnerChains.includes(chainId)) {
    return (
      <Button width="100%" disabled>
        {t('Unsupported Chain')}
      </Button>
    )
  }

  return (
    <Button width="100%" onClick={onConfirm} disabled={submitButton.disabled} isLoading={submitButton.loading}>
      {content}
    </Button>
  )
}

// ─── Main export (rendered inside SpotProvider) ──────────────────

export function SubmitOrderModal({
  setAcceptedOrder,
  acceptedOrder,
  bestOrder,
}: {
  setAcceptedOrder: (order: InterfaceOrder | null) => void
  acceptedOrder: InterfaceOrder | null
  bestOrder: InterfaceOrder | null
}) {
  return (
    <TwapSubmitModalProvider acceptedOrder={acceptedOrder} bestOrder={bestOrder} setAcceptedOrder={setAcceptedOrder}>
      <SubmitOrderModalContent />
      <CommitButton />
    </TwapSubmitModalProvider>
  )
}

const SubmitOrderModalContent = () => {
  const { isOpen, onDismiss } = useTwapSubmitModalContext()

  return (
    <ModalV2 isOpen={isOpen} onDismiss={onDismiss} closeOnOverlayClick>
      <ModalStateWrapper />
    </ModalV2>
  )
}
