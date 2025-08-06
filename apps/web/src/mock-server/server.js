const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Mock Data
const mockSeasons = [
  { id: 1, year: 2025, name: "2025 Formula 1 World Championship" },
  { id: 2, year: 2024, name: "2024 Formula 1 World Championship" },
  { id: 3, year: 2023, name: "2023 Formula 1 World Championship" }
];

const mockEvents = [
  {
    id: 1,
    seasonId: 1,
    round: 1,
    name: "Bahrain Grand Prix",
    shortName: "Bahrain GP",
    eventStart: "2025-03-16",
    eventEnd: "2025-03-16",
    hasLiveTiming: true,
    circuit: {
      id: 1,
      name: "Bahrain International Circuit",
      locality: "Sakhir",
      country: "Bahrain",
      length: 5412,
      turns: 15
    }
  },
  {
    id: 2,
    seasonId: 1,
    round: 2,
    name: "Saudi Arabian Grand Prix",
    shortName: "Saudi Arabia GP",
    eventStart: "2025-03-23",
    eventEnd: "2025-03-23", 
    hasLiveTiming: true,
    circuit: {
      id: 2,
      name: "Jeddah Corniche Circuit",
      locality: "Jeddah",
      country: "Saudi Arabia",
      length: 6174,
      turns: 27
    }
  }
];

const mockSessions = [
  {
    id: 1,
    eventId: 1,
    type: "Race",
    name: "Race",
    date: "2025-03-16T15:00:00Z",
    hasLiveData: true
  },
  {
    id: 2,
    eventId: 1,
    type: "Qualifying",
    name: "Qualifying",
    date: "2025-03-16T14:00:00Z",
    hasLiveData: true
  }
];

const mockDrivers = [
  {
    id: 1,
    carNumber: 4,
    position: 1,
    gridPosition: 3,
    status: "Finished",
    points: 25,
    driver: {
      id: 1,
      number: 4,
      code: "NOR",
      fullName: "Lando Norris",
      nationality: "British"
    },
    team: {
      id: 1,
      name: "McLaren",
      shortName: "MCL",
      color: "#FF8700"
    }
  },
  {
    id: 2,
    carNumber: 1,
    position: 2,
    gridPosition: 1,
    status: "Finished",
    points: 18,
    driver: {
      id: 2,
      number: 1,
      code: "VER",
      fullName: "Max Verstappen",
      nationality: "Dutch"
    },
    team: {
      id: 2,
      name: "Red Bull Racing",
      shortName: "RED",
      color: "#3671C6"
    }
  }
];

// REST API Routes
app.get('/live-timing/seasons', (req, res) => {
  console.log('📊 GET /live-timing/seasons');
  res.json(mockSeasons);
});

app.get('/live-timing/seasons/:year/events', (req, res) => {
  const year = parseInt(req.params.year);
  console.log(`🏁 GET /live-timing/seasons/${year}/events`);
  
  const events = mockEvents.filter(event => {
    const season = mockSeasons.find(s => s.id === event.seasonId);
    return season && season.year === year;
  });
  
  res.json(events);
});

app.get('/live-timing/events/:eventId/sessions', (req, res) => {
  const eventId = parseInt(req.params.eventId);
  console.log(`📋 GET /live-timing/events/${eventId}/sessions`);
  
  const sessions = mockSessions.filter(s => s.eventId === eventId);
  res.json(sessions);
});

app.get('/live-timing/sessions/:sessionId/drivers', (req, res) => {
  const sessionId = parseInt(req.params.sessionId);
  console.log(`👤 GET /live-timing/sessions/${sessionId}/drivers`);
  
  res.json(mockDrivers);
});

app.get('/live-timing/sessions/:sessionId/live-status', (req, res) => {
  const sessionId = parseInt(req.params.sessionId);
  console.log(`🔍 GET /live-timing/sessions/${sessionId}/live-status`);
  
  res.json({
    sessionId: sessionId,
    hasLiveData: true
  });
});

app.get('/live-timing/websocket-info', (req, res) => {
  console.log('📡 GET /live-timing/websocket-info');
  
  res.json({
    url: 'ws://localhost:3001/live-timing',
    protocol: 'Socket.IO',
    architecture: 'Mock F1 Live Timing',
    message: '⚠️ 이것은 Mock 서버입니다. 실제 F1 데이터가 아닙니다.'
  });
});

// WebSocket Mock
io.on('connection', (socket) => {
  console.log('🔌 WebSocket 연결:', socket.id);

  socket.on('join-session', (data) => {
    console.log('🏁 세션 참가:', data);
    
    socket.emit('message', {
      type: 'CONNECTION_STATUS',
      status: 'connected',
      message: `Mock 세션 ${data.sessionKey || data.sessionId}에 연결되었습니다`
    });

    // Mock 타이밍 데이터 전송 시뮬레이션
    let currentTime = 0;
    const interval = setInterval(() => {
      currentTime += 0.1;
      
      // Mock chunk data (30초마다)
      if (currentTime % 30 === 0) {
        socket.emit('chunk-data', {
          type: 'CHUNK_DATA',
          chunkIndex: Math.floor(currentTime / 30),
          startTime: currentTime - 30,
          endTime: currentTime,
          data: {
            drivers: mockDrivers.map(driver => ({
              ...driver,
              currentLapTime: 88000 + Math.random() * 5000,
              speed: 280 + Math.random() * 40,
              throttle: Math.random() * 100,
              gear: Math.floor(Math.random() * 8) + 1,
              rpm: 8000 + Math.random() * 4000
            }))
          }
        });
      }
      
      // Mock playback position (1초마다)  
      if (currentTime % 1 === 0) {
        socket.emit('playback-position', {
          type: 'PLAYBACK_POSITION',
          currentTime: currentTime,
          speed: 1,
          isPlaying: true
        });
      }
    }, 100);

    socket.on('disconnect', () => {
      console.log('❌ WebSocket 연결 해제:', socket.id);
      clearInterval(interval);
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
🏎️  ChronoF1 Mock API Server
📡 REST API: http://localhost:${PORT}
🔌 WebSocket: ws://localhost:${PORT}/live-timing
⚠️  Mock 데이터 서버입니다 - 실제 F1 데이터가 아닙니다
  `);
});
