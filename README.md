# Hotel Room Reservation System — Angular

## Setup & Run

```bash
npm install
npm start          # → http://localhost:4200
```

## Build for Production

```bash
npm run build
# Output: dist/hotel-reservation/
```

## Deploy (Vercel — easiest)

1. Push this folder to GitHub
2. Go to https://vercel.com → New Project → Import repo
3. Framework: **Angular**
4. Build command: `npm run build`
5. Output directory: `dist/hotel-reservation/browser`
6. Deploy ✓

## Deploy (Netlify)

1. Push to GitHub
2. Go to https://netlify.com → Add new site → Import from Git
3. Build command: `npm run build`
4. Publish directory: `dist/hotel-reservation/browser`
5. Deploy ✓

---

## Problem Summary

**Hotel:** 97 rooms across 10 floors  
- Floors 1–9: 10 rooms each (101–110, 201–210, …)  
- Floor 10: 7 rooms (1001–1007)  
- Lift/stairs on the **left** (room pos 1 is closest)

**Travel time:**  
- Horizontal: 1 min per room apart  
- Vertical: 2 min per floor apart  

**Booking priority:**  
1. Same floor first  
2. If not possible, minimize total travel time across floors  
3. Max 5 rooms per booking  

## Algorithm

See `src/app/hotel.service.ts` → `findOptimalRooms()` for full comments.

**Phase 1 (same floor):**  
Sliding window of size N across each floor's available rooms → O(10 × 10) = fast.

**Phase 2 (multi-floor):**  
Pre-compute contiguous room windows per floor, then enumerate floor-window combinations that sum to exactly N rooms. Prune branches early when remaining rooms can't satisfy count. Return combination with minimum travel time.
