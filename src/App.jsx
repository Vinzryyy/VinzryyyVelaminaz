import { Routes, Route } from 'react-router'
import Navbar from '@/components/layout/Navbar'
import { ToastProvider } from '@/components/ui/Toast'
import Home from '@/pages/Home'
import Gallery from '@/pages/Gallery'
import GalleryEvent from '@/pages/GalleryEvent'

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<><Navbar /><Home /></>} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/gallery/:eventId" element={<GalleryEvent />} />
      </Routes>
    </ToastProvider>
  )
}
