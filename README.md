# 🚀 UniSync – Student–Lecturer Appointment Permission System

<<<<<<< HEAD
<<<<<<< Updated upstream
2020/ASP/97 Buddini
2021/Asp/54 Sachini
=======
2020/ASP/97 Buddhini
>>>>>>> Stashed changes
=======
UniSync is a cross-platform (Web + Mobile) intelligent appointment management system designed to streamline student–lecturer communication in universities. It replaces inefficient email-based scheduling with a structured, permission-based workflow powered by real-time systems and timetable intelligence.

---

## 🧠 Core Concept

UniSync introduces a **Timetable-Aware Scheduling System** where lecturers upload their academic timetable, and the system automatically calculates only valid free slots for student appointments. This eliminates conflicts and ensures efficient scheduling.

---

## ⚙️ DevOps & System Architecture

- Infrastructure as Code using Terraform
- Cloud deployment on AWS (EC2 + Elastic IP)
- Containerized services using Docker
- CI/CD automation using GitHub Actions
- MongoDB Atlas for cloud database management
- Real-time communication using Socket.IO
- Observability with Prometheus & Grafana (WIP)

---

## 📱 Platform Support

- Web Application (React + Vite)
- Mobile Application (React Native – Android & iOS)
- Real-time synchronization across devices

---

## 🔑 Key Features

- Role-based system (Student, Lecturer, Admin)
- Smart availability engine (timetable-aware slot generation)
- Timetable upload & automatic parsing (PDF, Excel, CSV, Image OCR)
- Overlap detection and conflict prevention system
- Real-time notifications and messaging
- Lecturer slot management with alternative proposals
- Analytics dashboard for academic insights

---

## 🛠 Tech Stack

Frontend: React, Vite, TailwindCSS, Material UI  
Mobile: React Native (Expo)  
Backend: Node.js, Express.js, Socket.IO  
Database: PostgreSQL / MongoDB (depending on module)  
Cache: Redis  
Cloud: AWS (EC2), S3  
IaC: Terraform  
CI/CD: GitHub Actions  
Monitoring: Prometheus, Grafana  

---

## 📊 System Highlights

- 99.5% uptime target architecture
- <2s web response time design goal
- Real-time slot synchronization (<100ms)
- Timetable parsing (PDF/Excel/Image OCR)
- 500+ concurrent user support design

---

## 🎯 Status

Ongoing development — currently expanding:
- Mobile application enhancements
- Advanced CI/CD automation
- Observability and monitoring system
- AI-based scheduling optimization (future scope)

---

## 📌 Goal

To build a production-grade university scheduling ecosystem demonstrating real-world DevOps, cloud engineering, and distributed system design principles.

---

## 🔗 References

Based on real-world standards including:
- GDPR, FERPA compliance models
- OWASP security guidelines
- AWS cloud architecture best practices

---
>>>>>>> origin/main
