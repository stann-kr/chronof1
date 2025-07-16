/**
 * F1 관련 공통 열거형(Enum) 정의
 */

export enum SessionType {
  PRACTICE_1 = 'FP1',
  PRACTICE_2 = 'FP2',
  PRACTICE_3 = 'FP3',
  QUALIFYING = 'Q',
  SPRINT_QUALIFYING = 'SQ',
  SPRINT = 'S',
  RACE = 'R'
}

export enum TyreCompound {
  SOFT = 'SOFT',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  INTERMEDIATE = 'INTERMEDIATE',
  WET = 'WET',
  UNKNOWN = 'UNKNOWN'
}

export enum EventStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED'
}
