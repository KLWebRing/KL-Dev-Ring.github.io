// ── KL DevVerse — World Event Definition ────────────────────────────
// Type definitions for world events — festivals, hackathons, seasons.
// Architecture only.

import type { DistrictId } from '@/world/engine/WorldConfig';

// ── Event Types ─────────────────────────────────────────────────────

export type WorldEventType =
  | 'festival'
  | 'hackathon'
  | 'season'
  | 'community'
  | 'special'
  ;

// ── Event Definition ────────────────────────────────────────────────

export interface WorldEventDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: WorldEventType;
  /** Start date (month-day, e.g. "08-15" for Aug 15) */
  readonly startDate: string;
  /** End date (month-day) */
  readonly endDate: string;
  /** Affected districts (empty = all) */
  readonly affectedDistricts: readonly DistrictId[];
  /** Decoration theme color */
  readonly themeColor: number;
  /** Special NPCs spawned during event */
  readonly specialNPCs: readonly string[];
  /** Whether the event modifies weather */
  readonly weatherOverride?: string;
}

// ── Event Registry ──────────────────────────────────────────────────

export const WORLD_EVENTS: readonly WorldEventDef[] = [
  {
    id: 'onam',
    name: 'Onam Festival',
    description: 'Kerala\'s harvest festival — pookalam, sadya, and boat races.',
    type: 'festival',
    startDate: '08-20',
    endDate: '09-02',
    affectedDistricts: [],
    themeColor: 0xffd700,
    specialNPCs: ['maveli'],
    weatherOverride: 'sunny',
  },
  {
    id: 'vishu',
    name: 'Vishu',
    description: 'Kerala New Year — vishukani, fireworks, and feasts.',
    type: 'festival',
    startDate: '04-14',
    endDate: '04-16',
    affectedDistricts: [],
    themeColor: 0xff9900,
    specialNPCs: [],
  },
  {
    id: 'christmas',
    name: 'Christmas',
    description: 'Christmas celebrations with Kerala-style star lanterns.',
    type: 'festival',
    startDate: '12-20',
    endDate: '12-27',
    affectedDistricts: [],
    themeColor: 0xcc0000,
    specialNPCs: [],
  },
  {
    id: 'hacktoberfest',
    name: 'Hacktoberfest',
    description: 'Open source month — special coding challenges and rewards.',
    type: 'hackathon',
    startDate: '10-01',
    endDate: '10-31',
    affectedDistricts: ['developer_town', 'innovation_hub'],
    themeColor: 0x1a3a4a,
    specialNPCs: [],
  },
  {
    id: 'monsoon',
    name: 'Monsoon Season',
    description: 'Kerala monsoon — heavy rains, lush greenery, and chai.',
    type: 'season',
    startDate: '06-01',
    endDate: '08-15',
    affectedDistricts: [],
    themeColor: 0x4a5568,
    specialNPCs: [],
    weatherOverride: 'rain',
  },
];
