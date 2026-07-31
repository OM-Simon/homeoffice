/**
 * ONE-USE MIGRATION SCRIPT v5 — migrateShifts.ts
 *
 * - Supervisor-assigned days (negative IDs) → "late"
 * - Agent self-booked days (positive IDs)   → "day"
 * Completely overwrites the shifts collection.
 * Logs every single key written so you can verify in the console.
 *
 * HOW TO USE:
 *   1. Copy to /src/ alongside firebase.ts
 *   2. In App.tsx add BEFORE the return():
 *        import { migrateShifts } from "./migrateShifts";
 *        migrateShifts();
 *   3. Open browser, check console for the full list of keys written
 *   4. Verify agent 13 August entries appear (e.g. "13-2026-08-03": "day")
 *   5. Remove the two lines from App.tsx and delete this file
 */

import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export async function migrateShifts() {
  console.log("🔄 Migration v5 starting...");

  const bookingsSnap = await getDoc(doc(db, "bookings", "all"));

  if (!bookingsSnap.exists()) {
    console.error("❌ No bookings document found!");
    return;
  }

  const bookings = bookingsSnap.data() as Record<string, number[]>;
  console.log(`📦 Bookings document loaded. Keys: ${Object.keys(bookings).length}`);

  const newShifts: Record<string, "late" | "day"> = {};
  let lateCount = 0;
  let dayCount = 0;
  let skippedCount = 0;

  for (const [dateKey, userIds] of Object.entries(bookings)) {
    for (const uid of userIds) {
      // Skip férias and baixa special IDs
      if (uid === -99 || uid === -98) { skippedCount++; continue; }

      const absId = Math.abs(uid);
      const shiftKey = `${absId}-${dateKey}`;
      const shift = uid < 0 ? "late" : "day";
      newShifts[shiftKey] = shift;

      if (shift === "late") lateCount++;
      else dayCount++;
    }
  }

  console.log(`📊 Summary: ${lateCount} late, ${dayCount} day, ${skippedCount} skipped`);
  console.log("📝 All shift entries to be written:", newShifts);

  // Check specifically for agent 13 in August
  const agent13Aug = Object.entries(newShifts).filter(([k]) => k.startsWith("13-2026-08"));
  console.log(`🔍 Agent 13 August entries (${agent13Aug.length}):`, agent13Aug);

  try {
    await setDoc(doc(db, "shifts", "all"), newShifts);
    console.log("✅ Migration v5 complete — shifts collection written successfully.");
  } catch (err) {
    console.error("❌ Firestore write FAILED:", err);
    console.error("👉 Check your Firestore security rules — shifts collection needs read/write: if true");
  }
}
