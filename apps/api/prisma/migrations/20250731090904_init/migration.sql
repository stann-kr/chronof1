-- CreateTable
CREATE TABLE "common_seasons" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "name" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),

    CONSTRAINT "common_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_circuits" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "locality" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "length" DOUBLE PRECISION,
    "turns" INTEGER,

    CONSTRAINT "common_circuits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_events" (
    "id" SERIAL NOT NULL,
    "season_id" INTEGER NOT NULL,
    "circuit_id" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "event_start" TIMESTAMP(3) NOT NULL,
    "event_end" TIMESTAMP(3) NOT NULL,
    "status" TEXT,

    CONSTRAINT "common_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_sessions" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "status" TEXT,

    CONSTRAINT "common_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_drivers" (
    "id" SERIAL NOT NULL,
    "number" INTEGER,
    "code" TEXT,
    "abbreviation" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "nationality" TEXT,
    "country_code" TEXT,

    CONSTRAINT "common_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_teams" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "nationality" TEXT,
    "color" TEXT,

    CONSTRAINT "common_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_season_team_drivers" (
    "id" SERIAL NOT NULL,
    "season_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "driver_number" INTEGER,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "from_round" INTEGER,
    "to_round" INTEGER,
    "from_date" TIMESTAMP(3),
    "to_date" TIMESTAMP(3),

    CONSTRAINT "common_season_team_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_events" (
    "id" SERIAL NOT NULL,
    "common_event_id" INTEGER NOT NULL,
    "season_id" INTEGER NOT NULL,
    "circuit_id" INTEGER NOT NULL,

    CONSTRAINT "live_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_sessions" (
    "id" SERIAL NOT NULL,
    "live_event_id" INTEGER NOT NULL,
    "common_session_id" INTEGER NOT NULL,
    "common_event_id" INTEGER NOT NULL,

    CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_driver_sessions" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "car_number" INTEGER NOT NULL,
    "position" INTEGER,
    "grid_position" INTEGER,
    "status" TEXT,
    "points" DOUBLE PRECISION,

    CONSTRAINT "live_driver_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_laps" (
    "id" SERIAL NOT NULL,
    "driver_session_id" INTEGER NOT NULL,
    "lap_number" INTEGER NOT NULL,
    "lap_time" DOUBLE PRECISION,
    "lap_time_string" TEXT,
    "sector1_time" DOUBLE PRECISION,
    "sector2_time" DOUBLE PRECISION,
    "sector3_time" DOUBLE PRECISION,
    "lap_start_time" TIMESTAMP(3),
    "lap_start_date" TIMESTAMP(3),
    "sector1_session_time" DOUBLE PRECISION,
    "sector2_session_time" DOUBLE PRECISION,
    "sector3_session_time" DOUBLE PRECISION,
    "pit_in" BOOLEAN,
    "pit_out" BOOLEAN,
    "pit_in_time" TIMESTAMP(3),
    "pit_out_time" TIMESTAMP(3),
    "speed_i1" DOUBLE PRECISION,
    "speed_i2" DOUBLE PRECISION,
    "speed_fl" DOUBLE PRECISION,
    "speed_st" DOUBLE PRECISION,
    "tyre_compound" TEXT,
    "tyre_life" INTEGER,
    "fresh_tyre" BOOLEAN,
    "is_personal_best" BOOLEAN,
    "is_valid" BOOLEAN,
    "is_accurate" BOOLEAN,
    "track_status" TEXT,
    "deleted" BOOLEAN,
    "deleted_reason" TEXT,
    "fast_f1_generated" BOOLEAN,
    "position" INTEGER,

    CONSTRAINT "live_laps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_telemetry_data" (
    "id" SERIAL NOT NULL,
    "driver_session_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "lap_number" INTEGER,
    "session_time" DOUBLE PRECISION,
    "lap_time" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "rpm" DOUBLE PRECISION,
    "gear" INTEGER,
    "throttle" DOUBLE PRECISION,
    "brake" BOOLEAN,
    "drs" BOOLEAN,
    "distance" DOUBLE PRECISION,
    "relative_distance" DOUBLE PRECISION,
    "source" TEXT,

    CONSTRAINT "live_telemetry_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_pit_stops" (
    "id" SERIAL NOT NULL,
    "driver_session_id" INTEGER NOT NULL,
    "lap_number" INTEGER NOT NULL,
    "stop_time" DOUBLE PRECISION,
    "stop_time_string" TEXT,
    "total_duration" DOUBLE PRECISION,

    CONSTRAINT "live_pit_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_tyre_stints" (
    "id" SERIAL NOT NULL,
    "driver_session_id" INTEGER NOT NULL,
    "stint_number" INTEGER NOT NULL,
    "compound" TEXT,
    "start_lap" INTEGER,
    "end_lap" INTEGER,
    "laps" INTEGER,

    CONSTRAINT "live_tyre_stints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_position_data" (
    "id" SERIAL NOT NULL,
    "driver_session_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION,
    "status" TEXT,

    CONSTRAINT "live_position_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_weather_data" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "air_temp" DOUBLE PRECISION,
    "track_temp" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "pressure" DOUBLE PRECISION,
    "wind_speed" DOUBLE PRECISION,
    "wind_direction" DOUBLE PRECISION,
    "is_raining" BOOLEAN,

    CONSTRAINT "live_weather_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_session_messages" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "category" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT,
    "flag_type" TEXT,
    "scope" TEXT,

    CONSTRAINT "live_session_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_session_status" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "time_remaining" INTEGER,

    CONSTRAINT "live_session_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_track_status" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,

    CONSTRAINT "live_track_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "common_seasons_year_key" ON "common_seasons"("year");

-- CreateIndex
CREATE UNIQUE INDEX "common_events_season_id_round_key" ON "common_events"("season_id", "round");

-- CreateIndex
CREATE UNIQUE INDEX "common_drivers_number_key" ON "common_drivers"("number");

-- CreateIndex
CREATE UNIQUE INDEX "common_drivers_code_key" ON "common_drivers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "common_season_team_drivers_season_id_team_id_driver_id_from_key" ON "common_season_team_drivers"("season_id", "team_id", "driver_id", "from_round");

-- CreateIndex
CREATE UNIQUE INDEX "live_driver_sessions_session_id_driver_id_key" ON "live_driver_sessions"("session_id", "driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "live_laps_driver_session_id_lap_number_key" ON "live_laps"("driver_session_id", "lap_number");

-- CreateIndex
CREATE INDEX "live_telemetry_data_driver_session_id_timestamp_idx" ON "live_telemetry_data"("driver_session_id", "timestamp");

-- CreateIndex
CREATE INDEX "live_telemetry_data_driver_session_id_lap_number_idx" ON "live_telemetry_data"("driver_session_id", "lap_number");

-- CreateIndex
CREATE UNIQUE INDEX "live_pit_stops_driver_session_id_lap_number_key" ON "live_pit_stops"("driver_session_id", "lap_number");

-- CreateIndex
CREATE UNIQUE INDEX "live_tyre_stints_driver_session_id_stint_number_key" ON "live_tyre_stints"("driver_session_id", "stint_number");

-- CreateIndex
CREATE INDEX "live_position_data_driver_session_id_timestamp_idx" ON "live_position_data"("driver_session_id", "timestamp");

-- CreateIndex
CREATE INDEX "live_weather_data_session_id_timestamp_idx" ON "live_weather_data"("session_id", "timestamp");

-- CreateIndex
CREATE INDEX "live_session_messages_session_id_timestamp_idx" ON "live_session_messages"("session_id", "timestamp");

-- CreateIndex
CREATE INDEX "live_session_status_session_id_timestamp_idx" ON "live_session_status"("session_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "live_session_status_session_id_timestamp_key" ON "live_session_status"("session_id", "timestamp");

-- CreateIndex
CREATE INDEX "live_track_status_session_id_timestamp_idx" ON "live_track_status"("session_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "live_track_status_session_id_timestamp_key" ON "live_track_status"("session_id", "timestamp");

-- AddForeignKey
ALTER TABLE "common_events" ADD CONSTRAINT "common_events_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "common_seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common_events" ADD CONSTRAINT "common_events_circuit_id_fkey" FOREIGN KEY ("circuit_id") REFERENCES "common_circuits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common_sessions" ADD CONSTRAINT "common_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "common_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common_season_team_drivers" ADD CONSTRAINT "common_season_team_drivers_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "common_seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common_season_team_drivers" ADD CONSTRAINT "common_season_team_drivers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "common_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common_season_team_drivers" ADD CONSTRAINT "common_season_team_drivers_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "common_drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_events" ADD CONSTRAINT "live_events_common_event_id_fkey" FOREIGN KEY ("common_event_id") REFERENCES "common_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_events" ADD CONSTRAINT "live_events_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "common_seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_events" ADD CONSTRAINT "live_events_circuit_id_fkey" FOREIGN KEY ("circuit_id") REFERENCES "common_circuits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_live_event_id_fkey" FOREIGN KEY ("live_event_id") REFERENCES "live_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_common_session_id_fkey" FOREIGN KEY ("common_session_id") REFERENCES "common_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_common_event_id_fkey" FOREIGN KEY ("common_event_id") REFERENCES "common_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_driver_sessions" ADD CONSTRAINT "live_driver_sessions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "live_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_driver_sessions" ADD CONSTRAINT "live_driver_sessions_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "common_drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_driver_sessions" ADD CONSTRAINT "live_driver_sessions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "common_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_laps" ADD CONSTRAINT "live_laps_driver_session_id_fkey" FOREIGN KEY ("driver_session_id") REFERENCES "live_driver_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_telemetry_data" ADD CONSTRAINT "live_telemetry_data_driver_session_id_fkey" FOREIGN KEY ("driver_session_id") REFERENCES "live_driver_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_pit_stops" ADD CONSTRAINT "live_pit_stops_driver_session_id_fkey" FOREIGN KEY ("driver_session_id") REFERENCES "live_driver_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_tyre_stints" ADD CONSTRAINT "live_tyre_stints_driver_session_id_fkey" FOREIGN KEY ("driver_session_id") REFERENCES "live_driver_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_position_data" ADD CONSTRAINT "live_position_data_driver_session_id_fkey" FOREIGN KEY ("driver_session_id") REFERENCES "live_driver_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_weather_data" ADD CONSTRAINT "live_weather_data_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "common_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_session_messages" ADD CONSTRAINT "live_session_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "common_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_session_status" ADD CONSTRAINT "live_session_status_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "common_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_track_status" ADD CONSTRAINT "live_track_status_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "common_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
