import {
  CancelOrderProps,
  SignOrderProps,
  ApproveTokenProps,
  GetAllowanceProps,
  eqIgnoreCase,
  OrderType,
  useSpot,
  WalletInteractions,
} from '@orbs-network/spot-react'
import { ChainId } from '@pancakeswap/chains'
import { useTranslation } from '@pancakeswap/localization'
import { zeroAddress } from '@pancakeswap/price-api-sdk'
import { Currency, CurrencyAmount, UnifiedCurrency, UnifiedCurrencyAmount } from '@pancakeswap/sdk'
import { formatAmount } from '@pancakeswap/utils/formatFractions'
import tryParseAmount from '@pancakeswap/utils/tryParseAmount'
import { useCurrency, useUnifiedCurrency } from 'hooks/Tokens'
import { useActiveChainId } from 'hooks/useAccountActiveChain'
import { useCallWithGasPrice } from 'hooks/useCallWithGasPrice'
import { useWNativeContract } from 'hooks/useContract'
import useNativeCurrency from 'hooks/useNativeCurrency'
import { usePublicNodeWaitForTransaction } from 'hooks/usePublicNodeWaitForTransaction'
import { useUnifiedUSDPriceAmount } from 'hooks/useStablecoinPrice'
import { useUnifiedTokenUsdPrice } from 'hooks/useUnifiedTokenUsdPrice'
import { useCallback, useMemo } from 'react'
import { Address, erc20Abi, maxUint256 } from 'viem'
import { useAccount, usePublicClient, useSignTypedData, useWriteContract } from 'wagmi'

const useUnifiedCurrencyFromAddress = (address?: string): UnifiedCurrency | undefined => {
  const { chainId } = useActiveChainId()
  const native = useNativeCurrency()
  const currency = useUnifiedCurrency(address, chainId)

  return useMemo(() => {
    if (!address) return undefined
    if (eqIgnoreCase(address, zeroAddress)) {
      return native
    }
    return currency
  }, [address, native])
}

const useParseCurrencyAmountUi = (amount?: string, currency?: UnifiedCurrency) => {
  return useMemo(() => {
    if (!amount || !currency) {
      return {
        amount: undefined,
        formatted: undefined,
      }
    }
    const parsed = tryParseAmount(amount, currency as Currency)
    return {
      amount: parsed,
      formatted: formatAmount(parsed, 5),
    }
  }, [amount, currency])
}

const useFormatAmount = (amount?: CurrencyAmount<Currency> | UnifiedCurrencyAmount<UnifiedCurrency>) => {
  return useMemo(() => {
    if (!amount) return undefined
    return formatAmount(amount, 5)
  }, [amount])
}

const useParseCurrencyAmountRaw = (amount?: string, currency?: UnifiedCurrency) => {
  return useMemo(() => {
    if (!amount || !currency) {
      return {
        amount: undefined,
        formatted: undefined,
      }
    }
    const parsed = CurrencyAmount.fromRawAmount(currency as Currency, amount)
    return {
      amount: parsed,
      formatted: formatAmount(parsed, 5),
    }
  }, [amount, currency])
}

const useUsdPrice = (address?: string) => {
  const { chainId } = useActiveChainId()
  const currency = useCurrency(address, chainId)
  const amount1 = useUnifiedTokenUsdPrice(currency?.wrapped).data
  const amount2 = useUnifiedUSDPriceAmount(currency?.wrapped, currency?.wrapped ? 1 : undefined)

  return amount1 || amount2
}

export const dateOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
}

export const timeOptions: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: 'numeric',
}

export const dateTimeOptions: Intl.DateTimeFormatOptions = {
  ...dateOptions,
  ...timeOptions,
}

const useFormattedDate = (dateMs: number) => {
  const {
    currentLanguage: { locale },
  } = useTranslation()
  return useMemo(() => {
    return new Date(dateMs).toLocaleString(locale, dateTimeOptions)
  }, [dateMs, locale])
}

const useFormatMillisecondsToTimeCallback = () => {
  const { t } = useTranslation()
  return useCallback(
    (fillDelayMs: number) => {
      const fillDelayMin = Math.round(fillDelayMs / 60000)
      if (fillDelayMin < 60) return `${fillDelayMin} ${t('Minutes')}`
      if (fillDelayMin < 1440) return `${Math.round(fillDelayMin / 60)} ${t('Hours')}`
      return `${Math.round(fillDelayMin / 1440)} ${t('Days')}`
    },
    [t],
  )
}

const useMinChunksSizeUsd = () => {
  const { chainId } = useActiveChainId()
  return useMemo(() => {
    switch (chainId) {
      case ChainId.BSC:
        return 10
      case ChainId.BASE:
        return 10
      case ChainId.ARBITRUM_ONE:
        return 10
      default:
        return 5
    }
  }, [chainId])
}

const useOrderTitleCallback = () => {
  const { t } = useTranslation()
  return useCallback(
    (type?: OrderType) => {
      switch (type) {
        case OrderType.LIMIT:
          return t('Limit')
        case OrderType.TWAP_LIMIT:
          return t('TWAP')
        case OrderType.TWAP_MARKET:
          return t('TWAP')
        case OrderType.STOP_LOSS_LIMIT:
          return t('Stop Loss')
        case OrderType.STOP_LOSS_MARKET:
          return t('Stop Loss')
        case OrderType.TAKE_PROFIT_LIMIT:
          return t('Take Profit')
        case OrderType.TAKE_PROFIT_MARKET:
          return t('Take Profit')
        default:
          return ''
      }
    },
    [t],
  )
}

const useOrderTitle = (type?: OrderType) => {
  const getTitle = useOrderTitleCallback()
  return useMemo(() => getTitle(type), [getTitle, type])
}

const useSwapTitle = () => {
  const { t } = useTranslation()
  const type = useSpot().derivedFormData.orderType
  const title = twapHooks.useOrderTitle(type)
  return useMemo(() => t('Place %title% Order', { title }), [title, t])
}

const useWalletInteractions = (): WalletInteractions => {
  const { writeContractAsync } = useWriteContract()
  const { signTypedDataAsync } = useSignTypedData()
  const { callWithGasPrice } = useCallWithGasPrice()
  const publicClient = usePublicClient()
  const { address: account } = useAccount()
  const { waitForTransaction } = usePublicNodeWaitForTransaction()

  const wnativeContract = useWNativeContract()

  const waitFotTx = useCallback(
    async (hash: `0x${string}`) => {
      const receipt = await waitForTransaction({ hash })
      if (receipt.status !== 'success') {
        throw new Error('Failed to wait for transaction')
      }
      return receipt.transactionHash as `0x${string}`
    },
    [waitForTransaction],
  )

  const cancelOrder = useCallback(
    async (props: CancelOrderProps) => {
      const hash = await writeContractAsync({
        address: props.contractAddress as Address,
        abi: props.abi,
        functionName: 'cancel',
        args: props.args,
      })
      return waitFotTx(hash)
    },
    [writeContractAsync, waitFotTx],
  )

  const signOrder = useCallback(
    async (props: SignOrderProps) => {
      return signTypedDataAsync({
        domain: props.domain,
        types: props.types,
        primaryType: props.primaryType,
        message: props.message,
        account: props.account,
      })
    },
    [signTypedDataAsync],
  )

  const wrapNativeToken = useCallback(
    async (amount: string) => {
      const tx = await callWithGasPrice(wnativeContract, 'deposit', undefined, { value: BigInt(amount) })
      return waitFotTx(tx.hash)
    },
    [callWithGasPrice, wnativeContract, waitFotTx],
  )

  const approveToken = useCallback(
    async (props: ApproveTokenProps) => {
      // can be replaced with exact amount
      // const amount = BigInt(props.amount)
      const amount = maxUint256
      const hash = await writeContractAsync({
        address: props.tokenAddress as Address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [props.spenderAddress as Address, amount],
      })
      return waitFotTx(hash)
    },
    [writeContractAsync, waitFotTx],
  )

  const getAllowance = useCallback(
    async (props: GetAllowanceProps) => {
      const allowance = await publicClient!.readContract({
        address: props.tokenAddress as Address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [account!, props.spenderAddress as Address],
      })
      return allowance.toString()
    },
    [publicClient, account],
  )

  return {
    cancelOrder,
    signOrder,
    wrapNativeToken,
    approveToken,
    getAllowance,
  }
}

export const twapHooks = {
  useUnifiedCurrencyFromAddress,
  useUsdPrice,
  useParseCurrencyAmountUi,
  useParseCurrencyAmountRaw,
  useFormatAmount,
  useFormattedDate,
  useFormatMillisecondsToTimeCallback,
  useMinChunksSizeUsd,
  useOrderTitle,
  useSwapTitle,
  useOrderTitleCallback,
  useWalletInteractions,
}
