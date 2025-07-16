/**
 * 타이어 스틴트 데이터 엔티티
 */
export interface StintEntity {
  stint_id: string;
  session_key: string;
  driver_number: string;
  compound: string;
  stint_number: number;
  stint_start_lap: number;
  stint_end_lap: number | null;
  stint_compound: string | null;  // 가이드에 언급된 필드 추가
  created_at: Date;
  updated_at: Date;
}
