-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "gameId" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "statusBlock" TEXT NOT NULL,
    "time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("gameId", "server")
);
INSERT INTO "new_Game" ("gameId", "server", "statusBlock", "time") SELECT "gameId", 'HN1', "statusBlock", "time" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE TABLE "new_GameUserMapping" (
    "userId" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "isWin" BOOLEAN NOT NULL DEFAULT true,
    "scoreDelta" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("userId", "gameId", "server"),
    CONSTRAINT "GameUserMapping_userId_server_fkey" FOREIGN KEY ("userId", "server") REFERENCES "User" ("summonerId", "server") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GameUserMapping_gameId_server_fkey" FOREIGN KEY ("gameId", "server") REFERENCES "Game" ("gameId", "server") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GameUserMapping" ("gameId", "isWin", "scoreDelta", "userId", "server") SELECT "gameId", "isWin", "scoreDelta", "userId", 'HN1' FROM "GameUserMapping";
DROP TABLE "GameUserMapping";
ALTER TABLE "new_GameUserMapping" RENAME TO "GameUserMapping";
CREATE TABLE "new_User" (
    "summonerId" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "rankScore" INTEGER NOT NULL DEFAULT 1200,

    PRIMARY KEY ("summonerId", "server")
);
INSERT INTO "new_User" ("name", "nickname", "rankScore", "summonerId", "server") SELECT "name", "nickname", "rankScore", "summonerId", 'HN1' FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
