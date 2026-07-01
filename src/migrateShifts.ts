/**
 * ONE-USE MIGRATION SCRIPT v2 — migrateShifts.ts
 *
 * Fixes the shifts collection by re-deriving shift from the AGENT's schedule,
 * not from who made the booking. Overwrites all existing shift entries.
 *
 * HOW TO USE:
 *   1. Drop this file into your /src folder alongside firebase.ts
 *   2. In your App.tsx, temporarily add:
 *        import { migrateShifts } from "./migrateShifts";
 *        migrateShifts();
 *   3. Open the app once — check the console for "✅ Migration complete"
 *   4. Remove the two lines above from App.tsx
 *   5. Delete this file
 */

import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// IDs of agents on the LATE shift (⭐ 11h00–19h30)
// Must match LATE_SHIFT_IDS in HomeOfficeApp.tsx
const LATE_SHIFT_IDS = [2, 5, 7, 10, 12];

export async function migrateShifts() {
  console.log("🔄 Starting shift migration v2...");

  // 1. Read existing bookings
  const bookingsRef = doc(db, "bookings", "all");
  const bookingsSnap = await getDoc(bookingsRef);

  if (!bookingsSnap.exists()) {
    console.warn("⚠️ No bookings found. Nothing to migrate.");
    return;
  }

  const bookings = bookingsSnap.data() as Record<string, number[]>;
  const newShifts: Record<string, "late" | "day"> = {};
  let count = 0;

  // 2. Loop through every booked day
  for (const [dateKey, userIds] of Object.entries(bookings)) {
    for (const uid of userIds) {
      // Skip férias (-99) and baixa (-98)
      if (uid === -99 || uid === -98) continue;

      const absId = Math.abs(uid);
      const shiftKey = `${absId}-${dateKey}`;

      // Shift is determined purely by which list the agent is in —
      // regardless of whether the booking was self-made or supervisor-assigned
      newShifts[shiftKey] = LATE_SHIFT_IDS.includes(absId) ? "late" : "day";
      count++;
    }
  }

  // 3. Overwrite the entire shifts collection with the corrected data
  const shiftsRef = doc(db, "shifts", "all");
  await setDoc(shiftsRef, newShifts);
  console.log(`✅ Migration v2 complete. ${count} shift entries written.`);
  console.log("Entries:", newShifts);
}
