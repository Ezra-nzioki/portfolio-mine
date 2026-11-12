import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import express from 'express';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cloudinaryPackage from 'cloudinary';
import geoip from 'geoip-lite';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import multer from 'multer';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
const cloudinary = cloudinaryPackage.v2;
const app = express();
const authRouter = express.Router();
const emailAddressPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const port = process.env.PORT || 4000;
const tokenSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const dummyPasswordHash = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 12);
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || (process.env.ADMIN_PASSWORD ? bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12) : '');
const emailCodeSecret = tokenSecret;
const frontendOrigins = new Set((process.env.FRONTEND_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean));
const adminCookieSameSite = process.env.ADMIN_COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'strict');
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
const AdminAccount = mongoose.model('AdminAccount', new mongoose.Schema({
  username: { type: String, required: true, unique: true, maxlength: 100 },
  passwordHash: { type: String, required: true, select: false },
}, { versionKey: false }));
const EmailAccount = mongoose.model('EmailAccount', new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, maxlength: 200 },
  phone: { type: String, unique: true, sparse: true, maxlength: 16 },
  passwordHash: { type: String, required: true, select: false },
  emailVerified: { type: Boolean, default: true },
  phoneVerified: { type: Boolean, default: true },
  emailCodeHash: { type: String, select: false },
  emailCodeExpiresAt: { type: Date, select: false },
  emailCodePurpose: { type: String, select: false },
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
const authAttemptBuckets = new Map();

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
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
  let adminSession;
  try {
    const token = req.cookies.ezra_admin;
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    adminSession = jwt.verify(token, tokenSecret);
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
  if (!mongoose.isValidObjectId(adminSession.adminId)) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Admin authentication is unavailable because MongoDB is not connected.' });
  }
  return AdminAccount.findById(adminSession.adminId).select('username').lean()
    .then((admin) => {
      if (!admin) return res.status(401).json({ error: 'Your admin account is no longer available. Please sign in again.' });
      req.admin = { username: admin.username };
      return next();
    })
    .catch(next);
}

function requireVisitor(req, res, next) {
  try {
    const token = req.cookies.ezra_visitor;
    if (!token) return res.status(401).json({ error: 'Sign in to view this portfolio.' });
    const visitor = jwt.verify(token, tokenSecret);
    if (!mongoose.isValidObjectId(visitor.userId)) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    if (mongoose.connection.readyState === 1) {
      return EmailAccount.findById(visitor.userId).select('_id').lean()
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
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

function limitAuthAttempts(req, res, next) {
  const now = Date.now();
  for (const [ipAddress, bucket] of authAttemptBuckets) {
    if (bucket.expiresAt <= now) authAttemptBuckets.delete(ipAddress);
  }
  const ipAddress = req.ip || 'unknown';
  const bucket = authAttemptBuckets.get(ipAddress);
  if (bucket && bucket.count >= 10) {
    return res.status(429).json({ error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' });
  }
  authAttemptBuckets.set(ipAddress, bucket && bucket.expiresAt > now
    ? { count: bucket.count + 1, expiresAt: bucket.expiresAt }
    : { count: 1, expiresAt: now + 15 * 60 * 1000 });
  return next();
}

function setVisitorSession(req, res, userId, provider = 'email') {
  const secureCookie = process.env.NODE_ENV === 'production'
    || req.get('x-forwarded-proto')?.split(',')[0] === 'https';
  const visitorToken = jwt.sign({ userId: userId.toString(), provider }, tokenSecret, { expiresIn: '30d' });
  res.cookie('ezra_visitor', visitorToken, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: adminCookieSameSite,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

let emailTransporter;

function getEmailProvider() {
  return process.env.EMAIL_PROVIDER?.trim().toLowerCase() || 'smtp';
}

function isEmailDeliveryConfigured() {
  if (getEmailProvider() === 'resend') {
    return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
  }
  if (getEmailProvider() === 'smtp') {
    return Boolean(process.env.EMAIL_USER?.trim() && process.env.EMAIL_PASS?.trim());
  }
  return false;
}

function getEmailTransporter() {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.trim();
  if (!user || !pass) return null;
  if (emailTransporter) return emailTransporter;
  const host = process.env.EMAIL_HOST?.trim();
  const port = Number(process.env.EMAIL_PORT) || 587;
  emailTransporter = nodemailer.createTransport({
    ...(host ? { host, port, secure: process.env.EMAIL_SECURE === 'true' || port === 465 } : { service: 'gmail' }),
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
  return emailTransporter;
}

async function deliverEmail(message) {
  const provider = getEmailProvider();
  if (!isEmailDeliveryConfigured()) {
    const error = new Error('Email delivery is not configured.');
    error.responseCode = 503;
    error.provider = provider;
    throw error;
  }

  if (provider === 'resend') {
    let response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM.trim(),
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (cause) {
      const error = new Error('Could not connect to the Resend API.', { cause });
      error.provider = provider;
      error.code = cause.code || cause.cause?.code;
      throw error;
    }

    if (!response.ok) {
      const error = new Error(`Resend rejected the email request with status ${response.status}.`);
      error.provider = provider;
      error.responseCode = response.status;
      error.code = `RESEND_HTTP_${response.status}`;
      throw error;
    }
    return;
  }

  const transporter = getEmailTransporter();
  if (!transporter) {
    const error = new Error('SMTP email delivery is not configured.');
    error.responseCode = 503;
    error.provider = provider;
    throw error;
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM?.trim() || process.env.EMAIL_USER.trim(),
    ...message,
  });
}

function hashEmailCode(userId, email, purpose, code) {
  return crypto.createHmac('sha256', emailCodeSecret)
    .update(`${userId}:email:${email}:${purpose}:${code}`)
    .digest('hex');
}

async function sendEmailCode(user, purpose) {
  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const codeHash = hashEmailCode(user._id, user.email, purpose, code);
  if (mongoose.connection.readyState === 1) {
    await EmailAccount.findByIdAndUpdate(user._id, {
      $set: { emailCodeHash: codeHash, emailCodeExpiresAt: expiresAt, emailCodePurpose: purpose },
    });
  } else {
    user.emailCodeHash = codeHash;
    user.emailCodeExpiresAt = expiresAt;
    user.emailCodePurpose = purpose;
  }
  try {
    await deliverEmail({
      to: user.email,
      subject: purpose === 'password-reset' ? 'Your password reset code' : 'Your email verification code',
      text: `Your verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
      html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
    });
  } catch (error) {
    if (mongoose.connection.readyState === 1) {
      await EmailAccount.findByIdAndUpdate(user._id, {
        $unset: { emailCodeHash: 1, emailCodeExpiresAt: 1, emailCodePurpose: 1 },
      });
    } else {
      delete user.emailCodeHash;
      delete user.emailCodeExpiresAt;
      delete user.emailCodePurpose;
    }
    throw error;
  }
}

function getEmailDeliveryErrorMessage(error) {
  const provider = error?.provider || getEmailProvider();
  if (error?.responseCode === 503) {
    if (provider === 'resend') {
      return 'Resend email delivery is not configured. Set EMAIL_PROVIDER=resend, RESEND_API_KEY, and EMAIL_FROM in the backend environment.';
    }
    if (provider === 'smtp') {
      return 'SMTP email delivery is not configured. Set EMAIL_USER and EMAIL_PASS in the backend environment.';
    }
    return 'The EMAIL_PROVIDER setting is unsupported. Set it to resend or smtp.';
  }
  if (provider === 'resend') {
    if ([401, 403].includes(Number(error?.responseCode))) {
      return 'Resend rejected the API key or sender. Check RESEND_API_KEY and make sure EMAIL_FROM uses a sender on a verified Resend domain.';
    }
    if (Number(error?.responseCode) === 429) {
      return 'Resend rate-limited the email request. Check your Resend account limits and try again later.';
    }
    if (error?.responseCode) {
      return 'Resend rejected the email request. Check the sender address, recipient restrictions, and Resend account status.';
    }
    return 'The backend could not connect to the Resend API over HTTPS. Check the backend host’s outbound HTTPS access and review its logs for the connection error.';
  }
  if (error?.code === 'EAUTH' || [534, 535].includes(Number(error?.responseCode))) {
    return 'The SMTP provider rejected the login. Check EMAIL_USER and EMAIL_PASS in the backend environment.';
  }
  if (['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'EDNS', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ENOTFOUND', 'EHOSTUNREACH'].includes(error?.code)) {
    return 'The backend could not connect to the SMTP host. Check EMAIL_HOST, EMAIL_PORT, and the backend host’s outbound email restrictions; if SMTP is blocked, use EMAIL_PROVIDER=resend with the Resend HTTPS API.';
  }
  if ([550, 553].includes(Number(error?.responseCode))) {
    return 'The SMTP provider rejected the sender address. Set EMAIL_FROM to the authenticated or provider-verified sender address.';
  }
  return 'The email provider could not deliver the message. Check the provider settings in the production backend environment and review backend logs for the error code.';
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
    if (!name || !email || !message
      || name.length > 100
      || email.length > 200
      || !emailAddressPattern.test(email)
      || message.length > 4000) {
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

app.post('/api/admin/login', limitAuthAttempts, async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Admin sign-in requires an available MongoDB database.' });
  }
  const username = typeof req.body.username === 'string' ? req.body.username : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!username || username.length > 100 || !password || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(401).json({ error: 'That username and password did not match.' });
  }
  try {
    const admin = await AdminAccount.findOne({ username }).select('+passwordHash');
    const valid = await bcrypt.compare(password, admin?.passwordHash || dummyPasswordHash);
    if (!admin || !valid) return res.status(401).json({ error: 'That username and password did not match.' });
    const token = jwt.sign({ adminId: admin._id.toString() }, tokenSecret, { expiresIn: '12h' });
    const secureCookie = process.env.NODE_ENV === 'production'
      || req.get('x-forwarded-proto')?.split(',')[0] === 'https';
    res.cookie('ezra_admin', token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: adminCookieSameSite,
      maxAge: 12 * 60 * 60 * 1000,
    });
    return res.json({ username: admin.username });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/admin/logout', (req, res) => {
  const secureCookie = process.env.NODE_ENV === 'production'
    || req.get('x-forwarded-proto')?.split(',')[0] === 'https';
  res.clearCookie('ezra_admin', { httpOnly: true, sameSite: adminCookieSameSite, secure: secureCookie });
  res.status(204).end();
});

app.get('/api/admin/session', requireAdmin, (req, res) => res.json({ username: req.admin.username }));

app.get('/api/admin/bootstrap', requireAdmin, requireDatabase, async (req, res, next) => {
  try {
    const [portfolio, messages] = await Promise.all([
      getPortfolio(),
      mongoose.connection.readyState === 1
        ? Message.find().sort({ createdAt: -1 }).limit(100).lean()
        : memoryMessages,
    ]);
    res.set('Cache-Control', 'private, no-store');
    return res.json({ username: req.admin.username, portfolio, messages });
  } catch (error) {
    return next(error);
  }
});

authRouter.post(['/api/auth/register', '/register'], limitAuthAttempts, requireDatabase, async (req, res, next) => {
  const requestedName = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200
    || (phone && !/^\+[1-9]\d{7,14}$/.test(phone))) {
    return res.status(400).json({ error: 'Enter a valid email address and, if provided, a phone number in international format.' });
  }
  const name = requestedName || email.split('@')[0];
  if (name.length > 100) return res.status(400).json({ error: 'Your username must be no more than 100 characters.' });
  if (password.length < 6 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'Use a password of at least 6 characters and no more than 72 bytes.' });
  }
  if (!isEmailDeliveryConfigured()) {
    return res.status(503).json({ error: getEmailDeliveryErrorMessage({ responseCode: 503 }) });
  }

  try {
    const ipAddress = req.ip?.replace(/^::ffff:/, '');
    if (!ipAddress) return res.status(400).json({ error: 'Your registration could not be completed. Please try again.' });
    if (mongoose.connection.readyState === 1) {
      if (await EmailAccount.exists({ $or: [{ email }, ...(phone ? [{ phone }] : [])] })) {
        return res.status(409).json({ error: 'An account with this email or phone number already exists.' });
      }
    } else if ([...memoryUsers.values()].some((account) => account.email === email || (phone && account.phone === phone))) {
      return res.status(409).json({ error: 'An account with this email or phone number already exists.' });
    }
    const location = geoip.lookup(ipAddress);
    const accountData = {
      name,
      email,
      ...(phone ? { phone } : {}),
      passwordHash: await bcrypt.hash(password, 12),
      emailVerified: false,
      phoneVerified: true,
      ipAddress,
      city: location?.city || '',
      region: location?.region || '',
      country: location?.country || '',
    };
    const account = mongoose.connection.readyState === 1
      ? await EmailAccount.create(accountData)
      : (() => {
        const now = new Date();
        const memoryAccount = {
          ...accountData,
          _id: new mongoose.Types.ObjectId().toString(),
          loginCount: 0,
          createdAt: now,
          lastSeen: now,
        };
        memoryUsers.set(memoryAccount._id, memoryAccount);
        return memoryAccount;
      })();
    try {
      await sendEmailCode(account, 'registration');
    } catch (error) {
      console.error('Email registration code delivery failed:', {
        provider: error.provider || getEmailProvider(),
        code: error.code || error.cause?.code || 'UNKNOWN',
        responseCode: error.responseCode,
      });
      if (mongoose.connection.readyState === 1) await EmailAccount.findByIdAndDelete(account._id);
      else memoryUsers.delete(account._id.toString());
      return res.status(error.responseCode === 503 ? 503 : 502).json({ error: getEmailDeliveryErrorMessage(error) });
    }
    return res.status(201).json({ message: 'A verification code has been sent to your email address.' });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account with this email or phone number already exists.' });
    return next(error);
  }
});

app.post('/api/auth/email/send-code', limitAuthAttempts, requireDatabase, async (req, res, next) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (!isEmailDeliveryConfigured()) {
    return res.status(503).json({ error: getEmailDeliveryErrorMessage({ responseCode: 503 }) });
  }
  try {
    const account = mongoose.connection.readyState === 1
      ? await EmailAccount.findOne({ email })
      : [...memoryUsers.values()].find((user) => user.email === email);
    if (account) await sendEmailCode(account, account.emailVerified === false ? 'registration' : 'login');
    return res.json({ message: 'If an account exists for that email, a sign-in code has been sent.' });
  } catch (error) {
    console.error('Email sign-in code delivery failed:', {
      provider: error.provider || getEmailProvider(),
      code: error.code || error.cause?.code || 'UNKNOWN',
      responseCode: error.responseCode,
    });
    return res.status(error.responseCode === 503 ? 503 : 502).json({ error: getEmailDeliveryErrorMessage(error) });
  }
});

authRouter.post(['/api/auth/verify', '/verify'], limitAuthAttempts, requireDatabase, async (req, res, next) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const code = typeof req.body.enteredToken === 'string' ? req.body.enteredToken.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200 || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Enter the email address and six-digit verification code.' });
  }
  try {
    const account = mongoose.connection.readyState === 1
      ? await EmailAccount.findOne({ email }).select('+emailCodeHash +emailCodeExpiresAt +emailCodePurpose')
      : [...memoryUsers.values()].find((user) => user.email === email);
    const storedHash = account?.emailCodeHash;
    const purpose = account?.emailCodePurpose;
    const codeIsValid = typeof storedHash === 'string'
      && /^[a-f\d]{64}$/i.test(storedHash)
      && ['registration', 'login'].includes(purpose)
      && account.emailCodeExpiresAt > new Date()
      && crypto.timingSafeEqual(
        Buffer.from(storedHash, 'hex'),
        Buffer.from(hashEmailCode(account._id, email, purpose, code), 'hex'),
      );
    if (!account || !codeIsValid || (purpose === 'registration' && account.emailVerified !== false)
      || (purpose === 'login' && account.emailVerified === false)) {
      return res.status(400).json({ error: 'That email code is invalid or expired. Request a new code and try again.' });
    }

    const ipAddress = req.ip?.replace(/^::ffff:/, '');
    if (!ipAddress) return res.status(400).json({ error: 'Your sign-in could not be completed. Please try again.' });
    const location = geoip.lookup(ipAddress);
    const now = new Date();
    if (mongoose.connection.readyState === 1) {
      const result = await EmailAccount.updateOne({
        _id: account._id,
        emailCodeHash: storedHash,
        emailCodePurpose: purpose,
        emailCodeExpiresAt: { $gt: now },
      }, {
        $set: {
          emailVerified: true,
          ipAddress,
          city: location?.city || '',
          region: location?.region || '',
          country: location?.country || '',
          lastSeen: now,
        },
        $inc: { loginCount: 1 },
        $unset: { emailCodeHash: 1, emailCodeExpiresAt: 1, emailCodePurpose: 1 },
      });
      if (result.modifiedCount !== 1) {
        return res.status(400).json({ error: 'That email code is invalid or expired. Request a new code and try again.' });
      }
    } else {
      Object.assign(account, {
        emailVerified: true,
        ipAddress,
        city: location?.city || '',
        region: location?.region || '',
        country: location?.country || '',
        lastSeen: now,
        loginCount: account.loginCount + 1,
      });
      delete account.emailCodeHash;
      delete account.emailCodeExpiresAt;
      delete account.emailCodePurpose;
    }
    setVisitorSession(req, res, account._id);
    return res.json({ user: { name: account.name, email: account.email, phone: account.phone } });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/forgot-password', limitAuthAttempts, requireDatabase, async (req, res, next) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (!isEmailDeliveryConfigured()) {
    return res.status(503).json({ error: getEmailDeliveryErrorMessage({ responseCode: 503 }) });
  }

  try {
    const user = mongoose.connection.readyState === 1
      ? await EmailAccount.findOne({ email, emailVerified: true })
      : [...memoryUsers.values()].find((account) => account.email === email && account.emailVerified !== false);
    if (user) {
      await sendEmailCode(user, 'password-reset');
    }
    return res.json({ message: 'If a verified account exists for that email, a password reset code has been sent.' });
  } catch (error) {
    console.error('Email password recovery delivery failed:', {
      provider: error.provider || getEmailProvider(),
      code: error.code || error.cause?.code || 'UNKNOWN',
      responseCode: error.responseCode,
    });
    return res.status(error.responseCode === 503 ? 503 : 502).json({ error: getEmailDeliveryErrorMessage(error) });
  }
});

app.post('/api/auth/reset-password', limitAuthAttempts, requireDatabase, async (req, res, next) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const code = typeof req.body.enteredToken === 'string' ? req.body.enteredToken.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200 || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Enter the email address and six-digit reset code.' });
  }
  if (password.length < 6 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'Use a password of at least 6 characters and no more than 72 bytes.' });
  }

  try {
    const user = mongoose.connection.readyState === 1
      ? await EmailAccount.findOne({ email, emailVerified: true })
        .select('+emailCodeHash +emailCodeExpiresAt +emailCodePurpose')
      : [...memoryUsers.values()].find((account) => account.email === email && account.emailVerified === true);
    const storedHash = user?.emailCodeHash;
    const codeIsValid = typeof storedHash === 'string'
      && /^[a-f\d]{64}$/i.test(storedHash)
      && user.emailCodePurpose === 'password-reset'
      && user.emailCodeExpiresAt > new Date()
      && crypto.timingSafeEqual(
        Buffer.from(storedHash, 'hex'),
        Buffer.from(hashEmailCode(user._id, email, 'password-reset', code), 'hex'),
      );
    if (!user || !codeIsValid) {
      return res.status(400).json({ error: 'That password reset code is invalid or expired. Request a new code and try again.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    if (mongoose.connection.readyState === 1) {
      const result = await EmailAccount.updateOne({
        _id: user._id,
        emailCodeHash: storedHash,
        emailCodePurpose: 'password-reset',
        emailCodeExpiresAt: { $gt: new Date() },
        emailVerified: true,
      }, {
        $set: { passwordHash },
        $unset: { emailCodeHash: 1, emailCodeExpiresAt: 1, emailCodePurpose: 1 },
      });
      if (result.modifiedCount !== 1) {
        return res.status(400).json({ error: 'That password reset code is invalid or expired. Request a new code and try again.' });
      }
    } else {
      user.passwordHash = passwordHash;
      delete user.emailCodeHash;
      delete user.emailCodeExpiresAt;
      delete user.emailCodePurpose;
    }
    return res.json({ message: 'Your password has been reset. You can now sign in.' });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/login', limitAuthAttempts, requireDatabase, async (req, res, next) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200
    || !password || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'Enter a valid email address and password.' });
  }

  try {
    const user = mongoose.connection.readyState === 1
      ? await EmailAccount.findOne({ email }).select('+passwordHash')
      : [...memoryUsers.values()].find((account) => account.email === email);
    const passwordMatches = await bcrypt.compare(password, user?.passwordHash || dummyPasswordHash);
    if (!user || !passwordMatches) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    if (user.emailVerified === false) {
      return res.status(403).json({ error: 'Verify your email address before signing in.' });
    }

    const ipAddress = req.ip?.replace(/^::ffff:/, '');
    if (!ipAddress) return res.status(400).json({ error: 'Your sign-in could not be completed. Please try again.' });
    const location = geoip.lookup(ipAddress);
    const now = new Date();
    if (mongoose.connection.readyState === 1) {
      await EmailAccount.findByIdAndUpdate(user._id, {
        $set: {
          ipAddress,
          city: location?.city || '',
          region: location?.region || '',
          country: location?.country || '',
          lastSeen: now,
        },
        $inc: { loginCount: 1 },
      });
    } else {
      Object.assign(user, {
        ipAddress,
        city: location?.city || '',
        region: location?.region || '',
        country: location?.country || '',
        lastSeen: now,
        loginCount: user.loginCount + 1,
      });
    }
    setVisitorSession(req, res, user._id);
    return res.json({ user: { name: user.name, email: user.email, phone: user.phone } });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/auth/google', (_req, res) => res.status(410).json({ error: 'Google sign-in is no longer available.' }));

app.get('/api/auth/google/callback', (_req, res) => res.status(410).json({ error: 'Google sign-in is no longer available.' }));

app.get('/api/auth/session', requireDatabase, requireVisitor, async (req, res, next) => {
  try {
    const user = mongoose.connection.readyState === 1
      ? await EmailAccount.findById(req.visitor.userId).select('name email phone').lean()
      : memoryUsers.get(req.visitor.userId);
    if (!user) return res.status(401).json({ error: 'Your account is no longer available. Please sign in again.' });
    return res.json({ user: { name: user.name, email: user.email, phone: user.phone } });
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
      ? await Promise.all([
        User.find().select('name email ipAddress city region country loginCount createdAt lastSeen')
          .sort({ lastSeen: -1 }).limit(200).lean(),
        EmailAccount.find().select('name email ipAddress city region country loginCount createdAt lastSeen')
          .sort({ lastSeen: -1 }).limit(200).lean(),
      ]).then(([googleUsers, emailUsers]) => [
        ...googleUsers.map((user) => ({ ...user, provider: 'google' })),
        ...emailUsers.map((user) => ({ ...user, provider: 'email' })),
      ].sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen)).slice(0, 200))
      : [
        ...[...memoryUsers.values()].map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        ipAddress: user.ipAddress,
        city: user.city,
        region: user.region,
        country: user.country,
        loginCount: user.loginCount,
        createdAt: user.createdAt,
        lastSeen: user.lastSeen,
        provider: 'email',
        })),
      ]
        .sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 200);
    return res.json(users);
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/admin/users/:id', requireAdmin, requireDatabase, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'User not found.' });
  if (!['email', 'google'].includes(req.query.provider)) {
    return res.status(400).json({ error: 'Specify which visitor account type to delete.' });
  }
  try {
    if (mongoose.connection.readyState === 1) {
      const Model = req.query.provider === 'google' ? User : EmailAccount;
      const deleted = await Model.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'User not found.' });
    } else if (!memoryUsers.delete(req.params.id)) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.sendStatus(204);
  } catch (error) {
    return next(error);
  }
});

app.use(authRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

async function bootstrapAdminAccount() {
  if (await AdminAccount.exists()) return;
  const username = process.env.ADMIN_USERNAME;
  if (!username || !adminPasswordHash) {
    console.warn('No admin account exists. Set ADMIN_USERNAME and ADMIN_PASSWORD_HASH to create the initial MongoDB admin account.');
    return;
  }
  await AdminAccount.create({ username, passwordHash: adminPasswordHash });
  console.log('Created the initial admin account in MongoDB.');
}

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
  if (mongoose.connection.readyState === 1) await bootstrapAdminAccount();
  app.listen(port, () => console.log(`Portfolio API listening today on http://localhost:${port}`));
}

startServer().catch((error) => {
  console.error('Failed to initialize admin authentication; the server was not started.', error);
  process.exitCode = 1;
});

export { authRouter };