import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ResultsService {
  constructor(private readonly httpService: HttpService) {}

  async getSessionsByYear(year: number) {
    // Jolpica-F1 API에서 해당 시즌의 레이스 목록 조회
    const url = `https://api.jolpi.ca/ergast/api/f1/${year}/races.json`;
    const response = await firstValueFrom(this.httpService.get(url));
    return response.data;
  }

  async getAllSessions() {
    // 전체 시즌 세션 데이터 (예시: 최근 5년)
    const url = `https://api.jolpi.ca/ergast/api/f1/current.json`;
    const response = await firstValueFrom(this.httpService.get(url));
    return response.data;
  }

  async getSessionByKey(sessionKey: string) {
    // sessionKey에 맞는 세션 데이터 조회 (예시: 2024/1)
    const url = `https://api.jolpi.ca/ergast/api/f1/${sessionKey}.json`;
    const response = await firstValueFrom(this.httpService.get(url));
    return response.data;
  }

  async getSessionResults(sessionKey: string) {
    // sessionKey에 맞는 결과 데이터 조회
    const url = `https://api.jolpi.ca/ergast/api/f1/${sessionKey}/results.json`;
    const response = await firstValueFrom(this.httpService.get(url));
    return response.data;
  }
}
