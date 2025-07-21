import React from 'react'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import { Route, Routes } from 'react-router-dom'
import Calendar from './pages/Calendar'
import Dashboard from './pages/Dashboard'

function App() {

  return (
    <>
      <Header />
      <main className='w-screen px-[10%]'>
        <Routes>
              <Route path="/" element={<Home />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="dashboard" element={<Dashboard />} />
          </Routes>
      </main>
        
      <Footer />
    </>
    

  )
}

export default App
