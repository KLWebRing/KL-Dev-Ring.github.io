// ── KL DevVerse — UI State Store ─────────────────────────────────────
// Modal visibility, HUD state, and UI-level concerns.
// Phase 2: Extended with friends, online_players, and player_interact modals.

import { create } from 'zustand';
import type { Member, InteractionEvent } from '@/shared/types';

type ModalType =
  | 'passport'
  | 'leaderboard'
  | 'chat'
  | 'npc_chat'
  | 'friends'
  | 'online_players'
  | 'player_interact'
  | null;

interface NPCChatData {
  readonly name: string;
  readonly message: string;
}

interface PlayerInteractTarget {
  readonly sessionId: string;
  readonly userId: string;
  readonly username: string;
  readonly avatarUrl: string;
}

interface UIState {
  // Modal management
  activeModal: ModalType;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;

  // Passport target
  passportMember: Member | null;
  setPassportMember: (member: Member | null) => void;

  // NPC chat data
  npcChatData: NPCChatData | null;
  setNPCChatData: (data: NPCChatData | null) => void;

  // Player interaction target (Phase 2)
  playerInteractTarget: PlayerInteractTarget | null;
  setPlayerInteractTarget: (target: PlayerInteractTarget | null) => void;

  // Boot screen
  hasBooted: boolean;
  setHasBooted: (booted: boolean) => void;

  // HUD
  showHUD: boolean;
  setShowHUD: (show: boolean) => void;

  // Handle interaction events from the 3D world
  handleInteraction: (event: InteractionEvent) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({
    activeModal: null,
    passportMember: null,
    npcChatData: null,
    playerInteractTarget: null,
  }),

  passportMember: null,
  setPassportMember: (member) => set({ passportMember: member }),

  npcChatData: null,
  setNPCChatData: (data) => set({ npcChatData: data }),

  playerInteractTarget: null,
  setPlayerInteractTarget: (target) => set({ playerInteractTarget: target }),

  hasBooted: typeof window !== 'undefined' && localStorage.getItem('kl-town-booted') === '1',
  setHasBooted: (booted) => {
    if (booted) {
      localStorage.setItem('kl-town-booted', '1');
    }
    set({ hasBooted: booted });
  },

  showHUD: true,
  setShowHUD: (show) => set({ showHUD: show }),

  handleInteraction: (event) => {
    switch (event.type) {
      case 'passport':
        set({ activeModal: 'passport', passportMember: event.member });
        break;
      case 'chat':
        set({ activeModal: 'chat' });
        break;
      case 'leaderboard':
        set({ activeModal: 'leaderboard' });
        break;
      case 'npc_chat':
        set({ activeModal: 'npc_chat', npcChatData: { name: event.name, message: event.message } });
        break;
      case 'project_showcase':
        set({ activeModal: 'passport', passportMember: event.member });
        break;
    }
  },
}));
