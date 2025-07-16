import { Injectable } from '@nestjs/common';
import { ResultsRepository } from '../repositories/results.repository';
import { SessionDTO } from '@f1/types';

@Injectable()
export class ResultsService {
  constructor(private resultsRepository: ResultsRepository) {}

  async getAllSessions(): Promise<SessionDTO[]> {
    return this.resultsRepository.findAllSessions();
  }

  async getSessionsByYear(year: number): Promise<SessionDTO[]> {
    return this.resultsRepository.findSessionsByYear(year);
  }

  async getSessionByKey(sessionKey: string): Promise<SessionDTO | null> {
    return this.resultsRepository.findSessionByKey(sessionKey);
  }

  async getSessionResults(sessionKey: string) {
    const results = await this.resultsRepository.getSessionResults(sessionKey);
    if (!results) {
      return null;
    }

    return results;
  }
}
