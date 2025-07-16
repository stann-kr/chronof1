"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimingFrameDTO = exports.DriverTimingDTO = void 0;
const class_transformer_1 = require("class-transformer");
let DriverTimingDTO = class DriverTimingDTO {
    driverNumber;
    position;
    gapToLeader;
    interval;
    lastLapTime;
    bestLapTime;
    sector1Time;
    sector2Time;
    sector3Time;
    compound;
    tyreAge;
    timestamp;
};
exports.DriverTimingDTO = DriverTimingDTO;
__decorate([
    (0, class_transformer_1.Expose)({ name: 'driver_number' }),
    __metadata("design:type", String)
], DriverTimingDTO.prototype, "driverNumber", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'position' }),
    __metadata("design:type", Number)
], DriverTimingDTO.prototype, "position", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'gap_to_leader' }),
    __metadata("design:type", Object)
], DriverTimingDTO.prototype, "gapToLeader", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'interval' }),
    __metadata("design:type", Object)
], DriverTimingDTO.prototype, "interval", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'last_lap_time' }),
    __metadata("design:type", Object)
], DriverTimingDTO.prototype, "lastLapTime", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'best_lap_time' }),
    __metadata("design:type", Object)
], DriverTimingDTO.prototype, "bestLapTime", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'sector1_time' }),
    __metadata("design:type", Object)
], DriverTimingDTO.prototype, "sector1Time", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'sector2_time' }),
    __metadata("design:type", Object)
], DriverTimingDTO.prototype, "sector2Time", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'sector3_time' }),
    __metadata("design:type", Object)
], DriverTimingDTO.prototype, "sector3Time", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'compound' }),
    __metadata("design:type", Object)
], DriverTimingDTO.prototype, "compound", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'tyre_age' }),
    __metadata("design:type", Object)
], DriverTimingDTO.prototype, "tyreAge", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'timestamp' }),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], DriverTimingDTO.prototype, "timestamp", void 0);
exports.DriverTimingDTO = DriverTimingDTO = __decorate([
    (0, class_transformer_1.Exclude)()
], DriverTimingDTO);
let TimingFrameDTO = class TimingFrameDTO {
    sessionKey;
    timestamp;
    frameNumber;
    drivers;
};
exports.TimingFrameDTO = TimingFrameDTO;
__decorate([
    (0, class_transformer_1.Expose)({ name: 'session_key' }),
    __metadata("design:type", String)
], TimingFrameDTO.prototype, "sessionKey", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'timestamp' }),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], TimingFrameDTO.prototype, "timestamp", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'frame_number' }),
    __metadata("design:type", Number)
], TimingFrameDTO.prototype, "frameNumber", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'drivers' }),
    (0, class_transformer_1.Type)(() => DriverTimingDTO),
    __metadata("design:type", Object)
], TimingFrameDTO.prototype, "drivers", void 0);
exports.TimingFrameDTO = TimingFrameDTO = __decorate([
    (0, class_transformer_1.Exclude)()
], TimingFrameDTO);
//# sourceMappingURL=timing.dto.js.map