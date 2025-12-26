-- CreateTable
CREATE TABLE "Pilot" (
    "pilot_id" CHAR(10) NOT NULL,
    "cid" INTEGER NOT NULL,
    "callsign" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "altitude_agl" INTEGER NOT NULL,
    "altitude_ms" INTEGER NOT NULL,
    "groundspeed" INTEGER NOT NULL,
    "vertical_speed" INTEGER NOT NULL,
    "heading" INTEGER NOT NULL,
    "aircraft" TEXT NOT NULL,
    "transponder" CHAR(4) NOT NULL,
    "frequency" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "pilot_rating" TEXT NOT NULL,
    "military_rating" TEXT NOT NULL,
    "qnh_i_hg" DOUBLE PRECISION NOT NULL,
    "qnh_mb" DOUBLE PRECISION NOT NULL,
    "flight_plan" JSONB,
    "times" JSONB,
    "logon_time" TIMESTAMP(3) NOT NULL,
    "last_update" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "live" BOOLEAN NOT NULL DEFAULT false,
    "sched_off_block" TIMESTAMP(3),
    "sched_on_block" TIMESTAMP(3),
    "dep_icao" TEXT,
    "arr_icao" TEXT,

    CONSTRAINT "Pilot_pkey" PRIMARY KEY ("pilot_id")
);

-- CreateTable
CREATE TABLE "User" (
    "cid" BIGINT NOT NULL,
    "settings" JSONB,

    CONSTRAINT "User_pkey" PRIMARY KEY ("cid")
);

-- CreateIndex
CREATE INDEX "pilots_dep_idx" ON "Pilot"("dep_icao", "sched_off_block", "pilot_id");

-- CreateIndex
CREATE INDEX "pilots_arr_idx" ON "Pilot"("arr_icao", "sched_on_block", "pilot_id");

-- CreateIndex
CREATE INDEX "Pilot_callsign_idx" ON "Pilot"("callsign");

-- CreateIndex
CREATE INDEX "Pilot_cid_idx" ON "Pilot"("cid");

-- CreateIndex
CREATE INDEX "Pilot_name_idx" ON "Pilot"("name");
