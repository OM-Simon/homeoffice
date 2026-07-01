/**
 * ONE-USE MIGRATION SCRIPT — migrateShifts.ts
 *
 * Run once to populate the `shifts` Firestore collection from existing bookings.
 * After running successfully, DELETE this file.
 *
 * HOW TO USE:
 *   1. Drop this file into your /src folder alongside firebase.ts
 *   2. In your App.tsx, temporarily add:
 *        import { migrateShifts } from "./migrateShifts";
 *        migrateShifts();   // ← add this line before the return()
 *   3. Open the app once in the browser — check the console for "✅ Migration complete"
 *   4. Remove the import and the migrateShifts() call from App.tsx
 *   5. Delete this file
 */

import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// IDs of agents on the LATE shift (⭐ 11h00–19h30)
// Edit this list if needed before running
const LATE_SHIFT_IDS = [2, 5, 7, 10, 12];

export async function migrateShifts() {
  console.log("🔄 Starting shift migration...");

  // 1. Read existing bookings
  const bookingsRef = doc(db, "bookings", "all");
  const bookingsSnap = await getDoc(bookingsRef);

  if (!bookingsSnap.exists()) {
    console.warn("⚠️ No bookings found. Nothing to migrate.");
    return;
  }

  const bookings = bookingsSnap.data() as Record<string, number[]>;

  // 2. Read existing shifts (to avoid overwriting anything already set)
  const shiftsRef = doc(db, "shifts", "all");
  const shiftsSnap = await getDoc(shiftsRef);
  const existingShifts: Record<string, "late" | "day"> = shiftsSnap.exists()
    ? (shiftsSnap.data() as Record<string, "late" | "day">)
    : {};

  const newShifts = { ...existingShifts };
  let count = 0;

  // 3. Loop through every booked day
  for (const [dateKey, userIds] of Object.entries(bookings)) {
    for (const uid of userIds) {
      // Skip férias (-99) and baixa (-98)
      if (uid === -99 || uid === -98) continue;

      const absId = Math.abs(uid);
      const isSupervisorAssigned = uid < 0;
      const isUserSelfBooked = uid > 0;

      const shiftKey = `${absId}-${dateKey}`;

      // Skip if already set
      if (newShifts[shiftKey]) continue;

      if (isSupervisorAssigned) {
        // Supervisor-assigned: use late shift if agent is in LATE_SHIFT_IDS
        newShifts[shiftKey] = LATE_SHIFT_IDS.includes(absId) ? "late" : "day";
      } else if (isUserSelfBooked) {
        // Self-booked by agent: always day shift
        newShifts[shiftKey] = "day";
      }

      count++;
    }
  }

  // 4. Write back to Firestore
  await setDoc(shiftsRef, newShifts);
  console.log(`✅ Migration complete. ${count} shift entries written.`);
}
