import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>🏎️ ChronoF1</h1>
      <p className="description">
        F1 Historic Results + Live Timing Replay
      </p>
      
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>

      <div className="api-docs-section">
        <h2>📋 API 문서</h2>
        <p>백엔드 서버 없이도 API 명세를 확인하세요!</p>
        
        <div className="docs-links">
          <a 
            href="/api-docs/" 
            target="_blank" 
            className="api-docs-link primary"
            rel="noopener noreferrer"
          >
            � API Documentation
          </a>
          
          <a 
            href="/api-docs/redoc.html" 
            target="_blank" 
            className="api-docs-link secondary"
            rel="noopener noreferrer"
          >
            📋 ReDoc
          </a>
          
          <a 
            href="/api-docs/swagger-ui.html" 
            target="_blank" 
            className="api-docs-link secondary"
            rel="noopener noreferrer"
          >
            🛠️ Swagger UI
          </a>
        </div>
        
        <div className="api-info">
          <p><strong>WebSocket 라이브 타이밍:</strong> ws://localhost:3000/live-timing</p>
          <p><strong>REST API 기본 URL:</strong> http://localhost:3000</p>
        </div>
      </div>

      <div className="mock-api-section">
        <h2>🧪 Mock API 서버</h2>
        <p>프론트엔드 개발자를 위한 간단한 테스트 서버</p>
        
        <div className="mock-info">
          <div className="mock-server-status">
            <p><strong>Mock Server:</strong> http://localhost:3001</p>
            <p><strong>Mock WebSocket:</strong> ws://localhost:3001/live-timing</p>
          </div>
          
          <div className="mock-commands">
            <h3>실행 방법:</h3>
            <pre><code>pnpm mock-api</code></pre>
            <p>또는</p>
            <pre><code>cd apps/web/src/mock-server && npm install && npm run dev</code></pre>
          </div>
        </div>
        
        <p className="mock-warning">
          ⚠️ Mock 데이터는 실제 F1 데이터가 아닙니다. 개발/테스트 목적으로만 사용하세요.
        </p>
      </div>

      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
