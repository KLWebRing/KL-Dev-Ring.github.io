// ── KL DevVerse — Achievement Catalog ────────────────────────────────
// Data-driven achievement definitions. The backend checks conditions
// and unlocks achievements by ID. The client reads this catalog to
// render the UI.

import type { AchievementDefinition } from '@/shared/types';

export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════
  // Account — granted on basic lifecycle events
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'ach_account_created',
    name: 'Welcome to DevVerse',
    description: 'Created your KL DevVerse account.',
    icon: '🎉',
    category: 'account',
    rarity: 'common',
    maxProgress: 1,
    xpReward: 10,
    itemReward: null,
  },
  {
    id: 'ach_first_login',
    name: 'First Steps',
    description: 'Logged in for the first time.',
    icon: '👣',
    category: 'account',
    rarity: 'common',
    maxProgress: 1,
    xpReward: 10,
    itemReward: null,
  },
  {
    id: 'ach_profile_complete',
    name: 'Identity Established',
    description: 'Completed your developer profile.',
    icon: '🪪',
    category: 'account',
    rarity: 'common',
    maxProgress: 1,
    xpReward: 25,
    itemReward: 'deco_poster_code',
  },

  // ═══════════════════════════════════════════════════════════════════
  // Exploring — discovering the world
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'ach_explorer_1',
    name: 'Explorer',
    description: 'Visited 5 different areas of the map.',
    icon: '🗺️',
    category: 'exploring',
    rarity: 'common',
    maxProgress: 5,
    xpReward: 50,
    itemReward: null,
  },
  {
    id: 'ach_explorer_2',
    name: 'Wanderer',
    description: 'Visited every district in DevVerse.',
    icon: '🧭',
    category: 'exploring',
    rarity: 'uncommon',
    maxProgress: 1,
    xpReward: 100,
    itemReward: 'ward_shoes_boots',
  },
  {
    id: 'ach_house_visitor',
    name: 'Friendly Neighbor',
    description: 'Visited 10 different player houses.',
    icon: '🏠',
    category: 'exploring',
    rarity: 'uncommon',
    maxProgress: 10,
    xpReward: 75,
    itemReward: null,
  },

  // ═══════════════════════════════════════════════════════════════════
  // Social — interacting with other players
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'ach_socializer_1',
    name: 'Socializer',
    description: 'Made your first friend.',
    icon: '🤝',
    category: 'social',
    rarity: 'common',
    maxProgress: 1,
    xpReward: 30,
    itemReward: null,
  },
  {
    id: 'ach_socializer_2',
    name: 'Networker',
    description: 'Made 10 friends.',
    icon: '🌐',
    category: 'social',
    rarity: 'uncommon',
    maxProgress: 10,
    xpReward: 100,
    itemReward: 'deco_banner_devverse',
  },
  {
    id: 'ach_socializer_3',
    name: 'Community Pillar',
    description: 'Made 50 friends.',
    icon: '🏛️',
    category: 'social',
    rarity: 'rare',
    maxProgress: 50,
    xpReward: 250,
    itemReward: 'deco_trophy_bronze',
  },
  {
    id: 'ach_chat_first',
    name: 'Ice Breaker',
    description: 'Sent your first chat message.',
    icon: '💬',
    category: 'social',
    rarity: 'common',
    maxProgress: 1,
    xpReward: 15,
    itemReward: null,
  },

  // ═══════════════════════════════════════════════════════════════════
  // Building — house and customization
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'ach_builder_1',
    name: 'Homeowner',
    description: 'Entered your house for the first time.',
    icon: '🏡',
    category: 'building',
    rarity: 'common',
    maxProgress: 1,
    xpReward: 25,
    itemReward: null,
  },
  {
    id: 'ach_builder_2',
    name: 'Interior Designer',
    description: 'Placed 5 furniture items in your house.',
    icon: '🪑',
    category: 'building',
    rarity: 'uncommon',
    maxProgress: 5,
    xpReward: 75,
    itemReward: 'furn_lamp_neon',
  },
  {
    id: 'ach_builder_3',
    name: 'Dream Home',
    description: 'Reached house level 3.',
    icon: '🏰',
    category: 'building',
    rarity: 'rare',
    maxProgress: 1,
    xpReward: 200,
    itemReward: 'deco_trophy_silver',
  },
  {
    id: 'ach_wardrobe_1',
    name: 'Fashionista',
    description: 'Changed your outfit for the first time.',
    icon: '👗',
    category: 'building',
    rarity: 'common',
    maxProgress: 1,
    xpReward: 20,
    itemReward: null,
  },
  {
    id: 'ach_project_showcase',
    name: 'Show & Tell',
    description: 'Pinned a project to your house wall.',
    icon: '📌',
    category: 'building',
    rarity: 'common',
    maxProgress: 1,
    xpReward: 30,
    itemReward: null,
  },

  // ═══════════════════════════════════════════════════════════════════
  // GitHub — future hooks (tracked but unlock logic comes later)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'ach_github_linked',
    name: 'Open Source Spirit',
    description: 'Linked your GitHub account.',
    icon: '🐙',
    category: 'github',
    rarity: 'common',
    maxProgress: 1,
    xpReward: 50,
    itemReward: 'ward_shirt_github',
  },
  {
    id: 'ach_github_100_commits',
    name: 'Commit Machine',
    description: 'Made 100 commits this year.',
    icon: '⚡',
    category: 'github',
    rarity: 'uncommon',
    maxProgress: 100,
    xpReward: 150,
    itemReward: null,
  },
  {
    id: 'ach_github_streak_7',
    name: 'Week Warrior',
    description: 'Maintained a 7-day commit streak.',
    icon: '🔥',
    category: 'github',
    rarity: 'uncommon',
    maxProgress: 7,
    xpReward: 100,
    itemReward: 'deco_frame_github',
  },
  {
    id: 'ach_github_streak_30',
    name: 'Marathon Coder',
    description: 'Maintained a 30-day commit streak.',
    icon: '🏆',
    category: 'github',
    rarity: 'epic',
    maxProgress: 30,
    xpReward: 500,
    itemReward: 'deco_trophy_gold',
  },

  // ═══════════════════════════════════════════════════════════════════
  // Special — rare events (placeholder definitions for future phases)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'ach_special_early_adopter',
    name: 'Early Adopter',
    description: 'Joined DevVerse during the beta period.',
    icon: '⭐',
    category: 'special',
    rarity: 'legendary',
    maxProgress: 1,
    xpReward: 500,
    itemReward: 'ward_shirt_golden',
  },
] as const;

/** Lookup an achievement by ID */
export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_CATALOG.find((a) => a.id === id);
}

/** Get achievements by category */
export function getAchievementsByCategory(category: AchievementDefinition['category']): readonly AchievementDefinition[] {
  return ACHIEVEMENT_CATALOG.filter((a) => a.category === category);
}

/** Total number of achievements */
export const TOTAL_ACHIEVEMENTS = ACHIEVEMENT_CATALOG.length;
