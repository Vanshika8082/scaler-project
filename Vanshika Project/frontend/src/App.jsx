import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Meetings from './pages/Meetings';
import PublicBooking from './pages/PublicBooking';
import Confirmation from './pages/Confirmation';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public booking page — no navbar */}
        <Route path="/event/:slug" element={<PublicBooking />} />
        <Route path="/confirmation" element={<Confirmation />} />

        {/* Admin pages — with navbar */}
        <Route
          path="/*"
          element={
            <div className="app-layout">
              <Navbar />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/meetings" element={<Meetings />} />
                </Routes>
              </main>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
