// seed.js — generates a synthetic (fictional) demo dataset.
// No real citizens, phone numbers, or complaint records are represented.
const fs = require("fs");
const path = require("path");
const { scoreComplaint } = require("./priority");

const WARDS = [
  { id: "W1", name: "Ward 1 – Perur", lat: 10.9840, lng: 76.8720 },
  { id: "W2", name: "Ward 2 – Vadavalli", lat: 11.0086, lng: 76.9077 },
  { id: "W3", name: "Ward 3 – Thondamuthur", lat: 10.9700, lng: 76.8500 },
  { id: "W4", name: "Ward 4 – Sulur", lat: 11.0273, lng: 77.1253 },
  { id: "W5", name: "Ward 5 – Kinathukadavu", lat: 10.8800, lng: 77.0100 },
  { id: "W6", name: "Ward 6 – Annur", lat: 11.2270, lng: 77.1080 },
  { id: "W7", name: "Ward 7 – Madukkarai", lat: 10.9280, lng: 76.9420 },
  { id: "W8", name: "Ward 8 – Karamadai", lat: 11.2540, lng: 76.9440 },
  { id: "W9", name: "Ward 9 – Pollachi Rural", lat: 10.6590, lng: 77.0080 },
  { id: "W10", name: "Ward 10 – Mettupalayam Rural", lat: 11.2990, lng: 76.9350 },
  { id: "W11", name: "Ward 11 – Anaimalai", lat: 10.6420, lng: 77.0950 },
  { id: "W12", name: "Ward 12 – Periyanaickenpalayam", lat: 11.1440, lng: 76.9860 },
];

const CATEGORIES = Object.keys(require("./priority").CATEGORY_BASE);

const DESCRIPTIONS = {
  "Water Supply": [
    "No water supply in our street for the past 4 days.",
    "Water tanker did not arrive on the scheduled day this week.",
    "Pipeline leak near the bus stop, water pooling on the road.",
  ],
  "Drainage & Sewage": [
    "Open drain overflow near the school entrance, bad smell for children.",
    "Sewage backing up into the street after last night's rain.",
    "Drain cover missing near the community hall, safety hazard.",
  ],
  "Electricity & Streetlight": [
    "Streetlight on Mill Road has not worked for two weeks.",
    "Live wire hanging low near the bus stand after the storm.",
    "Frequent power cuts in the evening, no prior notice given.",
  ],
  "Roads & Potholes": [
    "Large pothole near the temple junction causing two-wheeler accidents.",
    "Road collapsed partially after the rains near the canal bridge.",
    "Speed breaker needed near the school gate, vehicles speeding.",
  ],
  "Garbage & Sanitation": [
    "Garbage not collected from our street for over a week.",
    "Waste dumped illegally behind the community hall.",
    "Public toilet block needs urgent cleaning, unusable currently.",
  ],
  "Public Property Damage": [
    "Compound wall of the government school damaged and unsafe.",
    "Bus shelter roof sheet blown off in last week's wind.",
    "Public bench and playground equipment vandalized.",
  ],
  "Stray Animals": [
    "Stray dogs chasing schoolchildren near the main road.",
    "Cattle roaming unattended causing traffic near the market.",
  ],
  "Other": [
    "Request for a new water tank in the eastern part of the ward.",
    "Noise complaint regarding late-night function near residential area.",
  ],
};

const NAMES = ["Muthu K.", "Lakshmi R.", "Saravanan P.", "Kavitha S.", "Ramesh V.", "Priya M.",
  "Suresh N.", "Deepa T.", "Karthik B.", "Anitha J.", "Vijay S.", "Meena R.", "Arun D.", "Geetha K."];

const OFFICERS = ["Officer R. Balakrishnan", "Officer S. Meenakshi", "Officer M. Suriya"];

const STATUSES = ["SUBMITTED", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "REJECTED"];
const STATUS_WEIGHTS = [0.15, 0.15, 0.25, 0.4, 0.05];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function weightedStatus() {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < STATUSES.length; i++) {
    acc += STATUS_WEIGHTS[i];
    if (r <= acc) return STATUSES[i];
  }
  return STATUSES[STATUSES.length - 1];
}
function randDate(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(Math.random() * 12) + 7, Math.floor(Math.random() * 60));
  return d;
}
function jitter(v, amt) { return v + (Math.random() - 0.5) * amt; }

function buildTimeline(createdAt, finalStatus) {
  const order = ["SUBMITTED", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"];
  const rejectedOrder = ["SUBMITTED", "ACKNOWLEDGED", "REJECTED"];
  const seq = finalStatus === "REJECTED" ? rejectedOrder : order.slice(0, order.indexOf(finalStatus) + 1);
  const timeline = [];
  let t = new Date(createdAt);
  const notes = {
    SUBMITTED: "Complaint lodged by citizen.",
    ACKNOWLEDGED: "Complaint reviewed and acknowledged by ward office.",
    IN_PROGRESS: "Field team assigned and work in progress.",
    RESOLVED: "Issue resolved and verified by ward officer.",
    REJECTED: "Closed — duplicate or outside panchayat jurisdiction.",
  };
  for (const s of seq) {
    timeline.push({
      status: s,
      note: notes[s],
      byOfficer: s === "SUBMITTED" ? null : pick(OFFICERS),
      timestamp: t.toISOString(),
    });
    t = new Date(t.getTime() + (Math.random() * 3 + 0.5) * 24 * 3600 * 1000);
  }
  return timeline;
}

function seed() {
  const complaints = [];
  let counter = 1;
  const total = 58;
  for (let i = 0; i < total; i++) {
    const ward = pick(WARDS);
    const category = pick(CATEGORIES);
    const description = pick(DESCRIPTIONS[category]);
    const createdAt = randDate(95);
    const status = weightedStatus();
    const { priority, score, reasons } = scoreComplaint(category, description);
    const id = `SP-2026-${String(counter).padStart(4, "0")}`;
    counter++;
    complaints.push({
      id,
      citizenName: pick(NAMES),
      phone: `98${String(400000000 + i * 977).slice(0, 8)}`,
      category,
      description,
      ward: ward.id,
      wardName: ward.name,
      lat: jitter(ward.lat, 0.02),
      lng: jitter(ward.lng, 0.02),
      photoPath: null,
      status,
      priority,
      priorityScore: score,
      priorityReasons: reasons,
      createdAt: createdAt.toISOString(),
      updates: buildTimeline(createdAt, status),
    });
  }
  // A few hand-placed "showcase" complaints for demo storytelling
  complaints.push({
    id: "SP-2026-0900",
    citizenName: "Selvi A.",
    phone: "9840012345",
    category: "Drainage & Sewage",
    description: "Sewage overflow flooding the lane right next to the primary school gate, children wading through it every morning.",
    ward: "W1", wardName: "Ward 1 – Perur", lat: 10.984, lng: 76.872,
    photoPath: null, status: "IN_PROGRESS",
    ...scoreAndWrap("Drainage & Sewage", "Sewage overflow flooding the lane right next to the primary school gate, children wading through it every morning."),
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    updates: buildTimeline(new Date(Date.now() - 6 * 86400000), "IN_PROGRESS"),
  });

  function scoreAndWrapUnused() {}

  fs.writeFileSync(path.join(__dirname, "data", "wards.json"), JSON.stringify(WARDS, null, 2));
  fs.writeFileSync(path.join(__dirname, "data", "complaints.json"), JSON.stringify(complaints, null, 2));
  console.log(`Seeded ${complaints.length} complaints across ${WARDS.length} wards.`);
}

function scoreAndWrap(category, description) {
  const { priority, score, reasons } = scoreComplaint(category, description);
  return { priority, priorityScore: score, priorityReasons: reasons };
}

seed();
