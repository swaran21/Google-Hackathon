# ResQNet AI — Intelligent Emergency Response System

> **Google Hackathon 2026** | An AI-powered emergency coordination platform that connects patients in distress with the nearest ambulances and best-suited hospitals in real-time.

![Status](https://img.shields.io/badge/status-Production%20Ready-brightgreen)
![Node](https://img.shields.io/badge/node-18%2B-blue)
![React](https://img.shields.io/badge/react-19.2.5-61dafb)

---

## 1. What Is ResQNet AI?

ResQNet AI is a **life-saving emergency response platform** designed to drastically reduce the time between when an emergency occurs and when professional medical help arrives. In India, emergency response times average 20-30 minutes — far beyond the critical "golden hour" that medical experts say is the window in which timely treatment can mean the difference between life and death.

Our platform addresses this crisis by using **artificial intelligence** to:
- **Automatically classify** the severity of each emergency in real-time
- **Intelligently dispatch** the nearest and most appropriate ambulance
- **Match patients** with hospitals that have available beds and required specialties
- **Track everything in real-time** so no one is left wondering where help is
- **Keep all parties connected** through integrated chat and notifications

Think of ResQNet as the "brain" of emergency response — it takes over the manual work that normally slows things down: the phone calls to find an available ambulance, the guesswork about which hospital has open ICU beds, the uncertainty about when help will arrive.

---

## 2. The Problem We're Solving

### The Emergency Response Crisis in India

Every day, thousands of emergencies in India go unanswered quickly enough. When someone experiences a heart attack, stroke, or serious accident, every minute matters. Yet the current system is riddled with inefficiencies:

**Manual Dispatch is Too Slow**
When a person calls for an ambulance, someone has to manually contact different ambulance services, find which one is available, figure out which hospital to go to, and communicate all of this by phone. This process can take 15-20 minutes before an ambulance even starts moving.

**No Real-Time Visibility**
Once an ambulance is dispatched, the patient and their family have no way to know where it is. They're left anxiously waiting, not knowing if it's 2 minutes away or 20. There's no tracking, no ETA, no updates.

**Hospital Beds Are a Mystery**
Even when a patient reaches a hospital, they might be turned away because no beds are available — or worse, the hospital accepts them but doesn't have the right equipment or specialists. This guesswork costs precious minutes.

**Communication Breaks Down**
The patient, ambulance driver, hospital staff, and family members are all trying to coordinate via phone calls and text messages. Information gets lost, calls get missed, and no one has the full picture.

### The Human Cost

Studies show that response times above 10 minutes significantly increase mortality for cardiac emergencies. Stroke patients who receive treatment within the golden hour have dramatically better outcomes. Yet the average emergency response in India is 20-30 minutes — two to three times too slow.

---

## 3. Our Solution: How ResQNet AI Works

### The Journey of an Emergency

**Step 1: Someone Hits SOS**
A person experiencing an emergency (or someone on their behalf) opens the ResQNet app and selects the type of emergency: cardiac, accident, fire, breathing difficulty, stroke, flood, or other. They fill in basic information — patient's name, phone number, and a description of what's happening. The app automatically captures the location using GPS.

**Step 2: AI Triage Happens in Milliseconds**
The moment the SOS is submitted, our AI triage system immediately analyzes the emergency. It considers:
- The type of emergency (cardiac emergencies are treated differently than accidents)
- The description provided (keywords like "not breathing" or "chest pain" indicate higher severity)
- Optional vitals if provided (heart rate, blood pressure, oxygen levels)

The AI classifies the emergency on a 1-5 severity scale:
- **Severity 1 (Low)**: Minor injuries, general illness
- **Severity 2 (Moderate)**: Non-critical injuries, moderate pain
- **Severity 3 (High)**: Serious injuries, potential complications
- **Severity 4 (Critical)**: Life-threatening, immediate response needed
- **Severity 5 (Extreme)**: Immediate life risk, all hands on deck

This classification determines the urgency of response and what kind of ambulance is needed.

**Step 3: Smart Ambulance Dispatch**
Our dispatch system doesn't just find the nearest ambulance — it finds the **right** ambulance. It considers:
- **Location**: Which ambulances are closest to the patient?
- **Equipment Level**: Does the ambulance have basic life support, advanced life support, or critical care equipment? A cardiac emergency needs critical care, while a minor injury might only need basic support.
- **Availability**: Is the ambulance currently free?
- **Current Status**: Is the ambulance already dispatched to another emergency?

The system ranks all available ambulances and automatically dispatches the best match.

**Step 4: Hospital Matching**
At the same time, ResQNet checks nearby hospitals for:
- **Bed Availability**: Does the hospital have open beds (general or ICU)?
- **Required Specialties**: For a cardiac emergency, does the hospital have a cardiology department? For stroke, does it have neurology?
- **Distance**: How far is the hospital from the patient's location?

This ensures patients are routed directly to facilities that can actually help them, avoiding the devastating situation of being turned away.

**Step 5: Real-Time Tracking Begins**
Once an ambulance is dispatched, everyone can track it in real-time on a map. The ambulance's GPS location is updated continuously and broadcast via WebSockets to the patient, the hospital, and the admin dashboard. ETA calculations are updated based on actual traffic and road conditions using OSRM (Open Source Routing Machine).

**Step 6: Connected Communication**
Throughout the emergency, all parties can communicate through the app:
- The patient can see when the ambulance is coming
- The driver can see the best route and access patient details
- The hospital can prepare for arrival (alert the ER team, prepare an ICU bed)
- The family can see status updates without clogging up phone lines

**Step 7: Resolution and Feedback**
When the emergency is resolved, patients can provide feedback on their experience — rating the ambulance driver, the hospital, and the overall system. This data helps improve future responses.

---

## 4. Key Features Explained

### AI-Powered Triage

Our triage system is the heart of ResQNet. When an SOS comes in, the AI immediately analyzes multiple factors:

**Emergency Type Analysis**: Different types of emergencies have different base severities. A cardiac emergency starts at severity 5, while a minor accident might start at 3. This is because certain conditions are inherently more time-sensitive than others.

**Description Parsing**: The free-text description field is scanned for keywords that indicate severity. Words like "unconscious," "not breathing," or "severe bleeding" automatically boost the severity level. The system has a curated list of 50+ critical keywords across extreme, critical, high, and moderate categories.

**Vitals Integration**: If the caller provides vital signs (heart rate, blood pressure, oxygen saturation), the AI evaluates them against clinical thresholds. Low oxygen or dangerously high/low heart rate triggers immediate severity boosts.

**Equipment Recommendation**: Based on the final severity, the system recommends the appropriate ambulance type:
- Basic Life Support (BLS): For severity 1-2
- Advanced Life Support (ALS): For severity 3
- Critical Care (CC): For severity 4-5

**Response Level Classification**: Each emergency is classified as STANDARD, URGENT, or IMMEDIATE, helping responders prioritize appropriately.

**Role-Specific Guidance**: The AI generates guidance for everyone involved:
- What the patient/caller should do while waiting
- What the ambulance crew should bring and prepare
- What the hospital should have ready

The triage system uses Google Gemini AI when available, with a sophisticated rule-based fallback system that ensures triage always works even without an API key.

### Real-Time GPS Tracking

Once an ambulance is dispatched, its location is tracked continuously. This is achieved through:

**WebSocket Updates**: The ambulance's location is sent to the server every few seconds via Socket.io, a real-time communication library.

**Live Map Display**: The patient sees a map with their location, the ambulance's current location, and the route to the hospital. The map updates in real-time without requiring a page refresh.

**ETA Calculations**: Using OSRM (Open Source Routing Machine), the system calculates the optimal route and estimated time of arrival based on actual road distances, not straight-line "as-the-crow-flies" estimates. This ETA is updated as traffic conditions change.

**Multi-Party Visibility**: Not just the patient — the hospital staff preparing for arrival and the admin monitoring the system also see the ambulance's location and ETA.

### Hospital Coordination System

One of ResQNet's most innovative features is hospital-first dispatch. In this flow:

1. When an SOS comes in, the system immediately alerts nearby hospitals that meet the criteria (available beds, required specialties)
2. Hospitals see the emergency details — severity, type, patient condition, ETA
3. The hospital can accept or reject the incoming patient
4. If accepted, the ambulance is dispatched with the hospital already prepared

This "receive first, then dispatch" approach means hospitals aren't caught off-guard, and patients don't arrive at facilities that can't help them.

### Smart Ambulance Dispatch

Our dispatch algorithm goes beyond "find the nearest." It considers:

**Equipment Matching**: A severity 5 cardiac emergency needs a critical care ambulance with cardiac equipment, not just the nearest basic ambulance.

**Location Ranking**: Ambulances are ranked by distance, but not just straight-line distance — estimated travel time based on road network data from OSRM.

**Status Awareness**: The system knows the real-time status of every ambulance in the fleet. An ambulance that's 3km away but already dispatched is ranked lower than one that's 5km away but available.

**Driver Links**: Each ambulance is linked to a driver account, so dispatch notifications go directly to the driver's interface.

### Role-Based Dashboards

ResQNet provides different experiences for each user type:

**Patients**: A simple interface focused on triggering SOS and tracking the response. After logging in, they can see their emergency history and track active emergencies.

**Drivers**: A dashboard showing assigned emergencies, navigation to the patient, quick status update buttons, and contact information for patient and hospital.

**Hospitals**: A comprehensive view of incoming emergencies (sorted by severity), bed availability management, the ability to accept or reject patients, and real-time tracking of incoming ambulances.

**Admins**: A command center showing the entire system at a glance — active emergencies on a map, ambulance fleet status, hospital capacity gauges, and system health indicators.

---

## 5. Technology Stack

### Why These Technologies?

**React 19**: We chose React for its component-based architecture, which makes it easy to build complex UIs from reusable pieces. The ecosystem is mature, developer productivity is high, and the virtual DOM provides good performance for real-time updates.

**Vite**: As a build tool, Vite is extremely fast and provides an excellent development experience with hot module replacement. It significantly reduces build times compared to older tools like Create React App.

**Tailwind CSS**: For styling, Tailwind's utility-first approach speeds up development. It's easy to make consistent design decisions across the application, and the resulting CSS is optimized (only used styles are included).

**Socket.io**: For real-time features, Socket.io is the industry standard. It handles WebSocket connections with automatic fallback to HTTP long-polling, and it provides rooms for grouping connections (e.g., all users tracking a specific emergency).

**Express.js**: The backend uses Express for its simplicity and flexibility. It handles routing, middleware, and API endpoints efficiently.

**MongoDB**: We use MongoDB because emergency data is naturally document-oriented — each emergency can have different associated data (different symptoms, different required equipment, different statuses). MongoDB's flexible schema handles this well.

**Mongoose**: Mongoose provides schema validation and modeling on top of MongoDB, ensuring data consistency and enabling features like geospatial queries for finding nearby ambulances and hospitals.

**Google Gemini API**: For AI triage, we use Google's Gemini because it can process natural language descriptions and return structured JSON that our system can use. The API is fast enough for real-time triage.

**OSRM**: The Open Source Routing Machine provides routing data — turn-by-turn directions, estimated travel times, optimal routes. This is essential for accurate ETAs beyond simple distance calculations.

---

## 6. System Architecture

### How the Pieces Connect

The ResQNet system consists of three main layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE LAYER                                │
│                                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   Patient App   │  │   Driver App    │  │       Hospital App          │  │
│  │   (SOS + Track) │  │   (Dispatch)    │  │  (Bed Management + Accept)  │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘  │
│           │                    │                          │                  │
│           │           ┌────────┴────────┐                  │                  │
│           │           │   Admin Panel   │                  │                  │
│           │           │ (System Monitor)│                  │                  │
│           │           └────────┬────────┘                  │                  │
└───────────┼────────────────────┼───────────────────────────┼──────────────────┘
            │                    │                           │
            ▼                    ▼                           ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND SERVER LAYER (Vercel)                       │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                    React Application                                      │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐  │ │
│  │  │  Landing    │  │  Auth Pages  │  │  Dashboards │  │  SOS + Track  │  │ │
│  │  │  (3D Globe) │  │  (4 variants)│  │  (per role) │  │  (Real-time)  │  │ │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  └───────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  Environment Variables: VITE_API_URL, VITE_SOCKET_URL                         │
│  Build Output: Static files served via CDN                                     │
└───────────────────────────────────────────────────────────────────────────────┘
            │                    │                           │
            │                    │                           │
            ▼                    ▼                           ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND API LAYER (Render)                           │
│                                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                         Express.js Server                               │  │
│  │                                                                       │  │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │   │   REST API   │  │  WebSocket   │  │    Auth      │                │  │
│  │   │   /api/*     │  │  (Socket.io) │  │  (JWT/bcrypt)│                │  │
│  │   └──────┬───────┘  └──────┬───────┘  └──────────────┘                │  │
│  │          │                 │                                          │  │
│  │   ┌──────▼──────────────────────────────────────────────┐            │  │
│  │   │                    Services Layer                    │            │  │
│  │   ├────────────┬─────────────┬────────────┬─────────────┤            │  │
│  │   │  Triage    │  Dispatch   │  Hospital  │  Routing    │            │  │
│  │   │  (Gemini)  │  (Matching) │  (Matching)│  (OSRM)     │            │  │
│  │   └────────────┴─────────────┴────────────┴─────────────┘            │  │
│  │          │                 │                 │                       │  │
│  │   ┌──────▼─────────────────▼─────────────────▼────────────┐          │  │
│  │   │                   Controllers Layer                   │          │  │
│  │   ├─────────┬───────────┬──────────┬──────────┬──────────┤          │  │
│  │   │  Auth   │ Emergency │ Ambulance│ Hospital │  Admin   │          │  │
│  │   └─────────┴───────────┴──────────┴──────────┴──────────┘          │  │
│  │          │                 │                 │                       │  │
│  │   ┌──────▼─────────────────▼─────────────────▼────────────┐          │  │
│  │   │                   Routes Layer                        │          │  │
│  │   │  /api/auth  /api/emergency  /api/ambulance  /api/*    │          │  │
│  │   └───────────────────────────────────────────────────────┘          │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   Rate Limiter  │  │   CORS Config   │  │      Error Handler          │  │
│  │  (100 req/15m)  │  │ (Frontend URL)  │  │      (404 + 500)            │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘
            │                    │                           │
            ▼                    ▼                           ▼
┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────┐
│     MongoDB Atlas   │  │    Google       │  │           OSRM                  │
│     (Database)      │  │    Gemini       │  │      (Route Calculation)        │
│                     │  │    (AI Triage)  │  │                                │
└─────────────────────┘  └─────────────────┘  └─────────────────────────────────┘
```

### Data Flow Example: Creating an Emergency

Here's what happens when a patient creates an SOS:

1. **User submits SOS form** in React app (e.g., React Router sends POST to `/api/emergency`)
2. **Axios sends request** to `VITE_API_URL/api/emergency`
3. **Express receives request** at `POST /api/emergency`
4. **Rate limiter checks** if user has exceeded 100 requests in 15 minutes
5. **Auth middleware verifies** JWT token is valid
6. **Emergency controller creates** emergency document in MongoDB
7. **Triage service is called** — Gemini AI or rule-based fallback generates severity
8. **Dispatch service runs** — finds nearest appropriate ambulance
9. **Hospital service runs** — finds hospitals with available beds
10. **Socket.io broadcasts** `emergency:created` event to all connected clients
11. **Response returns** to user with emergency details and assigned resources

Meanwhile:
- **Driver app** receives push notification via Socket.io
- **Hospital dashboard** sees new incoming emergency
- **Admin panel** updates with new emergency on map

---

## 7. Database Design

### Why These Collections?

**Users Collection**
We use a single User collection with a role field (user/driver/hospital/admin) rather than separate collections. This simplifies authentication — one login system, one token structure. For hospitals and drivers, additional fields link to their respective hospital or ambulance records.

**Emergencies Collection**
The Emergency model is the heart of our system. It's designed as a state machine tracking the emergency from creation to resolution. The document includes:
- Location stored as GeoJSON for geospatial queries
- Full triage result from AI (structured JSON with severity, equipment, guidance)
- Links to assigned ambulance and hospital
- Hospital request tracking (pending → accepted → rejected → released)
- Ambulance booking status
- Chat thread for communication
- Feedback from the patient after resolution

**Ambulances Collection**
Ambulances store their current location as GeoJSON for proximity queries. Equipment level determines which emergencies they're suited for. Status field enables dispatch logic.

**Hospitals Collection**
Hospitals track bed availability across categories (general, ICU, trauma, burn). The treatments array lists which medical specialties and services they offer, enabling specialty matching for emergencies.

**Notifications Collection**
We log all notifications for audit purposes and admin visibility, even though actual delivery is currently simulated.

### Geospatial Queries

MongoDB's 2dsphere indexes enable efficient location-based queries:
- Finding ambulances within a radius: `$nearSphere`
- Finding hospitals near an emergency: `$nearSphere`
- This is why location is stored as GeoJSON (type: "Point", coordinates: [longitude, latitude])

---

## 8. API Endpoints Explained

### Authentication Endpoints

**POST /api/auth/register**
When someone creates an account, we hash their password with bcrypt and store the user with their role. For users, this is straightforward. For drivers and hospitals, additional setup happens: linking to ambulance/hospital records, creating initial profiles.

**POST /api/auth/login**
We verify the password against the stored hash, then generate a JWT token valid for 7 days. The token contains the user's ID and role, which we verify on every protected request.

### Emergency Endpoints

**POST /api/emergency (Create SOS)**
This is the most complex endpoint. It:
1. Validates input (type, location, patient info)
2. Runs AI triage
3. Saves the emergency with triage results
4. Optionally triggers ambulance dispatch based on flow type
5. Optionally alerts hospitals
6. Broadcasts via Socket.io

The endpoint is rate-limited (100 requests per 15 minutes per IP) to prevent abuse.

**PATCH /api/emergency/:id/status**
Status transitions follow a strict flow:
- pending → dispatched → en_route → at_scene → resolved
- Any status can transition to cancelled
- Each transition is logged for audit

### Ambulance Endpoints

**GET /api/ambulance/nearest**
Uses MongoDB's geospatial query to find ambulances within a radius, sorted by distance. Filters by equipment level and availability.

### Hospital Endpoints

**PATCH /api/hospitals/me/requests/:id/decision**
When a hospital accepts or rejects an incoming emergency, this endpoint updates the hospitalRequest.status and notifies the dispatch system.

---

## 9. Real-Time Architecture

### WebSocket Events

Socket.io enables instant communication without polling:

**Client subscribes to an emergency:**
```
socket.emit('join:emergency', emergencyId)
```

**Server broadcasts emergency updates:**
```
io.to(emergencyId).emit('emergency:updated', { status: 'en_route', ... })
```

This means the tracking page doesn't need to poll — it receives updates the moment they happen.

### Connection Management

Socket.io handles reconnection automatically. If a driver loses connectivity temporarily, the client automatically attempts to reconnect and rejoin any emergency rooms they were in.

---

## 10. Security Measures

### Authentication
JWT tokens are signed with a secret key and expire after 7 days. Every protected route verifies the token before processing.

### Password Security
Passwords are hashed with bcrypt (12 rounds) before storage. We never store plaintext passwords.

### Rate Limiting
The SOS endpoint is limited to 100 requests per 15 minutes per IP. This prevents a malicious actor from spamming the system while allowing legitimate rapid retries.

### CORS
CORS is configured to only accept requests from the frontend domain. API calls from other origins are blocked.

### Input Validation
All user input is validated before processing. MongoDB's Mongoose validates types and required fields. Additional sanitization prevents injection attacks.

---

## 11. Environment Variables

### Backend Configuration

| Variable | Purpose | Example |
|----------|---------|---------|
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | Database connection string | `mongodb+srv://user:pass@cluster.mongodb.net` |
| `CLIENT_URL` | Frontend URL for CORS | `https://google-hackathon-eight.vercel.app` |
| `JWT_SECRET` | Token signing secret | `super-secret-key-min-32-chars` |
| `JWT_EXPIRE` | Token lifetime | `7d` |
| `GEMINI_API_KEY` | AI triage API key | `AIzaSy...` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |

### Frontend Configuration

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_URL` | Backend API URL | `https://resqnet-backend-api.onrender.com/api` |
| `VITE_SOCKET_URL` | Backend Socket.io URL | `https://resqnet-backend-api.onrender.com` |

---

## 12. Deployment Architecture

### Frontend: Vercel

The React application is deployed to Vercel's edge network. When you push to GitHub, Vercel automatically builds and deploys. Environment variables are configured in the Vercel dashboard and injected at build time.

The `VITE_` prefix is required because Vite embeds environment variables into the bundle at build time. This is more secure than runtime variables for the frontend.

### Backend: Render

The Node.js server deploys to Render, a Platform as a Service that handles the server process. Render automatically pulls from GitHub and runs `npm start` after `npm install`.

The backend uses environment variables set in Render's dashboard, including sensitive values like `MONGODB_URI` and `JWT_SECRET`.

### Database: MongoDB Atlas

The database runs on MongoDB Atlas's managed cloud service. Connection is via a connection string that includes credentials. Atlas handles replication, backups, and performance optimization.

### External Services

**Google Gemini API**: Our AI triage service sends requests to Google's generative AI API when `GEMINI_API_KEY` is set. The rule-based fallback ensures the system works even without the API key.

**OSRM**: Route calculations use the public OSRM demo server for development. In production, you'd deploy your own OSRM instance for higher limits and customization.

---

## 13. Current Status

### What's Working

✅ User registration and login with role-based access
✅ AI triage (Gemini with rule-based fallback)
✅ Emergency creation with location
✅ Smart ambulance dispatch
✅ Hospital matching and bed tracking
✅ Real-time GPS tracking via WebSockets
✅ OSRM route calculation and ETA
✅ Role-based dashboards (User, Driver, Hospital, Admin)
✅ Dark/light theme
✅ 3D globe landing page
✅ Feedback and ratings system
✅ Chat threads for emergencies
✅ Production deployment (Vercel + Render)
✅ Rate limiting
✅ JWT authentication
✅ Hospital-first and ambulance-first flows

### What's Ready But Not Yet Integrated

🔜 Twilio SMS notifications (configured, needs API keys)
🔜 Firebase push notifications (code ready, needs setup)

### Future Enhancements

🔜 Mobile app (React Native)
🔜 Multi-language support (Hindi, regional languages)
🔜 Advanced analytics dashboard
🔜 Predictive ambulance pre-positioning
🔜 Traffic-aware routing
🔜 Offline emergency pre-filling

---

## 14. Statistics

| Metric | Value |
|--------|-------|
| Total Files | 60+ |
| Lines of Code | ~10,000+ |
| REST API Endpoints | 25+ |
| WebSocket Events | 10+ |
| Database Collections | 5 |
| Supported User Roles | 4 |
| Emergency Types | 6 |
| Severity Levels | 5 |
| Equipment Levels | 3 |
| External Integrations | 4 |

---

## 15. Setup Instructions

### Prerequisites
- Node.js 18 or higher
- MongoDB Atlas account (free tier works)
- Git

### Backend Setup

```bash
cd server
npm install

# Create .env file with your values
# PORT=5000
# MONGODB_URI=mongodb+srv://...
# JWT_SECRET=your-secret-key
# etc.

# Seed demo data
npm run seed

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd client
npm install
npm run dev
```

### Demo Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| User | user@example.com | password123 |
| Driver | driver@example.com | password123 |
| Hospital | hospital@example.com | password123 |
| Admin | admin@example.com | password123 |

---

## 16. Project Structure

```
Google-Hackathon/
├── client/                    # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── context/           # Auth and Theme providers
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Route pages
│   │   ├── services/          # API and Socket clients
│   │   ├── App.jsx            # Router and route guards
│   │   └── main.jsx           # Entry point
│   ├── public/                # Static assets
│   └── package.json
│
├── server/                    # Express backend
│   ├── config/                # Database config
│   ├── controllers/           # Request handlers
│   ├── middleware/            # Auth and error handling
│   ├── models/                # MongoDB schemas
│   ├── routes/                # API routes
│   ├── services/              # Business logic (triage, dispatch, routing)
│   ├── socket/                # WebSocket handlers
│   ├── utils/                 # Helpers (distance calculation)
│   ├── seed/                  # Demo data seeder
│   └── server.js              # Entry point
│
├── kubernetes/                # K8s manifests for GKE deployment
├── docker-compose.yml         # Local Docker setup
└── README.md                  # This file
```

---

## License & Credits

**Project**: ResQNet AI - Intelligent Emergency Response System
**Created for**: Google Hackathon 2026
**Stack**: React + Express + MongoDB + Socket.io + Google Gemini AI
**Status**: Production-ready core features deployed

For questions about the codebase:
- API endpoints: `server/routes/`
- Frontend pages: `client/src/pages/`
- AI triage: `server/services/triageService.js`
- Dispatch logic: `server/services/dispatchService.js`