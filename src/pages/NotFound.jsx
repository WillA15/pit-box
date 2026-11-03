import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="page">
      <h1>Off track</h1>
      <p className="muted">That page doesn't exist. <Link to="/">Back to the pit box</Link>.</p>
    </section>
  );
}
