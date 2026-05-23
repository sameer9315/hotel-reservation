import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HotelService, Room } from './hotel.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  rooms: Record<number, Room> = {};
  numRooms: number | null = null;

  lastBookedIds: Set<number> = new Set();
  lastTravelTime: number = 0;
  showLastBooking = false;

  errorMsg = '';
  toastMsg = '';
  toastType: 'success' | 'info' | 'error' = 'success';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // Floors displayed top-to-bottom: 10 → 1
  readonly displayFloors = Array.from({ length: 10 }, (_, i) => 10 - i);

  constructor(private hotelService: HotelService) {}

  ngOnInit(): void {
    this.rooms = this.hotelService.buildInitialRooms();
  }

  // ── Derived helpers ──────────────────────────────────────────────────────

  get totalRooms()    { return Object.keys(this.rooms).length; }
  get occupiedCount() { return Object.values(this.rooms).filter(r => r.status === 'occupied').length; }
  get availableCount(){ return this.totalRooms - this.occupiedCount; }

  floorRooms(floor: number): Room[] {
    const count = floor === 10 ? 7 : 10;
    return Array.from({ length: count }, (_, i) => {
      const id = floor === 10 ? 1000 + i + 1 : floor * 100 + i + 1;
      return this.rooms[id];
    });
  }

  floorAvailable(floor: number): number {
    return this.floorRooms(floor).filter(r => r.status === 'available').length;
  }

  floorTotal(floor: number): number {
    return floor === 10 ? 7 : 10;
  }

  isNewlyBooked(roomId: number): boolean {
    return this.lastBookedIds.has(roomId);
  }

  roomClass(room: Room): string {
    if (this.lastBookedIds.has(room.id)) return 'room new-booking';
    if (room.status === 'occupied')      return 'room occupied';
    return 'room available';
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  bookRooms(): void {
    this.errorMsg = '';
    const n = this.numRooms;
    if (!n || n < 1 || n > 5) {
      this.errorMsg = 'Please enter a number between 1 and 5.';
      return;
    }

    const result = this.hotelService.findOptimalRooms(this.rooms, n);
    if (!result) {
      this.errorMsg = `Not enough rooms available. Only ${this.availableCount} room(s) left.`;
      return;
    }

    // Mark rooms as occupied
    const newRooms = { ...this.rooms };
    const ids = new Set<number>();
    for (const r of result.rooms) {
      newRooms[r.id] = { ...r, status: 'occupied' };
      ids.add(r.id);
    }
    this.rooms = newRooms;
    this.lastBookedIds  = ids;
    this.lastTravelTime = result.travelTime;
    this.showLastBooking = true;
    this.numRooms = null;

    this.showToast(`Booked ${n} room(s) successfully! Travel time: ${result.travelTime} min`, 'success');
  }

  randomOccupancy(): void {
    this.rooms = this.hotelService.randomOccupancy(this.rooms);
    this.lastBookedIds = new Set();
    this.showLastBooking = false;
    this.errorMsg = '';
    this.showToast('Random occupancy generated.', 'info');
  }

  resetAll(): void {
    this.rooms = this.hotelService.buildInitialRooms();
    this.lastBookedIds = new Set();
    this.showLastBooking = false;
    this.errorMsg = '';
    this.showToast('All bookings have been reset.', 'info');
  }

  private showToast(msg: string, type: 'success' | 'info' | 'error'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastMsg  = msg;
    this.toastType = type;
    this.toastTimer = setTimeout(() => { this.toastMsg = ''; }, 3500);
  }

  lastBookedArray(): number[] {
    return [...this.lastBookedIds];
  }
}
