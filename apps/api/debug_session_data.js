const { PrismaClient } = require('@prisma/client');

async function debugSessionData() {
  const prisma = new PrismaClient();
  
  try {
    // 1. 세션 1 기본 정보
    console.log('=== 세션 1 기본 정보 ===');
    const session = await prisma.commonSession.findUnique({
      where: { id: 1 },
      include: {
        event: {
          include: {
            circuit: true
          }
        }
      }
    });
    console.log('세션 정보:', JSON.stringify(session, null, 2));
    
    // 2. 라이브 세션 정보
    console.log('\n=== 라이브 세션 정보 ===');
    const liveSession = await prisma.liveSession.findFirst({
      where: { commonSessionId: 1 }
    });
    console.log('라이브 세션:', JSON.stringify(liveSession, null, 2));
    
    if (liveSession) {
      // 3. 텔레메트리 데이터 시간 범위
      console.log('\n=== 텔레메트리 데이터 시간 범위 ===');
      const timeRange = await prisma.$queryRaw`
        SELECT 
          MIN(session_time) as min_time,
          MAX(session_time) as max_time,
          COUNT(*) as total_records
        FROM live_telemetry_data 
        WHERE driver_session_id IN (
          SELECT id FROM live_driver_sessions WHERE session_id = ${liveSession.id}
        )
        AND session_time IS NOT NULL
      `;
      console.log('시간 범위:', timeRange);
      
      // 4. 첫 10개 레코드 샘플
      console.log('\n=== 첫 10개 텔레메트리 데이터 샘플 ===');
      const samples = await prisma.$queryRaw`
        SELECT 
          ltd.session_time,
          ltd.speed,
          lds.car_number,
          d.code as driver_code
        FROM live_telemetry_data ltd
        JOIN live_driver_sessions lds ON ltd.driver_session_id = lds.id
        JOIN common_drivers d ON lds.driver_id = d.id
        WHERE lds.session_id = ${liveSession.id}
        AND ltd.session_time IS NOT NULL
        ORDER BY ltd.session_time ASC
        LIMIT 10
      `;
      console.log('샘플 데이터:', samples);
      
      // 5. 랩 데이터 시간 범위
      console.log('\n=== 랩 데이터 시간 범위 ===');
      const lapTimeRange = await prisma.$queryRaw`
        SELECT 
          MIN(session_time) as min_lap_time,
          MAX(session_time) as max_lap_time,
          COUNT(*) as total_laps
        FROM live_laps 
        WHERE driver_session_id IN (
          SELECT id FROM live_driver_sessions WHERE session_id = ${liveSession.id}
        )
        AND session_time IS NOT NULL
      `;
      console.log('랩 시간 범위:', lapTimeRange);
    }
    
  } catch (error) {
    console.error('데이터 조회 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSessionData();
