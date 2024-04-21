import { Currency, Price } from "@pancakeswap/swap-sdk-core";
import { AtomBox, AutoRenewIcon, Loading, SwapCSS, SyncAltIcon, Text } from "@pancakeswap/uikit";
import { formatPrice } from "@pancakeswap/utils/formatFractions";
import { useState } from "react";

interface TradePriceProps {
  price?: Price<Currency, Currency>;
  loading?: boolean;
  onClick?: () => void;
}

export function TradePrice({ price, loading, onClick }: TradePriceProps) {
  const [showInverted, setShowInverted] = useState<boolean>(false);

  const formattedPrice = showInverted ? formatPrice(price, 6) : formatPrice(price?.invert(), 6);
  const show = Boolean(price?.baseCurrency && price?.quoteCurrency);

  const onShowInverted = () => {
    setShowInverted(!showInverted);
    onClick?.();
  };

  return (
    <Text
      fontSize="14px"
      style={{ justifyContent: "center", alignItems: "center", display: "flex", opacity: loading ? 0.6 : 1 }}
    >
      {show ? (
        <>
          {`1 ${showInverted ? price?.baseCurrency?.symbol : price?.quoteCurrency?.symbol}`}
          <SyncAltIcon width="14px" height="14px" color="textSubtle" ml="4px" mr="4px" />
          {`${formattedPrice} ${showInverted ? price?.quoteCurrency?.symbol : price?.baseCurrency?.symbol}`}
          {loading ? (
            <AtomBox className={SwapCSS.iconButtonClass}>
              <Loading width="12px" height="12px" />
            </AtomBox>
          ) : (
            <AtomBox role="button" className={SwapCSS.iconButtonClass} onClick={onShowInverted}>
              <AutoRenewIcon width="14px" />
            </AtomBox>
          )}
        </>
      ) : (
        "-"
      )}
    </Text>
  );
}
