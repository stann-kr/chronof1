const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

const DATA_DIR = "/home/programmers/project/data/input";
const PORT = 5678;
app.use(express.json());

// 유틸: JSON 파일 읽기/쓰기
function readJSON(filename) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf-8"));
}
function writeJSON(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}


// 1. 사용자 정보 조회 
// GET /api/users/:userId
app.get('/api/users/:userId', (req, res) => {
  const users = readJSON('users.json');
  const user = users.find(u => u.id === Number(req.params.userId));
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    id: user.id,
    username: user.username,
    createdAt: user.createdAt
  });
});

// 2. 전체 이벤트 목록 조회
// GET /api/events
app.get('/api/events', (req, res) => {
  const events = readJSON('events.json');
  res.json(events.map(e => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startDate: e.startDate,
    endDate: e.endDate,
    venueId: e.venueId
  })));
});

// 3. 사용자 이벤트 등록
// POST /api/events/register
app.post('/api/events/register', (req, res) => {
  const { userId, eventId } = req.body;
  if (!userId || !eventId) {
    return res.status(400).json({ error: "Invalid userId or eventId" });
  }
  const users = readJSON('users.json');
  const events = readJSON('events.json');
  if (!users.find(u => u.id === userId) || !events.find(e => e.id === eventId)) {
    return res.status(400).json({ error: "Invalid userId or eventId" });
  }
  const registrations = readJSON('registrations.json');
  // 중복 등록 허용여부에 따라 체크, 여기서는 허용(문제 예시대로)
  registrations.push({
    userId, eventId, registeredAt: (new Date()).toISOString().slice(0, 10)
  });
  writeJSON('registrations.json', registrations);
  res.json({ message: "User registered to event successfully" });
});

// 4. 사용자별 등록 이벤트 조회
// GET /api/users/:userId/events
app.get('/api/users/:userId/events', (req, res) => {
  const userId = Number(req.params.userId);
  const registrations = readJSON('registrations.json');
  const events = readJSON('events.json');
  const registeredEventIds = registrations
    .filter(r => r.userId === userId)
    .map(r => r.eventId);
  const userEvents = events.filter(e => registeredEventIds.includes(e.id));
  if (userEvents.length === 0) {
    return res.status(404).json({ error: "No events found for the user" });
  }
  res.json(userEvents.map(e => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startDate: e.startDate,
    endDate: e.endDate,
    venueId: e.venueId
  })));
});

// 5. 사용자별 이벤트 관리 조회
// GET /api/users/:userId/managed-events
app.get('/api/users/:userId/managed-events', (req, res) => {
  const userId = Number(req.params.userId);
  const organizers = readJSON('event_organizers.json');
  const events = readJSON('events.json');
  const managedEventIds = organizers
    .filter(o => o.userId === userId)
    .map(o => o.eventId);
  const managedEvents = events.filter(e => managedEventIds.includes(e.id));
  if (managedEvents.length === 0) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({
    userId,
    managedEvents: managedEvents.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startDate: e.startDate,
      endDate: e.endDate,
      venueId: e.venueId
    }))
  });
});

// 6. 이벤트 기간 검색
// GET /api/events/search-by-date?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&sorted=정렬기준
app.get('/api/events/search-by-date', (req, res) => {
  const { startDate, endDate, sorted } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Missing startDate or endDate" });
  }
  let events = readJSON('events.json').filter(e => (
    e.startDate >= startDate && e.endDate <= endDate
  ));
  if (events.length === 0) {
    return res.status(404).json({ error: "No events found in the specified period" });
  }

  if (sorted) {
    const [field, order] = sorted.split('_');
    events.sort((a, b) => (
      order === 'DESC'
        ? (a[field] < b[field] ? 1 : -1)
        : (a[field] > b[field] ? 1 : -1)
    ));
  }
  res.json(events.map(e => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startDate: e.startDate,
    endDate: e.endDate,
    venueId: e.venueId
  })));
});

// 7. 이벤트, 장소 복합 충돌 검사
// POST /api/events/complex-conflict-check
app.post('/api/events/complex-conflict-check', (req, res) => {
  const { title, startDate, endDate, venueId, expectedAttendees } = req.body;
  const events = readJSON('events.json');
  const venues = readJSON('venues.json');
  const venue = venues.find(v => v.id === venueId);
  if (!venue) return res.status(404).json({ error: "Venue not found" });

  // 시간 겹치는 이벤트 탐색
  const conflictingEvents = events.filter(e =>
    e.venueId === venueId &&
    ((startDate >= e.startDate && startDate < e.endDate) ||
      (endDate > e.startDate && endDate <= e.endDate) ||
      (startDate <= e.startDate && endDate >= e.endDate))
  );

  // 인원 초과 체크
  if (expectedAttendees > venue.capacity) {
    return res.json({
      message: "Capacity conflict detected due to venue's limited capacity.",
      conflict: true,
      type: "capacity",
      venue: {
        id: venue.id,
        name: venue.name,
        capacity: venue.capacity,
      },
      conflictingEvents
    });
  }
  if (conflictingEvents.length > 0) {
    return res.json({
      message: "Time conflict detected with another event.",
      conflict: true,
      type: "time",
      conflictingEvents
    });
  }
  res.json({ message: "No conflict detected", conflict: false });
});