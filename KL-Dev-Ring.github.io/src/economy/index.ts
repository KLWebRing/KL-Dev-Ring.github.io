// ── KL DevVerse — Economy Module Barrel Export ───────────────────────
// Single import point for all economy components and types.

// Types
export type {
  CurrencyType,
  CurrencyDisplay,
  Wallet,
  WalletTransaction,
  TransactionType,
  TransactionPage,
  DailyRewardResult,
  ItemRarity,
  RarityDisplay,
  MarketplaceItem,
  StudioTierDef,
} from './economyTypes';

export { CURRENCY_DISPLAY, RARITY_DISPLAY, STUDIO_TIERS } from './economyTypes';

// Components
export { WalletHUD } from './WalletHUD';
export { MarketplacePanel } from './MarketplacePanel';
export { MarketplaceItemCard } from './MarketplaceItemCard';
export { MarketplaceItemDetail } from './MarketplaceItemDetail';
export { PurchaseFlow } from './PurchaseFlow';
export { StudioUpgradePanel } from './StudioUpgradePanel';
export { EconomyNotification } from './EconomyNotification';
