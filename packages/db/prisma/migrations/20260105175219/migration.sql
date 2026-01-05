-- DropIndex
DROP INDEX "pilots_callsign_last_idx";

-- DropIndex
DROP INDEX "pilots_live_callsign_last_idx";

-- AlterTable
ALTER TABLE "Pilot" ADD COLUMN     "ac_reg" TEXT;

-- CreateIndex
CREATE INDEX "pilots_live_last_idx" ON "Pilot"("live", "last_update");

-- CreateIndex
CREATE INDEX "pilots_callsign_sched_idx" ON "Pilot"("callsign", "sched_off_block", "id");

-- CreateIndex
CREATE INDEX "pilots_acreg_sched_idx" ON "Pilot"("ac_reg", "sched_off_block", "id");

-- [MANUAL] Enable trigram extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- [MANUAL] Create GIN indexes for search
CREATE INDEX "pilots_callsign_trgm_idx" ON "Pilot" USING gin ("callsign" gin_trgm_ops);
CREATE INDEX "pilots_dep_icao_trgm_idx" ON "Pilot" USING gin ("dep_icao" gin_trgm_ops);
CREATE INDEX "pilots_arr_icao_trgm_idx" ON "Pilot" USING gin ("arr_icao" gin_trgm_ops);
CREATE INDEX "pilots_cid_trgm_idx" ON "Pilot" USING gin ("cid" gin_trgm_ops);
CREATE INDEX "pilots_name_trgm_idx" ON "Pilot" USING gin ("name" gin_trgm_ops);