-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN "wellnessPainScore" INTEGER DEFAULT 1;

-- CreateTable
CREATE TABLE "_EventParticipants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_EventParticipants_AB_unique" ON "_EventParticipants"("A", "B");
CREATE INDEX "_EventParticipants_B_index" ON "_EventParticipants"("B");

-- AddForeignKey
ALTER TABLE "_EventParticipants" ADD CONSTRAINT "_EventParticipants_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_EventParticipants" ADD CONSTRAINT "_EventParticipants_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
