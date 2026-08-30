// db.js — a deliberately simple, dependency-free JSON-file datastore.
// No MongoDB, no native bindings, no build step. Good enough for a
// single-instance demo/prototype; swap for a real database before any
// multi-instance or production deployment.
const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "data", "complaints.json");
const WARDS_PATH = path.join(__dirname, "data", "wards.json");

function readJSON(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    return fallback;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadComplaints() {
  return readJSON(DATA_PATH, []);
}

function saveComplaints(complaints) {
  writeJSON(DATA_PATH, complaints);
}

function loadWards() {
  return readJSON(WARDS_PATH, []);
}

module.exports = { loadComplaints, saveComplaints, loadWards, DATA_PATH, WARDS_PATH };
