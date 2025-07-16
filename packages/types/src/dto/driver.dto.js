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
exports.DriverDTO = void 0;
const class_transformer_1 = require("class-transformer");
let DriverDTO = class DriverDTO {
    driverId;
    driverNumber;
    code;
    fullName;
    firstName;
    lastName;
    teamName;
    countryCode;
    isActive;
};
exports.DriverDTO = DriverDTO;
__decorate([
    (0, class_transformer_1.Expose)({ name: 'driver_id' }),
    __metadata("design:type", Number)
], DriverDTO.prototype, "driverId", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'driver_number' }),
    __metadata("design:type", String)
], DriverDTO.prototype, "driverNumber", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'code' }),
    __metadata("design:type", String)
], DriverDTO.prototype, "code", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'full_name' }),
    __metadata("design:type", String)
], DriverDTO.prototype, "fullName", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'first_name' }),
    __metadata("design:type", String)
], DriverDTO.prototype, "firstName", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'last_name' }),
    __metadata("design:type", String)
], DriverDTO.prototype, "lastName", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'team_name' }),
    __metadata("design:type", String)
], DriverDTO.prototype, "teamName", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'country_code' }),
    __metadata("design:type", String)
], DriverDTO.prototype, "countryCode", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'is_active' }),
    __metadata("design:type", Boolean)
], DriverDTO.prototype, "isActive", void 0);
exports.DriverDTO = DriverDTO = __decorate([
    (0, class_transformer_1.Exclude)()
], DriverDTO);
//# sourceMappingURL=driver.dto.js.map