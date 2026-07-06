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