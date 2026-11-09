import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownRight,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Bot,
  BarChart3,
  Check,
  Code2,
  Command,
  CornerDownLeft,
  Download,
  ExternalLink,
  FileText,
  Github,
  ImagePlus,
  Layers3,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  MessageSquareText,
  PhoneCall,
  Plus,
  Search,
  Send,
  Save,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  Trash2,
  Users,
  X,
} from 'lucide-react';

const CONTACT_PHONE = '+254710865376';
const CONTACT_PHONE_DISPLAY = '+254 710 865 376';
const CONTACT_EMAIL = 'ezranzioki@gmail.com';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const ANALYTICS_CONSENT_KEY = 'ezra_analytics_consent';
const ANALYTICS_VISITOR_KEY = 'ezra_analytics_visitor';
const FEATURED_PROJECTS = [
  {
    name: 'Barber Shop Appointment Platform',
    category: 'FULL-STACK MERN · BOOKING & PAYMENTS',
    description: 'A full-stack MERN booking application featuring automated scheduling workflows, dynamic service menus, and direct Safaricom Daraja STK Push payment integrations.',
    technologies: ['MongoDB', 'Express', 'React', 'Node.js', 'Daraja API'],
    match: /barber|appointment/i,
  },
  {
    name: 'Thrift District E-Commerce Storefront',
    category: 'REACT + VITE · E-COMMERCE',
    description: 'A responsive React + Vite monorepo storefront hosted on Render, optimized for rapid mobile visual discovery.',
    technologies: ['React', 'Vite', 'Monorepo', 'Render'],
    match: /thrift district|thrift/i,
  },
];

const emptyPortfolio = {
  profile: {
    name: 'Ezra Nzioki',
    role: 'Full-stack developer',
    location: 'Nairobi, Kenya',
    headline: 'Thoughtful digital products, built for the real world.',
    bio: 'I turn complex ideas into clear, useful web experiences. I care about the details, the people using what I build, and the systems that make it all work.',
    email: '',
    github: '',
    linkedin: '',
    availability: 'Open to select projects',
  },
  projects: [],
};

async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body !== undefined && !Object.keys(headers).some((name) => name.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(apiUrl(path), {
    ...options,
    credentials: 'include',
    headers,
  });
  if (response.status === 204) return null;
  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    if (!response.ok) {
      throw new Error(`API request failed (${response.status}) at ${response.url}: ${responseText.trim().slice(0, 200) || response.statusText}`);
    }
    throw new Error(`API returned a non-JSON response (${response.status}) from ${response.url}. Check the deployed API URL.`);
  }
  if (!response.ok) {
    const error = new Error(data?.error || 'Something went wrong.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function apiUrl(path) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function getAnalyticsConsent() {
  try {
    const savedConsent = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return savedConsent === 'allowed' || savedConsent === 'declined' ? savedConsent : 'pending';
  } catch {
    return 'pending';
  }
}

function getAnalyticsVisitorId() {
  try {
    let visitorId = window.localStorage.getItem(ANALYTICS_VISITOR_KEY);
    if (!visitorId) {
      visitorId = window.crypto.randomUUID();
      window.localStorage.setItem(ANALYTICS_VISITOR_KEY, visitorId);
    }
    return visitorId;
  } catch {
    return window.crypto.randomUUID();
  }
}

function getKenyanGreeting() {
  const hour = Number(new Intl.DateTimeFormat('en-KE', {
    timeZone: 'Africa/Nairobi',
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(new Date()));
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function App() {
  const [portfolio, setPortfolio] = useState(emptyPortfolio);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const isAdmin = window.location.pathname.startsWith('/admin')
    || new URLSearchParams(window.location.search).get('admin') === '1';

  useEffect(() => {
    if (isAdmin) return undefined;
    let active = true;
    async function checkAuthentication() {
      try {
        const session = await api('/api/auth/session');
        if (active) setAuthUser(session.user);
      } catch (error) {
        if (error.status !== 401 && active) setAuthError(error.message);
      } finally {
        if (active) setAuthLoading(false);
      }
    }
    checkAuthentication();
    return () => { active = false; };
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin || !authUser) return undefined;
    let active = true;
    api('/api/portfolio')
      .then((data) => { if (active) setPortfolio(data); })
      .catch((error) => { if (active) setLoadError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authUser, isAdmin]);

  if (isAdmin) return <Admin />;
  if (authLoading) return <EmailPasswordSignIn loading />;
  if (!authUser) return <EmailPasswordSignIn error={authError} onSignedIn={setAuthUser} />;
  return <PortfolioPage portfolio={portfolio} loading={loading} loadError={loadError} user={authUser} onSignOut={async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
      setAuthUser(null);
      setLoading(true);
    } catch (error) {
      setLoadError(error.message);
    }
  }} />;
}

function EmailPasswordSignIn({ loading = false, error = '', onSignedIn = () => {} }) {
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const result = await api(registering ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      onSignedIn(result.user);
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="email-login-shell">
      <a className="wordmark" href="/" aria-label="Ezra Devs home">EZRA<span>.</span>DEVS</a>
      <section className="email-login-panel">
        <span className="section-kicker">WELCOME TO THE PORTFOLIO</span>
        <h1>{loading ? 'Checking your sign-in...' : registering ? 'Create your account.' : 'Sign in to continue.'}</h1>
        <p>Create an account or sign in with your email and password. Your name, email, IP address, and approximate location are stored until the site admin deletes your account. Location is approximate and determined locally; your IP is not sent to a lookup service. Email addresses are not verified.</p>
        {!loading && <form className="email-login-form" onSubmit={submit}>
          {registering && <label>Name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength="100" required /></label>}
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength="200" required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={registering ? 'new-password' : 'current-password'} minLength="10" maxLength="72" required /></label>
          {registering && <span className="email-login-hint">Use at least 10 characters.</span>}
          <button className="email-sign-in-button" type="submit" disabled={busy}>{busy ? 'Please wait...' : registering ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></button>
        </form>}
        {(formError || error) && <span className="email-login-error" role="alert">{formError || error}</span>}
        {!loading && <button className="email-login-toggle" type="button" onClick={() => {
          setRegistering((current) => !current);
          setFormError('');
        }}>{registering ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>}
      </section>
    </main>
  );
}

function PortfolioPage({ portfolio, loading, loadError, user, onSignOut }) {
  const { profile, projects } = portfolio;
  const [menuOpen, setMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [contact, setContact] = useState({ name: '', email: '', message: '' });
  const [contactState, setContactState] = useState({ busy: false, message: '' });
  const [analyticsConsent, setAnalyticsConsent] = useState(getAnalyticsConsent);
  const progressBarRef = useRef(null);

  useEffect(() => {
    function handleShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((isOpen) => !isOpen);
      }
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    if (analyticsConsent !== 'allowed') return undefined;
    const visitorId = getAnalyticsVisitorId();
    const sendView = (type, section) => {
      api('/api/analytics/view', {
        method: 'POST',
        body: JSON.stringify(section ? { type, section, visitorId } : { type, visitorId }),
      }).catch((error) => console.error('Analytics tracking failed:', error));
    };
    sendView('page');
    const viewedSections = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const section = entry.target.id;
        if (entry.isIntersecting && !viewedSections.has(section)) {
          viewedSections.add(section);
          sendView('section', section);
        }
      });
    }, { threshold: 0.25 });
    ['home', 'work', 'game', 'about', 'stack', 'contact'].forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, [analyticsConsent]);

  function chooseAnalytics(consent) {
    try {
      window.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
    } catch (error) {
      console.error('Could not save analytics preference:', error);
    }
    setAnalyticsConsent(consent);
  }

  useEffect(() => {
    let frame = 0;
    function updateProgress() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;
        const boundedProgress = Math.min(100, Math.max(0, progress));
        if (progressBarRef.current) {
          progressBarRef.current.style.transform = `scaleX(${boundedProgress / 100})`;
          progressBarRef.current.parentElement?.setAttribute('aria-valuenow', String(Math.round(boundedProgress)));
        }
      });
    }

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateProgress);
    resizeObserver?.observe(document.documentElement);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
      resizeObserver?.disconnect();
    };
  }, []);

  async function sendMessage(event) {
    event.preventDefault();
    setContactState({ busy: true, message: '' });
    try {
      await api('/api/contact', { method: 'POST', body: JSON.stringify(contact) });
      setContact({ name: '', email: '', message: '' });
      setContactState({ busy: false, message: 'Thanks for reaching out. Your note is in my inbox.' });
    } catch (error) {
      setContactState({ busy: false, message: error.message });
    }
  }

  const featuredProjects = FEATURED_PROJECTS.map((featured) => {
    const storedProject = projects.find((project) => featured.match.test(project.name || ''));
    return { ...featured, ...storedProject, name: featured.name, description: featured.description };
  });
  const additionalProjects = projects.filter((project) => !FEATURED_PROJECTS.some((featured) => featured.match.test(project.name || '')));
  const heroImage = profile.heroImage ? apiUrl(profile.heroImage) : '';

  return (
    <main className="site-shell">
      <div className="reading-progress" role="progressbar" aria-label="Page reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <span ref={progressBarRef} />
      </div>
      <div className="topline"><span className="status-dot" /> {profile.availability || 'Open to select projects'} <span className="topline-place">in {profile.location || 'Nairobi, Kenya'}</span></div>
      <header className="site-header">
        <a className="wordmark" href="#home" aria-label="Ezra Devs home">EZRA<span>.</span>DEVS</a>
        <button className="icon-button mobile-menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation">
          <a onClick={() => setMenuOpen(false)} href="#work">Work</a>
          <a onClick={() => setMenuOpen(false)} href="#about">About</a>
          <a onClick={() => setMenuOpen(false)} href="#stack">Stack</a>
          <a className="nav-contact" onClick={() => setMenuOpen(false)} href="#contact">Let&apos;s talk <ArrowUpRight size={14} /></a>
          <a className="nav-admin" onClick={() => setMenuOpen(false)} href="/?admin=1"><ShieldCheck size={14} /> Admin</a>
        </nav>
        <button className="command-trigger" onClick={() => setCommandOpen(true)} aria-label="Open quick navigation" title="Quick navigation (Ctrl or Command + K)">
          <Search size={16} /><span>Quick find</span><kbd><Command size={11} /> K</kbd>
        </button>
      </header>

      <section className="hero section-wrap" id="home" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> FULL-STACK DEVELOPER <span className="eyebrow-separator">/</span> NAIROBI, KENYA</div>
          <h1 id="hero-title">{profile.headline || 'Thoughtful digital products, built for the real world.'}</h1>
          <p className="hero-intro">I&apos;m <strong>{profile.name || 'Ezra Nzioki'}</strong> — a full-stack developer turning complex operational problems into fast, scalable MERN applications and high-impact web experiences.</p>
          <div className="hero-actions"><a href="#work" className="button button-primary">Explore selected work <ArrowDownRight size={18} /></a><a href="#contact" className="button button-outline">Get in touch <ArrowUpRight size={17} /></a>{profile.cvUrl && <a className="button button-outline" href={apiUrl('/api/cv')} download="CV.pdf"><Download size={17} /> Download CV</a>}</div>
          <div className="hero-index"><span className="status-dot" /> AVAILABLE FOR SELECT PROJECTS <span className="index-rule" /> NAIROBI, KE</div>
        </div>
        <div className={`hero-art${heroImage ? ' has-image' : ''}`} aria-label={heroImage ? 'Portfolio hero image' : loading ? 'Loading portfolio image' : 'Abstract code-inspired artwork'}>
          {heroImage ? <img className="hero-art-image" src={heroImage} alt={`Featured work by ${profile.name || 'Ezra Nzioki'}`} /> : !loading && <>
            <div className="hero-art-grid" />
            <div className="hero-code-window"><div className="code-window-bar"><i /><i /><i /><span>ezra.dev / build.js</span></div><pre><span className="code-muted">01</span> <b>const</b> product = {'{'}<br /><span className="code-muted">02</span>   clarity: <em>&apos;always&apos;</em>,<br /><span className="code-muted">03</span>   performance: <em>&apos;fast&apos;</em>,<br /><span className="code-muted">04</span>   impact: <em>&apos;real&apos;</em><br /><span className="code-muted">05</span> {'}'};<br /><br /><span className="code-muted">06</span> <b>ship</b>(product); <span className="code-cursor" /></pre></div>
          </>}
          {!loading && <div className="hero-art-caption"><span><Code2 size={15} /> ENGINEERED WITH INTENTION</span><span>01 / 04</span></div>}
          {!loading && !heroImage && <span className="hero-art-orbit" aria-hidden="true" />}
        </div>
      </section>

      <section className="work-section section-wrap" id="work" aria-labelledby="work-title">
        <div className="section-heading"><div><span className="section-kicker">SELECTED WORK · 2024—26</span><h2 id="work-title">Built to make<br /><span className="accent-text">things work better.</span></h2></div><p>Practical products for real people,<br />designed to solve real problems.</p></div>
        {loadError && <p className="load-notice" role="status">Live project details could not load; featured work is shown below.</p>}
        <div className="project-grid">
          {featuredProjects.map((project, index) => (
            <article className={`feature-card feature-card-${index + 1}`} key={project.name}>
              <div className={`feature-visual${project.image ? ' has-image' : ''}`}>
                {project.image && <img className="project-cover-image" src={apiUrl(project.image)} alt="" loading="lazy" />}
                <span className="project-number">0{index + 1} / FEATURED</span>
                {!project.image && <div className={`feature-art feature-art-${index + 1}`} aria-hidden="true">
                  {index === 0 ? <><div className="booking-top"><span>BOOK YOUR VISIT</span><span>● OPEN TODAY</span></div><div className="booking-title">The right cut.<br /><b>Right on time.</b></div><div className="booking-slots"><span>10:30</span><span>11:15</span><span>12:00</span></div><div className="booking-action">CONFIRM APPOINTMENT <ArrowUpRight size={13} /></div></> : <><div className="shop-top"><span>THRIFT DISTRICT</span><span>☰ &nbsp; BAG (0)</span></div><div className="shop-title">GOOD FINDS.<br /><b>SECOND LIFE.</b></div><div className="shop-product"><span>CURATED FINDS / 2026</span><strong>Wear it<br />your way.</strong><i>DISCOVER THE DROP ↗</i></div></>}
                </div>}
                {project.url && <a className="project-open" href={project.url} target="_blank" rel="noreferrer" aria-label={`Visit ${project.name}`}><ArrowUpRight size={18} /></a>}
              </div>
              <div className="feature-info"><div className="feature-title-row"><div><span className="project-category">{project.category}</span><h3>{project.name}</h3></div><span className="project-year">{project.year || '2026'}</span></div><p>{project.description}</p><div className="tech-tags">{project.technologies.map((technology) => <span key={technology}>{technology}</span>)}</div></div>
            </article>
          ))}
        </div>
        {additionalProjects.length > 0 && <div className="additional-projects" aria-label="Additional projects">{additionalProjects.map((project, index) => <ProjectCard key={project.id || project.name} project={project} index={index + 2} />)}</div>}
        <div className="work-endnote"><span>MORE IN THE WORKS</span><span className="endnote-line" /><ArrowRight size={16} /></div>
      </section>

      <CircuitBreakGame />

      <section className="about-section" id="about">
        <div className="section-wrap about-inner">
          <div className="about-mark"><span>EN</span><div className="about-mark-ring" /></div>
          <div className="about-content"><span className="section-kicker">A LITTLE ABOUT ME</span><h2>Thoughtful by nature.<br /><span className="accent-text">Practical by design.</span></h2><p>{profile.bio || 'I turn complex ideas into clear, useful web experiences. I care about the details, the people using what I build, and the systems that make it all work.'}</p><div className="about-meta"><div><span className="meta-label">CURRENTLY</span><span>{profile.availability || 'Open to select projects'}</span></div><div><span className="meta-label">BASED IN</span><span>{profile.location || 'Nairobi, Kenya'}</span></div><div><span className="meta-label">FOCUS</span><span>Web · Product · Systems</span></div></div></div>
        </div>
      </section>

      <section className="stack-section section-wrap" id="stack">
        <div className="section-heading"><div><span className="section-kicker">TOOLS I BUILD WITH</span><h2>Full stack. <span className="accent-text">One mindset.</span></h2></div><p>From first interface to production<br />deployment, end to end.</p></div>
        <div className="stack-grid">{['React', 'Node.js', 'Express', 'MongoDB', 'Tailwind CSS', 'REST APIs', 'Render'].map((technology, index) => <div className="stack-item" key={technology}><span>0{index + 1}</span><Code2 size={17} /><b>{technology}</b><ArrowUpRight size={15} /></div>)}</div>
      </section>

      <section className="contact-section section-wrap" id="contact">
        <div className="contact-intro"><span className="section-kicker">HAVE SOMETHING IN MIND?</span><h2>Let&apos;s build<br />something <em>useful.</em></h2><p>Have a good problem to solve or an idea worth exploring? Tell me a little about it.</p>
          <div className="contact-links"><a href={`tel:${CONTACT_PHONE}`}><PhoneCall size={17} /> Call {CONTACT_PHONE_DISPLAY} <ArrowUpRight size={14} /></a><a href={`https://wa.me/${CONTACT_PHONE.slice(1)}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp Ezra <ArrowUpRight size={14} /></a><a href={`mailto:${profile.email || CONTACT_EMAIL}`}><Mail size={17} /> {profile.email || CONTACT_EMAIL} <ArrowUpRight size={14} /></a>{profile.github && <a href={profile.github} target="_blank" rel="noreferrer"><Github size={17} /> GitHub <ArrowUpRight size={14} /></a>}{profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer"><ExternalLink size={16} /> LinkedIn <ArrowUpRight size={14} /></a>}</div>
        </div>
        <form className="contact-form" onSubmit={sendMessage}>
          <label>Your name<input value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} placeholder="Name" autoComplete="name" required /></label>
          <label>Email address<input type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} placeholder="you@example.com" autoComplete="email" required /></label>
          <label>Your note<textarea value={contact.message} onChange={(event) => setContact({ ...contact, message: event.target.value })} placeholder="A little about what you have in mind..." rows="3" required /></label>
          <div className="form-footer"><span className="form-response" role="status">{contactState.message}</span><button type="submit" className="submit-button" disabled={contactState.busy}>{contactState.busy ? 'Sending...' : 'Send a note'} <ArrowUpRight size={17} /></button></div>
        </form>
      </section>

      <footer className="site-footer section-wrap"><a className="wordmark footer-mark" href="#home">EZRA<span>.</span>DEVS</a><span>Designed &amp; built by {profile.name || 'Ezra Nzioki'} <span className="footer-star">✳</span> {new Date().getFullYear()}</span><button className="privacy-choice-link" onClick={() => chooseAnalytics('pending')}>Privacy choices</button><span className="signed-in-user">{user.email} · <button onClick={onSignOut}>Sign out</button></span><a href="/?admin=1" className="admin-link">ADMIN <ArrowUpRight size={12} /></a></footer>
      {analyticsConsent === 'pending' && <aside className="analytics-consent" aria-label="Analytics privacy choices"><p>This site can store your IP address, approximate location, and a random browser ID to count visits. Location is approximate; data is kept for up to 90 days. Your name is not collected. Allow analytics or decline.</p><div><button onClick={() => chooseAnalytics('declined')}>Decline</button><button className="analytics-consent-allow" onClick={() => chooseAnalytics('allowed')}>Allow analytics</button></div></aside>}
      <PortfolioChat profile={profile} projects={projects} loading={loading} />
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} profile={profile} projects={projects} />
    </main>
  );
}

const CIRCUIT_LEVELS = [
  {
    name: 'BOOT SEQUENCE',
    map: [
      '#########',
      '#S..D...#',
      '#.#.##..#',
      '#...#D..#',
      '##......#',
      '#..#...E#',
      '#########',
    ],
    patrol: ['2,4', '3,4', '4,4', '5,4', '6,4'],
  },
  {
    name: 'FIREWALL',
    map: [
      '#########',
      '#S..#...#',
      '#.#.D#D.#',
      '#...#...#',
      '#.##...E#',
      '#..D....#',
      '#########',
    ],
    patrol: ['5,3', '6,3', '6,4', '5,4'],
  },
  {
    name: 'ZERO DAY',
    map: [
      '#########',
      '#S...#..#',
      '#.#D...D#',
      '#.#.##..#',
      '#...#...#',
      '#D.....E#',
      '#########',
    ],
    patrol: ['3,4', '4,4', '5,4', '6,4', '6,3'],
  },
];

function createCircuitState(level = 0, lives = 3, status = 'ready') {
  const definition = CIRCUIT_LEVELS[level];
  const positionOf = (symbol) => {
    for (let y = 0; y < definition.map.length; y += 1) {
      const x = definition.map[y].indexOf(symbol);
      if (x !== -1) return { x, y };
    }
    return null;
  };
  return {
    level,
    lives,
    status,
    player: positionOf('S'),
    start: positionOf('S'),
    exit: positionOf('E'),
    data: definition.map.flatMap((row, y) => [...row].flatMap((cell, x) => cell === 'D' ? [`${x},${y}`] : [])),
    collected: [],
    walls: definition.map.map((row) => [...row].map((cell) => cell === '#')),
    patrolPath: definition.patrol.map((point) => point.split(',').map(Number)),
    patrolIndex: 0,
    patrolDirection: 1,
    moves: 0,
    message: '',
  };
}

function CircuitBreakGame() {
  const [game, setGame] = useState(() => createCircuitState());
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const boardRef = useRef(null);
  const gameRef = useRef(game);
  const movePlayerRef = useRef(null);
  const startGameRef = useRef(null);
  const level = CIRCUIT_LEVELS[game.level];
  const isPlaying = game.status === 'playing';
  gameRef.current = game;

  function startGame() {
    setGame({ ...createCircuitState(), status: 'playing', message: 'Collect every data fragment, avoid the patrol, then reach the exit.' });
    boardRef.current?.focus();
  }
  startGameRef.current = startGame;

  function movePlayer(dx, dy) {
    if (!isPlaying) return;
    setGame((current) => {
      const x = current.player.x + dx;
      const y = current.player.y + dy;
      if (current.walls[y]?.[x] !== false) return current;

      const key = `${x},${y}`;
      const collected = current.data.includes(key) && !current.collected.includes(key)
        ? [...current.collected, key]
        : current.collected;
      const nextPatrolIndex = current.patrolIndex + current.patrolDirection;
      const patrolAtEnd = nextPatrolIndex === 0 || nextPatrolIndex === current.patrolPath.length - 1;
      const patrolIndex = nextPatrolIndex;
      const patrolDirection = patrolAtEnd ? -current.patrolDirection : current.patrolDirection;
      const patrol = current.patrolPath[patrolIndex];
      const caught = patrol[0] === x && patrol[1] === y;
      const moves = current.moves + 1;

      if (caught) {
        const lives = current.lives - 1;
        if (lives === 0) {
          return { ...current, lives, status: 'lost', moves, collected, patrolIndex, patrolDirection, message: 'The security patrol caught you. Try another run.' };
        }
        return { ...current, lives, player: current.start, moves, collected, patrolIndex, patrolDirection, message: `Caught by the patrol! ${lives} ${lives === 1 ? 'life' : 'lives'} left — you respawned at the start.` };
      }

      const nextState = { ...current, player: { x, y }, collected, patrolIndex, patrolDirection, moves, message: '' };
      if (x === current.exit.x && y === current.exit.y) {
        if (collected.length < current.data.length) {
          return { ...nextState, message: `Access denied — collect ${current.data.length - collected.length} more ${current.data.length - collected.length === 1 ? 'fragment' : 'fragments'}.` };
        }
        if (current.level === CIRCUIT_LEVELS.length - 1) {
          return { ...nextState, status: 'won', message: 'System breached. You cleared every sector!' };
        }
        const nextLevel = createCircuitState(current.level + 1, current.lives, 'playing');
        return { ...nextLevel, message: `${CIRCUIT_LEVELS[current.level + 1].name} unlocked. Find every fragment.` };
      }
      if (collected.length > current.collected.length) return { ...nextState, message: 'Data fragment secured.' };
      return nextState;
    });
  }
  movePlayerRef.current = movePlayer;

  useEffect(() => {
    let nextMoveAt = 0;
    let previousDirection = '';
    let previousStartPressed = false;
    let wasConnected = false;

    function pollGamepad() {
      const timestamp = performance.now();
      const pads = navigator.getGamepads?.();
      const gamepad = pads ? Array.from(pads).find((pad) => pad?.connected) : null;
      const connected = Boolean(gamepad);
      if (connected !== wasConnected) {
        wasConnected = connected;
        setGamepadConnected(connected);
      }

      if (!gamepad) {
        previousDirection = '';
        previousStartPressed = false;
        return;
      }

      const buttons = gamepad.buttons;
      const startPressed = Boolean(buttons[0]?.pressed);
      if (startPressed && !previousStartPressed && gameRef.current.status !== 'playing') {
        startGameRef.current?.();
      }
      previousStartPressed = startPressed;

      let direction = '';
      if (buttons[12]?.pressed) direction = 'up';
      else if (buttons[13]?.pressed) direction = 'down';
      else if (buttons[14]?.pressed) direction = 'left';
      else if (buttons[15]?.pressed) direction = 'right';
      else {
        const [x = 0, y = 0] = gamepad.axes;
        if (Math.abs(x) > Math.abs(y) && Math.abs(x) > 0.55) direction = x < 0 ? 'left' : 'right';
        else if (Math.abs(y) > 0.55) direction = y < 0 ? 'up' : 'down';
      }

      if (!direction) {
        previousDirection = '';
        return;
      }
      if (direction !== previousDirection || timestamp >= nextMoveAt) {
        const movement = {
          up: [0, -1],
          down: [0, 1],
          left: [-1, 0],
          right: [1, 0],
        }[direction];
        movePlayerRef.current?.(...movement);
        nextMoveAt = timestamp + 180;
      }
      previousDirection = direction;
    }

    const interval = window.setInterval(pollGamepad, 80);
    return () => window.clearInterval(interval);
  }, []);

  function handleBoardKeyDown(event) {
    const directions = {
      ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
      ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
      ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
      ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
    };
    const direction = directions[event.key];
    if (direction) {
      event.preventDefault();
      movePlayer(...direction);
    }
  }

  return (
    <section className="game-section section-wrap" id="game" aria-labelledby="game-title">
      <div className="game-heading">
        <div><span className="section-kicker">A TACTICAL MINI ARCADE</span><h2 id="game-title">Circuit Break<span>.</span></h2><p>Infiltrate the grid. Collect every data shard, outmaneuver the patrol, and reach the exit.</p></div>
        <div className="circuit-stats">
          <div><span>SECTOR</span><strong>{String(game.level + 1).padStart(2, '0')}<small> / 03</small></strong></div>
          <div><span>SHARDS</span><strong>{game.collected.length}<small> / {game.data.length}</small></strong></div>
          <div><span>LIVES</span><strong className="life-pips">{Array.from({ length: 3 }, (_, index) => <i className={index < game.lives ? 'life-active' : ''} key={index} />)}</strong></div>
        </div>
      </div>
      <div className="circuit-console">
        <div className="console-topline"><span><i /> SECURE CONNECTION</span><span>{level.name} <b>·</b> MOVES {game.moves.toString().padStart(2, '0')}</span></div>
        <div className={`circuit-board-wrap${isPlaying ? ' is-live' : ''}`}>
          <div className="circuit-board" role="grid" aria-label={`${level.name} maze. Use arrow keys, WASD, or a connected gamepad to move.`} tabIndex={0} ref={boardRef} onKeyDown={handleBoardKeyDown}>
            {level.map.map((row, y) => [...row].map((tile, x) => {
              const key = `${x},${y}`;
              const isPlayer = game.player.x === x && game.player.y === y;
              const patrolPosition = game.patrolPath[game.patrolIndex];
              const isPatrol = patrolPosition[0] === x && patrolPosition[1] === y;
              const isCollected = game.collected.includes(key);
              return <div className={`circuit-cell${tile === '#' ? ' is-wall' : ''}${tile === 'E' ? ' is-exit' : ''}${tile === 'D' && !isCollected ? ' is-shard' : ''}${isPlayer ? ' is-player' : ''}${isPatrol ? ' is-patrol' : ''}`} role="gridcell" aria-label={isPlayer ? 'You' : isPatrol ? 'Security patrol' : tile === '#' ? 'Firewall' : tile === 'E' ? 'Exit' : tile === 'D' && !isCollected ? 'Data shard' : 'Open route'} key={key}>
                {isPlayer && <span className="player-core"><Code2 size={15} /></span>}
                {isPatrol && <span className="patrol-core"><span /></span>}
                {tile === 'D' && !isCollected && !isPlayer && <span className="shard-core" />}
                {tile === 'E' && <span className="exit-core"><ArrowRight size={16} /></span>}
              </div>;
            }))}
          </div>
          {game.status !== 'playing' && (
            <div className="circuit-overlay" aria-live="polite">
              <span className="overlay-kicker">{game.status === 'won' ? 'ALL SECTORS CLEARED' : game.status === 'lost' ? 'CONNECTION LOST' : 'OPERATION: CIRCUIT BREAK'}</span>
              <strong>{game.status === 'won' ? 'You breached the system.' : game.status === 'lost' ? 'The firewall held.' : 'Ready to hack the grid?'}</strong>
              <span>{game.status === 'won' ? 'Flawless work, operator.' : game.status === 'lost' ? 'Three lives used. Recalibrate and try again.' : 'Collect the glowing shards. Avoid the moving patrol. Find the exit.'}</span>
              <button className="game-start" onClick={startGame}>{game.status === 'ready' ? 'Start mission' : 'Run it back'} {game.status === 'ready' ? <ArrowRight size={15} /> : <RotateCcw size={15} />}</button>
            </div>
          )}
        </div>
        <div className="console-bottomline"><span className="game-live-status" aria-live="polite">{game.message || (isPlaying ? 'OPERATOR ONLINE · MOVE WITH WASD OR ARROW KEYS' : 'AWAITING OPERATOR INPUT')}</span><span>{gamepadConnected ? 'GAMEPAD ONLINE' : isPlaying ? 'PATROL ACTIVE' : 'SYSTEM STANDBY'}</span></div>
      </div>
      <div className="circuit-controls" aria-label="Movement controls">
        <div className="dpad">
          <button onClick={() => movePlayer(0, -1)} disabled={!isPlaying} aria-label="Move up"><ArrowUp size={17} /></button>
          <button onClick={() => movePlayer(-1, 0)} disabled={!isPlaying} aria-label="Move left"><ArrowLeft size={17} /></button>
          <button onClick={() => movePlayer(0, 1)} disabled={!isPlaying} aria-label="Move down"><ArrowDown size={17} /></button>
          <button onClick={() => movePlayer(1, 0)} disabled={!isPlaying} aria-label="Move right"><ArrowRight size={17} /></button>
        </div>
        <span>WASD / ARROWS <i /> D-PAD / TOUCH</span>
      </div>
      <p className="game-hint">{gamepadConnected ? 'CONTROLLER CONNECTED · D-PAD / LEFT STICK TO MOVE · A TO START' : 'KEYBOARD: WASD / ARROWS · CONTROLLER: CONNECT AND PRESS ANY BUTTON'}<br />Every move advances the patrol. Plan your route before you move.</p>
    </section>
  );
}

function getChatAnswer(message, profile, projects, loading) {
  const question = message.toLowerCase();
  const contactLine = `Call or WhatsApp Ezra at ${CONTACT_PHONE_DISPLAY}, or email ${CONTACT_EMAIL}.`;
  if (/\b(hi|hello|hey|good morning|good afternoon)\b/.test(question)) {
    return `Hi there! I can tell you about ${profile.name || 'Ezra'}, his projects, availability, and how to get in touch. ${contactLine}`;
  }
  const mentionedProject = projects.find((project) => project.name && question.includes(project.name.toLowerCase()));
  if (mentionedProject) {
    return `${mentionedProject.name}${mentionedProject.category ? ` is a ${mentionedProject.category} project` : ''}${mentionedProject.year ? ` from ${mentionedProject.year}` : ''}. ${mentionedProject.description || 'See its project card in Selected work for more details.'} ${contactLine}`;
  }
  if (/\b(available|availability|hire|hiring|freelance|job|work together|collaborat(?:e|ion))\b/.test(question)) {
    return `${profile.availability || 'For current availability, get in touch directly.'} ${contactLine}`;
  }
  const asksAboutProjects = /\b(projects?|portfolio|case studies|selected work|built|made)\b|\bwork(?:ing)? on\b|\b(building|developing|creating|making)\b/.test(question);
  if (asksAboutProjects) {
    if (loading) return 'I’m loading Ezra’s current projects. Please try that question again in a moment.';
    return projects.length
      ? `The projects currently listed in Ezra’s portfolio are: ${projects.map((project) => `${project.name}${project.category ? ` (${project.category})` : ''}${project.description ? `: ${project.description}` : ''}`).join('; ')}. Scroll to Selected work for the details. ${contactLine}`
      : `New projects are being added. Contact Ezra directly for more information. ${contactLine}`;
  }
  if (/\b(contact|email|reach|message|talk|call|phone|whatsapp)\b/.test(question)) {
    return `You can call or WhatsApp ${profile.name || 'Ezra'} at ${CONTACT_PHONE_DISPLAY}, or email ${profile.email || CONTACT_EMAIL}. The contact form is also below.`;
  }
  if (/\b(where|location|based|from)\b/.test(question)) {
    return `Based in ${profile.location || 'Nairobi, Kenya'}. ${contactLine}`;
  }
  if (/\b(price|pricing|cost|rate|budget|quote)\b/.test(question)) {
    return `Project pricing depends on the scope and requirements. Get in touch to discuss your idea. ${contactLine}`;
  }
  if (/\b(who|about|name|developer|experience|skills|skill|technology|tech|service|services|stack)\b/.test(question)) {
    return `${profile.name || 'Ezra Nzioki'} is a ${profile.role || 'full-stack developer'} based in ${profile.location || 'Nairobi, Kenya'}. ${profile.bio || ''} The portfolio does not list a complete technology stack, so contact Ezra for specifics. ${contactLine}`;
  }
  return `I don't have enough information to answer that accurately. Please call or WhatsApp Ezra at ${CONTACT_PHONE_DISPLAY}, or email ${CONTACT_EMAIL}, and he can help.`;
}

function PortfolioChat({ profile, projects, loading }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const lastMessageRef = useRef(null);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi! I'm Ezra's portfolio assistant. Ask about his projects, availability, or contact details. I can also explain which media links the tool supports.` },
  ]);

  useEffect(() => {
    function openFromCommand() {
      setOpen(true);
    }
    window.addEventListener('portfolio:open-chat', openFromCommand);
    return () => window.removeEventListener('portfolio:open-chat', openFromCommand);
  }, []);

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, open]);

  function sendQuestion(text) {
    if (!text) return;
    setMessages((current) => [
      ...current,
      { role: 'user', text },
      { role: 'assistant', text: getChatAnswer(text, profile, projects, loading) },
    ]);
  }

  function sendMessage(event) {
    event.preventDefault();
    sendQuestion(draft.trim());
    setDraft('');
  }

  return (
    <aside className="portfolio-chat" aria-label="Portfolio assistant">
      {open && <section className="chat-panel" aria-label="Chat with Ezra's portfolio assistant">
        <header className="chat-header"><span className="chat-avatar"><Bot size={17} /></span><div><b>Ezra&apos;s assistant</b><span>PORTFOLIO GUIDE</span></div><button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat"><X size={17} /></button></header>
        <div className="chat-messages" aria-live="polite">{messages.map((message, index) => <p className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>{message.text}</p>)}{messages.length === 1 && <div className="chat-quick-prompts"><button onClick={() => sendQuestion('What projects has Ezra worked on?')}>Projects</button><button onClick={() => sendQuestion('Is Ezra available?')}>Availability</button><button onClick={() => sendQuestion('How can I contact Ezra?')}>Contact</button></div>}<span ref={lastMessageRef} /></div>
        <div className="chat-contact-shortcuts"><a href={`tel:${CONTACT_PHONE}`} aria-label="Call Ezra"><PhoneCall size={14} /> Call</a><a href={`https://wa.me/${CONTACT_PHONE.slice(1)}`} target="_blank" rel="noreferrer" aria-label="WhatsApp Ezra"><MessageCircle size={14} /> WhatsApp</a><a href={`mailto:${CONTACT_EMAIL}`} aria-label="Email Ezra"><Mail size={14} /> Email</a></div>
        <form className="chat-compose" onSubmit={sendMessage}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about Ezra's work..." aria-label="Ask a question" /><button type="submit" aria-label="Send question" disabled={!draft.trim()}><Send size={16} /></button></form>
      </section>}
      <button className="chat-launcher" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Close portfolio assistant' : 'Open portfolio assistant'}>{open ? <X size={20} /> : <Bot size={21} />}<span>{open ? 'Close' : 'Ask Ezra'}</span></button>
    </aside>
  );
}

function CommandPalette({ open, onOpenChange, profile, projects }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const commands = [
    { title: 'Go to home', detail: 'Back to the introduction', icon: ArrowDownRight, keywords: 'start intro', run: () => document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' }) },
    { title: 'Explore selected work', detail: 'Browse projects and case studies', icon: Layers3, keywords: 'projects portfolio', run: () => document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' }) },
    { title: 'Read about Ezra', detail: 'Background, focus, and availability', icon: Code2, keywords: 'about bio developer', run: () => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }) },
    { title: 'Get in touch', detail: 'Jump to the contact form', icon: Mail, keywords: 'contact email message', run: () => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }) },
    { title: 'Ask the portfolio assistant', detail: 'Get answers about projects and availability', icon: Bot, keywords: 'chat assistant help', run: () => window.dispatchEvent(new Event('portfolio:open-chat')) },
    { title: `Email ${profile.name || 'Ezra'}`, detail: profile.email || CONTACT_EMAIL, icon: Mail, keywords: 'send email mail', run: () => { window.location.href = `mailto:${profile.email || CONTACT_EMAIL}`; } },
    ...projects.map((project, index) => ({
      title: project.name || `Project ${index + 1}`,
      detail: [project.category, project.year].filter(Boolean).join(' · ') || 'Open this project',
      icon: ExternalLink,
      keywords: `${project.category || ''} ${project.description || ''} ${project.year || ''}`,
      run: () => document.getElementById(`project-${project.id || index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    })),
  ];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCommands = commands.filter((command) => `${command.title} ${command.detail} ${command.keywords}`.toLowerCase().includes(normalizedQuery));

  function runCommand(command) {
    onOpenChange(false);
    command.run();
  }

  function handleKeyDown(event) {
    if (!filteredCommands.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % filteredCommands.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (event.key === 'Enter' && filteredCommands[activeIndex]) {
      event.preventDefault();
      runCommand(filteredCommands[activeIndex]);
    }
  }

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  return (
    <dialog className="command-dialog" ref={dialogRef} aria-label="Quick navigation" onClose={() => onOpenChange(false)} onClick={(event) => {
      if (event.target === event.currentTarget) onOpenChange(false);
    }}>
      <div className="command-panel">
        <div className="command-search"><Search size={19} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleKeyDown} placeholder="Search pages, projects, actions..." aria-label="Search navigation commands" /><kbd>ESC</kbd><button className="command-close" onClick={() => onOpenChange(false)} aria-label="Close quick navigation"><X size={18} /></button></div>
        <div className="command-results" role="listbox" aria-label="Quick navigation results">
          {filteredCommands.length ? filteredCommands.map((command, index) => {
            const Icon = command.icon;
            return <button className={`command-result${activeIndex === index ? ' is-active' : ''}`} key={command.title} role="option" aria-selected={activeIndex === index} onMouseEnter={() => setActiveIndex(index)} onClick={() => runCommand(command)}><span className="command-icon"><Icon size={17} /></span><span className="command-copy"><strong>{command.title}</strong><small>{command.detail}</small></span>{activeIndex === index && <CornerDownLeft size={15} className="command-enter" />}</button>;
          }) : <p className="command-empty">No matches. Try a project name or section.</p>}
        </div>
        <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span><span><kbd>ESC</kbd> to close</span></div>
      </div>
    </dialog>
  );
}

function ProjectCard({ project, index }) {
  const artClasses = ['art-lime', 'art-coral', 'art-blue'];
  const projectImage = project.image ? apiUrl(project.image) : '';
  return (
    <article className="project-card" id={`project-${project.id || index}`}>
      <div className={`project-visual ${artClasses[index % artClasses.length]}${project.image ? ' has-image' : ''}`}>
        {projectImage ? <img className="project-cover-image" src={projectImage} alt={`${project.name} project`} loading="lazy" /> : <>
          {index === 0 && <div className="visual-notes"><span>01 / COLLECT</span><span>02 / CONNECT</span><span>03 / CREATE</span><strong>FIELD<br />NOTES<span>.</span></strong><div className="notes-grid" /></div>}
          {index === 1 && <div className="visual-ledger"><div className="ledger-top"><span>OPEN / LEDGER</span><span>•••</span></div><div className="ledger-label">TOTAL BALANCE</div><div className="ledger-number">$24,680<span>.50</span></div><div className="ledger-chart"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="ledger-bottom"><span>INCOME <b>+$5,200</b></span><span>SPEND <b>-$1,840</b></span></div></div>}
          {index === 2 && <div className="visual-common"><div className="common-orbit orbit-a" /><div className="common-orbit orbit-b" /><span>MAKE SPACE<br />FOR EVERYONE.</span><div className="common-star">✳</div><small>COMMON GROUND / COMMUNITY</small></div>}
        </>}
        <span className="project-number">0{index + 1}</span>
        {project.url && <a className="project-open" href={project.url} target="_blank" rel="noreferrer" aria-label={`Open ${project.name}`}><ArrowUpRight size={19} /></a>}
      </div>
      <div className="project-info"><div><h3>{project.name}</h3><span>{project.category}</span></div><span className="project-year">{project.year}</span></div>
      <p className="project-description">{project.description}</p>
    </article>
  );
}

function Admin() {
  const [user, setUser] = useState(null);
  const [login, setLogin] = useState({ username: '', password: '' });
  const [portfolio, setPortfolio] = useState(emptyPortfolio);
  const [messages, setMessages] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [usersError, setUsersError] = useState('');
  const [deletingUser, setDeletingUser] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState('');
  const [resettingAnalytics, setResettingAnalytics] = useState(false);
  const [tab, setTab] = useState('content');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadingProject, setUploadingProject] = useState(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);

  useEffect(() => {
    api('/api/admin/session')
      .then((session) => {
        setUser(session.username);
        return Promise.all([api('/api/portfolio'), api('/api/admin/messages')]);
      })
      .then(([data, inbox]) => { setPortfolio(data); setMessages(inbox); })
      .catch((requestError) => { if (requestError.message !== 'Authentication required.') setError(requestError.message); });
  }, []);

  useEffect(() => {
    if (!user || tab !== 'analytics') return undefined;
    let active = true;
    const refreshAnalytics = async () => {
      try {
        const data = await api('/api/admin/analytics');
        if (active) {
          setAnalytics(data);
          setAnalyticsError('');
        }
      } catch (requestError) {
        if (active) setAnalyticsError(requestError.message);
      }
    };
    refreshAnalytics();
    const interval = window.setInterval(refreshAnalytics, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [user, tab]);

  useEffect(() => {
    if (!user || tab !== 'users') return undefined;
    let active = true;
    api('/api/admin/users')
      .then((data) => { if (active) setRegisteredUsers(data); })
      .catch((requestError) => { if (active) setUsersError(requestError.message); });
    return () => { active = false; };
  }, [user, tab]);

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const session = await api('/api/admin/login', { method: 'POST', body: JSON.stringify(login) });
      setUser(session.username);
      const [data, inbox] = await Promise.all([api('/api/portfolio'), api('/api/admin/messages')]);
      setPortfolio(data);
      setMessages(inbox);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (uploadingProject !== null || uploadingHero || uploadingCv) {
      setError('Wait for file uploads to finish before saving changes.');
      return;
    }
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const data = await api('/api/admin/portfolio', { method: 'PUT', body: JSON.stringify(portfolio) });
      setPortfolio(data);
      setNotice('Changes saved. Your portfolio is live.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await api('/api/admin/logout', { method: 'POST' });
    setUser(null);
  }

  async function resetAnalytics() {
    if (!window.confirm('Reset all website view tracking? This cannot be undone.')) return;
    setResettingAnalytics(true);
    setAnalyticsError('');
    try {
      await api('/api/admin/analytics', { method: 'DELETE' });
      setAnalytics({ totalPageViews: 0, totalSectionViews: 0, totalUniqueVisitors: 0, pageViews: [], sectionViews: [], visitors: [] });
    } catch (requestError) {
      setAnalyticsError(requestError.message);
    } finally {
      setResettingAnalytics(false);
    }
  }

  async function deleteUser(id, provider) {
    if (!window.confirm('Permanently delete this user record?')) return;
    const userKey = `${provider}-${id}`;
    setDeletingUser(userKey);
    setUsersError('');
    try {
      await api(`/api/admin/users/${encodeURIComponent(id)}?provider=${encodeURIComponent(provider)}`, { method: 'DELETE' });
      setRegisteredUsers((current) => current.filter((registeredUser) => `${registeredUser.provider}-${registeredUser._id}` !== userKey));
    } catch (requestError) {
      setUsersError(requestError.message);
    } finally {
      setDeletingUser('');
    }
  }

  if (!user) return <main className="admin-login-shell"><a className="wordmark login-wordmark" href="/"><span>EN</span><i>.</i></a><div className="login-panel"><span className="section-kicker">PORTFOLIO ADMIN</span><h1>Welcome<br />back, Ezra.</h1><p>Sign in to update your portfolio and view messages.</p><form onSubmit={signIn}><label>Username<input value={login.username} onChange={(event) => setLogin({ ...login, username: event.target.value })} autoComplete="username" required /></label><label>Password<input type="password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} autoComplete="current-password" required /></label><button className="admin-primary" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'} <ArrowRight size={16} /></button><span className="error-text" role="alert">{error}</span></form></div><a href="/" className="back-home"><ArrowDownRight size={14} /> Back to portfolio</a></main>;

  const updateProfile = (key, value) => setPortfolio((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  const updateProject = (id, key, value) => setPortfolio((current) => ({ ...current, projects: current.projects.map((project) => project.id === id ? { ...project, [key]: value } : project) }));
  const addProject = () => setPortfolio({ ...portfolio, projects: [...portfolio.projects, { id: `project-${Date.now()}`, name: '', category: '', description: '', year: String(new Date().getFullYear()), color: '#5BC0BE', url: '' }] });

  async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(apiUrl('/api/admin/uploads'), { method: 'POST', credentials: 'include', body: formData });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Image upload failed.');
    return result.url;
  }

  async function uploadCv(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadingCv(true);
    setError('');
    setNotice('');
    try {
      const formData = new FormData();
      formData.append('cv', file);
      const response = await fetch(apiUrl('/api/admin/cv'), { method: 'POST', credentials: 'include', body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'CV upload failed.');
      updateProfile('cvUrl', result.url);
      setNotice('CV uploaded. Save changes to publish it.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploadingCv(false);
    }
  }

  async function uploadHeroImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadingHero(true);
    setError('');
    setNotice('');
    try {
      updateProfile('heroImage', await uploadImage(file));
      setNotice('Hero image uploaded. Save changes to publish it.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploadingHero(false);
    }
  }

  async function uploadProjectImage(id, event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadingProject(id);
    setError('');
    setNotice('');
    try {
      updateProject(id, 'image', await uploadImage(file));
      setNotice('Image uploaded. Save changes to publish it.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploadingProject(null);
    }
  }

  const heroImage = portfolio.profile.heroImage ? apiUrl(portfolio.profile.heroImage) : '';
  const maxDailyViews = Math.max(1, ...(analytics?.pageViews || []).map((day) => day.count));
  const mostViewedSection = analytics?.sectionViews?.[0];

  return (
    <main className="admin-shell">
      <header className="admin-header"><a className="wordmark" href="/"><span>EN</span><i>.</i></a><div className="admin-header-title"><span>PORTFOLIO / CONTROL ROOM</span><b>{getKenyanGreeting()}, {user}.</b></div><button className="admin-logout" onClick={signOut}><LogOut size={15} /> Sign out</button></header>
      <div className="admin-layout">
        <aside className="admin-sidebar"><span className="sidebar-label">WORKSPACE</span><button className={tab === 'content' ? 'sidebar-tab active' : 'sidebar-tab'} onClick={() => setTab('content')}><Layers3 size={17} /> Portfolio <ArrowRight size={14} /></button><button className={tab === 'messages' ? 'sidebar-tab active' : 'sidebar-tab'} onClick={() => setTab('messages')}><MessageSquareText size={17} /> Messages <span className="message-count">{messages.length}</span></button><button className={tab === 'analytics' ? 'sidebar-tab active' : 'sidebar-tab'} onClick={() => setTab('analytics')}><BarChart3 size={17} /> Analytics <ArrowRight size={14} /></button><button className={tab === 'users' ? 'sidebar-tab active' : 'sidebar-tab'} onClick={() => setTab('users')}><Users size={17} /> Users <span className="message-count">{registeredUsers.length}</span></button><div className="sidebar-bottom"><ShieldCheck size={17} /><span>Private admin access<br /><b>Session protected</b></span></div></aside>
        <section className="admin-main">
          {tab === 'content' ? <>
            <div className="admin-page-title"><div><span className="section-kicker">YOUR PUBLIC SITE</span><h1>Portfolio content</h1><p>Everything here appears on your live portfolio.</p></div><a href="/" target="_blank" rel="noreferrer" className="view-site">View site <ArrowUpRight size={15} /></a></div>
            <div className="admin-section-title"><span>01</span><div><h2>Profile</h2><p>Your introduction and contact details.</p></div></div>
            <div className="admin-form-grid">
              <AdminField label="Name" value={portfolio.profile.name} onChange={(value) => updateProfile('name', value)} />
              <AdminField label="Role" value={portfolio.profile.role} onChange={(value) => updateProfile('role', value)} />
              <AdminField label="Location" value={portfolio.profile.location} onChange={(value) => updateProfile('location', value)} />
              <AdminField label="Availability" value={portfolio.profile.availability} onChange={(value) => updateProfile('availability', value)} />
              <AdminField label="Headline" value={portfolio.profile.headline} onChange={(value) => updateProfile('headline', value)} wide />
              <AdminField label="About" value={portfolio.profile.bio} onChange={(value) => updateProfile('bio', value)} multiline wide />
              <AdminField label="Email" value={portfolio.profile.email} onChange={(value) => updateProfile('email', value)} />
              <AdminField label="GitHub URL" value={portfolio.profile.github} onChange={(value) => updateProfile('github', value)} />
              <AdminField label="LinkedIn URL" value={portfolio.profile.linkedin} onChange={(value) => updateProfile('linkedin', value)} />
              <div className="admin-image-control">
                <div className="admin-image-preview">{heroImage ? <img src={heroImage} alt="Hero image preview" /> : <div><ImagePlus size={22} /><span>Default hero image</span></div>}</div>
                <div className="admin-image-actions"><span className="image-field-label">HERO IMAGE</span><label className="image-upload-button"><ImagePlus size={15} />{uploadingHero ? 'Uploading...' : heroImage ? 'Replace image' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy || uploadingHero || uploadingProject !== null || uploadingCv} onChange={uploadHeroImage} /></label>{heroImage && <button className="image-remove-button" onClick={() => updateProfile('heroImage', '')}>Use default image</button>}<span className="image-upload-hint">JPEG, PNG, WebP, or GIF · up to 5 MB</span></div>
              </div>
              <div className="admin-image-control admin-cv-control">
                <div className="admin-cv-preview"><FileText size={23} /><span>{portfolio.profile.cvUrl ? 'CV ready to download' : 'No CV uploaded'}</span></div>
                <div className="admin-image-actions"><span className="image-field-label">CV / RESUME</span><label className="image-upload-button"><FileText size={15} />{uploadingCv ? 'Uploading...' : portfolio.profile.cvUrl ? 'Replace PDF' : 'Upload PDF'}<input type="file" accept="application/pdf,.pdf" disabled={busy || uploadingCv || uploadingProject !== null || uploadingHero} onChange={uploadCv} /></label>{portfolio.profile.cvUrl && <button className="image-remove-button" onClick={() => updateProfile('cvUrl', '')}>Remove CV</button>}<span className="image-upload-hint">PDF only · up to 10 MB · Save changes to publish</span></div>
              </div>
            </div>
            <div className="admin-section-title projects-admin-title"><span>02</span><div><h2>Selected work</h2><p>Show the projects you&apos;re proud of.</p></div><button className="add-project" onClick={addProject}><Plus size={16} /> Add project</button></div>
            <div className="admin-project-list">{portfolio.projects.map((project, index) => <article className="admin-project" key={project.id}><div className="admin-project-head"><span>PROJECT 0{index + 1}</span><button aria-label={`Delete ${project.name || 'project'}`} onClick={() => setPortfolio({ ...portfolio, projects: portfolio.projects.filter((item) => item.id !== project.id) })}><Trash2 size={16} /></button></div><div className="admin-form-grid"><div className="admin-image-control"><div className="admin-image-preview">{project.image ? <img src={apiUrl(project.image)} alt={`${project.name || 'Project'} cover preview`} /> : <div><ImagePlus size={22} /><span>No cover image</span></div>}</div><div className="admin-image-actions"><span className="image-field-label">PROJECT COVER</span><label className="image-upload-button"><ImagePlus size={15} />{uploadingProject === project.id ? 'Uploading...' : project.image ? 'Replace image' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy || uploadingProject !== null || uploadingHero || uploadingCv} onChange={(event) => uploadProjectImage(project.id, event)} /></label>{project.image && <button className="image-remove-button" onClick={() => updateProject(project.id, 'image', '')}>Remove image</button>}<span className="image-upload-hint">JPEG, PNG, WebP, or GIF · up to 5 MB</span></div></div><AdminField label="Project name" value={project.name} onChange={(value) => updateProject(project.id, 'name', value)} /><AdminField label="Category" value={project.category} onChange={(value) => updateProject(project.id, 'category', value)} /><AdminField label="Year" value={project.year} onChange={(value) => updateProject(project.id, 'year', value)} /><AdminField label="Project URL" value={project.url} onChange={(value) => updateProject(project.id, 'url', value)} /><AdminField label="Description" value={project.description} onChange={(value) => updateProject(project.id, 'description', value)} multiline wide /></div></article>)}{!portfolio.projects.length && <div className="admin-empty">No projects yet. Add one to feature it on your site.</div>}</div>
            <div className="admin-save-bar"><span className="save-notice" role="status">{notice || error}</span><button className="admin-primary save-button" onClick={save} disabled={busy || uploadingProject !== null || uploadingHero || uploadingCv}><Save size={16} /> {busy ? 'Saving...' : 'Save changes'} <Check size={15} /></button></div>
          </> : tab === 'messages' ? <>
            <div className="admin-page-title"><div><span className="section-kicker">CONTACT FORM</span><h1>Your messages</h1><p>Notes sent through your portfolio.</p></div><span className="inbox-total">{messages.length} {messages.length === 1 ? 'MESSAGE' : 'MESSAGES'}</span></div>
            <div className="message-list">{messages.map((message, index) => <article className="inbox-message" key={message._id || `${message.email}-${index}`}><div className="inbox-message-top"><div><span className="inbox-index">{String(index + 1).padStart(2, '0')}</span><h2>{message.name}</h2></div><time>{new Date(message.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time></div><a className="inbox-email" href={`mailto:${message.email}`}>{message.email} <ArrowUpRight size={13} /></a><p>{message.message}</p></article>)}{!messages.length && <div className="admin-empty"><Mail size={20} /> No messages yet. They&apos;ll show up here.</div>}</div>
          </> : tab === 'users' ? <>
            <div className="admin-page-title"><div><span className="section-kicker">VISITOR ACCOUNTS</span><h1>Registered users</h1><p>User records are retained until you delete them.</p></div><span className="inbox-total">{registeredUsers.length} USERS</span></div>
            {usersError && <p className="analytics-error" role="alert">{usersError}</p>}
            <div className="analytics-visitors-wrap"><table className="analytics-visitors admin-users-table"><thead><tr><th>Name / email</th><th>IP address</th><th>Approx. location</th><th>Sign-ins</th><th>Last seen</th><th>Action</th></tr></thead><tbody>
              {registeredUsers.map((registeredUser) => {
                const userKey = `${registeredUser.provider}-${registeredUser._id}`;
                return <tr key={userKey}><td><strong>{registeredUser.name}</strong><br />{registeredUser.email}</td><td>{registeredUser.ipAddress}</td><td>{[registeredUser.city, registeredUser.region, registeredUser.country].filter(Boolean).join(', ') || 'Unknown'}</td><td>{registeredUser.loginCount}</td><td>{new Date(registeredUser.lastSeen).toLocaleString()}</td><td><button className="user-delete-button" onClick={() => deleteUser(registeredUser._id, registeredUser.provider)} disabled={deletingUser === userKey}>{deletingUser === userKey ? 'Deleting...' : 'Delete'}</button></td></tr>;
              })}
              {!registeredUsers.length && <tr><td colSpan="6">No visitor accounts have been created yet.</td></tr>}
            </tbody></table></div>
          </> : <>
            <div className="admin-page-title analytics-page-title"><div><span className="section-kicker">AUDIENCE OVERVIEW</span><h1>Website analytics</h1><p>Consent-based visitor and section views. Live updates every 5 seconds.</p></div><button className="analytics-reset" onClick={resetAnalytics} disabled={resettingAnalytics}><RotateCcw size={14} />{resettingAnalytics ? 'Resetting...' : 'Reset tracking'}</button></div>
            {analyticsError && <p className="analytics-error" role="alert">{analyticsError}</p>}
            <div className="analytics-metrics">
              <article className="analytics-metric"><span>TOTAL PAGE VIEWS</span><strong>{analytics?.totalPageViews ?? '—'}</strong></article>
              <article className="analytics-metric"><span>UNIQUE BROWSERS</span><strong>{analytics?.totalUniqueVisitors ?? '—'}</strong></article>
              <article className="analytics-metric"><span>SECTION VIEWS</span><strong>{analytics?.totalSectionViews ?? '—'}</strong></article>
              <article className="analytics-metric"><span>MOST VIEWED SECTION</span><strong>{mostViewedSection?.count ? mostViewedSection.section : '—'}</strong><small>{mostViewedSection?.count || 0} views</small></article>
            </div>
            <section className="analytics-panel">
              <div className="analytics-panel-heading"><div><span className="section-kicker">LAST 7 DAYS</span><h2>Page views</h2></div><span className="analytics-live"><i /> LIVE</span></div>
              <div className="analytics-chart" role="img" aria-label="Page views over the last seven days">
                {(analytics?.pageViews || []).map((day) => <div className="analytics-bar-column" key={day.date}><span>{day.count}</span><div className="analytics-bar-track"><i style={{ height: `${Math.max(day.count ? 6 : 0, (day.count / maxDailyViews) * 100)}%` }} /></div><small>{day.date.slice(5)}</small></div>)}
              </div>
            </section>
            <section className="analytics-panel">
              <div className="analytics-panel-heading"><div><span className="section-kicker">ENGAGEMENT</span><h2>Views by section</h2></div></div>
              <div className="analytics-section-list">{(analytics?.sectionViews || []).map(({ section, count }) => {
                const maxSectionViews = Math.max(1, ...(analytics?.sectionViews || []).map((item) => item.count));
                return <div className="analytics-section-row" key={section}><span>{section}</span><div className="analytics-section-track"><i style={{ width: `${(count / maxSectionViews) * 100}%` }} /></div><strong>{count}</strong></div>;
              })}</div>
              <p className="analytics-privacy-note">Only visitors who allow analytics are included. IP addresses and approximate locations are stored for up to 90 days; names are not collected. Each section is counted once per page visit.</p>
            </section>
            <section className="analytics-panel">
              <div className="analytics-panel-heading"><div><span className="section-kicker">CONSENTED VISITORS</span><h2>Recent visitor details</h2></div><span className="inbox-total">LATEST 100</span></div>
              <div className="analytics-visitors-wrap"><table className="analytics-visitors"><thead><tr><th>IP address</th><th>Approx. location</th><th>Visits</th><th>Last seen</th></tr></thead><tbody>
                {(analytics?.visitors || []).map((visitor) => <tr key={visitor.visitorId}><td>{visitor.ipAddress}</td><td>{[visitor.city, visitor.region, visitor.country].filter(Boolean).join(', ') || 'Unknown'}</td><td>{visitor.visitCount}</td><td>{new Date(visitor.lastSeen).toLocaleString()}</td></tr>)}
                {!analytics?.visitors?.length && <tr><td colSpan="4">No visitors have allowed analytics yet.</td></tr>}
              </tbody></table></div>
            </section>
          </>}
        </section>
      </div>
    </main>
  );
}

function AdminField({ label, value = '', onChange, multiline = false, wide = false }) {
  const props = { value: value || '', onChange: (event) => onChange(event.target.value), placeholder: `Enter ${label.toLowerCase()}` };
  return <label className={wide ? 'admin-field wide' : 'admin-field'}>{label}{multiline ? <textarea {...props} rows="3" /> : <input {...props} />}</label>;
}

export default App;