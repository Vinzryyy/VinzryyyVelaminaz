import { Routes, Route } from 'react-router'
import Navbar from './components/layout/Navbar.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import Home from './pages/Home.jsx'

export default function App() {
  return (
    <ToastProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </ToastProvider>
  )
}
