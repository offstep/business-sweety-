import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="float-section">
      <p className="empty">Page introuvable.</p>
      <Link className="btn" to="/">Retour à l'accueil</Link>
    </section>
  );
}
