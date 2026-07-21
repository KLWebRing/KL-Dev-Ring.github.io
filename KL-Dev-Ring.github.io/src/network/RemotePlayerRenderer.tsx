// ── KL DevVerse — Remote Player Renderer ─────────────────────────────
// Renders other players' characters in the 3D scene.
// Manages character mesh lifecycle: spawn on join, despawn on leave.
// Runs interpolation + animation per frame.

import { useEffect, useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Group, CanvasTexture, SpriteMaterial, Sprite } from 'three';
import { useNetworkStore, getInterpolationBuffer } from '@/stores/networkStore';
import { createCharacter, animateCharacter } from '@/entities/character/characterSystem';
import { NETWORK } from '@shared/constants';
import type { AnimationState } from '@/shared/types';

// ── Nameplate Helpers ────────────────────────────────────────────────

function createNameplate(username: string): Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 256;
  canvas.height = 64;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  const padding = 8;
  const textWidth = ctx.measureText(username).width;
  const bgWidth = Math.min(textWidth + padding * 4, 240);
  const bgX = (256 - bgWidth) / 2;
  ctx.beginPath();
  ctx.roundRect(bgX, 8, bgWidth, 40, 6);
  ctx.fill();

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(username, 128, 28);

  const texture = new CanvasTexture(canvas);
  const material = new SpriteMaterial({ map: texture, transparent: true });
  const sprite = new Sprite(material);
  sprite.scale.set(2, 0.5, 1);
  sprite.position.y = 2.4; // Above head
  sprite.name = 'nameplate';

  return sprite;
}

// ── Renderer Component ───────────────────────────────────────────────

interface RemoteCharacterEntry {
  group: Group;
  charGroup: Group;
  nameplate: Sprite;
  lastAnimState: AnimationState;
  animTime: number;
}

export function RemotePlayerRenderer(): null {
  const { scene } = useThree();
  const charactersRef = useRef<Map<string, RemoteCharacterEntry>>(new Map());
  const remotePlayers = useNetworkStore((s) => s.remotePlayers);
  const localSessionId = useNetworkStore((s) => s.localSessionId);

  // ── Spawn/despawn characters based on remotePlayers map ──────────
  useEffect(() => {
    const currentIds = new Set(remotePlayers.keys());
    const renderedIds = new Set(charactersRef.current.keys());

    // Spawn new players
    for (const [sessionId, player] of remotePlayers) {
      if (sessionId === localSessionId) continue;
      if (renderedIds.has(sessionId)) continue;

      const group = new Group();
      group.name = `remote_${sessionId}`;
      group.position.set(player.x, player.y, player.z);
      group.rotation.y = player.yaw;

      const charGroup = createCharacter({
        handle: player.username || sessionId,
        scale: 0.85,
      });
      group.add(charGroup);

      const nameplate = createNameplate(player.username || 'Player');
      group.add(nameplate);

      scene.add(group);

      charactersRef.current.set(sessionId, {
        group,
        charGroup,
        nameplate,
        lastAnimState: 'idle',
        animTime: 0,
      });
    }

    // Despawn removed players
    for (const sessionId of renderedIds) {
      if (!currentIds.has(sessionId)) {
        const entry = charactersRef.current.get(sessionId);
        if (entry) {
          scene.remove(entry.group);
          entry.nameplate.material.dispose();
          charactersRef.current.delete(sessionId);
        }
      }
    }
  }, [remotePlayers, scene, localSessionId]);

  // ── Per-frame animation + interpolation ─────────────────────────
  useFrame((_state, delta) => {
    const renderTime = Date.now() - NETWORK.INTERPOLATION_DELAY_MS;

    for (const [sessionId, entry] of charactersRef.current) {
      const player = remotePlayers.get(sessionId);
      if (!player) continue;

      // Get interpolated position
      const buf = getInterpolationBuffer(sessionId);
      const interpolated = buf.interpolate(renderTime);

      if (interpolated) {
        // Smooth position update
        entry.group.position.set(interpolated.x, interpolated.y, interpolated.z);
        entry.group.rotation.y = interpolated.yaw;

        // Animate character
        const animState = (interpolated.animState || 'idle') as AnimationState;
        entry.animTime += delta;
        animateCharacter(entry.charGroup, animState, entry.animTime);
        entry.lastAnimState = animState;
      } else {
        // No interpolation data — use raw store data
        entry.group.position.set(player.x, player.y, player.z);
        entry.group.rotation.y = player.yaw;
        animateCharacter(entry.charGroup, player.animState, entry.animTime);
      }
    }
  });

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      for (const entry of charactersRef.current.values()) {
        scene.remove(entry.group);
        entry.nameplate.material.dispose();
      }
      charactersRef.current.clear();
    };
  }, [scene]);

  return null;
}
