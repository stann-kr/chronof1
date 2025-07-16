export declare class DriverTimingDTO {
    driverNumber: string;
    position: number;
    gapToLeader: number | null;
    interval: number | null;
    lastLapTime: number | null;
    bestLapTime: number | null;
    sector1Time: number | null;
    sector2Time: number | null;
    sector3Time: number | null;
    compound: string | null;
    tyreAge: number | null;
    timestamp: Date;
}
export declare class TimingFrameDTO {
    sessionKey: string;
    timestamp: Date;
    frameNumber: number;
    drivers: Record<string, DriverTimingDTO>;
}
//# sourceMappingURL=timing.dto.d.ts.map