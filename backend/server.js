const path = require('node:path');
const { Readable } = require('node:stream');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const cloudinary = require('cloudinary').v2;
const geoip = require('geoip-lite');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 4000;
const tokenSecret = process.env.JWT_SECRET || require('node:crypto').randomBytes(32).toString('hex');
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || (process.env.ADMIN_PASSWORD ? bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12) : '');
const frontendOrigins = new Set((process.env.FRONTEND_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean));
const adminCookieSameSite = process.env.ADMIN_COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'strict');
const googleOAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID
  && process.env.GOOGLE_CLIENT_SECRET
  && process.env.GOOGLE_REDIRECT_URI,
);
const cloudinaryConfigured = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}
const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const cvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const starterPortfolio = {
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
  projects: [
    {
      id: 'project-01',
      name: 'Fieldnotes',
      category: 'Product design / Web app',
      description: 'A calmer way to collect ideas, connect the dots, and get from a rough note to a clear next step.',
      year: '2025',
      color: '#d8ed5d',
      url: '',
    },
    {
      id: 'project-02',
      name: 'Open Ledger',
      category: 'Fintech / Dashboard',
      description: 'A straightforward financial workspace that makes everyday numbers easier to understand.',
      year: '2025',
      color: '#f0a27c',
      url: '',
    },
    {
      id: 'project-03',
      name: 'Common Ground',
      category: 'Community / Platform',
      description: 'A welcoming digital home for local groups to share resources and bring people together.',
      year: '2024',
      color: '#a8c9ff',
      url: '',
    },
  ],
};

let memoryPortfolio = structuredClone(starterPortfolio);
const memoryMessages = [];

const Portfolio = mongoose.model('Portfolio', new mongoose.Schema({
  key: { type: String, unique: true },
  profile: mongoose.Schema.Types.Mixed,
  projects: [mongoose.Schema.Types.Mixed],
}, { timestamps: true }));

const Message = mongoose.model('Message', new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, maxlength: 200 },
  message: { type: String, required: true, maxlength: 4000 },
  createdAt: { type: Date, default: Date.now },
}));

const Analytics = mongoose.model('Analytics', new mongoose.Schema({
  date: { type: String, required: true },
  type: { type: String, enum: ['page', 'section'], required: true },
  section: { type: String, default: '' },
  count: { type: Number, default: 0 },
}, { versionKey: false }).index({ date: 1, type: 1, section: 1 }, { unique: true }));
const Visitor = mongoose.model('Visitor', new mongoose.Schema({
  visitorId: { type: String, required: true, unique: true },
  ipAddress: { type: String, required: true },
  city: { type: String, default: '' },
  region: { type: String, default: '' },
  country: { type: String, default: '' },
  visitCount: { type: Number, default: 0 },
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 },
}, { versionKey: false }));
const User = mongoose.model('User', new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  ipAddress: { type: String, required: true },
  city: { type: String, default: '' },
  region: { type: String, default: '' },
  country: { type: String, default: '' },
  loginCount: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
}, { versionKey: false }));
const trackedSections = new Set(['home', 'work', 'game', 'about', 'stack', 'contact']);
const memoryAnalytics = new Map();
const memoryVisitors = new Map();
const memoryUsers = new Map();

app.disable('x-powered-by');
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);
app.use((req, res, next) => {
  const origin = req.get('Origin');
  const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0];
  const requestOrigin = `${forwardedProto || req.protocol}://${req.get('host')}`;
  const isLocalDevelopmentOrigin = process.env.NODE_ENV !== 'production'
    && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');

  if (origin && origin !== requestOrigin && !frontendOrigins.has(origin) && !isLocalDevelopmentOrigin) {
    return res.status(403).json({ error: 'This website is not allowed to access the API.' });
  }
  if (origin) {
    res.vary('Origin');
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    return res.sendStatus(204);
  }
  return next();
});
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

async function getPortfolio() {
  if (mongoose.connection.readyState !== 1) return memoryPortfolio;
  const saved = await Portfolio.findOne({ key: 'main' }).lean();
  return saved || memoryPortfolio;
}

async function savePortfolio(nextPortfolio) {
  memoryPortfolio = nextPortfolio;
  if (mongoose.connection.readyState === 1) {
    await Portfolio.findOneAndUpdate(
      { key: 'main' },
      { $set: { profile: nextPortfolio.profile, projects: nextPortfolio.projects } },
      { upsert: true, new: true, runValidators: true },
    );
  }
  return nextPortfolio;
}

function requireAdmin(req, res, next) {
  try {
    const token = req.cookies.ezra_admin;
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    req.admin = jwt.verify(token, tokenSecret);
    return next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

function requireVisitor(req, res, next) {
  try {
    const token = req.cookies.ezra_visitor;
    if (!token) return res.status(401).json({ error: 'Sign in with Google to view this portfolio.' });
    const visitor = jwt.verify(token, tokenSecret);
    if (!mongoose.isValidObjectId(visitor.userId)) {
      return res.status(401).json({ error: 'Your Google session has expired. Please sign in again.' });
    }
    if (mongoose.connection.readyState === 1) {
      return User.findById(visitor.userId).select('_id').lean()
        .then((user) => user
          ? (req.visitor = visitor, next())
          : res.status(401).json({ error: 'Your account is no longer available. Please sign in again.' }))
        .catch(next);
    }
    if (process.env.MONGODB_URI) {
      return res.status(503).json({ error: 'User storage is unavailable. Please try again later.' });
    }
    if (!memoryUsers.has(visitor.userId)) {
      return res.status(401).json({ error: 'Your account is no longer available. Please sign in again.' });
    }
    req.visitor = visitor;
    return next();
  } catch {
    return res.status(401).json({ error: 'Your Google session has expired. Please sign in again.' });
  }
}

function requireDatabase(req, res, next) {
  if (process.env.MONGODB_URI && mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'MongoDB is unavailable. Changes were not saved; check Atlas network access and try again.' });
  }
  return next();
}

app.get('/api/health', (_req, res) => {
  const storage = mongoose.connection.readyState === 1
    ? 'mongodb'
    : process.env.MONGODB_URI ? 'unavailable' : 'memory';
  res.json({ ok: storage !== 'unavailable', storage });
});

app.get('/api/auth/config', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    googleConfigured: googleOAuthConfigured
      && Boolean(process.env.MONGODB_URI)
      && mongoose.connection.readyState === 1,
  });
});

app.get('/api/portfolio', requireVisitor, requireDatabase, async (_req, res, next) => {
  try {
    res.set('Cache-Control', 'private, no-store');
    res.json(await getPortfolio());
  } catch (error) {
    next(error);
  }
});

app.post('/api/contact', requireVisitor, requireDatabase, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim();
    const message = String(req.body.message || '').trim();
    if (!name || !email || !message || name.length > 100 || email.length > 200 || message.length > 4000) {
      return res.status(400).json({ error: 'Please provide a name, valid email, and a message under 4,000 characters.' });
    }
    const entry = { name, email, message, createdAt: new Date() };
    if (mongoose.connection.readyState === 1) await Message.create(entry);
    else memoryMessages.unshift(entry);
    return res.status(201).json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/analytics/view', requireVisitor, async (req, res, next) => {
  const { type, section, visitorId } = req.body || {};
  if ((type !== 'page' && type !== 'section')
    || (type === 'section' && !trackedSections.has(section))
    || (type === 'page' && section !== undefined)
    || typeof visitorId !== 'string'
    || !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(visitorId)) {
    return res.status(400).json({ error: 'Analytics event is invalid.' });
  }
  try {
    const date = new Date().toISOString().slice(0, 10);
    const eventSection = type === 'section' ? section : '';
    const ipAddress = req.ip?.replace(/^::ffff:/, '');
    if (!ipAddress) return res.status(400).json({ error: 'Visitor IP address is unavailable.' });
    const location = geoip.lookup(ipAddress);
    if (mongoose.connection.readyState === 1) {
      await Promise.all([
        Analytics.findOneAndUpdate(
        { date, type, section: eventSection },
        { $inc: { count: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
        ),
        ...(type === 'page' ? [Visitor.findOneAndUpdate(
          { visitorId },
          {
            $set: {
              ipAddress,
              city: location?.city || '',
              region: location?.region || '',
              country: location?.country || '',
              lastSeen: new Date(),
            },
            $setOnInsert: { firstSeen: new Date() },
            $inc: { visitCount: 1 },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )] : []),
      ]);
    } else if (process.env.MONGODB_URI) {
      return res.status(503).json({ error: 'Analytics storage is unavailable.' });
    } else {
      const key = `${date}:${type}:${eventSection}`;
      memoryAnalytics.set(key, (memoryAnalytics.get(key) || 0) + 1);
      if (type === 'page') {
        const visitor = memoryVisitors.get(visitorId);
        memoryVisitors.set(visitorId, {
          visitorId,
          ipAddress,
          city: location?.city || '',
          region: location?.region || '',
          country: location?.country || '',
          visitCount: (visitor?.visitCount || 0) + 1,
          firstSeen: visitor?.firstSeen || new Date(),
          lastSeen: new Date(),
        });
      }
    }
    return res.sendStatus(204);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/admin/login', async (req, res) => {
  const username = process.env.ADMIN_USERNAME;
  if (!username || !adminPasswordHash) return res.status(503).json({ error: 'Admin credentials are not configured.' });
  const valid = typeof req.body.username === 'string'
    && typeof req.body.password === 'string'
    && req.body.username === username
    && await bcrypt.compare(req.body.password, adminPasswordHash);
  if (!valid) return res.status(401).json({ error: 'That username and password did not match.' });
  const token = jwt.sign({ username }, tokenSecret, { expiresIn: '12h' });
  const secureCookie = process.env.NODE_ENV === 'production'
    || req.get('x-forwarded-proto')?.split(',')[0] === 'https';
  res.cookie('ezra_admin', token, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: adminCookieSameSite,
    maxAge: 12 * 60 * 60 * 1000,
  });
  return res.json({ username });
});

app.post('/api/admin/logout', (req, res) => {
  const secureCookie = process.env.NODE_ENV === 'production'
    || req.get('x-forwarded-proto')?.split(',')[0] === 'https';
  res.clearCookie('ezra_admin', { httpOnly: true, sameSite: adminCookieSameSite, secure: secureCookie });
  res.status(204).end();
});

app.get('/api/admin/session', requireAdmin, (req, res) => res.json({ username: req.admin.username }));

app.get('/api/auth/google', (req, res) => {
  if (!googleOAuthConfigured) {
    return res.status(503).json({ error: 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.' });
  }
  if (!process.env.MONGODB_URI || mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Google sign-in requires an available MongoDB database to save user accounts.' });
  }
  const state = require('node:crypto').randomBytes(32).toString('hex');
  res.cookie('ezra_google_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || req.get('x-forwarded-proto')?.split(',')[0] === 'https',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
  });
  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizationUrl.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
  }).toString();
  return res.redirect(authorizationUrl.toString());
});

app.get('/api/auth/google/callback', requireDatabase, async (req, res, next) => {
  const frontendUrl = (process.env.FRONTEND_URL || [...frontendOrigins][0] || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  const redirectWithError = (reason) => res.redirect(`${frontendUrl}/?auth_error=${encodeURIComponent(reason)}`);
  const secureCookie = process.env.NODE_ENV === 'production'
    || req.get('x-forwarded-proto')?.split(',')[0] === 'https';
  const expectedState = req.cookies.ezra_google_state;
  res.clearCookie('ezra_google_state', { httpOnly: true, secure: secureCookie, sameSite: 'lax' });

  if (!googleOAuthConfigured || !process.env.MONGODB_URI || mongoose.connection.readyState !== 1) return redirectWithError('not_configured');
  if (req.query.error) return redirectWithError('cancelled');
  if (typeof req.query.code !== 'string' || typeof req.query.state !== 'string'
    || !expectedState || req.query.state !== expectedState) {
    return redirectWithError('invalid_state');
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: req.query.code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || typeof tokens.access_token !== 'string') {
      return redirectWithError('google_failed');
    }

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleProfile = await profileResponse.json();
    if (!profileResponse.ok || typeof googleProfile.sub !== 'string'
      || typeof googleProfile.name !== 'string' || typeof googleProfile.email !== 'string'
      || googleProfile.email_verified !== true) {
      return redirectWithError('profile_unavailable');
    }

    const ipAddress = req.ip?.replace(/^::ffff:/, '');
    if (!ipAddress) return redirectWithError('ip_unavailable');
    const location = geoip.lookup(ipAddress);
    const now = new Date();
    const user = await User.findOneAndUpdate(
      { googleId: googleProfile.sub },
      {
        $set: {
          name: googleProfile.name,
          email: googleProfile.email,
          ipAddress,
          city: location?.city || '',
          region: location?.region || '',
          country: location?.country || '',
          lastSeen: now,
        },
        $setOnInsert: { createdAt: now },
        $inc: { loginCount: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    );

    const visitorToken = jwt.sign({ userId: user._id.toString() }, tokenSecret, { expiresIn: '30d' });
    res.cookie('ezra_visitor', visitorToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: adminCookieSameSite,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return res.redirect(frontendUrl);
  } catch (error) {
    console.error('Google sign-in failed:', error);
    return next(error);
  }
});

app.get('/api/auth/session', requireDatabase, requireVisitor, async (req, res, next) => {
  try {
    const user = mongoose.connection.readyState === 1
      ? await User.findById(req.visitor.userId).select('name email').lean()
      : memoryUsers.get(req.visitor.userId);
    if (!user) return res.status(401).json({ error: 'Your account is no longer available. Please sign in again.' });
    return res.json({ user: { name: user.name, email: user.email } });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/logout', (req, res) => {
  const secureCookie = process.env.NODE_ENV === 'production'
    || req.get('x-forwarded-proto')?.split(',')[0] === 'https';
  res.clearCookie('ezra_visitor', { httpOnly: true, secure: secureCookie, sameSite: adminCookieSameSite });
  return res.sendStatus(204);
});

app.post('/api/admin/cv', requireAdmin, cvUpload.single('cv'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose a PDF CV to upload.' });
    if (!req.file.originalname.toLowerCase().endsWith('.pdf')
      || !req.file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      return res.status(415).json({ error: 'Upload a valid PDF file.' });
    }
    if (!cloudinaryConfigured) {
      return res.status(503).json({ error: 'CV uploads are unavailable. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on the backend.' });
    }
    const bytes = req.file.buffer;
    const result = await new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder: 'portfolio', resource_type: 'raw', use_filename: true, unique_filename: true },
        (error, uploadedFile) => {
          if (error) return reject(error);
          if (!uploadedFile?.secure_url) return reject(new Error('Cloudinary did not return a CV URL.'));
          return resolve(uploadedFile);
        },
      );
      Readable.from([bytes]).pipe(upload).on('error', reject);
    });
    return res.status(201).json({ url: result.secure_url });
  } catch (error) {
    console.error('Cloudinary CV upload failed:', error);
    if (error.http_code) {
      return res.status(502).json({ error: error.message || 'Cloudinary could not store the CV.' });
    }
    return next(error);
  }
});

app.get('/api/cv', requireVisitor, requireDatabase, async (_req, res, next) => {
  try {
    const portfolio = await getPortfolio();
    const cvUrl = portfolio.profile?.cvUrl;
    if (!cvUrl) return res.status(404).json({ error: 'No CV is available for download.' });
    if (!cloudinaryConfigured) {
      return res.status(503).json({ error: 'CV downloads are unavailable. Configure Cloudinary on the backend.' });
    }
    let parsedUrl;
    try {
      parsedUrl = new URL(cvUrl);
    } catch {
      return res.status(404).json({ error: 'No CV is available for download.' });
    }
    if (parsedUrl.protocol !== 'https:'
      || parsedUrl.hostname !== 'res.cloudinary.com'
      || !parsedUrl.pathname.startsWith(`/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/`)) {
      return res.status(404).json({ error: 'No CV is available for download.' });
    }

    const file = await fetch(parsedUrl);
    if (!file.ok) return res.status(502).json({ error: 'The CV could not be downloaded right now.' });
    const contentLength = Number(file.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > 10 * 1024 * 1024) {
      return res.status(502).json({ error: 'The stored CV is larger than the allowed download size.' });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length > 10 * 1024 * 1024 || !bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      return res.status(502).json({ error: 'The stored CV is not a valid PDF.' });
    }
    res.set({
      'Cache-Control': 'public, max-age=300',
      'Content-Disposition': 'attachment; filename="CV.pdf"',
      'Content-Length': String(bytes.length),
      'Content-Type': 'application/pdf',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.send(bytes);
  } catch (error) {
    console.error('CV download failed:', error);
    return next(error);
  }
});

app.post('/api/admin/uploads', requireAdmin, imageUpload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose an image to upload.' });
    if (!cloudinaryConfigured) {
      return res.status(503).json({ error: 'Image uploads are unavailable. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on the backend.' });
    }
    const bytes = req.file.buffer;
    const format = bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ? 'jpg'
      : bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? 'png'
        : bytes.subarray(0, 6).toString('ascii').match(/^GIF8[79]a$/) ? 'gif'
          : bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP' ? 'webp'
            : null;
    if (!format) return res.status(415).json({ error: 'Use a JPEG, PNG, WebP, or GIF image.' });
    const result = await new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder: 'portfolio', resource_type: 'image' },
        (error, uploadedImage) => {
          if (error) return reject(error);
          if (!uploadedImage?.secure_url) return reject(new Error('Cloudinary did not return an image URL.'));
          return resolve(uploadedImage);
        },
      );
      Readable.from([bytes]).pipe(upload).on('error', reject);
    });
    return res.status(201).json({ url: result.secure_url });
  } catch (error) {
    console.error('Cloudinary image upload failed:', error);
    if (error.http_code) {
      return res.status(502).json({ error: error.message || 'Cloudinary could not store the image.' });
    }
    return next(error);
  }
});

app.put('/api/admin/portfolio', requireAdmin, requireDatabase, async (req, res, next) => {
  try {
    const profile = req.body.profile;
    const projects = req.body.projects;
    if (!profile || typeof profile !== 'object' || !Array.isArray(projects) || projects.length > 50) {
      return res.status(400).json({ error: 'Portfolio data is invalid.' });
    }
    const saved = await savePortfolio({ profile, projects });
    return res.json(saved);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/messages', requireAdmin, requireDatabase, async (_req, res, next) => {
  try {
    const messages = mongoose.connection.readyState === 1
      ? await Message.find().sort({ createdAt: -1 }).limit(100).lean()
      : memoryMessages;
    return res.json(messages);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/analytics', requireAdmin, requireDatabase, async (_req, res, next) => {
  try {
    const today = new Date();
    const dates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() - (6 - index));
      return date.toISOString().slice(0, 10);
    });
    const [records, visitors] = mongoose.connection.readyState === 1
      ? await Promise.all([
        Analytics.find().lean(),
        Visitor.find().sort({ lastSeen: -1 }).limit(100).lean(),
      ])
      : [
        [...memoryAnalytics].map(([key, count]) => {
          const [date, type, section] = key.split(':');
          return { date, type, section, count };
        }),
        [...memoryVisitors.values()].sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 100),
      ];
    const pageViews = dates.map((date) => ({
      date,
      count: records.filter((record) => record.type === 'page' && record.date === date)
        .reduce((total, record) => total + record.count, 0),
    }));
    const sectionViews = [...trackedSections].map((section) => ({
      section,
      count: records.filter((record) => record.type === 'section' && record.section === section)
        .reduce((total, record) => total + record.count, 0),
    })).sort((a, b) => b.count - a.count);
    return res.json({
      totalPageViews: records.filter((record) => record.type === 'page')
        .reduce((total, record) => total + record.count, 0),
      totalSectionViews: records.filter((record) => record.type === 'section')
        .reduce((total, record) => total + record.count, 0),
      totalUniqueVisitors: mongoose.connection.readyState === 1
        ? await Visitor.countDocuments()
        : memoryVisitors.size,
      pageViews,
      sectionViews,
      visitors,
    });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/admin/analytics', requireAdmin, requireDatabase, async (_req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      await Promise.all([Analytics.deleteMany({}), Visitor.deleteMany({})]);
    } else {
      memoryAnalytics.clear();
      memoryVisitors.clear();
    }
    return res.sendStatus(204);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/users', requireAdmin, requireDatabase, async (_req, res, next) => {
  try {
    const users = mongoose.connection.readyState === 1
      ? await User.find().select('name email ipAddress city region country loginCount createdAt lastSeen')
        .sort({ lastSeen: -1 }).limit(200).lean()
      : [...memoryUsers.values()].sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 200);
    return res.json(users);
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/admin/users/:id', requireAdmin, requireDatabase, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'User not found.' });
  try {
    if (mongoose.connection.readyState === 1) {
      const deleted = await User.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'User not found.' });
    } else if (!memoryUsers.delete(req.params.id)) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.sendStatus(204);
  } catch (error) {
    return next(error);
  }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));

const clientBuild = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild));
app.get('*path', (_req, res, next) => {
  res.sendFile(path.join(clientBuild, 'index.html'), (error) => {
    if (error) next();
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    const message = _req.path === '/api/admin/cv' ? 'CV files must be 10 MB or smaller.' : 'Images must be 5 MB or smaller.';
    return res.status(413).json({ error: message });
  }
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

async function startServer() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        dbName: process.env.MONGODB_DB || 'portfolio',
        serverSelectionTimeoutMS: 10000,
      });
      console.log('Connected to MongoDB yebo!');
    } catch {
      console.error('MongoDB unavailable; using temporary in-memory storage. Check the URI and Atlas network access.');
    }
  }
  app.listen(port, () => console.log(`Portfolio API listening today on http://localhost:${port}`));
}

startServer();