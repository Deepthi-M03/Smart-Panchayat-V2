// server.js — Smart Panchayat: single-service backend.
// No MongoDB, no separate AI microservice, no build step required.
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { loadComplaints, saveComplaints, loadWards } = require("./db");
const { scoreComplaint } = require("./priority");

const app = express();
const PORT = process.env.PORT || 4000;

const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image uploads are supported"));
  },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, "..", "public")));

// -----------------------------------------------------------------------
// DEMO AUTH — prototype only, not production security.
// -----------------------------------------------------------------------
const DEMO_ACCOUNTS = {
  "officer@smartpanchayat.demo": { password: "officer123", role: "OFFICER", name: "R. Balakrishnan", ward: "W1" },
  "admin@smartpanchayat.demo": { password: "admin123", role: "ADMIN", name: "S. Meenakshi", ward: null },
};
const SESSIONS = {}; // token -> account email (in-memory; resets on restart, by design for a demo)

function issueToken(email) {
  const token = `demo-${email}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  SESSIONS[token] = email;
  return token;
}
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const email = SESSIONS[token];
  if (!email) return res.status(401).json({ error: "Not authenticated. Please sign in." });
  req.account = { email, ...DEMO_ACCOUNTS[email] };
  next();
}

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const account = DEMO_ACCOUNTS[email];
  if (!account || account.password !== password) {
    return res.status(401).json({ error: "Invalid demo credentials." });
  }
  const token = issueToken(email);
  res.json({ token, user: { email, name: account.name, role: account.role, ward: account.ward } });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ email: req.account.email, name: req.account.name, role: req.account.role, ward: req.account.ward });
});

// -----------------------------------------------------------------------
// WARDS
// -----------------------------------------------------------------------
app.get("/api/wards", (req, res) => {
  res.json(loadWards());
});

// Public, anonymized snapshot for the homepage ticker — no auth, no PII.
app.get("/api/public-stats", (req, res) => {
  const complaints = loadComplaints();
  const resolved = complaints.filter((c) => c.status === "RESOLVED");
  let avg = null;
  if (resolved.length) {
    const durations = resolved.map((c) => {
      const submitted = new Date(c.updates[0].timestamp);
      const resolvedUpdate = c.updates.find((u) => u.status === "RESOLVED");
      return resolvedUpdate ? (new Date(resolvedUpdate.timestamp) - submitted) / (1000 * 3600 * 24) : null;
    }).filter((d) => d !== null);
    avg = durations.length ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10 : null;
  }
  res.json({ total: complaints.length, resolved: resolved.length, avgResolutionDays: avg, wardsCovered: loadWards().length });
});

// -----------------------------------------------------------------------
// COMPLAINTS
// -----------------------------------------------------------------------
function nextComplaintId(complaints) {
  const year = new Date().getFullYear();
  const nums = complaints
    .map((c) => c.id.match(/^SP-\d{4}-(\d+)$/))
    .filter(Boolean)
    .map((m) => parseInt(m[1], 10));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `SP-${year}-${String(next).padStart(4, "0")}`;
}

app.post("/api/complaints", upload.single("photo"), (req, res) => {
  const { citizenName, phone, category, description, ward, lat, lng } = req.body;
  if (!citizenName || !category || !description || !ward) {
    return res.status(400).json({ error: "citizenName, category, description, and ward are required." });
  }
  const wards = loadWards();
  const wardObj = wards.find((w) => w.id === ward);
  if (!wardObj) return res.status(400).json({ error: `Unknown ward "${ward}".` });

  const complaints = loadComplaints();
  const id = nextComplaintId(complaints);
  const { priority, score, reasons } = scoreComplaint(category, description);
  const now = new Date().toISOString();

  const complaint = {
    id,
    citizenName,
    phone: phone || null,
    category,
    description,
    ward,
    wardName: wardObj.name,
    lat: lat ? parseFloat(lat) : wardObj.lat,
    lng: lng ? parseFloat(lng) : wardObj.lng,
    photoPath: req.file ? `/uploads/${req.file.filename}` : null,
    status: "SUBMITTED",
    priority,
    priorityScore: score,
    priorityReasons: reasons,
    createdAt: now,
    updates: [{ status: "SUBMITTED", note: "Complaint lodged by citizen.", byOfficer: null, timestamp: now }],
  };
  complaints.push(complaint);
  saveComplaints(complaints);
  res.status(201).json(complaint);
});

app.get("/api/complaints/:id", (req, res) => {
  const complaints = loadComplaints();
  const complaint = complaints.find((c) => c.id === req.params.id.toUpperCase());
  if (!complaint) return res.status(404).json({ error: `No complaint found with ID "${req.params.id}".` });
  res.json(complaint);
});

// Dashboard listing — requires auth. Officers only see their ward; admins see all.
app.get("/api/complaints", requireAuth, (req, res) => {
  let complaints = loadComplaints();
  if (req.account.role === "OFFICER") {
    complaints = complaints.filter((c) => c.ward === req.account.ward);
  }
  const { status, category, priority, ward, q } = req.query;
  if (status) complaints = complaints.filter((c) => c.status === status);
  if (category) complaints = complaints.filter((c) => c.category === category);
  if (priority) complaints = complaints.filter((c) => c.priority === priority);
  if (ward) complaints = complaints.filter((c) => c.ward === ward);
  if (q) {
    const qq = q.toLowerCase();
    complaints = complaints.filter((c) =>
      c.id.toLowerCase().includes(qq) ||
      c.citizenName.toLowerCase().includes(qq) ||
      c.description.toLowerCase().includes(qq)
    );
  }
  complaints = complaints.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(complaints);
});

app.patch("/api/complaints/:id/status", requireAuth, (req, res) => {
  const { status, note } = req.body || {};
  const VALID = ["SUBMITTED", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "REJECTED"];
  if (!VALID.includes(status)) return res.status(400).json({ error: `Status must be one of: ${VALID.join(", ")}` });

  const complaints = loadComplaints();
  const complaint = complaints.find((c) => c.id === req.params.id.toUpperCase());
  if (!complaint) return res.status(404).json({ error: "Complaint not found." });
  if (req.account.role === "OFFICER" && complaint.ward !== req.account.ward) {
    return res.status(403).json({ error: "This complaint is outside your assigned ward." });
  }

  complaint.status = status;
  complaint.updates.push({
    status, note: note || null, byOfficer: req.account.name, timestamp: new Date().toISOString(),
  });
  saveComplaints(complaints);
  res.json(complaint);
});

// -----------------------------------------------------------------------
// ANALYTICS
// -----------------------------------------------------------------------
app.get("/api/analytics", requireAuth, (req, res) => {
  let complaints = loadComplaints();
  if (req.account.role === "OFFICER") complaints = complaints.filter((c) => c.ward === req.account.ward);

  const byStatus = {}, byCategory = {}, byPriority = {}, byWard = {};
  let resolvedDurations = [];
  for (const c of complaints) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
    byWard[c.wardName] = (byWard[c.wardName] || 0) + 1;
    if (c.status === "RESOLVED") {
      const submitted = new Date(c.updates[0].timestamp);
      const resolvedUpdate = c.updates.find((u) => u.status === "RESOLVED");
      if (resolvedUpdate) {
        resolvedDurations.push((new Date(resolvedUpdate.timestamp) - submitted) / (1000 * 3600 * 24));
      }
    }
  }
  // last 12 weeks trend
  const weeks = [];
  for (let i = 11; i >= 0; i--) {
    const end = new Date(); end.setDate(end.getDate() - i * 7);
    const start = new Date(end); start.setDate(start.getDate() - 7);
    const count = complaints.filter((c) => {
      const d = new Date(c.createdAt);
      return d >= start && d < end;
    }).length;
    weeks.push({ label: `${start.getMonth() + 1}/${start.getDate()}`, count });
  }

  res.json({
    total: complaints.length,
    byStatus, byCategory, byPriority, byWard,
    avgResolutionDays: resolvedDurations.length
      ? Math.round((resolvedDurations.reduce((a, b) => a + b, 0) / resolvedDurations.length) * 10) / 10
      : null,
    weeklyTrend: weeks,
  });
});

app.get("/api/health", (req, res) => res.json({ ok: true, service: "smart-panchayat-server", time: new Date().toISOString() }));

// Error handler (multer errors etc.)
app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message || "Something went wrong." });
  next();
});

app.listen(PORT, () => {
  console.log(`[smart-panchayat] listening on http://localhost:${PORT}`);
});
