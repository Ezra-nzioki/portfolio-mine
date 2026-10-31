import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownRight,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Bot,
  Check,
  Code2,
  Command,
  CornerDownLeft,
  ExternalLink,
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
  X,
} from 'lucide-react';

const CONTACT_PHONE = '+254710865376';
const CONTACT_PHONE_DISPLAY = '+254 710 865 376';
const CONTACT_EMAIL = 'ezranzioki@gmail.com';
const HERO_POSTER = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=85';
const HERO_VIDEO = 'https://videos.pexels.com/video-files/3130284/3130284-sd_640_360_30fps.mp4';

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
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
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
  const isAdmin = window.location.pathname.startsWith('/admin');

  useEffect(() => {
    let active = true;
    api('/api/portfolio')
      .then((data) => { if (active) setPortfolio(data); })
      .catch((error) => { if (active) setLoadError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (isAdmin) return <Admin />;
  return <PortfolioPage portfolio={portfolio} loading={loading} loadError={loadError} />;
}

function PortfolioPage({ portfolio, loading, loadError }) {
  const { profile, projects } = portfolio;
  const [menuOpen, setMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [contact, setContact] = useState({ name: '', email: '', message: '' });
  const [contactState, setContactState] = useState({ busy: false, message: '' });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = (event) => setPrefersReducedMotion(event.matches);
    motionPreference.addEventListener('change', updateMotionPreference);
    return () => motionPreference.removeEventListener('change', updateMotionPreference);
  }, []);

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
    let frame = 0;
    function updateProgress() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
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

  useEffect(() => {
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -32px 0px' });
    const targets = document.querySelectorAll('.scroll-reveal');

    document.documentElement.classList.add('has-scroll-reveal');
    targets.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove('has-scroll-reveal');
    };
  }, [prefersReducedMotion]);

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

  return (
    <main className="site-shell">
      <div className="site-backdrop" aria-hidden="true">
        {prefersReducedMotion ? (
          <img className="site-backdrop-poster" src={HERO_POSTER} alt="" />
        ) : (
          <video className="site-backdrop-video" autoPlay loop muted playsInline preload="none" poster={HERO_POSTER} tabIndex="-1">
            <source src={HERO_VIDEO} type="video/mp4" />
          </video>
        )}
      </div>
      <div className="site-content">
      <div className="reading-progress" role="progressbar" aria-label="Page reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(scrollProgress)}>
        <span style={{ transform: `scaleX(${scrollProgress / 100})` }} />
      </div>
      <div className="topline"><span className="status-dot" /> {profile.availability || 'Open to select projects'} <span className="topline-place">Based in {profile.location || 'Nairobi, Kenya'}</span></div>
      <header className="site-header">
        <a className="wordmark" href="#home" aria-label={`${profile.name} home`}><span>EN</span><i>.</i></a>
        <button className="icon-button mobile-menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation">
          <a onClick={() => setMenuOpen(false)} href="#work">Work <span>03</span></a>
          <a onClick={() => setMenuOpen(false)} href="#about">About</a>
          <a className="nav-contact" onClick={() => setMenuOpen(false)} href="#contact">Let&apos;s talk <ArrowUpRight size={14} /></a>
          <a className="nav-admin" href="/admin"><ShieldCheck size={15} /> Admin</a>
        </nav>
        <button className="command-trigger" onClick={() => setCommandOpen(true)} aria-label="Open quick navigation" title="Quick navigation (Ctrl or Command + K)">
          <Search size={16} /><span>Quick find</span><kbd><Command size={11} /> K</kbd>
        </button>
      </header>

      <section className="hero section-wrap" id="home">
        <div className="hero-copy scroll-reveal">
          <div className="eyebrow"><span className="eyebrow-line" /> {profile.role || 'Full-stack developer'} <span className="eyebrow-separator">/</span> {profile.location || 'Nairobi, Kenya'}</div>
          <h1>{profile.headline || 'Thoughtful digital products, built for the real world.'}</h1>
          <div className="hero-bottom">
            <p className="hero-intro">I&apos;m <strong>{profile.name || 'Ezra Nzioki'}</strong> — a developer who brings ideas to life with care, curiosity, and clean code.</p>
            <a href="#work" className="circle-link" aria-label="Scroll to selected work"><ArrowDownRight size={22} /></a>
          </div>
          <div className="hero-index"><span>01</span><span className="index-rule" /><span>SCROLL TO EXPLORE</span></div>
        </div>
        <div className="hero-art scroll-reveal">
          <img className="hero-art-image" src={HERO_POSTER} alt="A developer working at a laptop in a bright workspace" fetchPriority="high" />
          <div className="art-label"><span className="art-label-icon"><Code2 size={16} /></span><span>Building with intention</span><span className="art-label-count">01 / 04</span></div>
          <div className="art-stamp"><Sparkles size={16} /><span>GOOD<br />THINGS<br />TAKE SHAPE</span></div>
          <span className="art-caption">CODE IN MOTION — DIGITAL THINKING</span>
        </div>
      </section>

      <section className="work-section section-wrap scroll-reveal" id="work">
        <div className="section-heading"><div><span className="section-kicker">A FEW THINGS I&apos;VE MADE</span><h2>Selected work<span className="heading-period">.</span></h2></div><p>Good work starts with a good question.<br />Here are a few answers.</p></div>
        {loading ? <div className="loading-line">Loading projects <span className="loading-pulse" /></div> : loadError ? <div className="empty-work"><Layers3 size={22} /><span>{loadError}</span></div> : projects.length ? (
          <div className="project-grid">
            {projects.map((project, index) => <ProjectCard key={project.id || project.name} project={project} index={index} />)}
          </div>
        ) : <div className="empty-work"><Layers3 size={22} /><span>New work is taking shape. Check back soon.</span></div>}
        <div className="work-endnote"><span>MORE IN THE WORKS</span><span className="endnote-line" /><ArrowRight size={16} /></div>
      </section>

      <section className="about-section" id="about">
        <div className="section-wrap about-inner scroll-reveal">
          <div className="about-mark"><span>EN</span><div className="about-mark-ring" /></div>
          <div className="about-content"><span className="section-kicker">A LITTLE ABOUT ME</span><h2>Curiosity is part<br />of the toolkit.</h2><p>{profile.bio}</p><div className="about-meta"><div><span className="meta-label">CURRENTLY</span><span>{profile.availability || 'Open to select projects'}</span></div><div><span className="meta-label">BASED IN</span><span>{profile.location || 'Nairobi, Kenya'}</span></div><div><span className="meta-label">FOCUS</span><span>Web · Product · Systems</span></div></div></div>
          <div className="about-side-note">THINK<br />MAKE<br />REFINE<span>↘</span></div>
        </div>
      </section>

      <section className="contact-section section-wrap" id="contact">
        <div className="contact-intro scroll-reveal"><span className="section-kicker">HAVE SOMETHING IN MIND?</span><h2>Let&apos;s make<br />it <em>matter.</em></h2><p>Have a good problem to solve or an idea worth exploring? Tell me a little about it.</p>
          <div className="contact-links"><a href={`tel:${CONTACT_PHONE}`}><PhoneCall size={17} /> Call {CONTACT_PHONE_DISPLAY} <ArrowUpRight size={14} /></a><a href={`https://wa.me/${CONTACT_PHONE.slice(1)}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp Ezra <ArrowUpRight size={14} /></a><a href={`mailto:${profile.email || CONTACT_EMAIL}`}><Mail size={17} /> {profile.email || CONTACT_EMAIL} <ArrowUpRight size={14} /></a>{profile.github && <a href={profile.github} target="_blank" rel="noreferrer"><Github size={17} /> GitHub <ArrowUpRight size={14} /></a>}{profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer"><ExternalLink size={16} /> LinkedIn <ArrowUpRight size={14} /></a>}</div>
        </div>
        <form className="contact-form scroll-reveal" onSubmit={sendMessage}>
          <label>Your name<input value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} placeholder="Name" autoComplete="name" required /></label>
          <label>Email address<input type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} placeholder="you@example.com" autoComplete="email" required /></label>
          <label>Your note<textarea value={contact.message} onChange={(event) => setContact({ ...contact, message: event.target.value })} placeholder="A little about what you have in mind..." rows="3" required /></label>
          <div className="form-footer"><span className="form-response" role="status">{contactState.message}</span><button type="submit" className="submit-button" disabled={contactState.busy}>{contactState.busy ? 'Sending...' : 'Send a note'} <ArrowUpRight size={17} /></button></div>
        </form>
      </section>

      <CircuitBreakGame />

      <footer className="site-footer section-wrap"><a className="wordmark footer-mark" href="#home"><span>EN</span><i>.</i></a><span>Designed &amp; built by {profile.name || 'Ezra Nzioki'} <span className="footer-star">✳</span> {new Date().getFullYear()}</span><a href="/admin" className="admin-link">ADMIN <ArrowUpRight size={12} /></a></footer>
      <PortfolioChat profile={profile} projects={projects} loading={loading} />
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} profile={profile} projects={projects} />
      </div>
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
  const boardRef = useRef(null);
  const level = CIRCUIT_LEVELS[game.level];
  const isPlaying = game.status === 'playing';

  function startGame() {
    setGame({ ...createCircuitState(), status: 'playing', message: 'Collect every data fragment, avoid the patrol, then reach the exit.' });
    boardRef.current?.focus();
  }

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
    <section className="game-section section-wrap" aria-labelledby="game-title">
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
          <div className="circuit-board" role="grid" aria-label={`${level.name} maze. Use arrow keys or WASD to move.`} tabIndex={0} ref={boardRef} onKeyDown={handleBoardKeyDown}>
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
        <div className="console-bottomline"><span className="game-live-status" aria-live="polite">{game.message || (isPlaying ? 'OPERATOR ONLINE · MOVE WITH WASD OR ARROW KEYS' : 'AWAITING OPERATOR INPUT')}</span><span>{isPlaying ? 'PATROL ACTIVE' : 'SYSTEM STANDBY'}</span></div>
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
      <p className="game-hint">Every move advances the patrol. Plan your route before you move.</p>
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
  return (
    <article className="project-card" id={`project-${project.id || index}`}>
      <div className={`project-visual ${artClasses[index % artClasses.length]}${project.image ? ' has-image' : ''}`}>
        {project.image ? <img className="project-cover-image" src={project.image} alt={`${project.name} project`} loading="lazy" /> : <>
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
  const [tab, setTab] = useState('content');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadingProject, setUploadingProject] = useState(null);

  useEffect(() => {
    api('/api/admin/session')
      .then((session) => {
        setUser(session.username);
        return Promise.all([api('/api/portfolio'), api('/api/admin/messages')]);
      })
      .then(([data, inbox]) => { setPortfolio(data); setMessages(inbox); })
      .catch((requestError) => { if (requestError.message !== 'Authentication required.') setError(requestError.message); });
  }, []);

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

  if (!user) return <main className="admin-login-shell"><a className="wordmark login-wordmark" href="/"><span>EN</span><i>.</i></a><div className="login-panel"><span className="section-kicker">PORTFOLIO ADMIN</span><h1>Welcome<br />back, Ezra.</h1><p>Sign in to update your portfolio and view messages.</p><form onSubmit={signIn}><label>Username<input value={login.username} onChange={(event) => setLogin({ ...login, username: event.target.value })} autoComplete="username" required /></label><label>Password<input type="password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} autoComplete="current-password" required /></label><button className="admin-primary" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'} <ArrowRight size={16} /></button><span className="error-text" role="alert">{error}</span></form></div><a href="/" className="back-home"><ArrowDownRight size={14} /> Back to portfolio</a></main>;

  const updateProfile = (key, value) => setPortfolio({ ...portfolio, profile: { ...portfolio.profile, [key]: value } });
  const updateProject = (id, key, value) => setPortfolio((current) => ({ ...current, projects: current.projects.map((project) => project.id === id ? { ...project, [key]: value } : project) }));
  const addProject = () => setPortfolio({ ...portfolio, projects: [...portfolio.projects, { id: `project-${Date.now()}`, name: '', category: '', description: '', year: String(new Date().getFullYear()), color: '#5BC0BE', url: '' }] });

  async function uploadProjectImage(id, event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadingProject(id);
    setError('');
    setNotice('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('/api/admin/uploads', { method: 'POST', credentials: 'include', body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Image upload failed.');
      updateProject(id, 'image', result.url);
      setNotice('Image uploaded. Save changes to publish it.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploadingProject(null);
    }
  }

  return (
    <main className="admin-shell">
      <header className="admin-header"><a className="wordmark" href="/"><span>EN</span><i>.</i></a><div className="admin-header-title"><span>PORTFOLIO / CONTROL ROOM</span><b>{getKenyanGreeting()}, {user}.</b></div><button className="admin-logout" onClick={signOut}><LogOut size={15} /> Sign out</button></header>
      <div className="admin-layout">
        <aside className="admin-sidebar"><span className="sidebar-label">WORKSPACE</span><button className={tab === 'content' ? 'sidebar-tab active' : 'sidebar-tab'} onClick={() => setTab('content')}><Layers3 size={17} /> Portfolio <ArrowRight size={14} /></button><button className={tab === 'messages' ? 'sidebar-tab active' : 'sidebar-tab'} onClick={() => setTab('messages')}><MessageSquareText size={17} /> Messages <span className="message-count">{messages.length}</span></button><div className="sidebar-bottom"><ShieldCheck size={17} /><span>Private admin access<br /><b>Session protected</b></span></div></aside>
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
            </div>
            <div className="admin-section-title projects-admin-title"><span>02</span><div><h2>Selected work</h2><p>Show the projects you&apos;re proud of.</p></div><button className="add-project" onClick={addProject}><Plus size={16} /> Add project</button></div>
            <div className="admin-project-list">{portfolio.projects.map((project, index) => <article className="admin-project" key={project.id}><div className="admin-project-head"><span>PROJECT 0{index + 1}</span><button aria-label={`Delete ${project.name || 'project'}`} onClick={() => setPortfolio({ ...portfolio, projects: portfolio.projects.filter((item) => item.id !== project.id) })}><Trash2 size={16} /></button></div><div className="admin-form-grid"><div className="admin-image-control"><div className="admin-image-preview">{project.image ? <img src={project.image} alt={`${project.name || 'Project'} cover preview`} /> : <div><ImagePlus size={22} /><span>No cover image</span></div>}</div><div className="admin-image-actions"><span className="image-field-label">PROJECT COVER</span><label className="image-upload-button"><ImagePlus size={15} />{uploadingProject === project.id ? 'Uploading...' : project.image ? 'Replace image' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingProject !== null} onChange={(event) => uploadProjectImage(project.id, event)} /></label>{project.image && <button className="image-remove-button" onClick={() => updateProject(project.id, 'image', '')}>Remove image</button>}<span className="image-upload-hint">JPEG, PNG, WebP, or GIF · up to 5 MB</span></div></div><AdminField label="Project name" value={project.name} onChange={(value) => updateProject(project.id, 'name', value)} /><AdminField label="Category" value={project.category} onChange={(value) => updateProject(project.id, 'category', value)} /><AdminField label="Year" value={project.year} onChange={(value) => updateProject(project.id, 'year', value)} /><AdminField label="Project URL" value={project.url} onChange={(value) => updateProject(project.id, 'url', value)} /><AdminField label="Description" value={project.description} onChange={(value) => updateProject(project.id, 'description', value)} multiline wide /></div></article>)}{!portfolio.projects.length && <div className="admin-empty">No projects yet. Add one to feature it on your site.</div>}</div>
            <div className="admin-save-bar"><span className="save-notice" role="status">{notice || error}</span><button className="admin-primary save-button" onClick={save} disabled={busy}><Save size={16} /> {busy ? 'Saving...' : 'Save changes'} <Check size={15} /></button></div>
          </> : <>
            <div className="admin-page-title"><div><span className="section-kicker">CONTACT FORM</span><h1>Your messages</h1><p>Notes sent through your portfolio.</p></div><span className="inbox-total">{messages.length} {messages.length === 1 ? 'MESSAGE' : 'MESSAGES'}</span></div>
            <div className="message-list">{messages.map((message, index) => <article className="inbox-message" key={message._id || `${message.email}-${index}`}><div className="inbox-message-top"><div><span className="inbox-index">{String(index + 1).padStart(2, '0')}</span><h2>{message.name}</h2></div><time>{new Date(message.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time></div><a className="inbox-email" href={`mailto:${message.email}`}>{message.email} <ArrowUpRight size={13} /></a><p>{message.message}</p></article>)}{!messages.length && <div className="admin-empty"><Mail size={20} /> No messages yet. They&apos;ll show up here.</div>}</div>
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