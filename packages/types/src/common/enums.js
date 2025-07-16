"use strict";
/**
 * F1 관련 공통 열거형(Enum) 정의
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventStatus = exports.TyreCompound = exports.SessionType = void 0;
var SessionType;
(function (SessionType) {
    SessionType["PRACTICE_1"] = "FP1";
    SessionType["PRACTICE_2"] = "FP2";
    SessionType["PRACTICE_3"] = "FP3";
    SessionType["QUALIFYING"] = "Q";
    SessionType["SPRINT_QUALIFYING"] = "SQ";
    SessionType["SPRINT"] = "S";
    SessionType["RACE"] = "R";
})(SessionType || (exports.SessionType = SessionType = {}));
var TyreCompound;
(function (TyreCompound) {
    TyreCompound["SOFT"] = "SOFT";
    TyreCompound["MEDIUM"] = "MEDIUM";
    TyreCompound["HARD"] = "HARD";
    TyreCompound["INTERMEDIATE"] = "INTERMEDIATE";
    TyreCompound["WET"] = "WET";
    TyreCompound["UNKNOWN"] = "UNKNOWN";
})(TyreCompound || (exports.TyreCompound = TyreCompound = {}));
var EventStatus;
(function (EventStatus) {
    EventStatus["UPCOMING"] = "UPCOMING";
    EventStatus["ONGOING"] = "ONGOING";
    EventStatus["COMPLETED"] = "COMPLETED";
})(EventStatus || (exports.EventStatus = EventStatus = {}));
//# sourceMappingURL=enums.js.map