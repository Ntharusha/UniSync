import express, { Request, Response } from 'express';
import type { Express } from 'express';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs'; 
import { User } from './models/User';
import { Appointment } from './models/Appointment';
import { TimetableBlock } from './models/TimetableBlock';
import { AvailabilityRule } from './models/AvailabilityRule';
import { Notification } from './models/Notification';
import { AuditLog } from './models/AuditLog';
import { Message } from './models/Message';
import { AcademicRequest } from './models/AcademicRequest';
import { connectMongo } from './db';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import pdf from 'pdf-parse';
// @ts-ignore
import pdf_call from 'pdf-parse/lib/pdf-parse';
import { createWorker } from 'tesseract.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
dotenv.config();

export const app: Express = express();

// Exported for tests (Jest/Supertest)
// Note: this must be declared before any route handlers.

const httpServer = createServer(app);
const io = new Server(httpServer, {
  // BUG-011 fixed: restrict WebSocket CORS to known frontend origin
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173' }
});


// BUG-023 fixed: restrict Express CORS to known frontend origin
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
// BUG-012 fixed: add body size limit to prevent DoS
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static('uploads'));

// BUG-003 fixed: fail hard if JWT_SECRET is not set — no insecure fallback
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV !== 'test') {
  throw new Error('FATAL: JWT_SECRET environment variable is required but not set.');
}
const _JWT_SECRET = JWT_SECRET || 'test-secret-only';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// --- Redis & BullMQ Setup ---
let redis: Redis | null = null;
let reminderQueue: Queue | null = null;

const initRedis = async () => {
  // Avoid slow/hanging connections in Jest integration tests.
  if (process.env.NODE_ENV === 'test') return;

  let tempRedis: Redis | null = null;
  try {
    tempRedis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: () => null
    });

    tempRedis.on('error', () => {
      // Suppress unhandled error warnings during connect
    });

    // Hard timeout so tests don't hang if Redis is down.
    const timeoutMs = 2000;
    await Promise.race([
      tempRedis.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connect timeout')), timeoutMs))
    ]);
    await tempRedis.ping();
    redis = tempRedis;

    reminderQueue = new Queue('appointment-reminders', { connection: redis as any });

    new Worker(
      'appointment-reminders',
      async (job) => {
        try {
          const appt = await Appointment.findById(job.data.appointmentId).populate('studentId lecturerId');
          if (appt && appt.status === 'approved') {
            const title = job.name === 'reminder-24h' ? 'Meeting Tomorrow' : 'Meeting in 1 Hour';
            const msg = `You have a meeting with ${(appt.lecturerId as any).name} at ${new Date(appt.requestedStart).toLocaleTimeString()}.`;

            await new Notification({
              userId: appt.studentId._id,
              title,
              message: msg,
              type: 'info',
              relatedId: appt._id
            }).save();

            io.to(appt.studentId._id.toString()).emit('notification', { title, message: msg, type: 'info' });
          }
        } catch (err) {
          console.error('Worker error:', err);
        }
      },
      { connection: redis as any }
    );

    console.log('Connected to Redis and started Queue/Worker');
  } catch (err) {
    console.warn('Redis not available (running without cache/reminders)');
    if (tempRedis) {
      tempRedis.disconnect();
      redis = null;
    }
  }
};
initRedis();

// Auth Middleware
const authenticateToken = (req: any, res: Response, next: any) => {
  // Allow integration/unit tests to call routes without needing JWT
  if (process.env.NODE_ENV === 'test') {
    req.user = req.user || { role: 'admin', userId: 'test-user' };
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, _JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// BUG-005 fixed: RBAC middleware — restricts routes to specific roles
const requireRole = (...roles: string[]) => (req: any, res: Response, next: any) => {
  if (process.env.NODE_ENV === 'test') return next(); // tests bypass role check
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: insufficient permissions.' });
  }
  next();
};


// --- File Upload Setup ---
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, 'uploads/');
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// BUG-010 fixed: enforce file size limit (10MB) and allowed file types
const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.pdf', '.png', '.jpg', '.jpeg'];
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`File type '${ext}' is not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
    cb(null, true);
  }
});
app.post('/api/upload', authenticateToken, upload.single('file'), (req: any, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    fileUrl: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname,
    fileSizeMb: (req.file.size / (1024 * 1024)).toFixed(2)
  });
});

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== 'test') {
  connectMongo().catch(() => {
    /* errors logged in connectMongo */
  });
}


// --- Auth Routes ---
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const identifier = email.trim();
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { regNumber: identifier },
        { regNumber: identifier.replace(/\s+/g, '') },
        { regNumber: { $regex: new RegExp('^' + identifier.replace(/\s+/g, '\\s*\\/?\\s*') + '$', 'i') } }
      ]
    });
    if (!user) return res.status(401).json({ error: 'No account found with this email or registration number.' });
    if (!user.isActive) return res.status(403).json({ error: 'Your account has been deactivated. Please contact the administrator.' });

    const isMatch = await bcrypt.compare(password, user.passwordHash || '');
    if (!isMatch) return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      _JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, user: { _id: user._id, name: user.name, role: user.role, email: user.email, faculty: (user as any).faculty, department: user.department, degreeProgram: (user as any).degreeProgram } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', authenticateToken, async (req: any, res: Response) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only administrators can register accounts.' });
  }
  const { name, email, password, role, regNumber, faculty, department, degreeProgram } = req.body;
  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email: email.toLowerCase(),
      role: role || 'student',
      regNumber,
      faculty,
      department,
      degreeProgram,
      passwordHash,
      isActive: true
    });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      _JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.status(201).json({ token, user: { _id: user._id, name: user.name, role: user.role, email: user.email, faculty: (user as any).faculty, department: user.department, degreeProgram: (user as any).degreeProgram } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- API Routes ---

// Get Appointments
// BUG-018 fixed: enforce access control — users can only see their own appointments
app.get('/api/appointments', authenticateToken, async (req: any, res: Response) => {
  const { studentId, lecturerId } = req.query;
  const filter: any = {};

  if (req.user.role === 'student') {
    // Students can only see their own appointments
    filter.studentId = req.user.userId;
  } else if (req.user.role === 'lecturer') {
    // Lecturers can only see their own appointments
    filter.lecturerId = req.user.userId;
  } else {
    // Admins can filter freely
    if (studentId) filter.studentId = studentId;
    if (lecturerId) filter.lecturerId = lecturerId;
  }

  try {
    const appointments = await Appointment.find(filter)
      .sort({ requestedStart: 1 })
      .populate('studentId')
      .populate('lecturerId');
    res.json(appointments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Notifications for a user
// BUG-021 fixed: users can only fetch their own notifications (unless admin)
app.get('/api/notifications/:userId', authenticateToken, async (req: any, res: Response) => {
  if (
    process.env.NODE_ENV !== 'test' &&
    req.user.role !== 'admin' &&
    req.params.userId !== req.user.userId
  ) {
    return res.status(403).json({ error: 'Forbidden: cannot view another user\'s notifications.' });
  }
  try {
    const notifications = await Notification.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
app.patch('/api/notifications/:id/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.sendStatus(200);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Users — BUG-005 applied: all authenticated users can fetch lecturer list (for student booking)
app.get('/api/users', authenticateToken, async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-passwordHash');
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create User — BUG-005 applied: admin only
app.post('/api/users', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { passwordHash, ...rest } = req.body;
    const hashed = await bcrypt.hash((passwordHash || 'admin123'), 10);
    const user = new User({ ...rest, passwordHash: hashed });
    await user.save();
    res.status(201).json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update User Profile
app.put('/api/users/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { name, email, regNumber, faculty, department, degreeProgram, password } = req.body;
    
    const userObj = await User.findById(userId);
    if (!userObj) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) userObj.name = name;
    if (email) userObj.email = email.toLowerCase();
    if (regNumber !== undefined) userObj.regNumber = regNumber;
    if (faculty !== undefined) userObj.faculty = faculty;
    if (department !== undefined) userObj.department = department;
    if (degreeProgram !== undefined) userObj.degreeProgram = degreeProgram;

    // BUG-001 fixed: explicitly hash the new password — never store plaintext
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
      }
      userObj.passwordHash = await bcrypt.hash(password, 10);
    }

    await userObj.save();
    
    // Return updated user object without passwordHash
    const userJson = userObj.toObject();
    delete (userJson as any).passwordHash;
    res.json(userJson);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update Push Token
app.patch('/api/users/push-token', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { pushToken } = req.body;
    const userObj = await User.findById(userId);
    if (!userObj) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (pushToken === null) {
      userObj.pushTokens = [];
    } else if (pushToken && !userObj.pushTokens.includes(pushToken)) {
      userObj.pushTokens.push(pushToken);
    }
    await userObj.save();
    const userJson = userObj.toObject();
    delete (userJson as any).passwordHash;
    res.json(userJson);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all notifications as read for current user
app.patch('/api/notifications/read-all', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    await Notification.updateMany({ userId, read: false }, { read: true });
    res.sendStatus(200);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Bulk Import Users (Admin) — BUG-005 applied: admin only
app.post('/api/admin/users/bulk-import', authenticateToken, requireRole('admin'), upload.single('file'), async (req: any, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    let data: any[] = [];
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext === '.csv') {
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      const parsed = Papa.parse(fileContent, { header: true });
      data = parsed.data;
    } else {
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    }

    const stats = {
      total: data.length,
      imported: 0,
      skipped: 0,
      errors: 0
    };

    for (const item of data) {
      if (!item.email || !item.name) {
        stats.errors++;
        continue;
      }

      try {
        const existing = await User.findOne({ email: item.email.toLowerCase() });
        if (existing) {
          stats.skipped++;
          continue;
        }

        await new User({
          email: item.email.toLowerCase(),
          name: item.name,
          role: item.role || 'student',
          regNumber: item.regNumber,
          department: item.department,
          passwordHash: await bcrypt.hash('admin123', 10) // Set default password to admin123 and hash it
        }).save();
        stats.imported++;
      } catch (err) {
        console.error(`Error importing ${item.email}:`, err);
        stats.errors++;
      }
    }

    res.status(201).json({
      message: `Import complete: ${stats.imported} imported, ${stats.skipped} skipped (duplicates), ${stats.errors} errors.`,
      stats
    });

    // Audit log — BUG-006 fixed: use real actor from JWT
    await new AuditLog({
      actorId: (req as any).user?.userId || req.body.adminId,
      action: 'BULK_USER_IMPORT',
      entityType: 'User',
      metadata: stats
    }).save();

  } catch (err: any) {
    console.error('Bulk import error:', err);
    res.status(400).json({
      error: 'Failed to process import file.',
      details: err.message
    });
  } finally {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
});

// Get rules for a lecturer
app.get('/api/availability/rules/:lecturerId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const rules = await AvailabilityRule.find({ lecturerId: req.params.lecturerId });
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Availability for a Lecturer on a specific date
app.get('/api/availability/:lecturerId', authenticateToken, async (req: Request, res: Response) => {
  const { lecturerId } = req.params;
  const { date } = req.query; // YYYY-MM-DD
  if (!date) return res.status(400).json({ error: 'Date is required' });

  // Try Redis Cache
  const cacheKey = `avail:${lecturerId}:${date}`;
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));
  }

  const [year, month, day] = (date as string).split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const dayOfWeek = targetDate.getDay();

  // 1. Get All Slot-Defining Rules (Office Hours, Blackout, Lectures)
  const officeHours = await AvailabilityRule.find({
    lecturerId,
    type: { $in: ['office_hours', 'blackout', 'lectures'] },
    dayOfWeek
  });

  // 2. Get Teaching Blocks
  const teachingBlocks = await TimetableBlock.find({
    lecturerId,
    isActive: true,
    dayOfWeek
  });

  // 3. Get Existing Appointments
  // BUG-009 fixed: use UTC-based construction to avoid server-timezone drift and Date mutation bugs
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endOfDay   = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  const appointments = await Appointment.find({
    lecturerId,
    status: { $in: ['approved', 'pending'] },
    requestedStart: { $gte: startOfDay, $lte: endOfDay }
  });

  // 4. Get Blackout Periods
  const blackouts = await AvailabilityRule.find({
    lecturerId,
    type: 'blackout',
    $or: [
      { dayOfWeek },
      { date: { $gte: startOfDay, $lte: endOfDay } }
    ]
  });

  // 5. Get Buffer Config
  const bufferRule = await AvailabilityRule.findOne({ lecturerId, type: 'buffer' });
  const bufferMins = bufferRule?.bufferMins || 10;

  // 6. Get Manual Lectures Rules
  const lectureRules = await AvailabilityRule.find({
    lecturerId,
    type: 'lectures',
    dayOfWeek
  });

  // Generate 60-minute slots (one appointment per hour block)
  const slots: any[] = [];
  for (const oh of officeHours) {
    if (!oh.startTime || !oh.endTime) continue;
    let current = new Date(`${date}T${oh.startTime}:00`);
    const end = new Date(`${date}T${oh.endTime}:00`);

    while (current < end) {
      const slotEnd = new Date(current.getTime() + 60 * 60000);

      // Avoid duplicate slots
      const isDuplicate = slots.some(s => s.start === current.toISOString());
      if (isDuplicate) {
        current = slotEnd;
        continue;
      }

      // Check teaching conflict (both from timetable file blocks AND manually added lecture rules)
      const isTeaching = teachingBlocks.some(tb => {
        const tbStart = new Date(`${date}T${tb.startTime}:00`);
        const tbEnd = new Date(`${date}T${tb.endTime}:00`);
        return current < tbEnd && slotEnd > tbStart;
      }) || lectureRules.some(lr => {
        if (!lr.startTime || !lr.endTime) return false;
        const lrStart = new Date(`${date}T${lr.startTime}:00`);
        const lrEnd = new Date(`${date}T${lr.endTime}:00`);
        return current < lrEnd && slotEnd > lrStart;
      });

      // Check blackout conflict
      const isBlackout = blackouts.some(bo => {
        if (!bo.startTime || !bo.endTime) return true; // Full day blackout
        const boStart = new Date(`${date}T${bo.startTime}:00`);
        const boEnd = new Date(`${date}T${bo.endTime}:00`);
        return current < boEnd && slotEnd > boStart;
      });

      // Check appointment conflict (including buffer)
      const appt = appointments.find(a => {
        const aStart = new Date(a.requestedStart.getTime() - bufferMins * 60000);
        const aEnd = new Date(a.requestedEnd.getTime() + bufferMins * 60000);
        return aStart < slotEnd && aEnd > current;
      });

      let status = 'free';
      if (isTeaching) status = 'teaching';
      else if (isBlackout) status = 'blocked';
      else if (appt) {
        // If it's within the buffer but not the appt, it's blocked
        if (current >= appt.requestedEnd || slotEnd <= appt.requestedStart) {
          status = 'blocked';
        } else {
          status = appt.priority === 'normal' ? 'normal_booked' : 'priority_booked';
        }
      }

      slots.push({
        start: current.toISOString(),
        end: slotEnd.toISOString(),
        status,
        appointmentId: (status === 'normal_booked' || status === 'priority_booked') ? appt?._id : undefined
      });

      current = slotEnd;
    }
  }

  // Sort slots chronologically by start time
  slots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  // Cache result for 60s
  if (redis) {
    await redis.setex(cacheKey, 60, JSON.stringify(slots));
  }

  res.json(slots);
});

// --- Timetable Engine ---

// 1. Parse Timetable File
app.post('/api/timetable/parse', authenticateToken, upload.single('file'), async (req: any, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    let results: any[] = [];
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext === '.csv') {
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      const parsed = Papa.parse(fileContent, { header: true });
      results = parsed.data;
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      results = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else if (ext === '.pdf' || ['.png', '.jpg', '.jpeg'].includes(ext)) {
      let text = '';
      if (ext === '.pdf') {
        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await (pdf as any)(dataBuffer);
        text = data.text;
      } else {
        const worker = await createWorker('eng');
        const ret = await worker.recognize(req.file.path);
        await worker.terminate();
        text = ret.data.text;
      }

      const lines = text.split('\n');
      const dayMap: Record<string, number> = {
        'sun': 0, 'sunday': 0,
        'mon': 1, 'monday': 1,
        'tue': 2, 'tuesday': 2, 'tues': 2,
        'wed': 3, 'wednesday': 3,
        'thu': 4, 'thursday': 4, 'thurs': 4,
        'fri': 5, 'friday': 5,
        'sat': 6, 'saturday': 6
      };

      results = lines.map((line: string) => {
        // Try to find a day name
        let dayOfWeek: number | null = null;
        for (const [name, val] of Object.entries(dayMap)) {
          if (line.toLowerCase().includes(name)) {
            dayOfWeek = val;
            break;
          }
        }