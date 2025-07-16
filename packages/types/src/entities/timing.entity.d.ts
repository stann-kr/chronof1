/**
 * 타이밍 데이터 엔티티
 */
export interface TimingEntity {
    id: string;
    session_key: string;
    frame_number: number;
    driver_number: string;
    position: number;
    gap_to_leader: number | null;
    interval: number | null;
    last_lap_time: number | null;
    best_lap_time: number | null;
    sector1_time: number | null;
    sector2_time: number | null;
    sector3_time: number | null;
    compound: string | null;
    tyre_age: number | null;
    timestamp: Date;
    created_at: Date;
}
//# sourceMappingURL=timing.entity.d.ts.map