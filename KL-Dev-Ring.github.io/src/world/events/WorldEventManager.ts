// ── KL DevVerse — World Event Manager ───────────────────────────────
// Checks current real-world date against event definitions.
// Sets active events for other systems to react to.

import { WORLD_EVENTS, type WorldEventDef } from './WorldEventDefinition';

export class WorldEventManager {
  private activeEvents: WorldEventDef[] = [];

  /**
   * Check which events are currently active based on real date.
   */
  refresh(): void {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const today = `${month}-${day}`;

    this.activeEvents = WORLD_EVENTS.filter(event => {
      return today >= event.startDate && today <= event.endDate;
    });

    if (this.activeEvents.length > 0) {
      console.log(
        `[WorldEventManager] Active events: ${this.activeEvents.map(e => e.name).join(', ')}`,
      );
    }
  }

  getActiveEvents(): readonly WorldEventDef[] {
    return this.activeEvents;
  }

  isEventActive(id: string): boolean {
    return this.activeEvents.some(e => e.id === id);
  }

  getWeatherOverride(): string | null {
    for (const event of this.activeEvents) {
      if (event.weatherOverride) return event.weatherOverride;
    }
    return null;
  }
}

export const worldEventManager = new WorldEventManager();
