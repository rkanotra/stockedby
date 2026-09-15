import Nav from '../Nav';
import Footer from '../Footer';
import './pages.css';

export default function PageShell({ children, className = '' }) {
  return <div id="top" className={`sb-pages ${className}`}>
    <a href="#page-content" className="page-skip">Skip to content</a>
    <Nav />
    <main id="page-content">{children}</main>
    <Footer />
  </div>;
}
