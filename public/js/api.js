const API_BASE = "http://localhost:4000";

async function apiGet(path, auth) {
  const headers = {};
  if (auth) headers.Authorization = `Bearer ${localStorage.getItem("sp_token") || ""}`;
  const res = await fetch(API_BASE + path, { headers });
  if (!res.ok) { const e = await res.json().catch(()=>({error:"Request failed"})); throw new Error(e.error || "Request failed"); }
  return res.json();
}
async function apiSend(method, path, body, auth, isForm) {
  const headers = {};
  if (auth) headers.Authorization = `Bearer ${localStorage.getItem("sp_token") || ""}`;
  if (!isForm) headers["Content-Type"] = "application/json";
  const res = await fetch(API_BASE + path, { method, headers, body: isForm ? body : JSON.stringify(body) });
  if (!res.ok) { const e = await res.json().catch(()=>({error:"Request failed"})); throw new Error(e.error || "Request failed"); }
  return res.json();
}

function toast(msg) {
  let el = document.getElementById("sp-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "sp-toast"; el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3200);
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABELS = {
  SUBMITTED: "Submitted", ACKNOWLEDGED: "Acknowledged", IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved", REJECTED: "Rejected / Closed",
};

function badge(kind, value) {
  return `<span class="badge badge-${value}">${kind === "status" ? STATUS_LABELS[value] || value : value}</span>`;
}
