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
exports.SessionDTO = void 0;
const class_transformer_1 = require("class-transformer");
let SessionDTO = class SessionDTO {
    sessionKey;
    year;
    round;
    eventName;
    sessionName;
    sessionType;
    circuitName;
    circuitShortName;
    startDate;
    endDate;
    hasTiming;
};
exports.SessionDTO = SessionDTO;
__decorate([
    (0, class_transformer_1.Expose)({ name: 'session_key' }),
    __metadata("design:type", String)
], SessionDTO.prototype, "sessionKey", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'year' }),
    __metadata("design:type", Number)
], SessionDTO.prototype, "year", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'round' }),
    __metadata("design:type", Number)
], SessionDTO.prototype, "round", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'event_name' }),
    __metadata("design:type", String)
], SessionDTO.prototype, "eventName", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'session_name' }),
    __metadata("design:type", String)
], SessionDTO.prototype, "sessionName", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'session_type' }),
    __metadata("design:type", String)
], SessionDTO.prototype, "sessionType", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'circuit_name' }),
    __metadata("design:type", String)
], SessionDTO.prototype, "circuitName", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'circuit_short_name' }),
    __metadata("design:type", String)
], SessionDTO.prototype, "circuitShortName", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'start_date' }),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], SessionDTO.prototype, "startDate", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'end_date' }),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], SessionDTO.prototype, "endDate", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'has_timing_data' }),
    __metadata("design:type", Boolean)
], SessionDTO.prototype, "hasTiming", void 0);
exports.SessionDTO = SessionDTO = __decorate([
    (0, class_transformer_1.Exclude)()
], SessionDTO);
//# sourceMappingURL=session.dto.js.map