// ── KL DevVerse — Type Definitions ────────────────────────────────────
// Single source of truth for all game-level interfaces.
// Every module imports from here. No 'any' allowed.

import type { Group } from 'three';

// ── Member Data (from members/*.json via build pipeline) ─────────────

export interface MemberProject {
  readonly name: string;
  readonly url: string;
  readonly description: string;
}

export interface MemberStats {
  readonly contributions: number;
  readonly mergedPRs: number;
  readonly streak: number;
  readonly daily: number;
  readonly monthly: number;
}

export interface Member {
  readonly handle: string;
  readonly name: string;
  readonly github: string;
  readonly site: string;
  readonly city: string;
  readonly district: string;
  readonly college?: string;
  readonly country: string;
  readonly tags: readonly string[];
  readonly bio: string;
  readonly joined: string;
  readonly stats?: MemberStats;
  readonly projects?: readonly MemberProject[];
  // Computed by build pipeline
  readonly score: number;
  readonly rank: number;
  readonly hue: number;
  readonly badges: readonly Badge[];
  readonly index: number;
  readonly x: number;
  readonly y: number;
}

export interface Badge {
  readonly icon: string;
  readonly label: string;
}

// ── Network Data (generated as data/network.json) ────────────────────

export interface NetworkLink {
  readonly source: number;
  readonly target: number;
  readonly strength: number;
  readonly shared: readonly string[];
}

export interface DistrictLeague {
  readonly name: string;
  readonly count: number;
  readonly score: number;
  readonly topBuilderHandle: string;
  readonly topBuilderName: string;
}

export interface CollegeLeague {
  readonly name: string;
  readonly count: number;
  readonly score: number;
  readonly topBuilderHandle: string;
  readonly topBuilderName: string;
}

export interface Trail {
  readonly name: string;
  readonly tag: string;
  readonly description: string;
  readonly members: readonly string[];
}

export interface NetworkStats {
  readonly builders: number;
  readonly districts: number;
  readonly projects: number;
  readonly countries: number;
}

export interface NetworkData {
  readonly generatedAt: string;
  readonly stats: NetworkStats;
  readonly tags: readonly string[];
  readonly districtCounts: Readonly<Record<string, number>>;
  readonly collegeCounts: Readonly<Record<string, number>>;
  readonly districtLeagues: readonly DistrictLeague[];
  readonly collegeLeagues: readonly CollegeLeague[];
  readonly trails: readonly Trail[];
  readonly nodes: readonly Member[];
  readonly links: readonly NetworkLink[];
}

// ── World Entities ───────────────────────────────────────────────────

export interface Structure {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
}

export type NPCBehaviorType = 'resident' | 'shopkeeper' | 'customer_walk' | 'customer_sit';
export type AnimationState = 'idle' | 'walk' | 'run' | 'wave' | 'celebrate' | 'sit' | 'jump' | 'landing' | 'talk';
export type ViewState = 'town' | 'workshop' | 'studio';

export interface InteractableItem {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly message: string;
  readonly action: () => void;
}

export interface NPCConfig {
  readonly mesh: Group;
  readonly type: NPCBehaviorType;
  readonly defaultFacing?: number;
  readonly speed?: number;
  readonly direction?: number;
  readonly minZ?: number;
  readonly maxZ?: number;
  animState: AnimationState;
  time: number;
}

export interface ResidentConfig {
  readonly mesh: Group;
  readonly member: Member;
  animState: AnimationState;
  time: number;
}

// ── Interaction Events ───────────────────────────────────────────────

export type InteractionEvent =
  | { readonly type: 'passport'; readonly member: Member }
  | { readonly type: 'chat' }
  | { readonly type: 'leaderboard' }
  | { readonly type: 'npc_chat'; readonly name: string; readonly message: string }
  | { readonly type: 'project_showcase'; readonly member: Member };

// ── Workshop ─────────────────────────────────────────────────────────

export type WorkshopStyle = 'ai' | 'frontend' | 'systems' | 'robotics' | 'gamedev';

export interface ActiveWorkshop {
  readonly group: Group;
  readonly member: Member;
  readonly styleType: WorkshopStyle;
}

// ── GitHub Profile (fetched at runtime) ──────────────────────────────

export interface GitHubRepo {
  readonly name: string;
  readonly description: string;
  readonly stars: number;
  readonly url: string;
  readonly language: string;
}

export interface GitHubOrg {
  readonly name: string;
  readonly avatar: string;
}

export interface CalendarDay {
  readonly date: string;
  readonly count: number;
  readonly level: number;
}

export interface GitHubProfile {
  readonly handle: string;
  readonly name: string;
  readonly avatar: string;
  readonly bio: string;
  readonly skills: readonly string[];
  readonly languages: readonly string[];
  readonly contributionStats: number;
  readonly followers: number;
  readonly following: number;
  readonly repoCount: number;
  readonly featuredRepos: readonly GitHubRepo[];
  readonly organizations: readonly GitHubOrg[];
  readonly calendar: readonly CalendarDay[];
  hue?: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Phase 2 — Multiplayer & Social Types
// ═══════════════════════════════════════════════════════════════════════

// Re-export shared protocol types for client convenience
export type { EmoteType, ChatChannel, PlayerStatus, AuthUser, AuthResponse } from '@shared/protocol';

// ── Remote Player (rendered in the 3D scene) ─────────────────────────

export interface RemotePlayer {
  readonly sessionId: string;
  readonly userId: string;
  readonly username: string;
  readonly avatarUrl: string;
  readonly level: number;

  // Position (interpolated)
  x: number;
  y: number;
  z: number;
  yaw: number;
  animState: AnimationState;

  // Emote overlay (temporary)
  activeEmote: import('@shared/protocol').EmoteType | null;
  emoteStartTime: number;

  // Interpolation buffer
  stateBuffer: readonly RemotePlayerSnapshot[];
}

export interface RemotePlayerSnapshot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly animState: string;
  readonly timestamp: number;
}

// ── Auth / Session ───────────────────────────────────────────────────

export interface SessionState {
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly user: import('@shared/protocol').AuthUser | null;
  readonly accessToken: string | null;
  readonly error: string | null;
}

// ── Social ───────────────────────────────────────────────────────────

export interface FriendEntry {
  readonly id: string;
  readonly friendshipId: string;
  readonly userId: string;
  readonly username: string;
  readonly displayName: string;
  readonly avatarUrl: string;
  readonly status: import('@shared/protocol').PlayerStatus;
  readonly lastSeen: string | null;
}

export interface FriendRequest {
  readonly id: string;
  readonly senderId: string;
  readonly senderName: string;
  readonly senderAvatar: string;
  readonly receiverId: string;
  readonly status: 'pending' | 'accepted' | 'rejected';
  readonly createdAt: string;
}

export interface NearbyPlayer {
  readonly sessionId: string;
  readonly userId: string;
  readonly username: string;
  readonly avatarUrl: string;
  readonly level: number;
  readonly distance: number;
  readonly isFriend: boolean;
}

export interface RecentlyMetPlayer {
  readonly userId: string;
  readonly username: string;
  readonly avatarUrl: string;
  readonly metAt: string;
  readonly district: string;
}

// ── Chat ─────────────────────────────────────────────────────────────

export interface ChatMessage {
  readonly id: string;
  readonly channel: import('@shared/protocol').ChatChannel;
  readonly authorId: string;
  readonly authorName: string;
  readonly authorAvatar: string;
  readonly content: string;
  readonly timestamp: number;
  readonly isSystem?: boolean;
}

// ── Notifications ────────────────────────────────────────────────────

export type NotificationType = 'friend_request' | 'friend_accepted' | 'system' | 'chat_mention';

export interface GameNotification {
  readonly id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly timestamp: number;
  readonly read: boolean;
  readonly data?: Record<string, string>;
}

// ── Connection State ─────────────────────────────────────────────────

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// ── Player Interaction ───────────────────────────────────────────────

export interface PlayerInteraction {
  readonly type: 'view_profile' | 'add_friend' | 'message' | 'wave';
  readonly label: string;
  readonly icon: string;
  readonly enabled: boolean;
  readonly action: () => void;
}

// ═══════════════════════════════════════════════════════════════════════
// Phase 3 — Builder Identity Types
// ═══════════════════════════════════════════════════════════════════════

// ── Builder Studio ───────────────────────────────────────────────────────

export type StudioTheme = 'default' | 'kerala_traditional' | 'cyberpunk' | 'minimal_white' | 'dark_studio' | 'tropical';

export interface BuilderStudio {
  readonly id: string;
  readonly userId: string;
  readonly ownerUsername: string;
  readonly ownerAvatar: string;
  readonly ownerDisplayName: string;
  readonly name: string;
  readonly tier: number;   // 1=Garage, 2=Workspace, 3=Professional, 4=Innovation Lab, 5=Startup Office, 6=Campus
  readonly theme: StudioTheme;
  readonly floorMat: string;
  readonly wallColor: string;
  readonly lightPreset: string;
  readonly isPublic: boolean;
  readonly plotX: number;
  readonly plotZ: number;
  readonly furniture: readonly StudioFurniture[];
  readonly projectWall: readonly ProjectDisplay[];
  readonly visitorCount: number;
}

export interface StudioFurniture {
  readonly id: string;
  readonly itemId: string;    // references FurnitureCatalogEntry.id
  readonly slotId: string;    // e.g. "workspace_desk_1"
  readonly posX: number;
  readonly posZ: number;
  readonly rotation: number;
  readonly variant: string;
}

export interface StudioInteriorState {
  readonly studioId: string;
  readonly ownerId: string;
  readonly isOwner: boolean;
  readonly studio: BuilderStudio;
  readonly isLoading: boolean;
}

export interface StudioVisit {
  readonly id: string;
  readonly visitorId: string;
  readonly visitorName: string;
  readonly visitorAvatar: string;
  readonly visitedAt: string;
}

// ── Furniture Slot Definition ────────────────────────────────────────

export interface FurnitureSlot {
  readonly slotId: string;
  readonly label: string;
  readonly room: 'main_workspace' | 'lounge' | 'display' | 'server_room' | 'meeting' | 'expansion';
  readonly posX: number;
  readonly posY: number;
  readonly posZ: number;
  readonly rotation: number;
  readonly allowedCategories: readonly string[];   // e.g. ['desk', 'table']
  readonly requiredStudioTier: number;
}

// ── Project Display ──────────────────────────────────────────────────

export interface ProjectDisplay {
  readonly id: string;
  readonly repoUrl: string;
  readonly repoName: string;
  readonly description: string;
  readonly slotIndex: number;
  readonly pinned: boolean;
}

// ── Inventory ────────────────────────────────────────────────────────

export type ItemCategory = 'furniture' | 'cosmetic' | 'decoration' | 'special' | 'collectible';
export type ItemSource = 'starter' | 'achievement' | 'event' | 'marketplace' | 'reward';

export interface InventoryItem {
  readonly id: string;
  readonly catalogId: string;
  readonly category: ItemCategory;
  readonly quantity: number;
  readonly acquiredAt: string;
  readonly source: ItemSource;
}

// ── Wardrobe ─────────────────────────────────────────────────────────

export type WardrobeSlot = 'hair' | 'face' | 'shirt' | 'jacket' | 'pants' | 'shoes' | 'backpack' | 'accessory';

export interface WardrobeItem {
  readonly id: string;
  readonly catalogId: string;
  readonly slot: WardrobeSlot;
  readonly equipped: boolean;
  readonly acquiredAt: string;
}

export interface EquippedWardrobe {
  readonly hair: string | null;     // catalogId or null for default
  readonly face: string | null;
  readonly shirt: string | null;
  readonly jacket: string | null;
  readonly pants: string | null;
  readonly shoes: string | null;
  readonly backpack: string | null;
  readonly accessory: string | null;
}

// ── Builder Progress ─────────────────────────────────────────────────

export interface BuilderProgress {
  readonly builderPoints: number;
  readonly level: number;
  readonly totalXp: number;
  readonly pointsFromGithub: number;
  readonly pointsFromSocial: number;
  readonly pointsFromExploring: number;
  readonly pointsFromBuilding: number;
  readonly nextLevelXp: number;
  readonly progressPercent: number;
}

export interface BuilderLevel {
  readonly level: number;
  readonly title: string;
  readonly requiredXp: number;
  readonly perks: readonly string[];
  readonly studioUnlock: string | null;
}

// ── Achievements ─────────────────────────────────────────────────────

export interface Achievement {
  readonly achieveId: string;
  readonly unlockedAt: string;
  readonly progress: number;  // 0-100
}

export interface AchievementDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly category: 'account' | 'social' | 'building' | 'exploring' | 'github' | 'special';
  readonly rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  readonly maxProgress: number;
  readonly xpReward: number;
  readonly itemReward: string | null;  // catalogId
}

// ── Catalog Entry Types (data-driven definitions) ────────────────────

export interface FurnitureCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: 'desk' | 'chair' | 'monitor' | 'laptop' | 'bookshelf' | 'plant' | 'lamp' | 'sofa' | 'whiteboard' | 'projector' | 'table' | 'shelf';
  readonly rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  readonly variants: readonly string[];
  readonly icon: string;
  readonly defaultSlot: string;
  readonly scale: number;
}

export interface DecorationCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: 'poster' | 'trophy' | 'plant' | 'light' | 'frame' | 'sticker' | 'banner';
  readonly rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  readonly icon: string;
  readonly wallMount: boolean;
}

export interface CosmeticCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly slot: WardrobeSlot;
  readonly rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  readonly icon: string;
  readonly colorHex: string;
}
