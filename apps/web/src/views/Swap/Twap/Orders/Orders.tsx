import { OrderStatus, useSpot } from '@orbs-network/spot-react'
import { useTranslation } from '@pancakeswap/localization'
import {
  Flex,
  ButtonMenu,
  ButtonMenuItem,
  Toggle,
  Skeleton,
  Text,
  PaginationButton,
  useMatchBreakpoints,
} from '@pancakeswap/uikit'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { OrderRow } from './Order'
import { FormContainer } from 'views/SwapSimplify/InfinitySwap/FormContainer'

const ORDERS_PER_PAGE = 6

const ORDER_TAB_OPEN = 0
const ORDER_TAB_HISTORY = 1
const TWAP_ORDERS_PORTAL_ID = 'twap-orders-portal'

const OrderHistoryContent = () => {
  const { t } = useTranslation()
  const panel = useSpot().orderHistoryPanel
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState(ORDER_TAB_OPEN)
  const [hideCancelled, setHideCancelled] = useState(false)

  const filteredOrders = useMemo(() => {
    if (activeTab === ORDER_TAB_OPEN) {
      return panel.orders.open
    }
    // History = all non-open
    let orders = panel.orders.all.filter((o) => o.status !== OrderStatus.Open)
    if (hideCancelled) {
      orders = orders.filter((o) => o.status !== OrderStatus.Cancelled)
    }
    return orders
  }, [panel.orders, activeTab, hideCancelled])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE))
  const pagedOrders = useMemo(
    () => filteredOrders.slice((page - 1) * ORDERS_PER_PAGE, page * ORDERS_PER_PAGE),
    [filteredOrders, page],
  )

  const handleTabChange = useCallback((index: number) => {
    setActiveTab(index)
    setPage(1)
    setExpandedId(null)
  }, [])

  const showHideCancelledToggle = useMemo(() => {
    return activeTab === ORDER_TAB_HISTORY && panel.orders.cancelled.length > 0
  }, [activeTab, panel.orders.cancelled])

  const { isMobile } = useMatchBreakpoints()

  return (
    <FormContainer>
      {/* Tabs + Hide cancelled toggle */}
      {isMobile ? (
        <>
          <ButtonMenu scale="sm" activeIndex={activeTab} onItemClick={handleTabChange} variant="subtle">
            <ButtonMenuItem>
              {t('Open Orders')} ({panel.orders.open.length})
            </ButtonMenuItem>
            <ButtonMenuItem>{t('Order History')}</ButtonMenuItem>
          </ButtonMenu>
          {showHideCancelledToggle && (
            <Flex alignItems="center" justifyContent="flex-end" mt="4px" style={{ gap: 8 }}>
              <Text fontSize="13px" color="textSubtle" style={{ whiteSpace: 'nowrap' }}>
                {t('Hide cancelled orders')}
              </Text>
              <Toggle scale="sm" checked={hideCancelled} onChange={() => setHideCancelled(!hideCancelled)} />
            </Flex>
          )}
        </>
      ) : (
        <Flex justifyContent="space-between" alignItems="center" style={{ gap: 8 }}>
          <ButtonMenu scale="sm" activeIndex={activeTab} onItemClick={handleTabChange} variant="subtle">
            <ButtonMenuItem>
              {t('Open Orders')} ({panel.orders.open.length})
            </ButtonMenuItem>
            <ButtonMenuItem>{t('Order History')}</ButtonMenuItem>
          </ButtonMenu>
          {showHideCancelledToggle && (
            <Flex alignItems="center" style={{ gap: 8 }}>
              <Text fontSize="13px" color="textSubtle" style={{ whiteSpace: 'nowrap' }}>
                {t('Hide cancelled orders')}
              </Text>
              <Toggle scale="sm" checked={hideCancelled} onChange={() => setHideCancelled(!hideCancelled)} />
            </Flex>
          )}
        </Flex>
      )}

      {/* Orders list */}
      {panel.isLoading ? (
        <Flex justifyContent="center" p="24px">
          <Skeleton animation="pulse" width="100%" height="60px" />
        </Flex>
      ) : pagedOrders.length === 0 ? (
        <Flex justifyContent="center" p="24px">
          <Text color="textSubtle">{t('No Open Orders')}</Text>
        </Flex>
      ) : (
        <Flex flexDirection="column" style={{ gap: 8 }}>
          {pagedOrders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              isExpanded={expandedId === order.id}
              onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
            />
          ))}
        </Flex>
      )}

      {totalPages > 1 && (
        <PaginationButton currentPage={page} maxPage={totalPages} showMaxPageText setCurrentPage={setPage} />
      )}
    </FormContainer>
  )
}

export const TwapOrdersPortal = () => {
  const [container, setContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const find = () => {
      const el = document.getElementById(TWAP_ORDERS_PORTAL_ID)
      setContainer((prev) => (prev === el ? prev : el))
    }

    find()

    // Re-find when the DOM changes (e.g. desktop ↔ mobile layout swap)
    const observer = new MutationObserver(find)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  if (!container) return null
  return createPortal(<OrderHistoryContent />, container)
}

export const TwapOrdersTarget = () => <div id={TWAP_ORDERS_PORTAL_ID} style={{ width: '100%', marginTop: '-4px' }} />
