import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './models/User';
import { AvailabilityRule } from './models/AvailabilityRule';
import { TimetableBlock } from './models/TimetableBlock';
import { Appointment } from './models/Appointment';
import { Notification } from './models/Notification';
import { Message } from './models/Message';
import { AuditLog } from './models/AuditLog';
import { AcademicRequest } from './models/AcademicRequest';
import dotenv from 'dotenv';
import { connectMongo, connectMongoAtlasOnly } from './db';

dotenv.config();

const seedAtlasOnly = process.env.SEED_TARGET === 'atlas';

async function seed() {
  if (seedAtlasOnly) {
    await connectMongoAtlasOnly();
  } else {
    await connectMongo();
  }

  // Clear existing data
  await User.deleteMany({});
  await AvailabilityRule.deleteMany({});
  await TimetableBlock.deleteMany({});
  await Appointment.deleteMany({});
  await Notification.deleteMany({});
  await Message.deleteMany({});
  await AuditLog.deleteMany({});
  await AcademicRequest.deleteMany({});
  console.log('Cleared existing data');

  // ─── STUDENTS ────────────────────────────────────────────────────────────────
  const student1 = await User.create({
    name: 'Saman Perera',
    email: 'saman@vau.ac.lk',
    role: 'student',
    regNumber: '2021 / ASP / 52',
    faculty: 'Faculty of Applied Science',
    department: 'Department of Physical Science',
    degreeProgram: 'BSc in Applied Mathematics and Computing',
    isActive: true,
    passwordHash: await bcrypt.hash('admin123', 10)
  });

  const student2 = await User.create({
    name: 'Kamala Silva',
    email: 'kamala@vau.ac.lk',
    role: 'student',
    regNumber: '2021 / ICT / 34',
    faculty: 'Faculty of Technology',
    department: 'Department of Information Technology',
    degreeProgram: 'BSc in Information Technology',
    isActive: true,
    passwordHash: await bcrypt.hash('admin123', 10)
  });

  const student3 = await User.create({
    name: 'Nadeeka Fernando',
    email: 'nadeeka@vau.ac.lk',
    role: 'student',
    regNumber: '2020 / ASP / 12',
    faculty: 'Faculty of Applied Science',
    department: 'Department of Bio-science',
    degreeProgram: 'Bachelor of Science Honours in Environmental Science',
    isActive: true,
    passwordHash: await bcrypt.hash('admin123', 10)
  });

  // ─── LECTURERS ───────────────────────────────────────────────────────────────
  const lecturer1 = await User.create({
    name: 'Dr. Priya Jayasinghe',
    email: 'priya@vau.ac.lk',
    role: 'lecturer',
    department: 'Department of Physical Science',
    isActive: true,
    passwordHash: await bcrypt.hash('admin123', 10)
  });

  const lecturer2 = await User.create({
    name: 'Prof. Rajan Kumar',
    email: 'rajan@vau.ac.lk',
    role: 'lecturer',
    department: 'Department of Computer Science',
    isActive: true,
    passwordHash: await bcrypt.hash('admin123', 10)
  });

  const lecturer3 = await User.create({
    name: 'Dr. Amali Wickramasinghe',
    email: 'amali@vau.ac.lk',
    role: 'lecturer',
    department: 'Department of Information Technology',
    isActive: true,
    passwordHash: await bcrypt.hash('admin123', 10)
  });

  const lecturer4 = await User.create({
    name: 'Mr. Suresh Vithanage',
    email: 'suresh@vau.ac.lk',
    role: 'lecturer',
    department: 'Department of Business Administration',
    isActive: true,
    passwordHash: await bcrypt.hash('admin123', 10)
  });

  // ─── ADMIN ───────────────────────────────────────────────────────────────────
  await User.create({
    name: 'Nimal Admin',
    email: 'nimal@vau.ac.lk',
    role: 'admin',
    isActive: true,
    passwordHash: await bcrypt.hash('admin123', 10)
  });

  console.log('✅ Users created');

  // ─── AVAILABILITY RULES ──────────────────────────────────────────────────────
  // DR. PRIYA — Mon–Fri
  // Mixed 1-hour slots: Office hours, Lectures, Blackouts, Office hours
  for (let day = 1; day <= 5; day++) {
    await AvailabilityRule.insertMany([
      { lecturerId: lecturer1._id, type: 'office_hours', dayOfWeek: day, startTime: '08:00', endTime: '09:00' },
      { lecturerId: lecturer1._id, type: 'lectures', dayOfWeek: day, startTime: '09:00', endTime: '10:00' },
      { lecturerId: lecturer1._id, type: 'blackout', dayOfWeek: day, startTime: '10:00', endTime: '11:00' },
      { lecturerId: lecturer1._id, type: 'office_hours', dayOfWeek: day, startTime: '11:00', endTime: '12:00' },
    ]);
  }

  // PROF. RAJAN — Mon–Fri
  // Mixed 1-hour slots: Office hours, Lectures, Blackouts, Office hours
  for (let day = 1; day <= 5; day++) {
    await AvailabilityRule.insertMany([
      { lecturerId: lecturer2._id, type: 'office_hours', dayOfWeek: day, startTime: '13:00', endTime: '14:00' },
      { lecturerId: lecturer2._id, type: 'lectures', dayOfWeek: day, startTime: '14:00', endTime: '15:00' },
      { lecturerId: lecturer2._id, type: 'blackout', dayOfWeek: day, startTime: '15:00', endTime: '16:00' },
      { lecturerId: lecturer2._id, type: 'office_hours', dayOfWeek: day, startTime: '16:00', endTime: '17:00' },
    ]);
  }

  // DR. AMALI — Mon–Fri
  // Mixed 1-hour slots: Office hours, Lectures, Blackouts, Office hours, Lectures
  for (let day = 1; day <= 5; day++) {
    await AvailabilityRule.insertMany([
      { lecturerId: lecturer3._id, type: 'office_hours', dayOfWeek: day, startTime: '09:00', endTime: '10:00' },
      { lecturerId: lecturer3._id, type: 'lectures', dayOfWeek: day, startTime: '10:00', endTime: '11:00' },
      { lecturerId: lecturer3._id, type: 'blackout', dayOfWeek: day, startTime: '11:00', endTime: '11:30' },
      { lecturerId: lecturer3._id, type: 'office_hours', dayOfWeek: day, startTime: '14:00', endTime: '15:00' },
      { lecturerId: lecturer3._id, type: 'lectures', dayOfWeek: day, startTime: '15:00', endTime: '16:00' },
    ]);
  }

  // MR. SURESH — Mon–Sat
  // Mixed 1-hour/2-hour slots: Office hours, Lectures, Blackout, Office hours, Lectures, Blackout
  for (let day = 1; day <= 6; day++) {
    await AvailabilityRule.insertMany([
      { lecturerId: lecturer4._id, type: 'office_hours', dayOfWeek: day, startTime: '08:00', endTime: '10:00' },
      { lecturerId: lecturer4._id, type: 'lectures', dayOfWeek: day, startTime: '10:00', endTime: '12:00' },
      { lecturerId: lecturer4._id, type: 'blackout', dayOfWeek: day, startTime: '12:00', endTime: '13:00' },
      { lecturerId: lecturer4._id, type: 'office_hours', dayOfWeek: day, startTime: '13:00', endTime: '15:00' },
      { lecturerId: lecturer4._id, type: 'lectures', dayOfWeek: day, startTime: '15:00', endTime: '17:00' },
      { lecturerId: lecturer4._id, type: 'blackout', dayOfWeek: day, startTime: '17:00', endTime: '18:00' },
    ]);
  }

  // Buffer: Prof. Rajan — 15 mins between appointments
  await AvailabilityRule.create({
    lecturerId: lecturer2._id,
    type: 'buffer',
    bufferMins: 15
  });

  console.log('✅ Availability rules created');

  // ─── TIMETABLE BLOCKS ─────────────────────────────────────────────────────
  // Lecturer 1 — Dr. Priya
  await TimetableBlock.insertMany([
    { lecturerId: lecturer1._id, dayOfWeek: 1, startTime: '10:00', endTime: '11:00', courseName: 'BIO2301: Cell Biology', room: 'Lab 3', semester: '2026-S1', isActive: true },
    { lecturerId: lecturer1._id, dayOfWeek: 3, startTime: '09:00', endTime: '10:00', courseName: 'BIO3101: Genetics', room: 'Room A2', semester: '2026-S1', isActive: true },
  ]);

  // Lecturer 2 — Prof. Rajan
  await TimetableBlock.insertMany([
    { lecturerId: lecturer2._id, dayOfWeek: 2, startTime: '13:00', endTime: '14:30', courseName: 'CSC3232: Advanced AI', room: 'Lab 1', semester: '2026-S1', isActive: true },
    { lecturerId: lecturer2._id, dayOfWeek: 4, startTime: '15:00', endTime: '16:30', courseName: 'CSC4101: Machine Learning', room: 'Lab 2', semester: '2026-S1', isActive: true },
  ]);

  // Lecturer 3 — Dr. Amali
  await TimetableBlock.insertMany([
    { lecturerId: lecturer3._id, dayOfWeek: 1, startTime: '09:30', endTime: '11:00', courseName: 'MAT2201: Calculus II', room: 'Room B4', semester: '2026-S1', isActive: true },
    { lecturerId: lecturer3._id, dayOfWeek: 3, startTime: '14:30', endTime: '15:30', courseName: 'MAT3301: Linear Algebra', room: 'Room B2', semester: '2026-S1', isActive: true },
  ]);

  // Lecturer 4 — Mr. Suresh
  await TimetableBlock.insertMany([
    { lecturerId: lecturer4._id, dayOfWeek: 2, startTime: '08:00', endTime: '09:30', courseName: 'PHY1101: Mechanics', room: 'Physics Lab', semester: '2026-S1', isActive: true },
    { lecturerId: lecturer4._id, dayOfWeek: 5, startTime: '10:00', endTime: '12:00', courseName: 'PHY2201: Electromagnetism', room: 'Room C1', semester: '2026-S1', isActive: true },
  ]);

  console.log('✅ Timetable blocks created');

  // Helper functions for seeding relative dates
  function getNextDateForDayOfWeek(dayOfWeek: number, timeStr: string, weeksAhead: number = 0): Date {
    const date = new Date();
    const currentDay = date.getDay(); // 0 (Sun) to 6 (Sat)
    const targetDay = dayOfWeek === 7 ? 0 : dayOfWeek;
    
    let daysDiff = targetDay - currentDay;
    if (daysDiff <= 0) {
      daysDiff += 7;
    }
    daysDiff += weeksAhead * 7;
    
    date.setDate(date.getDate() + daysDiff);
    const [hours, minutes] = timeStr.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  function getPastDateForDayOfWeek(dayOfWeek: number, timeStr: string, weeksAgo: number = 0): Date {
    const date = new Date();
    const currentDay = date.getDay();
    const targetDay = dayOfWeek === 7 ? 0 : dayOfWeek;
    
    let daysDiff = targetDay - currentDay;
    if (daysDiff >= 0) {
      daysDiff -= 7;
    }
    daysDiff -= weeksAgo * 7;
    
    date.setDate(date.getDate() + daysDiff);
    const [hours, minutes] = timeStr.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  // ─── SAMPLE APPOINTMENT REQUESTS ───────────────────────────────────────────
  // 1. Saman & Dr. Priya — Next Monday: 08:30–09:00 (Approved)
  const appt1Start = getNextDateForDayOfWeek(1, '08:30');
  const appt1End = new Date(appt1Start.getTime() + 30 * 60000);
  const appt1 = await Appointment.create({
    studentId: student1._id,
    lecturerId: lecturer1._id,
    requestedStart: appt1Start,
    requestedEnd: appt1End,
    status: 'approved',
    priority: 'normal',
    priorityWeight: 1,
    reason: 'BIO2301 assignment selection',
    description: 'Need help choosing a suitable topic for the Cell Biology review paper.',
    statusHistory: [
      { status: 'pending', at: new Date(Date.now() - 3600000 * 2) },
      { status: 'approved', changedBy: lecturer1._id, reason: 'Approved. Please come prepared with your ideas.', at: new Date(Date.now() - 3600000) }
    ]
  });

  // 2. Kamala & Prof. Rajan — Next Tuesday: 15:00–15:30 (Pending)
  const appt2Start = getNextDateForDayOfWeek(2, '15:00');
  const appt2End = new Date(appt2Start.getTime() + 30 * 60000);
  const appt2 = await Appointment.create({
    studentId: student2._id,
    lecturerId: lecturer2._id,
    requestedStart: appt2Start,
    requestedEnd: appt2End,
    status: 'pending',
    priority: 'academic_urgent',
    priorityWeight: 2,
    reason: 'Advanced AI Project proposal feedback',
    description: 'I would like to discuss my project topic on reinforcement learning.',
    statusHistory: [
      { status: 'pending', at: new Date() }
    ]
  });

  // 3. Nadeeka & Dr. Amali — Next Wednesday: 10:00–10:30 (Approved)
  const appt3Start = getNextDateForDayOfWeek(3, '10:00');
  const appt3End = new Date(appt3Start.getTime() + 30 * 60000);
  const appt3 = await Appointment.create({
    studentId: student3._id,
    lecturerId: lecturer3._id,
    requestedStart: appt3Start,
    requestedEnd: appt3End,
    status: 'approved',
    priority: 'normal',
    priorityWeight: 1,
    reason: 'Calculus II query',
    description: 'Struggling with double integrals over polar coordinates.',
    statusHistory: [
      { status: 'pending', at: new Date(Date.now() - 3600000 * 24) },
      { status: 'approved', changedBy: lecturer3._id, reason: 'Sure, let\'s resolve this.', at: new Date(Date.now() - 3600000 * 23) }
    ]
  });

  // 4. Saman & Mr. Suresh — Next Thursday: 11:00–11:30 (Pending)
  const appt4Start = getNextDateForDayOfWeek(4, '11:00');
  const appt4End = new Date(appt4Start.getTime() + 30 * 60000);
  const appt4 = await Appointment.create({
    studentId: student1._id,
    lecturerId: lecturer4._id,
    requestedStart: appt4Start,
    requestedEnd: appt4End,
    status: 'pending',
    priority: 'normal',
    priorityWeight: 1,
    reason: 'PHY1101 lab report clarification',
    description: 'Looking for a clarification on the error analysis section.',
    statusHistory: [
      { status: 'pending', at: new Date() }
    ]
  });

  // 5. Kamala & Dr. Priya — Next Friday: 09:30–10:00 (Approved)
  const appt5Start = getNextDateForDayOfWeek(5, '09:30');
  const appt5End = new Date(appt5Start.getTime() + 30 * 60000);
  const appt5 = await Appointment.create({
    studentId: student2._id,
    lecturerId: lecturer1._id,
    requestedStart: appt5Start,
    requestedEnd: appt5End,
    status: 'approved',
    priority: 'normal',
    priorityWeight: 1,
    reason: 'Academic advising',
    description: 'Need help choosing final year electives.',
    statusHistory: [
      { status: 'pending', at: new Date(Date.now() - 3600000 * 5) },
      { status: 'approved', changedBy: lecturer1._id, reason: 'Approved, see you then.', at: new Date(Date.now() - 3600000 * 4) }
    ]
  });

  // 6. Nadeeka & Mr. Suresh — Next Saturday: 14:00–14:30 (Approved)
  const appt6Start = getNextDateForDayOfWeek(6, '14:00');
  const appt6End = new Date(appt6Start.getTime() + 30 * 60000);
  const appt6 = await Appointment.create({
    studentId: student3._id,
    lecturerId: lecturer4._id,
    requestedStart: appt6Start,
    requestedEnd: appt6End,
    status: 'approved',
    priority: 'normal',
    priorityWeight: 1,
    reason: 'PHY2201 mock exam query',
    description: 'Need to review some electromagnetism problems.',
    statusHistory: [
      { status: 'pending', at: new Date(Date.now() - 3600000 * 12) },
      { status: 'approved', changedBy: lecturer4._id, reason: 'Bring your workings.', at: new Date(Date.now() - 3600000 * 11) }
    ]
  });

  // 7. Saman & Dr. Amali — Past (1 week ago Monday): 10:30–11:00 (Rejected)
  const appt7Start = getPastDateForDayOfWeek(1, '10:30', 0);
  const appt7End = new Date(appt7Start.getTime() + 30 * 60000);
  const appt7 = await Appointment.create({
    studentId: student1._id,
    lecturerId: lecturer3._id,
    requestedStart: appt7Start,
    requestedEnd: appt7End,
    status: 'rejected',
    priority: 'normal',
    priorityWeight: 1,
    reason: 'Math competition preparation',
    description: 'Need help with advanced algebra concepts.',
    statusHistory: [
      { status: 'pending', at: new Date(appt7Start.getTime() - 3600000 * 24) },
      { status: 'rejected', changedBy: lecturer3._id, reason: 'Out of office during this slot for external meeting', at: new Date(appt7Start.getTime() - 3600000 * 22) }
    ]
  });

  // 8. Kamala & Dr. Amali — Past (1 week ago Wednesday): 15:00–15:30 (Cancelled)
  const appt8Start = getPastDateForDayOfWeek(3, '15:00', 0);
  const appt8End = new Date(appt8Start.getTime() + 30 * 60000);
  const appt8 = await Appointment.create({
    studentId: student2._id,
    lecturerId: lecturer3._id,
    requestedStart: appt8Start,
    requestedEnd: appt8End,
    status: 'cancelled',
    priority: 'normal',
    priorityWeight: 1,
    reason: 'Exam revision discussion',
    description: 'Going over past papers.',
    statusHistory: [
      { status: 'pending', at: new Date(appt8Start.getTime() - 3600000 * 24) },
      { status: 'cancelled', changedBy: student2._id, reason: 'Cancelled by student due to sickness', at: new Date(appt8Start.getTime() - 3600000 * 20) }
    ]
  });

  // 9. Saman & Prof. Rajan — Next Thursday: 14:00–14:30 (Emergency - Pending)
  const appt9Start = getNextDateForDayOfWeek(4, '14:00');
  const appt9End = new Date(appt9Start.getTime() + 30 * 60000);
  const appt9 = await Appointment.create({
    studentId: student1._id,
    lecturerId: lecturer2._id,
    requestedStart: appt9Start,
    requestedEnd: appt9End,
    status: 'pending',
    priority: 'emergency',
    priorityWeight: 3,
    reason: 'Missed AI midterm exam',
    description: 'I was hospitalized and missed the exam. Please see medical certificate attached.',
    documents: [{
      fileUrl: '/uploads/medical_certificate.pdf',
      fileName: 'medical_certificate.pdf',
      fileSizeMb: 1.2,
      uploadedAt: new Date()
    }],
    statusHistory: [
      { status: 'pending', at: new Date() }
    ]
  });

  // ─── SAMPLE NOTIFICATIONS ─────────────────────────────────────────────────
  await Notification.insertMany([
    {
      userId: student1._id,
      title: 'Appointment Approved',
      message: `Your appointment request with Dr. Priya Jayasinghe on ${appt1Start.toLocaleDateString()} at 08:30 has been approved.`,
      type: 'success',
      read: false,
      relatedId: appt1._id
    },
    {
      userId: lecturer2._id,
      title: 'New Urgent Request',
      message: 'Kamala Silva submitted an academic urgent request for project feedback.',
      type: 'info',
      read: false,
      relatedId: appt2._id
    },
    {
      userId: student3._id,
      title: 'Appointment Approved',
      message: `Your appointment request with Dr. Amali Wickramasinghe on ${appt3Start.toLocaleDateString()} at 10:00 has been approved.`,
      type: 'success',
      read: true,
      relatedId: appt3._id
    },
    {
      userId: lecturer2._id,
      title: 'Emergency Request',
      message: 'Saman Perera submitted an emergency request regarding a missed exam.',
      type: 'error',
      read: false,
      relatedId: appt9._id
    }
  ]);

  console.log('✅ Sample appointments and notifications created');

  // ─── SAMPLE MESSAGES ────────────────────────────────────────────────────────
  await Message.insertMany([
    {
      appointmentId: appt1._id,
      senderId: student1._id,
      body: 'Thank you for approving. I will bring three topic ideas for the review paper.',
      readAt: new Date(),
    },
    {
      appointmentId: appt1._id,
      senderId: lecturer1._id,
      body: 'Please also bring your course outline and any prior feedback from BIO2301.',
      readAt: null,
    },
    {
      appointmentId: appt2._id,
      senderId: student2._id,
      body: 'I have a draft proposal document ready. Can we focus on the RL methodology section?',
      readAt: null,
    },
    {
      appointmentId: appt9._id,
      senderId: student1._id,
      body: 'Medical certificate is uploaded. Happy to provide additional documentation if needed.',
      readAt: null,
    },
    {
      appointmentId: appt9._id,
      senderId: lecturer2._id,
      body: 'Received. I will review with the exam board and respond within 48 hours.',
      readAt: null,
    },
  ]);

  console.log('✅ Sample messages created');

  // ─── SAMPLE ACADEMIC REQUESTS ─────────────────────────────────────────────
  await AcademicRequest.insertMany([
    {
      studentId: student1._id.toString(),
      faculty: 'Faculty of Applied Science',
      department: 'Department of Physical Science',
      degreeProgram: 'Bachelor of Science in Applied Mathematics and Computing',
      requestType: 'letter',
      priority: 'normal',
      title: 'Enrollment verification letter',
      description: 'Need an official letter confirming full-time enrollment for scholarship renewal.',
      documents: [],
      status: 'approved',
    },
    {
      studentId: student2._id.toString(),
      faculty: 'Faculty of Technology',
      department: 'Department of Information Technology',
      degreeProgram: 'BSc in Information Technology',
      requestType: 'transcript',
      priority: 'academic_urgent',
      title: 'Interim transcript for internship',
      description: 'Employer requires interim transcript before offer deadline next week.',
      documents: [{
        fileUrl: '/uploads/internship_form.pdf',
        fileName: 'internship_form.pdf',
        fileSizeMb: 0.8,
        uploadedAt: new Date().toISOString(),
      }],
      status: 'pending',
    },
    {
      studentId: student3._id.toString(),
      faculty: 'Faculty of Applied Science',
      department: 'Department of Bio-science',
      degreeProgram: 'Bachelor of Science Honours in Environmental Science',
      requestType: 'course-issue',
      priority: 'normal',
      title: 'Grade discrepancy — ENV3101',
      description: 'Lab component score appears incorrect on the student portal.',
      documents: [],
      status: 'pending',
    },
    {
      studentId: student1._id.toString(),
      faculty: 'Faculty of Applied Science',
      department: 'Department of Physical Science',
      degreeProgram: 'Bachelor of Science in Applied Mathematics and Computing',
      requestType: 'other',
      priority: 'emergency',
      title: 'Exam deferral request',
      description: 'Requesting deferral of final exam due to hospitalization.',
      documents: [{
        fileUrl: '/uploads/medical_certificate.pdf',
        fileName: 'medical_certificate.pdf',
        fileSizeMb: 1.2,
        uploadedAt: new Date().toISOString(),
      }],
      status: 'rejected',
    },
  ]);

  console.log('✅ Sample academic requests created');

  // ─── SAMPLE AUDIT LOGS ────────────────────────────────────────────────────
  await AuditLog.insertMany([
    {
      actorId: lecturer1._id,
      action: 'APPOINTMENT_APPROVED',
      entityType: 'Appointment',
      entityId: appt1._id,
      metadata: { studentEmail: student1.email, slot: 'Mon 08:30' },
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      actorId: lecturer2._id,
      action: 'APPOINTMENT_PENDING_REVIEW',
      entityType: 'Appointment',
      entityId: appt9._id,
      metadata: { priority: 'emergency', studentEmail: student1.email },
      timestamp: new Date(),
    },
    {
      actorId: lecturer3._id,
      action: 'APPOINTMENT_REJECTED',
      entityType: 'Appointment',
      entityId: appt7._id,
      metadata: { reason: 'Out of office during this slot' },
      timestamp: new Date(appt7Start.getTime() - 3600000 * 22),
    },
    {
      actorId: lecturer1._id,
      action: 'TIMETABLE_ACTIVATED',
      entityType: 'TimetableBlock',
      metadata: { semester: '2026-S1', courses: 2 },
      timestamp: new Date(Date.now() - 86400000 * 7),
    },
  ]);

  console.log('✅ Sample audit logs created');

  console.log('─────────────────────────────────────');
  console.log('📋 LOGIN CREDENTIALS (password: admin123)');
  console.log('─────────────────────────────────────');
  console.log('👨‍🎓 STUDENTS:');
  console.log('   saman@vau.ac.lk    — Department of Physical Science');
  console.log('   kamala@vau.ac.lk   — Department of Information Technology');
  console.log('   nadeeka@vau.ac.lk  — Department of Bio-science');
  console.log('');
  console.log('👨‍🏫 LECTURERS:');
  console.log('   priya@vau.ac.lk   — Mon/Wed/Fri: 08:00–12:00');
  console.log('   rajan@vau.ac.lk   — Tue/Thu: 13:00–17:00');
  console.log('   amali@vau.ac.lk   — Mon–Fri: 09:00–11:30 & 14:00–16:00');
  console.log('   suresh@vau.ac.lk  — Mon–Sat: 08:00–18:00 (fullday)');
  console.log('');
  console.log('🛡️  ADMIN:');
  console.log('   nimal@vau.ac.lk');
  console.log('─────────────────────────────────────');

  if (process.env.SEED_DISCONNECT !== 'false') {
    await mongoose.disconnect();
  }
  console.log('✅ Seeding complete!');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
