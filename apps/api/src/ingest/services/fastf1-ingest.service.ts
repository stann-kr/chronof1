import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * FastF1 데이터를 적재하는 서비스
 * 
 * 이 서비스는 Python 스크립트를 실행하여 FastF1 데이터를 
 * 가져오고 데이터베이스에 저장합니다.
 */
@Injectable()
export class FastF1IngestService {
  private readonly logger = new Logger(FastF1IngestService.name);
  private readonly pythonScriptPath: string;
  private readonly etlDir: string;

  constructor() {
    // ETL 스크립트 경로 설정
    this.etlDir = path.join(__dirname, '..', 'python');
    this.pythonScriptPath = path.join(this.etlDir, 'chronof1_etl.py');

    // 스크립트 존재 여부 확인
    if (!fs.existsSync(this.pythonScriptPath)) {
      this.logger.error(`ETL 스크립트를 찾을 수 없습니다: ${this.pythonScriptPath}`);
    }
  }

  /**
   * Python 환경이 올바르게 설정되었는지 확인합니다.
   * 
   * @returns 환경이 준비되었는지 여부
   */
  async checkEnvironment(): Promise<boolean> {
    try {
      await this.runPythonCommand(['--version']);
      return true;
    } catch (error) {
      this.logger.error('Python 환경 확인 실패:', error);
      return false;
    }
  }

  /**
   * 필요한 Python 패키지를 설치합니다.
   * 
   * @returns 설치 성공 여부
   */
  async installDependencies(): Promise<boolean> {
    try {
      const requirementsPath = path.join(this.etlDir, 'requirements.txt');
      if (!fs.existsSync(requirementsPath)) {
        this.logger.error(`requirements.txt 파일을 찾을 수 없습니다: ${requirementsPath}`);
        return false;
      }

      this.logger.log('Python 패키지 설치 중...');
      // pip 명령어 직접 사용
      await this.runPythonCommand(['-m', 'pip', 'install', '-r', requirementsPath]);
      this.logger.log('Python 패키지 설치 완료');
      return true;
    } catch (error) {
      this.logger.error('Python 패키지 설치 실패:', error);
      return false;
    }
  }

  /**
   * 특정 시즌의 데이터를 적재합니다.
   * 
   * @param year 시즌 연도
   * @param options 추가 옵션
   * @returns 적재 성공 여부
   */
  async ingestSeason(year: number, options: { 
    round?: number; 
    includeTelemetry?: boolean 
  } = {}): Promise<boolean> {
    try {
      // Python 스크립트 명령행 인수 구성
      const args = [this.pythonScriptPath, year.toString()];
      
      // 특정 라운드가 지정된 경우
      if (options.round) {
        args.push(options.round.toString());
      }
      
      // 텔레메트리 데이터 포함 옵션
      if (options.includeTelemetry) {
        args.push('--telemetry');
      }

      this.logger.log(`시즌 ${year} 데이터 적재 시작...`);
      
      // Python 스크립트 실행
      await this.runPythonCommand(args);
      
      this.logger.log(`시즌 ${year} 데이터 적재 완료`);
      return true;
    } catch (error) {
      this.logger.error(`시즌 ${year} 데이터 적재 실패:`, error);
      return false;
    }
  }

  /**
   * 시즌 범위의 데이터를 적재합니다.
   * 
   * @param startYear 시작 연도
   * @param endYear 종료 연도
   * @param options 추가 옵션
   * @returns 적재 성공 여부
   */
  async ingestSeasonRange(startYear: number, endYear: number, options: {
    includeTelemetry?: boolean
  } = {}): Promise<boolean> {
    try {
      // Python 스크립트 명령행 인수 구성
      const seasonRange = `${startYear}-${endYear}`;
      const args = [this.pythonScriptPath, seasonRange];
      
      // 텔레메트리 데이터 포함 옵션
      if (options.includeTelemetry) {
        args.push('--telemetry');
      }

      this.logger.log(`시즌 범위 ${seasonRange} 데이터 적재 시작...`);
      
      // Python 스크립트 실행
      await this.runPythonCommand(args);
      
      this.logger.log(`시즌 범위 ${seasonRange} 데이터 적재 완료`);
      return true;
    } catch (error) {
      this.logger.error(`시즌 범위 데이터 적재 실패:`, error);
      return false;
    }
  }

  /**
   * Python 명령을 실행합니다.
   * 
   * @param args 명령행 인수
   * @returns 명령 실행 결과
   */
  private runPythonCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      // macOS에서는 'python3'를 사용
      const pythonCommand = process.platform === 'darwin' ? 'python3' : 'python';
      this.logger.debug(`Python 명령 실행: ${pythonCommand} ${args.join(' ')}`);
      
      // Python 명령 실행
      const pythonProcess = spawn(pythonCommand, args);
      
      let output = '';
      let errorOutput = '';

      // 표준 출력 수집
      pythonProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        this.logger.debug(text.trim());
      });

      // 표준 오류 수집
      pythonProcess.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        this.logger.debug(text.trim());
      });

      // 프로세스 종료 처리
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Python 명령 실패 (종료 코드: ${code}): ${errorOutput}`));
        }
      });

      // 오류 처리
      pythonProcess.on('error', (error) => {
        reject(new Error(`Python 프로세스 시작 실패: ${error.message}`));
      });
    });
  }
}
