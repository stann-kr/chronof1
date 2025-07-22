import React from 'react'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import AppRoutes from './routes/AppRoutes'

const App = () => {
  return (
    <>
      <Header />
      <main className='w-screen px-[10%] text-center'>
        <AppRoutes />
      </main>
      <Footer />
    </>
  )
}

export default App
