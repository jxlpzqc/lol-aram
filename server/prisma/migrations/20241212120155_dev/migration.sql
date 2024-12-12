-- CreateTable
CREATE TABLE "User" (
    "summonerId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "rankScore" INTEGER NOT NULL DEFAULT 1200
);

-- CreateTable
CREATE TABLE "Game" (
    "gameId" TEXT NOT NULL PRIMARY KEY,
    "statusBlock" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GameUserMapping" (
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,

    PRIMARY KEY ("userId", "gameId"),
    CONSTRAINT "GameUserMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("summonerId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GameUserMapping_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("gameId") ON DELETE RESTRICT ON UPDATE CASCADE
);
