import { useParams } from 'react-router-dom';
import { useSeason } from '../lib/useSeason.js';
import { Loading, LoadError } from '../components/Status.jsx';
import DriverPicker from './DriverPicker.jsx';
import DriverProfile from './DriverProfile.jsx';

export default function Drivers() {
  const { driverId } = useParams();
  const { data: season, error, loading } = useSeason();
  if (loading) return <section className="page"><h1>Driver Spotlight</h1><Loading /></section>;
  if (error) return <section className="page"><h1>Driver Spotlight</h1><LoadError error={error} /></section>;
  return driverId ? <DriverProfile season={season} driverId={driverId} /> : <DriverPicker season={season} />;
}
