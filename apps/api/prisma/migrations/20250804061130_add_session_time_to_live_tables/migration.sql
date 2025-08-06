-- AlterTable
ALTER TABLE "live_pit_stops" ADD COLUMN     "session_time" DOUBLE PRECISION,
ADD COLUMN     "timestamp" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "live_position_data" ADD COLUMN     "session_time" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "live_session_messages" ADD COLUMN     "session_time" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "live_session_status" ADD COLUMN     "session_time" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "live_track_status" ADD COLUMN     "session_time" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "live_weather_data" ADD COLUMN     "session_time" DOUBLE PRECISION;
