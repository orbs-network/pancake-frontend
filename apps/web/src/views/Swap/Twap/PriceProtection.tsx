import { useTheme } from '@pancakeswap/hooks'
import { useTranslation } from '@pancakeswap/localization'
import {
  Box,
  Button,
  Flex,
  FlexGap,
  Input,
  Message,
  ModalV2,
  MotionModal,
  PencilIcon,
  QuestionHelper,
  RowBetween,
  RowFixed,
  QuestionHelperV2,
  DottedHelpText,
  Text,
  useModalV2,
} from '@pancakeswap/uikit'
import { VerticalDivider } from '@pancakeswap/widgets-internal'
import { atom, useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { useCallback, useMemo, useState } from 'react'
import styled from 'styled-components'
import { escapeRegExp } from 'utils'

// ─── Price protection state ──────────────────────────────────────
// Values in basis points: 100 = 1%, 300 = 3%, 500 = 5%
// "auto" means use the default (300 = 3%)

const AUTO_PRICE_PROTECTION = 300 // 3% in basis points
const PRICE_PROTECTION_OPTIONS = [100, 300, 500] as const // 1%, 3%, 5%

const priceProtectionAtom = atomWithStorage<number | 'auto'>('twap:priceProtection', 'auto')

const priceProtectionDerivedAtom = atom(
  (get) => {
    const value = get(priceProtectionAtom)
    return {
      value: value === 'auto' ? AUTO_PRICE_PROTECTION : value,
      isAuto: value === 'auto',
    }
  },
  (_get, set, newValue: number | 'auto') => {
    set(priceProtectionAtom, newValue)
  },
)

export const useUserPriceProtection = () => {
  const [derived, setRaw] = useAtom(priceProtectionDerivedAtom)

  const setValue = useCallback(
    (val: number | 'auto') => {
      setRaw(val)
    },
    [setRaw],
  )

  return {
    priceProtection: derived.value,
    isAuto: derived.isAuto,
    setPriceProtection: setValue,
  }
}

// ─── Styled components ───────────────────────────────────────────

const TertiaryButton = styled(Button).attrs({ variant: 'tertiary' })<{ $color: string }>`
  height: unset;
  padding: 7px 8px;
  font-size: 14px;
  border-radius: 12px;
  border-bottom: 2px solid rgba(0, 0, 0, 0.1);
  color: ${({ $color }) => $color};
`

const ButtonsContainer = styled(FlexGap).attrs({ flexWrap: 'wrap', gap: '4px' })`
  background-color: ${({ theme }) => theme.colors.input};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 1px;
  width: fit-content;
  box-shadow: ${({ theme }) => theme.shadows.inset};
`

const StyledButton = styled(Button)`
  height: 48px;
  padding: 0 16px;
`

const StyledVerticalDivider = styled(VerticalDivider).attrs(({ theme }) => ({ bg: theme.colors.inputSecondary }))`
  margin: 0 4px;
`

const inputRegex = RegExp(`^\\d*(?:\\\\[.])?\\d*$`)

// ─── Setting panel (shown inside modal) ──────────────────────────

const PriceProtectionSetting = () => {
  const { t } = useTranslation()
  const { priceProtection, isAuto, setPriceProtection } = useUserPriceProtection()
  const [customInput, setCustomInput] = useState('')

  const isCustom = !isAuto && !PRICE_PROTECTION_OPTIONS.includes(priceProtection as any)

  const parseCustomValue = (value: string) => {
    if (value === '' || inputRegex.test(escapeRegExp(value))) {
      setCustomInput(value)
      try {
        const parsed = Number.parseFloat(value)
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 100) {
          const bps = Math.round(parsed * 100)
          setPriceProtection(bps)
        }
      } catch (error) {
        console.error(error)
      }
    }
  }

  const inputIsValid =
    customInput === '' || (priceProtection / 100).toFixed(2) === Number.parseFloat(customInput).toFixed(2)
  const hasError = customInput !== '' && !inputIsValid

  return (
    <FlexGap flexDirection="column" gap="24px">
      <Flex flexDirection="column">
        <ButtonsContainer>
          <StyledButton
            scale="sm"
            onClick={() => {
              setCustomInput('')
              setPriceProtection('auto')
            }}
            variant={isAuto ? 'subtle' : 'light'}
          >
            {t('Auto')} (3%)
          </StyledButton>
          {PRICE_PROTECTION_OPTIONS.map((bp) => {
            const pct = bp / 100
            const isActive = !isAuto && priceProtection === bp && !isCustom
            return (
              <StyledButton
                key={bp}
                scale="sm"
                onClick={() => {
                  setCustomInput('')
                  setPriceProtection(bp)
                }}
                variant={isActive ? 'subtle' : 'light'}
              >
                {pct}%
              </StyledButton>
            )
          })}
          <Flex ml="8px" pr="8px" alignItems="center">
            <Box position="relative" width="82px">
              <Input
                scale="md"
                inputMode="decimal"
                pattern="^[0-9]*[.,]?[0-9]{0,2}$"
                placeholder={isAuto ? 'Auto' : (priceProtection / 100).toFixed(2)}
                value={customInput}
                onBlur={() => {
                  parseCustomValue((priceProtection / 100).toFixed(2))
                }}
                onChange={(event) => {
                  if (isAuto) {
                    setPriceProtection(AUTO_PRICE_PROTECTION)
                  }
                  if (event.currentTarget.validity.valid) {
                    parseCustomValue(event.target.value.replace(/,/g, '.'))
                  }
                }}
                isWarning={hasError}
                isSuccess={isCustom}
                style={{ paddingRight: '28px' }}
              />
              <Flex position="absolute" right="8px" top="8px" alignItems="center">
                <StyledVerticalDivider />
                <Text color="textSubtle">%</Text>
              </Flex>
            </Box>
          </Flex>
        </ButtonsContainer>

        {hasError && (
          <Message mt="8px" variant="primary">
            <Text>{t('Enter a valid percentage between 0 and 100')}</Text>
          </Message>
        )}
      </Flex>
    </FlexGap>
  )
}

// ─── Button that shows current value + opens modal ───────────────

const PriceProtectionButton = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { priceProtection, isAuto } = useUserPriceProtection()
  const { isOpen, onOpen, onDismiss } = useModalV2()

  const displayValue = `${(priceProtection / 100).toFixed(0)}%`
  const color = theme.colors.primary60

  return (
    <>
      <div style={{ textAlign: 'center' }}>
        <TertiaryButton $color={color} endIcon={<PencilIcon color={color} width={12} />} onClick={onOpen}>
          {isAuto ? `${t('Auto')}: ` : ''}
          {displayValue}
        </TertiaryButton>
      </div>
      <ModalV2 isOpen={isOpen} onDismiss={onDismiss} closeOnOverlayClick>
        <MotionModal
          title={
            <Flex justifyContent="center">
              {t('Price Protection')}
              <QuestionHelper
                text={t(
                  'The protocol uses an oracle price to help protect users from unfavorable executions. If the execution price is worse than the oracle price by more than the allowed percentage, the transaction will not be executed.',
                )}
                ml="4px"
                placement="top-start"
              />
            </Flex>
          }
          onDismiss={onDismiss}
          minHeight="100px"
        >
          <PriceProtectionSetting />
        </MotionModal>
      </ModalV2>
    </>
  )
}

// ─── Row export (used in Twap form) ──────────────────────────────

export const PriceProtection = () => {
  const { t } = useTranslation()

  return (
    <RowBetween>
      <RowFixed>
        <QuestionHelperV2
          placement="top"
          text={t(
            'The protocol uses an oracle price to help protect users from unfavorable executions. If the execution price is worse than the oracle price by more than the allowed percentage, the transaction will not be executed.',
          )}
        >
          <DottedHelpText fontSize="14px">{t('Price Protection')}</DottedHelpText>
        </QuestionHelperV2>
      </RowFixed>
      <PriceProtectionButton />
    </RowBetween>
  )
}
