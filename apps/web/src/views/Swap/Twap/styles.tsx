import { Box, Flex, QuestionHelperV2, Text } from '@pancakeswap/uikit'
import { NumericalInput } from '@pancakeswap/widgets-internal'
import { RowFixed } from 'components/Layout/Row'
import { styled } from 'styled-components'
import { DetailsTitle } from 'views/SwapSimplify/InfinitySwap/AdvancedSwapDetails'

export const PanelCard = styled(Box)<{ error?: boolean }>`
  background: ${({ theme }) => theme.colors.input};
  border-radius: 24px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: inset 0px 2px 2px -1px rgba(74, 74, 104, 0.1);
  border: ${({ theme, error }) => (error ? `1px solid ${theme.colors.failure}` : '1px solid transparent')};
`

export const PanelCardFocus = styled(PanelCard)`
  transition: box-shadow 0.2s;
  &:focus-within {
    box-shadow: 0px 0px 0px 1px #7645d9, 0px 0px 0px 4px rgba(118, 69, 217, 0.6);
  }
`

export const PricePill = styled(PanelCardFocus)`
  display: flex;
  flex: 1;
  flex-direction: row;
  align-items: center;
`

export const PercentPill = styled(PanelCardFocus)`
  width: 180px;
  flex-direction: row;
  align-items: center;
`

export const PriceConfigSectionWrapper = styled(Flex)`
  flex-direction: column;
  gap: 20px;
`

export const MediumInput = styled(NumericalInput)`
  text-align: left;
  font-weight: 600;
  font-size: 24px;
`

export const LabelWithTooltip = ({ label, tooltip }: { label: string; tooltip?: string }) => {
  return (
    <RowFixed>
      <QuestionHelperV2 text={<Text>{tooltip}</Text>} placement="top">
        <DetailsTitle>{label}</DetailsTitle>
      </QuestionHelperV2>
    </RowFixed>
  )
}

export const ResetButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <Text
    fontSize="13px"
    color="primary"
    style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
    onClick={onClick}
    role="button"
  >
    {label}
  </Text>
)
