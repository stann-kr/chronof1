import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);
  private readonly pythonScriptsPath = path.resolve(__dirname, '../python');

  /**
   * FastF1 라이브러리를 사용하여 세션 데이터를 가져오는 함수
   */
  async importSessionFromFastF1(year: number, round: number, sessionType: string): Promise<any> {
    return this.runPythonScript('import_fastf1.py', [
      '--year', year.toString(),
      '--round', round.toString(),
      '--session', sessionType,
    ]);
  }

  /**
   * Jolpica API를 사용하여 타이밍 데이터 가져오기
   */
  async importTimingFromJolpica(sessionKey: string): Promise<any> {
    return this.runPythonScript('import_jolpica.py', [
      '--session-key', sessionKey,
    ]);
  }

  /**
   * 세션 목록 가져오기
   */
  async listAvailableSessions(year?: number): Promise<any> {
    const args = [];
    if (year) {
      args.push('--year', year.toString());
    }
    
    return this.runPythonScript('list_sessions.py', args);
  }

  /**
   * 파이썬 스크립트를 실행하는 내부 헬퍼 함수
   */
  private runPythonScript(scriptName: string, args: string[] = []): Promise<any> {
    const scriptPath = path.join(this.pythonScriptsPath, scriptName);
    
    if (!fs.existsSync(scriptPath)) {
      this.logger.error(`Python script not found: ${scriptPath}`);
      throw new Error(`Python script not found: ${scriptName}`);
    }

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [scriptPath, ...args]);
      
      let dataString = '';
      let errorString = '';
      
      pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
        this.logger.error(`Python stderr: ${data.toString()}`);
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`Python process exited with code ${code}`);
          reject(new Error(`Python script exited with code ${code}: ${errorString}`));
          return;
        }
        
        try {
          const result = JSON.parse(dataString);
          resolve(result);
        } catch (error) {
          this.logger.error(`Failed to parse Python output: ${(error as any).message}`);
          reject(new Error(`Failed to parse Python output: ${(error as any).message}`));
        }
      });
    });
  }
}
