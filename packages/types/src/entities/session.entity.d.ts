/**
 * 세션 정보 엔티티
 */
export interface SessionEntity {
    session_key: string;
    year: number;
    round: number;
    event_name: string;
    session_name: string;
    session_type: string;
    circuit_name: string;
    circuit_short_name: string;
    start_date: Date;
    end_date: Date;
    has_timing_data: boolean;
    created_at: Date;
    updated_at: Date;
}
//# sourceMappingURL=session.entity.d.ts.map