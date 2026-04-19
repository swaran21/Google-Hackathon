# 🚨 ResQNet AI — Intelligent Emergency Response System

> **Google Hackathon 2026** | AI-powered emergency coordination platform connecting patients, ambulances, and hospitals in real-time.

---

## 🎯 Problem Statement

In India, **emergency response time averages 20-30 minutes** — far above the golden hour threshold. Manual dispatch, lack of real-time tracking, and no centralized coordination cost lives every day.

## 💡 Our Solution

**ResQNet AI** is an intelligent emergency coordination platform that:

- 🤖 **AI-Powered Triage** — Classifies emergency severity in seconds
- 🚑 **Smart Dispatch** — Assigns nearest ambulance based on distance, availability & equipment
- 🏥 **Hospital Matching** — Suggests best hospital by proximity, bed availability & ICU capacity
- 📡 **Real-Time Tracking** — Live GPS tracking via WebSocket connections
- 📱 **Instant Notifications** — SMS to patient, push to driver, alerts to emergency contacts
- 🔐 **Role-Based Access** — Separate dashboards for Users, Drivers, Hospitals & Admins

---

## 🏗️ System Architecture

```
┌─────────────┐     ┌──────────────────────────────────────────┐     ┌─────────────┐
│   React UI  │────▶│         Node.js + Express API            │────▶│  MongoDB    │
│  Vite + TW  │◀────│  Socket.io │ JWT Auth │ Rate Limiting    │◀────│  Atlas      │
└─────────────┘     └──────────────────────────────────────────┘     └─────────────┘
                         │          │           │
                    ┌────┴───┐ ┌───┴────┐ ┌───┴────┐
                    │AI Triage│ │ OSRM   │ │ Notif. │
                    │Service  │ │Routing │ │Service │
                    └─────────┘ └────────┘ └────────┘
```

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS 4, Leaflet Maps |
| Backend | Node.js, Express.js, Socket.io |
| Database | MongoDB Atlas, Mongoose ODM |
| Auth | JWT + bcrypt, Role-based (User/Driver/Hospital/Admin) |
| AI | Rule-based triage classifier (Gemini API-ready) |
| Routing | OSRM (Open Source Routing Machine) |
| Real-time | Socket.io WebSockets |
| Notifications | Simulated SMS (Twilio-ready) + Push (FCM-ready) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/resqnet-ai.git
cd resqnet-ai

# Install backend
cd server && npm install

# Install frontend
cd ../client && npm install --legacy-peer-deps
```

### 2. Configure Environment

Create `server/.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
```

### 3. Seed Database

```bash
cd server && npm run seed
```

This creates:
- 🚑 8 ambulances across Hyderabad
- 🏥 6 hospitals (NIMS, Gandhi, Osmania, Apollo, Yashoda, KIMS)
- 👤 Demo accounts for all roles

### 4. Run

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Open **http://localhost:5173**

---

## 👤 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@resqnet.ai | admin123 |
| Driver | driver1@resqnet.ai | driver123 |
| Hospital | nims@resqnet.ai | hospital123 |
| User | user@resqnet.ai | user123 |

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login & get JWT |
| GET | `/api/auth/me` | Get current user |

### Emergency
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/emergency` | Create SOS (triggers AI triage + dispatch + routing) |
| GET | `/api/emergency/:id` | Get emergency details |
| PATCH | `/api/emergency/:id/status` | Update status |

### Ambulance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ambulance` | List all ambulances |
| GET | `/api/ambulance/nearest?lat=&lng=` | Find nearest |
| PATCH | `/api/ambulance/:id/location` | Update GPS location |

### Driver (Simulator)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/driver/status?ambulanceId=` | Get driver assignment |
| POST | `/api/driver/accept` | Accept dispatch |
| POST | `/api/driver/reject` | Reject dispatch |
| POST | `/api/driver/simulate-move` | Simulate GPS movement |

### Hospital
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hospitals/suggest?lat=&lng=` | Get scored suggestions |
| PATCH | `/api/hospitals/:id/beds` | Update bed/ICU counts |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Aggregated stats |
| GET | `/api/admin/notifications` | SMS/push notification log |

---

## 🧠 Smart Algorithms

### Haversine Distance
Calculates great-circle distance between two GPS coordinates for nearest-ambulance ranking.

### Composite Hospital Scoring
```
score = 0.6 × proximityScore + 0.3 × bedAvailability + 0.1 × icuAvailability
```

### AI Triage Classification
Severity 1-5 based on emergency type + keyword analysis of description. Maps severity to equipment requirements (basic → advanced → critical_care).

---

## 📂 Project Structure

```
RESQNET/
├── server/                     # Backend (Node.js + Express)
│   ├── config/db.js            # MongoDB connection
│   ├── controllers/            # Route handlers
│   ├── middleware/              # Auth + error handling
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # API routes
│   ├── services/               # Business logic
│   │   ├── triageService.js    # AI severity classifier
│   │   ├── dispatchService.js  # Smart ambulance dispatch
│   │   ├── hospitalService.js  # Hospital scoring
│   │   ├── routingService.js   # OSRM road routing
│   │   └── notificationService.js  # SMS/Push simulation
│   ├── socket/                 # WebSocket handlers
│   └── seed/                   # Database seeding
│
├── client/                     # Frontend (React + Vite)
│   └── src/
│       ├── pages/              # 7 pages (Landing, SOS, Tracking, Admin, Driver, Hospital, Login)
│       ├── components/         # Reusable UI components
│       ├── context/            # Auth context (JWT)
│       ├── services/           # API + Socket clients
│       └── hooks/              # Custom hooks
│
└── README.md
```

---

## 🛣️ Production Roadmap

| Phase | Description |
|-------|-------------|
| ✅ Phase 1 | Working prototype (current) |
| 🔜 Phase 2 | Flutter driver app with real GPS streaming |
| 🔜 Phase 3 | Twilio SMS + Firebase push notifications |
| 🔜 Phase 4 | Google Gemini API integration for triage |
| 🔜 Phase 5 | Government partnerships (108 ambulance integration) |

---

## 👥 Team

Built for **Google Hackathon 2026** 🏆

---

*Every second counts. Let's save lives with technology.* 🚑💙
