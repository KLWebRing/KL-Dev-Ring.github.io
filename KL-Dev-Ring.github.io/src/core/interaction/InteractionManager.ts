// ── KL DevVerse — Interaction Manager ────────────────────────────────
// Manages proximity-based interactions ("Press E") across the world.
// Replaces the scattered proximity checks in the original game loop.

import { distanceXZ } from '@/shared/math';
import type { InteractableItem } from '@/shared/types';

export class InteractionManager {
  private items: InteractableItem[] = [];

  setItems(items: InteractableItem[]): void {
    this.items = items;
  }

  addItem(item: InteractableItem): void {
    this.items.push(item);
  }

  clear(): void {
    this.items = [];
  }

  /**
   * Find the closest interactable item within range.
   * Call once per frame with the player's position.
   */
  getNearest(px: number, pz: number): InteractableItem | null {
    let closest: InteractableItem | null = null;
    let minDist = Infinity;

    for (const item of this.items) {
      const dist = distanceXZ(px, pz, item.x, item.z);
      if (dist < item.radius && dist < minDist) {
        minDist = dist;
        closest = item;
      }
    }

    return closest;
  }

  /**
   * Trigger the action of the nearest item.
   * Call when the player presses E.
   */
  triggerNearest(px: number, pz: number): boolean {
    const item = this.getNearest(px, pz);
    if (item) {
      item.action();
      return true;
    }
    return false;
  }
}

export const interactionManager = new InteractionManager();
