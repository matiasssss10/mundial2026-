import "dotenv/config";
import { sendScheduledPreviews } from "./lib/data/telegram";
import { getDb } from "./lib/db/index";

async function forcePreview() {
  const db = await getDb();
  const f = (await db.execute("SELECT id FROM fixtures WHERE status='NS' LIMIT 1")).rows[0] as any;
  if (!f) return console.log("No NS matches");
  
  // Set match date to 1 hour from now so it passes the cutoff
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await db.execute({ sql: "UPDATE fixtures SET match_date = ? WHERE id=?", args: [future, f.id] });
  
  // Delete from tg_log so it sends again
  await db.execute({ sql: "DELETE FROM tg_log WHERE fixture_id=? AND type='preview'", args: [f.id] });
  
  const sent = await sendScheduledPreviews();
  console.log(`Sent: ${sent}`);
}

forcePreview();
