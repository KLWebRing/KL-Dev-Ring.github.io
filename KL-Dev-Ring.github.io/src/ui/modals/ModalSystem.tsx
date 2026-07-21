// ── KL DevVerse — Modal System ────────────────────────────────────────
// Renders active modal based on uiStore state.
// Each modal type is a self-contained component.
// Phase 2: Added friends and player_interact modals.

import React, { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useWorldStore } from '@/stores/worldStore';
import { PassportModal } from './PassportModal';
import { LeaderboardModal } from './LeaderboardModal';
import { ChatModal } from './ChatModal';
import { FriendsPanel } from '@/social/FriendsPanel';
import { PlayerInteractMenu } from '@/social/PlayerInteractMenu';

export const ModalSystem: React.FC = () => {
  const { activeModal, npcChatData, playerInteractTarget, closeModal } = useUIStore();

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeModal();
  }, [closeModal]);

  if (!activeModal) return null;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      {activeModal === 'passport' && <PassportModal />}
      {activeModal === 'leaderboard' && <LeaderboardModal />}
      {activeModal === 'chat' && <ChatModal />}
      {activeModal === 'friends' && <FriendsPanel />}
      {activeModal === 'npc_chat' && npcChatData && (
        <div className="modal-panel" style={{ maxWidth: 480 }}>
          <div className="modal-header">
            <span><span className="live-dot" />NPC DIALOGUE</span>
            <button className="modal-close" onClick={closeModal} aria-label="Close">×</button>
          </div>
          <div className="modal-body npc-chat-panel">
            <p className="npc-chat-name">{npcChatData.name}</p>
            <p className="npc-chat-message">{npcChatData.message}</p>
          </div>
        </div>
      )}
      {activeModal === 'player_interact' && playerInteractTarget && (
        <PlayerInteractMenu
          targetSessionId={playerInteractTarget.sessionId}
          targetUsername={playerInteractTarget.username}
          targetUserId={playerInteractTarget.userId}
          targetAvatarUrl={playerInteractTarget.avatarUrl}
          onClose={closeModal}
          onViewProfile={() => {
            // Could open passport with this player's data
            closeModal();
          }}
        />
      )}
    </div>
  );
};
