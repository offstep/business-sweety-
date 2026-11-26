import { Component } from 'react';

// Évite la page blanche : si une page plante, on affiche un message au lieu de tout casser.
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error(error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="shop" style={{ paddingTop: 60 }}>
        <section className="float-section" style={{ textAlign: 'center' }}>
          <h1 className="sec-title">Oups, un problème est survenu</h1>
          <p className="muted">La page n'a pas pu s'afficher. Recharge-la ; si ça continue, préviens la boutique.</p>
          <button className="btn" onClick={() => window.location.reload()}>Recharger</button>
          <p className="muted"><small>{String(this.state.error?.message || this.state.error)}</small></p>
        </section>
      </main>
    );
  }
}
