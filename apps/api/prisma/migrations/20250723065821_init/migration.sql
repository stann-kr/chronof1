-- CreateTable
CREATE TABLE "history"."Season" (
    "season_year" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),

    CONSTRAINT "Season_pkey" PRIMARY KEY ("season_year")
);

-- CreateTable
CREATE TABLE "history"."Circuit" (
    "circuit_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "locality" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "Circuit_pkey" PRIMARY KEY ("circuit_id")
);

-- CreateTable
CREATE TABLE "history"."Event" (
    "event_id" SERIAL NOT NULL,
    "season_year" INTEGER NOT NULL,
    "circuit_id" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "official_name" TEXT NOT NULL,
    "event_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "history"."Constructor" (
    "constructor_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "nationality" TEXT,

    CONSTRAINT "Constructor_pkey" PRIMARY KEY ("constructor_id")
);

-- CreateTable
CREATE TABLE "history"."Driver" (
    "driver_id" SERIAL NOT NULL,
    "code" CHAR(3),
    "forename" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "nationality" TEXT,
    "number" INTEGER,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("driver_id")
);

-- CreateTable
CREATE TABLE "history"."DriverSeasonStanding" (
    "season_year" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "constructor_id" INTEGER NOT NULL,
    "position" INTEGER,
    "points" DECIMAL(6,1),
    "wins" INTEGER,

    CONSTRAINT "DriverSeasonStanding_pkey" PRIMARY KEY ("season_year","driver_id","constructor_id")
);

-- CreateTable
CREATE TABLE "history"."ConstructorSeasonStanding" (
    "season_year" INTEGER NOT NULL,
    "constructor_id" INTEGER NOT NULL,
    "position" INTEGER,
    "points" DECIMAL(6,1),
    "wins" INTEGER,

    CONSTRAINT "ConstructorSeasonStanding_pkey" PRIMARY KEY ("season_year","constructor_id")
);

-- CreateTable
CREATE TABLE "history"."DriverEventResult" (
    "event_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "constructor_id" INTEGER NOT NULL,
    "grid" INTEGER,
    "finish_pos" INTEGER,
    "points" DECIMAL(5,1),
    "laps" INTEGER,
    "status" TEXT,
    "fastest_lap_time" TEXT,

    CONSTRAINT "DriverEventResult_pkey" PRIMARY KEY ("event_id","driver_id")
);

-- CreateTable
CREATE TABLE "history"."ConstructorEventResult" (
    "event_id" INTEGER NOT NULL,
    "constructor_id" INTEGER NOT NULL,
    "points" DECIMAL(6,1),
    "finish_pos" INTEGER,

    CONSTRAINT "ConstructorEventResult_pkey" PRIMARY KEY ("event_id","constructor_id")
);

-- CreateTable
CREATE TABLE "history"."DriverConstructor" (
    "driver_id" INTEGER NOT NULL,
    "constructor_id" INTEGER NOT NULL,
    "season_year" INTEGER NOT NULL,
    "from_round" INTEGER,
    "to_round" INTEGER,

    CONSTRAINT "DriverConstructor_pkey" PRIMARY KEY ("driver_id","constructor_id","season_year")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_season_year_round_key" ON "history"."Event"("season_year", "round");

-- CreateIndex
CREATE UNIQUE INDEX "DriverConstructor_driver_id_constructor_id_season_year_from_key" ON "history"."DriverConstructor"("driver_id", "constructor_id", "season_year", "from_round");

-- AddForeignKey
ALTER TABLE "history"."Event" ADD CONSTRAINT "Event_season_year_fkey" FOREIGN KEY ("season_year") REFERENCES "history"."Season"("season_year") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history"."Event" ADD CONSTRAINT "Event_circuit_id_fkey" FOREIGN KEY ("circuit_id") REFERENCES "history"."Circuit"("circuit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history"."DriverSeasonStanding" ADD CONSTRAINT "DriverSeasonStanding_season_year_fkey" FOREIGN KEY ("season_year") REFERENCES "history"."Season"("season_year") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history"."DriverSeasonStanding" ADD CONSTRAINT "DriverSeasonStanding_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "history"."Driver"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history"."DriverSeasonStanding" ADD CONSTRAINT "DriverSeasonStanding_constructor_id_fkey" FOREIGN KEY ("constructor_id") REFERENCES "history"."Constructor"("constructor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history"."ConstructorSeasonStanding" ADD CONSTRAINT "ConstructorSeasonStanding_season_year_fkey" FOREIGN KEY ("season_year") REFERENCES "history"."Season"("season_year") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history"."ConstructorSeasonStanding" ADD CONSTRAINT "ConstructorSeasonStanding_constructor_id_fkey" FOREIGN KEY ("constructor_id") REFERENCES "history"."Constructor"("constructor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history"."DriverEventResult" ADD CONSTRAINT "DriverEventResult_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "history"."Event"("event_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history"."DriverEventResult" ADD CONSTRAINT "DriverEventResult_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "history"."Driver"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history"."DriverEventResult" ADD CONSTRAINT "DriverEventResult_constructor_id_fkey" FOREIGN KEY ("constructor_id") REFERENCES "history"."Constructor"("constructor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history"."ConstructorEventResult" ADD CONSTRAINT "ConstructorEventResult_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "history"."Event"("event_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history"."ConstructorEventResult" ADD CONSTRAINT "ConstructorEventResult_constructor_id_fkey" FOREIGN KEY ("constructor_id") REFERENCES "history"."Constructor"("constructor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history"."DriverConstructor" ADD CONSTRAINT "DriverConstructor_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "history"."Driver"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history"."DriverConstructor" ADD CONSTRAINT "DriverConstructor_constructor_id_fkey" FOREIGN KEY ("constructor_id") REFERENCES "history"."Constructor"("constructor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history"."DriverConstructor" ADD CONSTRAINT "DriverConstructor_season_year_fkey" FOREIGN KEY ("season_year") REFERENCES "history"."Season"("season_year") ON DELETE RESTRICT ON UPDATE CASCADE;
