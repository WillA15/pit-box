import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Standings from './pages/Standings.jsx';
import Schedule from './pages/Schedule.jsx';
import Tracks from './pages/Tracks.jsx';
import TrackDetail from './pages/TrackDetail.jsx';
import Drivers from './pages/Drivers.jsx';
import PitWall from './pages/PitWall.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="standings" element={<Standings />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="tracks" element={<Tracks />} />
        <Route path="tracks/:round" element={<TrackDetail />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="drivers/:driverId" element={<Drivers />} />
        <Route path="pit-wall" element={<PitWall />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
