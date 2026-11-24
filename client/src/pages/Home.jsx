import { Link } from 'react-router-dom';

function MarkedDiagram() {
  return (
    <svg className="hero-art" viewBox="0 0 560 400" role="img" aria-label="A class diagram where the marker has circled a hollow diamond in red and written that it should be filled, because order lines die with the order.">
      <defs>
        <pattern id="hero-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="var(--grid)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="560" height="400" rx="14" fill="var(--node-bg)" />
      <rect width="560" height="400" rx="14" fill="url(#hero-grid)" />
      <rect width="560" height="400" rx="14" fill="none" stroke="var(--line)" />

      <g fill="var(--node-bg)" stroke="var(--ink)" strokeWidth="1.8">
        <rect x="32" y="44" width="150" height="92" rx="4" />
        <rect x="330" y="44" width="170" height="104" rx="4" />
        <rect x="330" y="270" width="170" height="92" rx="4" />
      </g>
      <g stroke="var(--ink)" strokeWidth="1.4">
        <path d="M32 74h150M32 104h150M330 74h170M330 108h170M330 300h170M330 330h170" />
      </g>
      <g fontFamily="var(--font-mono)" fontSize="13" fill="var(--ink)">
        <text x="107" y="64" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="15">Customer</text>
        <text x="44" y="92">- name: String</text>
        <text x="44" y="122">+ place(): Order</text>
        <text x="415" y="64" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="15">Order</text>
        <text x="342" y="92">- placedAt: Date</text>
        <text x="342" y="126">+ total(): double</text>
        <text x="415" y="290" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="15">OrderLine</text>
        <text x="342" y="318">- quantity: int</text>
        <text x="342" y="352">+ subtotal(): Money</text>
        <text x="190" y="62">1</text>
        <text x="306" y="62">*</text>
      </g>

      <path d="M182 90H330" stroke="var(--ink)" strokeWidth="1.8" />
      <path d="M415 270V170" stroke="var(--ink)" strokeWidth="1.8" />
      <polygon points="415,148 424,159 415,170 406,159" fill="var(--node-bg)" stroke="var(--ink)" strokeWidth="1.8" />

      <g className="pencil-group" stroke="#E5484D" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
        <path className="pencil" d="M415 138c22-2 32 14 30 28-3 22-30 34-48 22-18-11-16-38 2-46 9-4 20-5 28-3" />
        <path className="pencil pencil-2" d="M447 196c30 8 56 6 76-4M523 192l-9-9M523 192l-11 7" />
      </g>
      <text className="pencil-note" x="452" y="226" fill="#E5484D" fontFamily="var(--font-display)" fontWeight="600" fontSize="14" transform="rotate(-3 452 226)">
        <tspan x="452" dy="0">filled! lines die</tspan>
        <tspan x="452" dy="18">with the order</tspan>
      </text>

      <g className="tick" stroke="var(--ok)" fill="none" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="256" cy="90" r="15" fill="var(--node-bg)" />
        <path d="M249 90l5 6 10-12" />
      </g>
    </svg>
  );
}

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <h1>Software Engineering</h1>
          <p>
            class, Use Case and ER diagrams on a real canvas. Each scenario reads like an exam question, and the checker circles what a
            marker would: the wrong arrow, the missing line, the cardinality you flipped.
          </p>
          <div className="hero-cta">
            <Link className="btn primary lg" to="/practice">Start a scenario</Link>
            <Link className="btn lg" to="/studio?new=1">Open a blank board</Link>
          </div>
          <p className="hero-fine">System Deisgn Analyst</p>
        </div>
        <MarkedDiagram />
      </section>

      <section className="index" aria-label="What is inside">
        <Link to="/practice" className="index-row">
          <div>
            <h2>Practice</h2>
            <p>Read a short scenario, then connect the given boxes or draw everything from the text. Get a score, reasons, and hints that unlock one at a time.</p>
          </div>
          <span className="index-meta">Class, use case and ER, from beginner to advanced</span>
        </Link>
        <Link to="/studio" className="index-row">
          <div>
            <h2>Studio</h2>
            <p>A free board with undo, auto layout and tabs. Export PNG, SVG, PlantUML or Mermaid, or turn an OpenAPI file or Java, TypeScript and PHP code into a class diagram.</p>
          </div>
          <span className="index-meta">Work on several diagrams at once</span>
        </Link>
        <Link to="/cheatsheet" className="index-row">
          <div>
            <h2>Cheatsheet</h2>
            <p>Every arrow, diamond and crow’s foot drawn out, with the one-line test that tells similar ones apart, and the traps that cost marks.</p>
          </div>
          <span className="index-meta">Open it next to the board</span>
        </Link>
      </section>
    </div>
  );
}
