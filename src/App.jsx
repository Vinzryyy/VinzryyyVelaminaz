import { Routes, Route } from 'react-router'
import Navbar from './components/layout/Navbar.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import Home from './pages/Home.jsx'
import Gallery from './pages/Gallery.jsx'

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<><Navbar /><Home /></>} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/gallery/:id" element={<Gallery />} />
      </Routes>
    </ToastProvider>
  )
}
