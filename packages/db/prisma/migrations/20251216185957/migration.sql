-- CreateTable
CREATE TABLE "User" (
    "cid" BIGINT NOT NULL,
    "name" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("cid")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" SERIAL NOT NULL,
    "userCid" BIGINT NOT NULL,
    "settings" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userCid_key" ON "UserSettings"("userCid");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userCid_fkey" FOREIGN KEY ("userCid") REFERENCES "User"("cid") ON DELETE RESTRICT ON UPDATE CASCADE;
