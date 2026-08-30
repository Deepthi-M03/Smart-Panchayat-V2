// priority.js — deterministic, explainable priority scoring.
// No black box: every score is a transparent sum of named, visible factors.
const CATEGORY_BASE = {
  "Water Supply": 3,
  "Drainage & Sewage": 3,
  "Electricity & Streetlight": 2,
  "Roads & Potholes": 2,
  "Garbage & Sanitation": 2,
  "Public Property Damage": 1,
  "Stray Animals": 1,
  "Other": 1,
};

const URGENT_TERMS = ["overflow", "leak", "burst", "open wire", "live wire", "collapsed",
  "flood", "sewage", "contaminat", "accident", "children", "school", "hospital", "fire"];

function scoreComplaint(category, description) {
  const reasons = [];
  let score = CATEGORY_BASE[category] ?? 1;
  reasons.push(`Base weight for "${category}": ${CATEGORY_BASE[category] ?? 1}`);

  const desc = (description || "").toLowerCase();
  const matched = URGENT_TERMS.filter((t) => desc.includes(t));
  if (matched.length) {
    score += matched.length;
    reasons.push(`Urgent keyword(s) detected: ${matched.join(", ")} (+${matched.length})`);
  }

  let priority = "LOW";
  if (score >= 5) priority = "HIGH";
  else if (score >= 3) priority = "MEDIUM";

  reasons.push(`Total score ${score} → ${priority}`);
  return { priority, score, reasons };
}

module.exports = { scoreComplaint, CATEGORY_BASE };
