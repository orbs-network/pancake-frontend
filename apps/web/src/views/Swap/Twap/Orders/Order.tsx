import {
  getOrderExecutionRate,
  getOrderLimitPriceRate,
  getTriggerPriceRate,
  Order,
  OrderStatus,
  OrderType,
  useCancelOrder,
  useSpot,
} from '@orbs-network/spot-react'
import { useTranslation } from '@pancakeswap/localization'
import {
  ArrowUpDownIcon,
  Box,
  BscScanIcon,
  Button,
  ChevronDownIcon,
  ChevronUpIcon,
  Flex,
  Modal,
  ModalV2,
  PaginationButton,
  QuestionHelperV2,
  Text,
  useMatchBreakpoints,
  useModalV2,
} from '@pancakeswap/uikit'
import { CurrencyLogo } from '@pancakeswap/widgets-internal'
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react'

import { styled } from 'styled-components'
import { twapHooks } from '../hooks'
import { UnifiedCurrency } from '@pancakeswap/swap-sdk-core'
import { twapUtils } from '../utils'
import truncateHash from '@pancakeswap/utils/truncateHash'
import { useBlockExploreLink } from 'utils'
import { OrderDetails } from '../OrderDetails'

const ListItem = styled(Flex)`
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};

  &:last-child {
    border-bottom: none;
  }
`

const OrderCard = styled(Flex)`
  background: ${({ theme }) => theme.colors.input};
  border-radius: 16px;

  transition: background 0.15s;
  flex-direction: column;
  width: 100%;
`

const OrderPreviewCard = styled(Flex)`
  flex-direction: column;
  padding: 12px 16px;
  width: 100%;
  cursor: pointer;
  border-radius: 16px;
  gap: 8px;

  &:hover {
    background: ${({ theme }) => theme.colors.tertiary};
  }
`

const StatusBadge = styled(Text)<{ $status: string }>`
  color: ${({ $status, theme }) => {
    if ($status === 'COMPLETED') return theme.colors.success
    if ($status === 'OPEN') return theme.colors.primary
    if ($status === 'CANCELLED' || $status === 'EXPIRED') return theme.colors.textSubtle
    return theme.colors.text
  }};
`

const OrderDetailsContent = styled(Flex)`
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 8px 12px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.input};
  margin-top: -8px;
`

const OrderDetailsContentInner = styled(Flex)`
  background: ${({ theme }) => theme.colors.card};
  border-radius: 16px;
  padding: 8px 12px;
  width: 100%;
  flex-direction: column;
`

const RateIcon = styled(ArrowUpDownIcon)`
  transform: rotate(90deg);
  position: relative;
  top: 4px;
  width: 16px;
  height: 16px;
  margin-left: 4px;
  margin-right: 4px;
  color: ${({ theme }) => theme.colors.primary};
`

const Rate = ({ order }: { order: Order }) => {
  const inputCurrency = twapHooks.useUnifiedCurrencyFromAddress(order.srcTokenAddress)
  const outputCurrency = twapHooks.useUnifiedCurrencyFromAddress(order.dstTokenAddress)
  const inputUsd = twapHooks.useUsdPrice(order.srcTokenAddress)
  const outputUsd = twapHooks.useUsdPrice(order.dstTokenAddress)

  const rate = useMemo(() => {
    if (!inputUsd || !outputUsd) return 0
    return inputUsd / outputUsd
  }, [inputUsd, outputUsd])

  return (
    <>
      1 {inputCurrency?.symbol}
      <RateIcon />
      {twapUtils.formatDecimals(rate.toString(), 3) ?? '—'} {outputCurrency?.symbol}
    </>
  )
}

const useStatusTitle = (status: OrderStatus) => {
  const { t } = useTranslation()
  return useMemo(() => {
    switch (status) {
      case OrderStatus.Completed:
        return t('Completed')
      case OrderStatus.Open:
        return t('Open')
      case OrderStatus.Expired:
        return t('Expired')
      case OrderStatus.Cancelled:
        return t('Cancelled')
      default:
        return ''
    }
  }, [status])
}

const OrderDetailsContext = createContext(
  {} as {
    inputCurrency?: UnifiedCurrency
    outputCurrency?: UnifiedCurrency
    order: Order
  },
)

const useOrderDetailsContext = () => {
  return useContext(OrderDetailsContext)
}

const OrderDetailValue = styled(Text)`
  font-size: 14px;
  font-weight: 500;
`

const LimitPriceRow = () => {
  const { t } = useTranslation()
  const { inputCurrency, outputCurrency, order } = useOrderDetailsContext()

  const limitPrice = useMemo(() => {
    if (!inputCurrency || !outputCurrency) return ''
    return getOrderLimitPriceRate(order, inputCurrency.decimals, outputCurrency.decimals)
  }, [order, inputCurrency, outputCurrency])

  const { amount } = twapHooks.useParseCurrencyAmountUi(limitPrice, outputCurrency)

  if (order.isMarketPrice) return null

  return (
    <ListItem>
      <OrderDetails.LimitPriceRow
        limitPrice={amount?.numerator.toString() ?? ''}
        inputCurrency={inputCurrency}
        outputCurrency={outputCurrency}
      />
    </ListItem>
  )
}

const AvgExecutionPriceRow = () => {
  const { t } = useTranslation()
  const { inputCurrency, outputCurrency, order } = useOrderDetailsContext()

  const rate = useMemo(() => {
    if (!inputCurrency || !outputCurrency) return ''
    return getOrderExecutionRate(
      order.srcAmountFilled,
      order.dstAmountFilled,
      inputCurrency.decimals,
      outputCurrency.decimals,
    )
  }, [order, inputCurrency, outputCurrency])

  const { amount } = twapHooks.useParseCurrencyAmountUi(rate, outputCurrency)

  if (!rate) return null

  return (
    <ListItem>
      <OrderDetails.RowItem label={t('Real Execution Price')}>
        <OrderDetails.PriceRow
          amountRaw={amount?.numerator.toString()}
          inputCurrency={inputCurrency}
          outputCurrency={outputCurrency}
        />
      </OrderDetails.RowItem>
    </ListItem>
  )
}

const TriggerPriceRow = () => {
  const { t } = useTranslation()
  const { inputCurrency, outputCurrency, order } = useOrderDetailsContext()

  const triggerPrice = useMemo(() => {
    if (!inputCurrency || !outputCurrency) return ''
    return getTriggerPriceRate(order, inputCurrency.decimals, outputCurrency.decimals)
  }, [order, inputCurrency, outputCurrency])

  const { amount } = twapHooks.useParseCurrencyAmountUi(triggerPrice, outputCurrency)

  if (!order.isTriggerPrice) return null

  return (
    <ListItem>
      <OrderDetails.RowItem label={t('Trigger Price')}>
        <OrderDetails.PriceRow
          amountRaw={amount?.numerator.toString()}
          inputCurrency={inputCurrency}
          outputCurrency={outputCurrency}
        />
      </OrderDetails.RowItem>
    </ListItem>
  )
}

const FilledRow = () => {
  const { t } = useTranslation()
  const { inputCurrency, order } = useOrderDetailsContext()

  const { formatted: srcFilled } = twapHooks.useParseCurrencyAmountRaw(order.srcAmountFilled, inputCurrency)
  const { formatted: srcTotal } = twapHooks.useParseCurrencyAmountRaw(order.srcAmount, inputCurrency)
  const filledPct = order.progress ? `${Math.round(order.progress)}%` : '0%'

  return (
    <ListItem>
      <OrderDetails.RowItem label={t('Filled')}>
        <Text fontSize="14px" fontWeight={600} color="secondary">
          {filledPct}
        </Text>
      </OrderDetails.RowItem>
    </ListItem>
  )
}

const CreatedAtRow = () => {
  const { order } = useOrderDetailsContext()
  const createdAtStr = twapHooks.useFormattedDate(order.createdAt)
  const { t } = useTranslation()
  return (
    <ListItem>
      <OrderDetails.RowItem label={t('Created at')}>{createdAtStr}</OrderDetails.RowItem>
    </ListItem>
  )
}

const IDRow = () => {
  const { t } = useTranslation()
  const { order } = useOrderDetailsContext()
  return (
    <ListItem>
      <OrderDetails.RowItem label={t('ID')}>
        <QuestionHelperV2 text={<Text>{order.id}</Text>} placement="top">
          <OrderDetailValue>{!order.id.startsWith('0x') ? order.id : truncateHash(order.id, 6)}</OrderDetailValue>
        </QuestionHelperV2>
      </OrderDetails.RowItem>
    </ListItem>
  )
}

const StatusRow = () => {
  const { order } = useOrderDetailsContext()
  const statusTitle = useStatusTitle(order.status)
  const { t } = useTranslation()
  return (
    <ListItem>
      <OrderDetails.RowItem label={t('Status')}>
        <StatusBadge fontSize="13px" fontWeight={600} $status={order.status}>
          {statusTitle}
        </StatusBadge>
      </OrderDetails.RowItem>
    </ListItem>
  )
}

const TypeRow = () => {
  const { order } = useOrderDetailsContext()
  const typeTitle = twapHooks.useOrderTitle(order.type)
  const { t } = useTranslation()
  return (
    <ListItem>
      <OrderDetails.RowItem label={t('Type')}>{typeTitle}</OrderDetails.RowItem>
    </ListItem>
  )
}

const TotalTradesRow = () => {
  const { order } = useOrderDetailsContext()
  if (order.totalTradesAmount === 1) return null

  return (
    <ListItem>
      <OrderDetails.TradesAmountRow tradesAmount={order.totalTradesAmount} />
    </ListItem>
  )
}

const SizePerTradeRow = () => {
  const { t } = useTranslation()
  const { inputCurrency, order } = useOrderDetailsContext()

  if (order.totalTradesAmount === 1) return null

  return (
    <ListItem>
      <OrderDetails.InputSizePerTradeRow rawValue={order.srcAmountPerTrade} inputCurrency={inputCurrency} />
    </ListItem>
  )
}

const MinReceivedPerTradeRow = () => {
  const { outputCurrency, order } = useOrderDetailsContext()

  if (order.isMarketPrice) return null

  return (
    <ListItem>
      <OrderDetails.MinReceivedRow
        rawValue={order.dstMinAmountPerTrade}
        outputCurrency={outputCurrency}
        tradesAmount={order.totalTradesAmount}
      />
    </ListItem>
  )
}

const TradeIntervalRow = () => {
  const { order } = useOrderDetailsContext()
  const fillDelayMs = order.fillDelay

  if (order.totalTradesAmount === 1) return null

  return (
    <ListItem>
      <OrderDetails.TradeIntervalRow fillDelayMs={fillDelayMs} />
    </ListItem>
  )
}

const ExpirationRow = () => {
  const { order } = useOrderDetailsContext()
  return (
    <ListItem>
      <OrderDetails.ExpirationRow deadlineMs={order.deadline} />
    </ListItem>
  )
}

const FILLS_PER_PAGE = 6

const FillsTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 8px 12px;
    text-align: left;
    font-size: 13px;
  }

  th {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.secondary};
    border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
  }

  td {
    border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
  }

  tr:last-child td {
    border-bottom: none;
  }
`

type Fill = {
  inAmount: string
  outAmount: string
  txHash: string
  timestamp: number
}

const useExplorerLink = (txHash: string) => {
  const getBlockExploreLink = useBlockExploreLink()
  return useMemo(() => {
    return getBlockExploreLink(txHash, 'transaction')
  }, [getBlockExploreLink, txHash])
}

const FillModalItem = ({ fill, order, idx, page }: { fill: Fill; order: Order; idx: number; page: number }) => {
  const inputCurrency = twapHooks.useUnifiedCurrencyFromAddress(order.srcTokenAddress)
  const outputCurrency = twapHooks.useUnifiedCurrencyFromAddress(order.dstTokenAddress)
  const dateStr = twapHooks.useFormattedDate(fill.timestamp)

  const { formatted: inAmount } = twapHooks.useParseCurrencyAmountRaw(fill.inAmount, inputCurrency)
  const { formatted: outAmount } = twapHooks.useParseCurrencyAmountRaw(fill.outAmount, outputCurrency)
  const explorerLink = useExplorerLink(fill.txHash)

  return (
    <tr>
      <td>
        <Text fontSize="13px" color="textSubtle">
          {(page - 1) * FILLS_PER_PAGE + idx + 1}
        </Text>
      </td>
      <td>
        <Text fontSize="13px">
          {inAmount} {inputCurrency?.symbol}
        </Text>
      </td>
      <td>
        <Text fontSize="13px" color="success">
          {outAmount} {outputCurrency?.symbol}
        </Text>
      </td>
      <td>
        <Text fontSize="13px" color="textSubtle">
          {dateStr}
        </Text>
      </td>
      <td>
        {fill.txHash ? (
          <a href={explorerLink} target="_blank" rel="noopener noreferrer">
            <Text fontSize="13px" color="primary">
              {truncateHash(fill.txHash, 4)} ↗
            </Text>
          </a>
        ) : (
          <Text fontSize="13px" color="textSubtle">
            —
          </Text>
        )}
      </td>
    </tr>
  )
}

const MobileFillCard = styled(Flex)`
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
  flex-direction: column;
  gap: 6px;

  &:last-child {
    border-bottom: none;
  }
`

const MobileFillItem = ({ fill, order, idx, page }: { fill: Fill; order: Order; idx: number; page: number }) => {
  const { t } = useTranslation()
  const inputCurrency = twapHooks.useUnifiedCurrencyFromAddress(order.srcTokenAddress)
  const outputCurrency = twapHooks.useUnifiedCurrencyFromAddress(order.dstTokenAddress)
  const dateStr = twapHooks.useFormattedDate(fill.timestamp)

  const { formatted: inAmount } = twapHooks.useParseCurrencyAmountRaw(fill.inAmount, inputCurrency)
  const { formatted: outAmount } = twapHooks.useParseCurrencyAmountRaw(fill.outAmount, outputCurrency)
  const explorerLink = useExplorerLink(fill.txHash)

  return (
    <MobileFillCard>
      <Flex justifyContent="space-between" alignItems="center">
        <Text fontSize="13px" color="textSubtle">
          #{(page - 1) * FILLS_PER_PAGE + idx + 1}
        </Text>
        <Text fontSize="13px" color="textSubtle">
          {dateStr}
        </Text>
      </Flex>
      <Flex justifyContent="space-between" alignItems="center">
        <Text fontSize="13px" color="textSubtle">
          {t('In')}
        </Text>
        <Text fontSize="13px">
          {inAmount} {inputCurrency?.symbol}
        </Text>
      </Flex>
      <Flex justifyContent="space-between" alignItems="center">
        <Text fontSize="13px" color="textSubtle">
          {t('Out')}
        </Text>
        <Text fontSize="13px" color="success">
          {outAmount} {outputCurrency?.symbol}
        </Text>
      </Flex>
      {fill.txHash && (
        <Flex justifyContent="flex-end">
          <a href={explorerLink} target="_blank" rel="noopener noreferrer">
            <Text fontSize="13px" color="primary">
              {truncateHash(fill.txHash, 4)} ↗
            </Text>
          </a>
        </Flex>
      )}
    </MobileFillCard>
  )
}

const FillsModalContent = ({ order }: { order: Order }) => {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const { isMobile } = useMatchBreakpoints()

  const fills = order.fills ?? []
  const totalPages = Math.max(1, Math.ceil(fills.length / FILLS_PER_PAGE))
  const pagedFills = fills.slice((page - 1) * FILLS_PER_PAGE, page * FILLS_PER_PAGE)

  return (
    <Flex flexDirection="column" style={{ maxHeight: '60vh', overflow: 'hidden' }}>
      <Flex justifyContent="space-between" alignItems="center" mb="12px">
        <Text fontSize="14px" color="textSubtle">
          {t('%count% fills', { count: fills.length })}
        </Text>
      </Flex>
      <Box style={{ overflowY: 'auto', flex: 1 }}>
        {isMobile ? (
          <Flex flexDirection="column">
            {pagedFills.map((fill, idx) => (
              <MobileFillItem key={fill.txHash + idx} fill={fill} order={order} idx={idx} page={page} />
            ))}
          </Flex>
        ) : (
          <FillsTable>
            <thead>
              <tr>
                <th>#</th>
                <th>{t('In')}</th>
                <th>{t('Out')}</th>
                <th>{t('Date')}</th>
                <th>{t('Tx')}</th>
              </tr>
            </thead>
            <tbody>
              {pagedFills.map((fill, idx) => {
                return <FillModalItem key={fill.txHash + idx} fill={fill} order={order} idx={idx} page={page} />
              })}
            </tbody>
          </FillsTable>
        )}
      </Box>
      {totalPages > 1 && (
        <Flex style={{ marginTop: 'auto' }}>
          <PaginationButton currentPage={page} maxPage={totalPages} showMaxPageText setCurrentPage={setPage} />
        </Flex>
      )}
    </Flex>
  )
}

const ViewFillsButton = () => {
  const { t } = useTranslation()
  const fillsModal = useModalV2()
  const { order } = useOrderDetailsContext()
  const type = twapHooks.useOrderTitle(order.type)

  return (
    <>
      <Flex justifyContent="space-between" alignItems="center" style={{ marginLeft: 'auto' }}>
        {order.fills && order.fills.length > 0 && (
          <Button scale="sm" onClick={fillsModal.onOpen} variant="primary60">
            <Text fontSize="13px" fontWeight={600}>
              {t('View Fills')} ({order.fills.length})
            </Text>
          </Button>
        )}
      </Flex>
      <ModalV2 isOpen={fillsModal.isOpen} onDismiss={fillsModal.onDismiss} closeOnOverlayClick>
        <Modal title={`${t('Order Fills')} — ${type}`} onDismiss={fillsModal.onDismiss} minWidth="min(90vw, 600px)">
          <FillsModalContent order={order} />
        </Modal>
      </ModalV2>
    </>
  )
}

const CancelOrderButton = () => {
  const { t } = useTranslation()
  const { order } = useOrderDetailsContext()
  const { cancelOrder, isLoading } = useCancelOrder(order)

  if (order.status !== OrderStatus.Open) return null

  return (
    <Button variant="tertiary" scale="sm" onClick={cancelOrder} isLoading={isLoading} style={{ padding: '0 12px' }}>
      <Text fontSize="13px" color="textSubtle" fontWeight={600}>
        {isLoading ? t('Cancelling...') : t('Cancel Order')}
      </Text>
    </Button>
  )
}

const ExplorerLinkRow = () => {
  const { order } = useOrderDetailsContext()
  const explorerLink = useExplorerLink(order.txHash ?? '')
  const { t } = useTranslation()

  if (order.version !== 1) return null

  return (
    <a href={explorerLink} target="_blank" rel="noopener noreferrer">
      <Button scale="sm" variant="primary60" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Text fontSize="14px" fontWeight={600}>
          {t('View on Explorer')}
        </Text>
        <BscScanIcon width={20} />
      </Button>
    </a>
  )
}

const ExpandedContent = ({ order }: { order: Order }) => {
  const inputCurrency = twapHooks.useUnifiedCurrencyFromAddress(order.srcTokenAddress)
  const outputCurrency = twapHooks.useUnifiedCurrencyFromAddress(order.dstTokenAddress)

  return (
    <OrderDetailsContext.Provider value={{ inputCurrency, outputCurrency, order }}>
      <OrderDetailsContent>
        <OrderDetailsContentInner>
          <StatusRow />
          <TypeRow />
          <IDRow />
          <CreatedAtRow />
          <LimitPriceRow />
          <TriggerPriceRow />
          <MinReceivedPerTradeRow />
          <FilledRow />
          <TotalTradesRow />
          <SizePerTradeRow />
          <TradeIntervalRow />
          <ExpirationRow />
          <AvgExecutionPriceRow />
        </OrderDetailsContentInner>
        <Flex
          justifyContent="flex-end"
          alignItems="center"
          style={{ gap: 8, marginTop: '8px', width: 'auto', marginLeft: 'auto' }}
        >
          <CancelOrderButton />
          <ViewFillsButton />
          <ExplorerLinkRow />
        </Flex>
      </OrderDetailsContent>
    </OrderDetailsContext.Provider>
  )
}

export const OrderRow = ({
  order,
  isExpanded,
  onToggle,
}: {
  order: Order
  isExpanded: boolean
  onToggle: () => void
}) => {
  const { t } = useTranslation()
  const { isMobile } = useMatchBreakpoints()
  const inputCurrency = twapHooks.useUnifiedCurrencyFromAddress(order.srcTokenAddress)
  const outputCurrency = twapHooks.useUnifiedCurrencyFromAddress(order.dstTokenAddress)
  const { formatted: inputAmount } = twapHooks.useParseCurrencyAmountRaw(order.srcAmount, inputCurrency)
  const { formatted: outputAmountFilled } = twapHooks.useParseCurrencyAmountRaw(order.dstAmountFilled, outputCurrency)
  const statusTitle = useStatusTitle(order.status)

  return (
    <Box>
      <OrderCard alignItems="center" justifyContent="space-between">
        <OrderPreviewCard onClick={onToggle}>
          {isMobile ? (
            <>
              {/* Mobile top row: tokens + chevron */}
              <Flex justifyContent="space-between" alignItems="center" width="100%">
                <Flex flexDirection="column" style={{ gap: 2 }}>
                  <Flex alignItems="center" style={{ gap: 6 }}>
                    {inputCurrency && <CurrencyLogo currency={inputCurrency} />}
                    <Text fontSize="14px" fontWeight={600} color="primary">
                      {inputAmount ?? '—'} {inputCurrency?.symbol}
                    </Text>
                  </Flex>
                  <Flex alignItems="center" style={{ gap: 6 }}>
                    {outputCurrency && <CurrencyLogo currency={outputCurrency} />}
                    <Text fontSize="14px" fontWeight={600} color="success">
                      {outputAmountFilled !== '0' ? outputAmountFilled : ''} {outputCurrency?.symbol}
                    </Text>
                  </Flex>
                </Flex>
                <Text fontSize="16px" color="textSubtle">
                  {!isExpanded ? <ChevronDownIcon /> : <ChevronUpIcon />}
                </Text>
              </Flex>
              {/* Mobile bottom row: rate + status */}
              <Flex justifyContent="space-between" alignItems="center" width="100%">
                <Text fontSize="14px" color="textSubtle">
                  <Rate order={order} />
                </Text>
                <StatusBadge fontSize="13px" fontWeight={600} $status={order.status}>
                  {isExpanded ? t('Hide') : statusTitle}
                </StatusBadge>
              </Flex>
            </>
          ) : (
            /* Desktop: single row */
            <Flex justifyContent="space-between" alignItems="center" width="100%">
              <Flex flexDirection="column" style={{ gap: 2 }}>
                <Flex alignItems="center" style={{ gap: 6 }}>
                  {inputCurrency && <CurrencyLogo currency={inputCurrency} />}
                  <Text fontSize="14px" fontWeight={600} color="primary">
                    {inputAmount ?? '—'} {inputCurrency?.symbol}
                  </Text>
                </Flex>
                <Flex alignItems="center" style={{ gap: 6 }}>
                  {outputCurrency && <CurrencyLogo currency={outputCurrency} />}
                  <Text fontSize="14px" fontWeight={600} color="success">
                    {outputAmountFilled !== '0' ? outputAmountFilled : ''} {outputCurrency?.symbol}
                  </Text>
                </Flex>
              </Flex>

              <Text fontSize="14px" color="textSubtle">
                <Rate order={order} />
              </Text>

              <Flex alignItems="center" style={{ gap: 8 }}>
                <StatusBadge fontSize="13px" fontWeight={600} $status={order.status}>
                  {isExpanded ? t('Hide') : statusTitle}
                </StatusBadge>
                <Text
                  fontSize="16px"
                  color="textSubtle"
                  style={{
                    position: 'relative',
                    top: '2px',
                  }}
                >
                  {!isExpanded ? <ChevronDownIcon /> : <ChevronUpIcon />}
                </Text>
              </Flex>
            </Flex>
          )}
        </OrderPreviewCard>

        {isExpanded && <ExpandedContent order={order} />}
      </OrderCard>
    </Box>
  )
}
