// §5.5 Mock writes (Phase 4): `pnpm mock:reset` deletes the persisted mock
// write-store so the next `pnpm dev` reseeds fresh from /lib/mock/fixtures.
import fs from "node:fs";
import path from "node:path";

const dbFile = path.join(process.cwd(), ".mock-db.json");

if (fs.existsSync(dbFile)) {
  fs.unlinkSync(dbFile);
  console.log(`[mock:reset] deleted ${dbFile}`);
} else {
  console.log(`[mock:reset] ${dbFile} does not exist — nothing to do.`);
}
