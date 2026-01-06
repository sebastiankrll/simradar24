-- CreateTable
CREATE TABLE "Trackpoint" (
    "pilot_id" CHAR(10) NOT NULL,
    "points" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trackpoint_pkey" PRIMARY KEY ("pilot_id")
);

-- CreateIndex
CREATE INDEX "Trackpoint_pilot_id_idx" ON "Trackpoint"("pilot_id");

-- AddForeignKey
ALTER TABLE "Trackpoint" ADD CONSTRAINT "Trackpoint_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "Pilot"("pilot_id") ON DELETE RESTRICT ON UPDATE CASCADE;
