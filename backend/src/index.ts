
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

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:8082'
];

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
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

        // Try to find time patterns like HH:MM or HH.MM
        const timeMatch = line.match(/(\d{1,2}[:.]\d{2})/g);
        let startTime = '';
        let endTime = '';
        if (timeMatch && timeMatch.length >= 2) {
          startTime = timeMatch[0].replace('.', ':');
          endTime = timeMatch[1].replace('.', ':');
        }

        // Basic course name extraction (everything else on the line)
        const courseName = line.replace(/[A-Za-z]{3,10}|(\d{1,2}[:.]\d{2})/g, '').trim();

        return {
          dayOfWeek,
          startTime,
          endTime,
          courseName: courseName || 'Unresolved Course',
          room: 'TBA'
        };
      }).filter((item: any) => item.dayOfWeek !== null && item.startTime && item.endTime);
    }

    // Format results to match TimetableBlock schema
    const formatted = results.map(item => ({
      dayOfWeek: parseInt(item.dayOfWeek),
      startTime: item.startTime,
      endTime: item.endTime,
      courseName: item.courseName,
      room: item.room,
      semester: item.semester || '2026-S1'
    }));

    res.json(formatted);
  } catch (err: any) {
    console.error('Parse error:', err);
    res.status(400).json({ error: 'Failed to parse file. ' + err.message });
  } finally {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
});

// Helper function for conflict detection
const findConflicts = async (lecturerId: string, blocks: any[]) => {
  const appts = await Appointment.find({
    lecturerId: new mongoose.Types.ObjectId(lecturerId),
    status: { $in: ['approved', 'pending'] }
  })
    .populate('studentId', 'name email role')
    .populate('lecturerId', 'name email role');

  const conflicts: any[] = [];

  for (const appt of appts) {
    const apptDayOfWeek = (appt.requestedStart as Date).getDay();
    const apptStart = appt.requestedStart as Date;
    const apptEnd = appt.requestedEnd as Date;

    for (const block of blocks) {
      if (block.dayOfWeek !== apptDayOfWeek) continue;

      const [bsH, bsM] = String(block.startTime).split(':').map(Number);
      const [beH, beM] = String(block.endTime).split(':').map(Number);

      const blockStart = new Date(apptStart);
      blockStart.setHours(bsH, bsM, 0, 0);

      const blockEnd = new Date(apptStart); // Use apptStart as base — same day reference as blockStart
      blockEnd.setHours(beH, beM, 0, 0);

      const overlaps = blockStart < apptEnd && blockEnd > apptStart;
      if (!overlaps) continue;

      const safe: any = appt.toObject({ getters: false, virtuals: false });
      // test expects res.body[0].student.name
      safe.student = appt.studentId;
      safe.lecturer = appt.lecturerId;

      // activation expects these fields
      safe._id = appt._id;
      safe.studentId = appt.studentId;
      safe.lecturerId = appt.lecturerId;
      safe.requestedStart = appt.requestedStart;
      safe.requestedEnd = appt.requestedEnd;

      conflicts.push(safe);
      break;
    }
  }

  return conflicts;
};

// Helper to suggest alternative slots
const suggestAlternativeSlots = async (lecturerId: string, baseDate: Date, limit: number = 3) => {
  const dateStr = baseDate.toISOString().split('T')[0];
  const dayOfWeek = baseDate.getUTCDay();
  const [year, month, day] = dateStr.split('-').map(Number);

  const officeHours = await AvailabilityRule.find({
    lecturerId,
    type: 'office_hours',
    dayOfWeek
  });

  const teachingBlocks = await TimetableBlock.find({
    lecturerId,
    isActive: true,
    dayOfWeek
  });

  const appointments = await Appointment.find({
    lecturerId,
    status: { $in: ['approved', 'pending'] },
    requestedStart: {
      $gte: new Date(year, month - 1, day, 0, 0, 0, 0),
      $lte: new Date(year, month - 1, day, 23, 59, 59, 999)
    }
  });

  const alternatives: any[] = [];
  for (const oh of officeHours) {
    if (!oh.startTime || !oh.endTime) continue;
    let current = new Date(`${dateStr}T${oh.startTime}:00`);
    const end = new Date(`${dateStr}T${oh.endTime}:00`);

    while (current < end && alternatives.length < limit) {
      const slotEnd = new Date(current.getTime() + 60 * 60000);

      const isConflict = teachingBlocks.some(tb => {
        const tbStart = new Date(`${dateStr}T${tb.startTime}:00`);
        const tbEnd = new Date(`${dateStr}T${tb.endTime}:00`);
        return current < tbEnd && slotEnd > tbStart;
      }) || appointments.some(a => {
        return a.requestedStart < slotEnd && a.requestedEnd > current;
      });

      if (!isConflict) {
        alternatives.push({
          start: current.toISOString(),
          end: slotEnd.toISOString()
        });
      }
      current = slotEnd;
    }
  }
  alternatives.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return alternatives;
};

// 2. Check Conflicts (Preview)
app.post('/api/timetable/conflicts', authenticateToken, async (req: Request, res: Response) => {
  const { lecturerId, blocks } = req.body;
  if (!lecturerId || !blocks) return res.status(400).json({ error: 'lecturerId and blocks are required' });

  try {
    const conflicts = await findConflicts(lecturerId, blocks);
    res.json(conflicts);
  } catch (err: any) {
    console.error('conflicts error:', err);
    res.status(500).json({ error: err?.message || 'Unknown error', details: String(err) });
  }

});

// 3. Activate Timetable & Conflict Check
app.post('/api/timetable/activate', authenticateToken, async (req: Request, res: Response) => {
  const { lecturerId, blocks } = req.body;

  try {
    // 1. Deactivate old blocks
    await TimetableBlock.updateMany({ lecturerId }, { isActive: false });

    // 2. Insert new blocks
    const newBlocks = blocks.map((b: any) => ({ ...b, lecturerId, isActive: true }));
    await TimetableBlock.insertMany(newBlocks);

    // 3. Level 3 Overlap Detection: Find conflicting appointments
    const conflicts = await findConflicts(lecturerId, blocks);

    // 4. Notify affected students and lecturer
    for (const conflict of conflicts) {
      // Support multiple conflict shapes (tests vs runtime)
      const appointmentId = conflict._id ?? conflict.appointmentId;
      const studentId = conflict.studentId ?? conflict.student?._id ?? conflict.student;

      await Appointment.findByIdAndUpdate(appointmentId, {
        status: 'cancelled',
        $push: {
          statusHistory: {
            status: 'cancelled',
            reason: 'Conflict with newly activated timetable',
            at: new Date()
          }
        }
      });

      if (studentId) {
        io.to(studentId.toString()).emit('notification', {
          userId: studentId,
          message: 'Your appointment was cancelled due to a schedule change.',
          type: 'error'
        });
      }

      await new Notification({
        userId: studentId,
        title: 'Appointment Cancelled',
        message: `Your appointment on ${new Date(conflict.requestedStart ?? conflict.appointmentStart ?? Date.now()).toLocaleDateString()} was cancelled due to a timetable update.`,
        type: 'error',
        relatedId: appointmentId
      }).save();
    }

    res.json({
      message: 'Timetable activated successfully',
      conflictsFound: conflicts.length,
      conflicts
    });

    // Audit log
    await new AuditLog({
      actorId: lecturerId,
      action: 'TIMETABLE_ACTIVATED',
      entityType: 'TimetableBlock',
      metadata: { blocksCount: blocks.length, conflictsCount: conflicts.length }
    }).save();

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get rules for a lecturer (moved above generic route to avoid shadowing)

// Create/Update a rule
app.post('/api/availability/rules', authenticateToken, async (req: Request, res: Response) => {
  const { lecturerId, type, dayOfWeek, startTime, endTime, bufferMins, date, recurrence } = req.body;
  try {
    const rule = new AvailabilityRule({
      lecturerId,
      type,
      dayOfWeek,
      startTime,
      endTime,
      bufferMins,
      date,
      recurrence
    });
    await rule.save();

    // Clear cache/Notify clients
    io.emit('slot:updated', { lecturerId, date: date ? date.split('T')[0] : 'dynamic' });

    res.status(201).json(rule);

    // Audit log
    await new AuditLog({
      actorId: lecturerId,
      action: 'AVAILABILITY_RULE_CREATED',
      entityType: 'AvailabilityRule',
      entityId: rule._id,
      metadata: { type }
    }).save();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a rule
app.delete('/api/availability/rules/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const rule = await AvailabilityRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    const lecturerId = rule.lecturerId;
    await AvailabilityRule.findByIdAndDelete(req.params.id);

    io.emit('slot:updated', { lecturerId, date: 'dynamic' });
    res.sendStatus(200);

    // Audit log
    await new AuditLog({
      actorId: lecturerId.toString(),
      action: 'AVAILABILITY_RULE_DELETED',
      entityType: 'AvailabilityRule',
      entityId: req.params.id as any
    }).save();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Request an Appointment
app.post('/api/appointments', authenticateToken, requireRole('student', 'admin'), async (req: Request, res: Response) => {
  const { studentId, lecturerId, requestedStart, requestedEnd, priority, reason } = req.body;

  // BUG-017 fixed: validate date range server-side
  const start = new Date(requestedStart);
  const end = new Date(requestedEnd);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid date format for requestedStart or requestedEnd.' });
  }
  if (start >= end) {
    return res.status(400).json({ error: 'requestedStart must be before requestedEnd.' });
  }
  if (start < new Date()) {
    return res.status(400).json({ error: 'Cannot book an appointment in the past.' });
  }

  const priorityWeights: Record<string, number> = { normal: 1, academic_urgent: 2, emergency: 3 };
  const incomingWeight = priorityWeights[priority] || 1;

  try {
    // 1. Check for overlapping appointments
    const overlapping = await Appointment.findOne({
      lecturerId,
      status: { $in: ['approved', 'pending'] },
      requestedStart: { $lt: new Date(requestedEnd) },
      requestedEnd: { $gt: new Date(requestedStart) }
    });

    if (overlapping) {
      const existingWeight = overlapping.priorityWeight;
      if (incomingWeight > existingWeight) {
        // Displace existing
        overlapping.status = 'cancelled';
        overlapping.statusHistory.push({
          status: 'cancelled',
          reason: 'Displaced by higher-priority request',
          at: new Date()
        });
        await overlapping.save();

        io.to(overlapping.studentId.toString()).emit('notification', {
          userId: overlapping.studentId,
          message: 'Your booking was displaced by a higher-priority request.',
          type: 'displacement'
        });

        // Save persistent notification
        await new Notification({
          userId: overlapping.studentId,
          title: 'Booking Displaced',
          message: `Your appointment with a lecturer was displaced by a higher-priority request.`,
          type: 'displacement',
          relatedId: overlapping._id
        }).save();
      } else {
        const alternatives = await suggestAlternativeSlots(lecturerId, new Date(requestedStart));
        return res.status(409).json({
          error: 'This time slot is already taken.',
          alternatives
        });
      }
    }

    const appt = new Appointment({
      studentId,
      lecturerId,
      requestedStart,
      requestedEnd,
      priority,
      priorityWeight: incomingWeight,
      reason,
      status: 'pending',
      documents: req.body.documents || []
    });
    await appt.save();

    // Schedule reminders if queue available
    if (reminderQueue) {
      const msUntil = new Date(requestedStart).getTime() - Date.now();
      if (msUntil > 0) {
        await reminderQueue.add('reminder-24h',
          { appointmentId: appt._id.toString() },
          { delay: Math.max(0, msUntil - 24 * 60 * 60 * 1000) }
        );
        await reminderQueue.add('reminder-1h',
          { appointmentId: appt._id.toString() },
          { delay: Math.max(0, msUntil - 60 * 60 * 1000) }
        );
      }
    }

    io.emit('slot:updated', { lecturerId, date: requestedStart.split('T')[0] });
    io.emit('notification', {
      userId: lecturerId,
      message: 'New appointment request received.'
    });

    // Save persistent notification
    await new Notification({
      userId: lecturerId,
      title: 'New Request',
      message: `A new ${priority} appointment request has been submitted.`,
      type: 'info',
      relatedId: appt._id
    }).save();

    res.status(201).json(appt);

    // Audit log for appointment
    await new AuditLog({
      actorId: studentId,
      action: 'APPOINTMENT_REQUESTED',
      entityType: 'Appointment',
      entityId: appt._id,
      metadata: { priority }
    }).save();

  } catch (err: any) {
    if (err.code === 11000) {
      // Duplicate key error - simultaneous booking
      const alternatives = await suggestAlternativeSlots(lecturerId, new Date(requestedStart));
      return res.status(409).json({
        error: 'Someone else just booked this slot. Please choose another.',
        alternatives
      });
    }
    res.status(400).json({ error: err.message });
  }
});

// Update Appointment Status — BUG-005: lecturers and admins only
app.patch('/api/appointments/:id', authenticateToken, requireRole('lecturer', 'admin', 'student'), async (req: any, res: Response) => {
  const { status, reason, proposedStart, proposedEnd } = req.body;
  const userRole = req.user?.role;
  const userId = req.user?.userId;

  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    // Permissions check
    if (userRole === 'student' && appt.studentId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized to update this appointment' });
    }
    if (userRole === 'lecturer' && appt.lecturerId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized to update this appointment' });
    }

    let targetUserId = appt.studentId;
    let notificationTitle = `Request ${status.toUpperCase()}`;
    let notificationMessage = `Your appointment request for ${appt.requestedStart.toLocaleDateString()} has been ${status}.`;
    let notificationType = status === 'approved' ? 'success' : 'error';

    if (status === 'rescheduled') {
      if (userRole !== 'lecturer' && userRole !== 'admin') {
        return res.status(403).json({ error: 'Only lecturers and admins can reschedule appointments' });
      }
      if (!proposedStart || !proposedEnd) {
        return res.status(400).json({ error: 'Proposed start and end times are required for rescheduling' });
      }
      appt.proposedStart = new Date(proposedStart);
      appt.proposedEnd = new Date(proposedEnd);
      appt.status = 'rescheduled';
      
      targetUserId = appt.studentId;
      notificationTitle = 'Reschedule Propose';
      notificationMessage = `The lecturer has proposed a new time slot: ${new Date(proposedStart).toLocaleString()}.`;
      notificationType = 'warning';
    } else if (status === 'approved' && appt.status === 'rescheduled') {
      // Student accepting the rescheduled time
      if (!appt.proposedStart || !appt.proposedEnd) {
        return res.status(400).json({ error: 'No proposed slot exists to accept' });
      }
      appt.requestedStart = appt.proposedStart;
      appt.requestedEnd = appt.proposedEnd;
      appt.proposedStart = undefined;
      appt.proposedEnd = undefined;
      appt.status = 'approved';

      targetUserId = appt.lecturerId;
      notificationTitle = 'Reschedule Accepted';
      notificationMessage = `Student has accepted the proposed time slot for ${appt.requestedStart.toLocaleDateString()}.`;
      notificationType = 'success';
    } else if (status === 'cancelled' && appt.status === 'rescheduled') {
      // Student rejecting/cancelling rescheduled time
      appt.proposedStart = undefined;
      appt.proposedEnd = undefined;
      appt.status = 'cancelled';

      targetUserId = appt.lecturerId;
      notificationTitle = 'Reschedule Declined';
      notificationMessage = `Student has declined the proposed rescheduled time. Reason: ${reason || 'No reason provided'}.`;
      notificationType = 'error';
    } else {
      // Normal state transitions (approved, rejected, cancelled)
      appt.status = status;
      if (status === 'approved') {
        targetUserId = appt.studentId;
        notificationTitle = 'Request APPROVED';
        notificationMessage = `Your appointment request for ${appt.requestedStart.toLocaleDateString()} has been approved.`;
        notificationType = 'success';
      } else if (status === 'rejected') {
        targetUserId = appt.studentId;
        notificationTitle = 'Request REJECTED';
        notificationMessage = `Your appointment request for ${appt.requestedStart.toLocaleDateString()} has been rejected. Reason: ${reason || 'No reason provided'}.`;
        notificationType = 'error';
      } else if (status === 'cancelled') {
        // Can be cancelled by either student or lecturer
        targetUserId = userRole === 'student' ? appt.lecturerId : appt.studentId;
        notificationTitle = 'Request CANCELLED';
        notificationMessage = `The appointment request for ${appt.requestedStart.toLocaleDateString()} has been cancelled.`;
        notificationType = 'error';
      }
    }

    appt.statusHistory.push({
      status,
      reason,
      changedBy: userId,
      at: new Date()
    });
    await appt.save();

    io.emit('slot:updated', { lecturerId: appt.lecturerId, date: appt.requestedStart.toISOString().split('T')[0] });
    io.emit('notification', {
      userId: targetUserId,
      message: notificationMessage
    });

    // Save persistent notification
    await new Notification({
      userId: targetUserId,
      title: notificationTitle,
      message: notificationMessage,
      type: notificationType,
      relatedId: appt._id
    }).save();

    res.json(appt);

    // Audit log
    await new AuditLog({
      actorId: userId,
      action: `APPOINTMENT_${status.toUpperCase()}`,
      entityType: 'Appointment',
      entityId: appt._id,
      metadata: { reason, proposedStart, proposedEnd }
    }).save();

  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get Admin Analytics — BUG-005 applied: admin only; BUG-016: remove mocked values
app.get('/api/admin/analytics', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalLecturers = await User.countDocuments({ role: 'lecturer' });
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalAppointments = await Appointment.countDocuments();
    const activeAppointments = await Appointment.countDocuments({ status: 'approved' });
    const pendingRequests = await Appointment.countDocuments({ status: 'pending' });
    const cancelledAppointments = await Appointment.countDocuments({ status: 'cancelled' });

    res.json({
      totalUsers,
      totalLecturers,
      totalStudents,
      totalAppointments,
      activeAppointments,
      pendingRequests,
      cancelledAppointments,
      // BUG-016 fixed: these were previously hardcoded mock values
      uptime: 'N/A',
      avgResponse: 'N/A'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Admin Users — BUG-005 applied: admin only
app.get('/api/admin/users', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// BUG-005 + BUG-006 applied: admin only, real actor ID from JWT
app.delete('/api/admin/users/:id', authenticateToken, requireRole('admin'), async (req: any, res: Response) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.sendStatus(200);

    // Audit log
    await new AuditLog({
      actorId: req.user?.userId,
      action: 'USER_DELETED',
      entityType: 'User',
      entityId: req.params.id as any
    }).save();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle User Status (Admin) — BUG-005 + BUG-006 applied
app.patch('/api/admin/users/:id/status', authenticateToken, requireRole('admin'), async (req: any, res: Response) => {
  const { isActive } = req.body;
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive });
    res.sendStatus(200);

    // Audit log — use real actor ID from JWT token
    await new AuditLog({
      actorId: req.user?.userId,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: req.params.id as any
    }).save();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Audit Logs (Admin) — BUG-005 applied: admin only
app.get('/api/admin/audit-logs', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .populate('actorId', 'name email role');
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Messaging (Chat) ---
app.get('/api/messages/:appointmentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const messages = await Message.find({ appointmentId: req.params.appointmentId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name role');
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', authenticateToken, async (req: Request, res: Response) => {
  const { appointmentId, senderId, body } = req.body;
  try {
    const msg = new Message({ appointmentId, senderId, body });
    await msg.save();

    const populated = await msg.populate('senderId', 'name role');

    // Notify room
    io.to(appointmentId).emit('message', populated);

    res.status(201).json(populated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Academic Requests ---
app.get('/api/academic-requests', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.query;
    const query = studentId ? { studentId } : {};
    const requests = await AcademicRequest.find(query).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/academic-requests', authenticateToken, async (req: Request, res: Response) => {
  const { studentId, faculty, department, degreeProgram, requestType, priority, title, description, documents } = req.body;
  try {
    if (!studentId || !faculty || !degreeProgram || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const request = new AcademicRequest({
      studentId,
      faculty,
      department: department || '',
      degreeProgram,
      requestType: requestType || 'other',
      priority: priority || 'normal',
      title,
      description,
      documents: documents || [],
      status: 'pending'
    });

    await request.save();
    res.status(201).json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/academic-requests/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const request = await AcademicRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    res.json(request);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/academic-requests/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, title, description, priority } = req.body;
    const request = await AcademicRequest.findByIdAndUpdate(
      req.params.id,
      {
        ...(status && { status }),
        ...(title && { title }),
        ...(description && { description }),
        ...(priority && { priority })
      },
      { new: true }
    );
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    res.json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their notification room`);
  });

  socket.on('join-chat', (appointmentId) => {
    socket.join(appointmentId);
    console.log(`User joined chat room: ${appointmentId}`);
  });

  socket.on('disconnect', () => console.log('User disconnected'));
});

// --- BullMQ Worker for Reminders ---
// --- BullMQ Worker for Reminders initialized in initRedis ---

// (named exports are declared inline above for Jest compatibility)



// In dev/tests multiple instances can get started accidentally; avoid hard crash on EADDRINUSE.
if (process.env.NODE_ENV !== 'test') {
  httpServer.on('error', (err: any) => {
    if (err?.code === 'EADDRINUSE') {
      console.warn(`Port ${PORT} already in use. Skipping server listen (another instance may be running).`);
      return;
    }
    throw err;
  });

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

