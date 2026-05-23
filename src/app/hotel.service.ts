import { Injectable } from '@angular/core';

export type RoomStatus = 'available' | 'occupied' | 'new';

export interface Room {
  id: number;
  floor: number;
  pos: number;      // 1-based position from left (closest to lift)
  status: RoomStatus;
}

export interface BookingResult {
  rooms: Room[];
  travelTime: number;
}

@Injectable({ providedIn: 'root' })
export class HotelService {

  // ── Build hotel state ────────────────────────────────────────────────────

  buildInitialRooms(): Record<number, Room> {
    const rooms: Record<number, Room> = {};
    for (let floor = 1; floor <= 9; floor++) {
      for (let pos = 1; pos <= 10; pos++) {
        const id = floor * 100 + pos;
        rooms[id] = { id, floor, pos, status: 'available' };
      }
    }
    for (let pos = 1; pos <= 7; pos++) {
      const id = 1000 + pos;
      rooms[id] = { id, floor: 10, pos, status: 'available' };
    }
    return rooms;
  }

  randomOccupancy(rooms: Record<number, Room>): Record<number, Room> {
    const next: Record<number, Room> = {};
    for (const [key, room] of Object.entries(rooms)) {
      next[+key] = { ...room, status: Math.random() < 0.4 ? 'occupied' : 'available' };
    }
    return next;
  }

  // ── Travel time calculation ──────────────────────────────────────────────
  /**
   * Travel time for a SET of rooms:
   *   vertical   = (maxFloor - minFloor) * 2   [2 min/floor]
   *   horizontal = (maxPos   - minPos)  * 1    [1 min/room]
   *
   * We use span (max - min) because the lift takes you straight to
   * the nearest floor and you walk linearly across the rooms.
   */
  travelTime(roomList: Room[]): number {
    if (roomList.length <= 1) return 0;
    let minFloor = Infinity, maxFloor = -Infinity;
    let minPos   = Infinity, maxPos   = -Infinity;
    for (const r of roomList) {
      if (r.floor < minFloor) minFloor = r.floor;
      if (r.floor > maxFloor) maxFloor = r.floor;
      if (r.pos   < minPos)   minPos   = r.pos;
      if (r.pos   > maxPos)   maxPos   = r.pos;
    }
    return (maxFloor - minFloor) * 2 + (maxPos - minPos);
  }

  // ── Main booking algorithm ───────────────────────────────────────────────
  /**
   * ALGORITHM — Optimal Room Assignment
   *
   * PHASE 1 — Same floor (priority):
   *   For each floor that has ≥ N available rooms, slide a window of size N
   *   across the sorted available rooms on that floor.
   *   Pick the window with the smallest horizontal span (= maxPos - minPos).
   *   If any single-floor solution exists, return the best one immediately
   *   (single-floor vertical cost is always 0, so it beats any multi-floor).
   *
   * PHASE 2 — Multi-floor (fallback):
   *   We represent each floor's contribution as a "window" — a contiguous
   *   slice of available rooms (contiguous is always optimal: taking
   *   non-adjacent rooms on the same floor only widens the horizontal span).
   *
   *   We then recursively enumerate combinations of floor-windows whose
   *   total room count equals N, pruning branches early when:
   *     - remaining rooms needed > rooms left in unvisited floors
   *
   *   Among all valid combinations we pick the one with minimum travelTime.
   *
   * Complexity: count ≤ 5, floors = 10 → search space is very small.
   */
  findOptimalRooms(allRooms: Record<number, Room>, count: number): BookingResult | null {
    if (count < 1 || count > 5) return null;

    // Available rooms sorted by floor then position
    const available = Object.values(allRooms)
      .filter(r => r.status === 'available')
      .sort((a, b) => a.floor !== b.floor ? a.floor - b.floor : a.pos - b.pos);

    if (available.length < count) return null;

    // Group by floor
    const byFloor: Record<number, Room[]> = {};
    for (const r of available) {
      if (!byFloor[r.floor]) byFloor[r.floor] = [];
      byFloor[r.floor].push(r);
    }
    const floors = Object.keys(byFloor).map(Number).sort((a, b) => a - b);

    let bestRooms: Room[] | null = null;
    let bestTime = Infinity;

    const consider = (combo: Room[]) => {
      const t = this.travelTime(combo);
      if (t < bestTime) {
        bestTime  = t;
        bestRooms = [...combo];
      }
    };

    // ── PHASE 1: Single-floor sliding window ─────────────────────────────
    for (const floor of floors) {
      const fr = byFloor[floor];
      if (fr.length >= count) {
        for (let i = 0; i <= fr.length - count; i++) {
          consider(fr.slice(i, i + count));
        }
      }
    }

    // If a single-floor solution exists, return it — it's always optimal
    if (bestRooms) return { rooms: bestRooms, travelTime: bestTime };

    // ── PHASE 2: Multi-floor enumeration ─────────────────────────────────
    // For each floor, pre-compute all valid contiguous windows of size 1..count
    const floorWindows: Record<number, Room[][]> = {};
    for (const floor of floors) {
      const fr = byFloor[floor];
      floorWindows[floor] = [];
      for (let size = 1; size <= Math.min(count, fr.length); size++) {
        for (let i = 0; i <= fr.length - size; i++) {
          floorWindows[floor].push(fr.slice(i, i + size));
        }
      }
    }

    // Recursive enumeration with pruning
    const enumerate = (floorIdx: number, remaining: number, current: Room[]) => {
      if (remaining === 0) { consider(current); return; }
      if (floorIdx >= floors.length) return;

      // Prune: can we still get enough rooms?
      const maxLeft = floors.slice(floorIdx).reduce(
        (s, f) => s + byFloor[f].length, 0
      );
      if (maxLeft < remaining) return;

      const floor = floors[floorIdx];

      // Option A: skip this floor
      enumerate(floorIdx + 1, remaining, current);

      // Option B: take a window from this floor
      for (const win of floorWindows[floor]) {
        if (win.length <= remaining) {
          enumerate(floorIdx + 1, remaining - win.length, [...current, ...win]);
        }
      }
    };

    enumerate(0, count, []);

    return bestRooms ? { rooms: bestRooms, travelTime: bestTime } : null;
  }
}
