import React from 'react'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import AppRoutes from './routes/AppRoutes'

const App = () => {
  return (
    <>
      <Header />
      <main className='w-screen h-full px-[5%] text-center'>
        <AppRoutes />
      </main>
      <Footer />
    </>
  )
}

export default App
