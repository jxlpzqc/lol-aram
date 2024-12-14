-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GameUserMapping" (
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "isWin" BOOLEAN NOT NULL DEFAULT true,
    "scoreDelta" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("userId", "gameId"),
    CONSTRAINT "GameUserMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("summonerId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GameUserMapping_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("gameId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GameUserMapping" ("gameId", "userId") SELECT "gameId", "userId" FROM "GameUserMapping";
DROP TABLE "GameUserMapping";
ALTER TABLE "new_GameUserMapping" RENAME TO "GameUserMapping";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
