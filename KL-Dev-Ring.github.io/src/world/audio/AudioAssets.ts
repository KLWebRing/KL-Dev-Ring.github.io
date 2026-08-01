// ── KL DevVerse — Audio Assets ──────────────────────────────────────
// Asset manifest for all ambient sounds.
// URLs defined here, lazy-loaded when zone activates.
//
// Future: replace placeholder URLs with actual CDN-hosted audio files.

// ── Audio Layer Definition ──────────────────────────────────────────

export interface AudioLayerDef {
  readonly id: string;
  readonly label: string;
  /** URL to audio file (will be lazy-loaded) */
  readonly src: string;
  /** Default volume (0..1) */
  readonly volume: number;
  /** Whether to loop */
  readonly loop: boolean;
  /** Category for volume control */
  readonly category: 'ambient' | 'sfx' | 'music';
}

// ── Audio Manifest ──────────────────────────────────────────────────
// Placeholder entries — src URLs will be populated when actual audio
// files are sourced. The system is fully functional without them —
// zones just won't produce sound until files are added.

export const AUDIO_LAYERS: readonly AudioLayerDef[] = [
  // Nature
  { id: 'birds_morning',    label: 'Morning Birds',      src: '', volume: 0.3, loop: true, category: 'ambient' },
  { id: 'birds_evening',    label: 'Evening Birds',      src: '', volume: 0.25, loop: true, category: 'ambient' },
  { id: 'wind_light',       label: 'Light Breeze',       src: '', volume: 0.15, loop: true, category: 'ambient' },
  { id: 'wind_strong',      label: 'Strong Wind',        src: '', volume: 0.3, loop: true, category: 'ambient' },
  { id: 'rain_light',       label: 'Light Rain',         src: '', volume: 0.35, loop: true, category: 'ambient' },
  { id: 'rain_heavy',       label: 'Heavy Rain',         src: '', volume: 0.5, loop: true, category: 'ambient' },
  { id: 'thunder',          label: 'Thunder',            src: '', volume: 0.7, loop: false, category: 'sfx' },
  { id: 'night_insects',    label: 'Night Insects',      src: '', volume: 0.2, loop: true, category: 'ambient' },

  // Water
  { id: 'river_flow',       label: 'River Flow',         src: '', volume: 0.25, loop: true, category: 'ambient' },
  { id: 'ocean_waves',      label: 'Ocean Waves',        src: '', volume: 0.3, loop: true, category: 'ambient' },
  { id: 'boat_creak',       label: 'Boat Creaking',      src: '', volume: 0.15, loop: true, category: 'ambient' },

  // Cultural
  { id: 'temple_bells',     label: 'Temple Bells',       src: '', volume: 0.2, loop: false, category: 'ambient' },
  { id: 'tea_shop_chatter', label: 'Tea Shop Chatter',   src: '', volume: 0.2, loop: true, category: 'ambient' },
  { id: 'market_bustle',    label: 'Market Bustle',      src: '', volume: 0.25, loop: true, category: 'ambient' },

  // Urban
  { id: 'traffic_distant',  label: 'Distant Traffic',    src: '', volume: 0.1, loop: true, category: 'ambient' },
  { id: 'footsteps_stone',  label: 'Stone Footsteps',    src: '', volume: 0.3, loop: false, category: 'sfx' },
  { id: 'footsteps_grass',  label: 'Grass Footsteps',    src: '', volume: 0.25, loop: false, category: 'sfx' },

  // Music
  { id: 'ambient_day',      label: 'Daytime Ambient',    src: '', volume: 0.15, loop: true, category: 'music' },
  { id: 'ambient_night',    label: 'Nighttime Ambient',  src: '', volume: 0.12, loop: true, category: 'music' },
];

// ── Helper: get layer by ID ─────────────────────────────────────────

export function getAudioLayer(id: string): AudioLayerDef | undefined {
  return AUDIO_LAYERS.find(l => l.id === id);
}
