// ── KL DevVerse — Furniture Catalog ──────────────────────────────────
// Data-driven furniture definitions. Every furniture item in the game
// is defined here. The 3D renderer reads this catalog to know what to
// draw. The backend uses catalogId references.

import type { FurnitureCatalogEntry } from '@/shared/types';

export const FURNITURE_CATALOG: readonly FurnitureCatalogEntry[] = [
  // ── Desks ──────────────────────────────────────────────────────────
  {
    id: 'furn_desk_basic',
    name: 'Basic Desk',
    description: 'A simple wooden desk. Every builder starts here.',
    category: 'desk',
    rarity: 'common',
    variants: ['default', 'dark_wood', 'light_wood'],
    icon: '🪵',
    defaultSlot: 'workspace_desk_1',
    scale: 1.0,
  },
  {
    id: 'furn_desk_gaming',
    name: 'Gaming Desk',
    description: 'RGB underglow and cable management. Peak productivity.',
    category: 'desk',
    rarity: 'uncommon',
    variants: ['default', 'black', 'white'],
    icon: '🖥️',
    defaultSlot: 'workspace_desk_1',
    scale: 1.1,
  },
  {
    id: 'furn_desk_standing',
    name: 'Standing Desk',
    description: 'For the health-conscious builder. Adjustable height.',
    category: 'desk',
    rarity: 'rare',
    variants: ['default', 'bamboo'],
    icon: '🏋️',
    defaultSlot: 'workspace_desk_1',
    scale: 1.0,
  },

  // ── Chairs ─────────────────────────────────────────────────────────
  {
    id: 'furn_chair_basic',
    name: 'Basic Chair',
    description: 'Gets the job done. Your back may disagree.',
    category: 'chair',
    rarity: 'common',
    variants: ['default', 'blue', 'red'],
    icon: '🪑',
    defaultSlot: 'workspace_chair_1',
    scale: 0.9,
  },
  {
    id: 'furn_chair_ergo',
    name: 'Ergonomic Chair',
    description: 'Lumbar support for marathon coding sessions.',
    category: 'chair',
    rarity: 'uncommon',
    variants: ['default', 'mesh_black', 'mesh_gray'],
    icon: '💺',
    defaultSlot: 'workspace_chair_1',
    scale: 1.0,
  },
  {
    id: 'furn_chair_gaming',
    name: 'Gaming Chair',
    description: 'Racing stripes add 10% more commits.',
    category: 'chair',
    rarity: 'rare',
    variants: ['default', 'red_black', 'blue_black'],
    icon: '🎮',
    defaultSlot: 'workspace_chair_1',
    scale: 1.0,
  },

  // ── Monitors ───────────────────────────────────────────────────────
  {
    id: 'furn_monitor_basic',
    name: 'Basic Monitor',
    description: 'A standard 24-inch display.',
    category: 'monitor',
    rarity: 'common',
    variants: ['default'],
    icon: '🖥️',
    defaultSlot: 'workspace_monitor_1',
    scale: 0.8,
  },
  {
    id: 'furn_monitor_ultrawide',
    name: 'Ultrawide Monitor',
    description: 'Three terminals side by side. Living the dream.',
    category: 'monitor',
    rarity: 'rare',
    variants: ['default', 'curved'],
    icon: '📺',
    defaultSlot: 'workspace_monitor_1',
    scale: 1.2,
  },
  {
    id: 'furn_monitor_triple',
    name: 'Triple Monitor Setup',
    description: 'Docs, code, and Stack Overflow simultaneously.',
    category: 'monitor',
    rarity: 'epic',
    variants: ['default'],
    icon: '🖥️',
    defaultSlot: 'workspace_monitor_1',
    scale: 1.4,
  },

  // ── Bookshelves ────────────────────────────────────────────────────
  {
    id: 'furn_bookshelf_basic',
    name: 'Basic Bookshelf',
    description: 'O\'Reilly books and a few manga volumes.',
    category: 'bookshelf',
    rarity: 'common',
    variants: ['default', 'tall', 'wide'],
    icon: '📚',
    defaultSlot: 'living_room_shelf_1',
    scale: 1.0,
  },
  {
    id: 'furn_bookshelf_tech',
    name: 'Tech Library',
    description: 'CLRS, SICP, and Design Patterns. All well-thumbed.',
    category: 'bookshelf',
    rarity: 'uncommon',
    variants: ['default'],
    icon: '📖',
    defaultSlot: 'living_room_shelf_1',
    scale: 1.1,
  },

  // ── Plants ─────────────────────────────────────────────────────────
  {
    id: 'furn_plant_basic',
    name: 'Desk Plant',
    description: 'A small potted plant. 100% chance of not being watered.',
    category: 'plant',
    rarity: 'common',
    variants: ['default', 'succulent', 'fern'],
    icon: '🌱',
    defaultSlot: 'living_room_plant_1',
    scale: 0.6,
  },
  {
    id: 'furn_plant_palm',
    name: 'Mini Palm',
    description: 'Brings Kerala vibes to your workspace.',
    category: 'plant',
    rarity: 'uncommon',
    variants: ['default'],
    icon: '🌴',
    defaultSlot: 'living_room_plant_1',
    scale: 1.0,
  },

  // ── Lamps ──────────────────────────────────────────────────────────
  {
    id: 'furn_lamp_desk',
    name: 'Desk Lamp',
    description: 'Adjustable arm lamp for late-night sessions.',
    category: 'lamp',
    rarity: 'common',
    variants: ['default', 'warm', 'cool'],
    icon: '💡',
    defaultSlot: 'workspace_lamp_1',
    scale: 0.5,
  },
  {
    id: 'furn_lamp_neon',
    name: 'Neon Sign',
    description: '"Hello World" in neon. Obviously.',
    category: 'lamp',
    rarity: 'rare',
    variants: ['hello_world', 'code', 'custom'],
    icon: '🔮',
    defaultSlot: 'living_room_lamp_1',
    scale: 0.7,
  },

  // ── Sofas ──────────────────────────────────────────────────────────
  {
    id: 'furn_sofa_basic',
    name: 'Basic Sofa',
    description: 'A comfortable two-seater. Great for pair programming.',
    category: 'sofa',
    rarity: 'common',
    variants: ['default', 'gray', 'green'],
    icon: '🛋️',
    defaultSlot: 'living_room_sofa_1',
    scale: 1.0,
  },

  // ── Whiteboards ────────────────────────────────────────────────────
  {
    id: 'furn_whiteboard_basic',
    name: 'Whiteboard',
    description: 'For system design interviews you\'ll never have in a metaverse.',
    category: 'whiteboard',
    rarity: 'uncommon',
    variants: ['default', 'large'],
    icon: '📋',
    defaultSlot: 'workspace_board_1',
    scale: 1.0,
  },

  // ── Laptops ────────────────────────────────────────────────────────
  {
    id: 'furn_laptop_basic',
    name: 'Laptop',
    description: 'A developer laptop. Sticker collection sold separately.',
    category: 'laptop',
    rarity: 'common',
    variants: ['default', 'stickered'],
    icon: '💻',
    defaultSlot: 'workspace_desk_1',
    scale: 0.5,
  },
] as const;

/** Lookup a furniture item by catalog ID */
export function getFurnitureById(id: string): FurnitureCatalogEntry | undefined {
  return FURNITURE_CATALOG.find((f) => f.id === id);
}

/** Get all furniture in a category */
export function getFurnitureByCategory(category: FurnitureCatalogEntry['category']): readonly FurnitureCatalogEntry[] {
  return FURNITURE_CATALOG.filter((f) => f.category === category);
}
