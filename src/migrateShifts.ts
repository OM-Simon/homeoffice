/**
 * ONE-USE MIGRATION SCRIPT v4 — migrateShifts.ts
 *
 * - Agent self-booked days (positive IDs in bookings) → "day" (morning ☀️)
 * - Supervisor-assigned days (negative IDs in bookings) → "late" (afternoon ⭐)
 * Completely overwrites the shifts collection.
 *
 * HOW TO USE:
 *   1. Drop this file into your /src folder alongside firebase.ts
 *   2. In your App.tsx, temporarily add these two lines before the return():
 *        import { migrateShifts } from "./migrateShifts";
 *        migrateShifts();
 *   3. Open the app once in the browser
 *   4. Check the console for "✅ Migration v4 complete."
 *   5. Remove the two lines from App.tsx
 *   6. Delete this file
 */

import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export async function migrateShifts() {
  console.log("🔄 Starting shift migration v4...");

  const bookingsRef = doc(db, "bookings", "all");
  const bookingsSnap = await getDoc(bookingsRef);

  if (!bookingsSnap.exists()) {
    console.warn("⚠️ No bookings found. Nothing to migrate.");
    return;
  }

  const bookings = bookingsSnap.data() as Record<string, number[]>;
  const newShifts: Record<string, "late" | "day"> = {};
  let late = 0, day = 0;

  for (const [dateKey, userIds] of Object.entries(bookings)) {
    for (const uid of userIds) {
      // Skip férias (-99) and baixa (-98)
      if (uid === -99 || uid === -98) continue;

      const absId = Math.abs(uid);
      const isSupervisorAssigned = uid < 0;
      const shiftKey = `${absId}-${dateKey}`;

      if (isSupervisorAssigned) {
        // Supervisor assigned → late shift
        newShifts[shiftKey] = "late";
        late++;
      } else {
        // Agent self-booked → morning shift
        newShifts[shiftKey] = "day";
        day++;
      }
    }
  }

  // Overwrite the entire shifts collection
  const shiftsRef = doc(db, "shifts", "all");
  await setDoc(shiftsRef, newShifts);
  console.log(`✅ Migration v4 complete. ${late} late + ${day} day = ${late + day} total entries written.`);
}
