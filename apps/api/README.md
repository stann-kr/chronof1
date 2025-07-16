# F1 API 서비스

이 NestJS 애플리케이션은 ChronoF1 프로젝트의 백엔드 서버로, F1 경기 결과 조회와 라이브 타이밍 리플레이 기능을 제공합니다.
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
## 모듈 구조

- `results` : F1 세션 및 결과 데이터 REST API
- `replay` : WebSocket을 통한 타이밍 데이터 리플레이
- `ingest` : FastF1/Jolpica API로 데이터 수집(ETL)

## 개발 환경 설정

### 사전 요구사항

- Node.js 18 이상
- pnpm 8 이상
- Python 3.8 이상 (데이터 수집용)
- PostgreSQL 15 + TimescaleDB
- Redis 7 (캐싱용)

### 설치 방법

1. 의존성 설치:

```bash
pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

2. Python 의존성 설치:

```bash
pip install -r src/ingest/python/requirements.txt
```

3. 환경 변수 설정:

```
DATABASE_URL="postgresql://username:password@localhost:5432/f1_db?schema=public"
REDIS_URL="redis://localhost:6379"
```

4. 데이터베이스 마이그레이션:

```bash
npx prisma migrate dev
```

5. 서버 실행:

```bash
pnpm run start:dev
```

## API 문서

서버가 실행되면 Swagger API 문서는 `http://localhost:3000/api/docs`에서 확인할 수 있습니다.

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## 참고 문서

- [Prisma ORM 문서](https://www.prisma.io/docs)
- [NestJS 웹소켓 게이트웨이](https://docs.nestjs.com/websockets/gateways)
- [FastF1 API 가이드](https://theoehrly.github.io/Fast-F1/)
- [Jolpica‑F1 DB 문서](https://dbdocs.io/jolpica/jolpica-f1)
