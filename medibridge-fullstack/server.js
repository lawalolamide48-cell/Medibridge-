const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const querystring = require("querystring");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const departments = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "departments.json"), "utf8"));

const users = [
  {
    id: "MB-2026-001",
    patientId: "MB-2026-001",
    name: "Sarah Martins",
    email: "sarahmartins32@gmail.com",
    phone: "+2348012345678",
    password: "password123"
  }
];

let appointments = [
  {
    id: "APT-1001",
    patientId: "MB-2026-001",
    department: "Cardiology",
    doctor: "Dr. Amelia Chen",
    date: "2026-07-02",
    time: "10:00 AM",
    status: "Upcoming",
    reason: "Follow-up consultation"
  }
];

const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function createOtpRecord({ patientId = "", email = "", phone = "", purpose = "activation" }) {
  const code = generateOtp();
  const verificationId = crypto.randomUUID();
  otpStore.set(verificationId, {
    patientId,
    email,
    phone: normalizePhone(phone),
    purpose,
    codeHash: hashOtp(code),
    attempts: 0,
    expiresAt: Date.now() + OTP_TTL_MS
  });
  return { verificationId, code };
}

function postJson(hostname, pathName, body, headers = {}) {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      path: pathName,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        ...headers
      }
    }, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) return resolve({ ok: true, data });
        reject(new Error(`Provider returned ${res.statusCode}: ${data}`));
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function postForm(hostname, pathName, body, headers = {}) {
  const payload = querystring.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      path: pathName,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(payload),
        ...headers
      }
    }, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) return resolve({ ok: true, data });
        reject(new Error(`Provider returned ${res.statusCode}: ${data}`));
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function sendOtpEmail(email, code, purpose) {
  if (!email) return { channel: "email", sent: false, reason: "No email supplied" };
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM) {
    return { channel: "email", sent: false, reason: "Missing SENDGRID_API_KEY or SENDGRID_FROM" };
  }

  await postJson("api.sendgrid.com", "/v3/mail/send", {
    personalizations: [{ to: [{ email }] }],
    from: { email: process.env.SENDGRID_FROM, name: "MediBridge" },
    subject: "Your MediBridge verification code",
    content: [{
      type: "text/plain",
      value: `Your MediBridge ${purpose} code is ${code}. It expires in 5 minutes. Do not share this code with anyone.`
    }]
  }, {
    Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`
  });

  return { channel: "email", sent: true };
}

async function sendOtpSms(phone, code, purpose) {
  const to = normalizePhone(phone);
  if (!to) return { channel: "sms", sent: false, reason: "No phone number supplied" };
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM) {
    return { channel: "sms", sent: false, reason: "Missing Twilio environment variables" };
  }

  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  await postForm("api.twilio.com", `/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    To: to,
    From: process.env.TWILIO_FROM,
    Body: `Your MediBridge ${purpose} code is ${code}. It expires in 5 minutes.`
  }, {
    Authorization: `Basic ${auth}`
  });

  return { channel: "sms", sent: true };
}

async function deliverOtp({ email, phone, code, purpose }) {
  const results = await Promise.allSettled([
    sendOtpEmail(email, code, purpose),
    sendOtpSms(phone, code, purpose)
  ]);

  return results.map(result => result.status === "fulfilled"
    ? result.value
    : { channel: "provider", sent: false, reason: result.reason.message });
}

function verifyOtpCode(verificationId, code, purpose) {
  const record = otpStore.get(verificationId);
  if (!record) return { ok: false, error: "Verification session not found. Please request a new code." };
  if (record.purpose !== purpose) return { ok: false, error: "Verification purpose mismatch. Please request a new code." };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(verificationId);
    return { ok: false, error: "Code expired. Please request a new code." };
  }
  record.attempts += 1;
  if (record.attempts > 5) {
    otpStore.delete(verificationId);
    return { ok: false, error: "Too many attempts. Please request a new code." };
  }
  if (record.codeHash !== hashOtp(code)) return { ok: false, error: "Incorrect verification code." };
  otpStore.delete(verificationId);
  return { ok: true, record };
}

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function send(res, status, payload, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  });
  if (Buffer.isBuffer(payload) || payload instanceof Uint8Array) return res.end(payload);
  res.end(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
  });
}

function publicUser(user) {
  return {
    id: user.id,
    patientId: user.patientId,
    name: user.name,
    email: user.email,
    phone: user.phone
  };
}

function tokenFor(user) {
  return crypto.createHash("sha256").update(`${user.patientId}:${user.email}:medibridge`).digest("hex");
}

function urgencyMessage(text) {
  const urgentWords = [
    "chest pain",
    "can't breathe",
    "cannot breathe",
    "trouble breathing",
    "stroke",
    "faint",
    "unconscious",
    "severe bleeding",
    "suicide",
    "self harm",
    "worst headache",
    "one side weakness"
  ];
  return urgentWords.some(word => text.includes(word));
}

function medicalReply(question = "") {
  const text = question.toLowerCase();
  const safety = "I can share general health information, but I cannot diagnose you. Please speak with a qualified clinician for personal medical decisions.";

  if (urgencyMessage(text)) {
    return `This may be urgent. If symptoms are severe, sudden, or worsening, seek emergency care now or call your local emergency number. ${safety}`;
  }

  if (text.includes("headache") || text.includes("migraine")) {
    return `Headaches can be linked to stress, dehydration, poor sleep, eye strain, infections, or migraine. Rest, fluids, and avoiding triggers may help, but get medical care urgently if it is sudden and severe, follows a head injury, includes fever/stiff neck, weakness, confusion, vision loss, or keeps worsening. ${safety}`;
  }

  if (text.includes("fever") || text.includes("temperature")) {
    return `Fever often means the body is responding to infection or inflammation. Drink fluids, rest, and monitor your temperature. Seek care if fever is very high, lasts more than a few days, comes with breathing difficulty, confusion, stiff neck, rash, dehydration, or affects a young baby. ${safety}`;
  }

  if (text.includes("cough") || text.includes("cold") || text.includes("flu")) {
    return `Coughs and colds are commonly caused by viral infections, allergies, asthma, or irritation. Fluids, rest, honey for adults and older children, and avoiding smoke can help. Seek care for breathing trouble, chest pain, coughing blood, fever that persists, or symptoms lasting more than 2 to 3 weeks. ${safety}`;
  }

  if (text.includes("stomach") || text.includes("diarrhea") || text.includes("vomit") || text.includes("nausea")) {
    return `Stomach upset may come from infections, food irritation, medication effects, stress, or digestive conditions. Sip fluids, consider oral rehydration solution, and eat bland foods as tolerated. Seek care for severe pain, blood in stool or vomit, dehydration, pregnancy, high fever, or symptoms that persist. ${safety}`;
  }

  if (text.includes("blood pressure") || text.includes("hypertension")) {
    return `High blood pressure often has no symptoms, so regular checks matter. Helpful steps include reducing salt, staying active, limiting alcohol, managing stress, and taking prescribed medication consistently. Very high readings with chest pain, breathlessness, severe headache, weakness, or vision changes need urgent care. ${safety}`;
  }

  if (text.includes("diabetes") || text.includes("blood sugar") || text.includes("glucose")) {
    return `Blood sugar concerns are best managed with regular monitoring, medication adherence, balanced meals, activity, and follow-up appointments. Seek urgent care for confusion, fainting, very high readings with vomiting, dehydration, or symptoms of very low sugar such as sweating, shaking, or drowsiness. ${safety}`;
  }

  if (text.includes("pregnan") || text.includes("period") || text.includes("menstrual")) {
    return `Women's health symptoms can have many causes. Track timing, bleeding amount, pain level, pregnancy possibility, and associated symptoms. Seek care urgently for heavy bleeding, severe pelvic pain, fainting, fever, pregnancy with pain or bleeding, or unusual discharge with pain. ${safety}`;
  }

  if (text.includes("medicine") || text.includes("medication") || text.includes("drug") || text.includes("dose")) {
    return `For medication questions, check the label and your clinician's instructions first. Do not change your dose or combine medicines without professional advice. Tell your doctor or pharmacist about allergies, pregnancy, kidney/liver disease, and other medicines or supplements. ${safety}`;
  }

  if (text.includes("stress") || text.includes("anxiety") || text.includes("depress") || text.includes("sleep")) {
    return `Stress, anxiety, low mood, and poor sleep can affect the whole body. Breathing exercises, steady routines, movement, reducing caffeine, and talking with someone trusted may help. If you feel unsafe, may harm yourself, or cannot function, seek urgent mental health support now. ${safety}`;
  }

  if (text.includes("appointment") || text.includes("doctor") || text.includes("department")) {
    return `MediBridge can help you choose a department, prepare questions for your doctor, and book an appointment. Share your main symptom, how long it has lasted, your age, medicines, allergies, and any warning signs so the care team can guide you properly.`;
  }

  return `Thanks for explaining. A good next step is to note when it started, how severe it is, what makes it better or worse, any medicines taken, and any warning signs. If symptoms are severe, sudden, worsening, or worrying, contact a healthcare professional promptly. ${safety}`;
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") return send(res, 204, "");

  if (req.method === "GET" && url.pathname === "/api/health") {
    return send(res, 200, { ok: true, project: "MediBridge", owner: "lawalolamide48-cell" });
  }

  if (req.method === "GET" && url.pathname === "/api/departments") {
    return send(res, 200, { departments });
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/departments/")) {
    const slug = decodeURIComponent(url.pathname.split("/").pop());
    const department = departments.find(item => item.slug === slug);
    return department ? send(res, 200, { department }) : send(res, 404, { error: "Department not found" });
  }

  if (req.method === "POST" && url.pathname === "/api/ai/chat") {
    const body = await readBody(req);
    const message = String(body.message || "").trim();
    if (!message) return send(res, 400, { error: "Message is required" });
    return send(res, 200, {
      reply: medicalReply(message),
      disclaimer: "MediBridge AI provides general information only and is not a replacement for emergency care, diagnosis, or treatment."
    });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readBody(req);
    const patientId = String(body.patientId || "").trim();
    const password = String(body.password || "");
    const user = users.find(item => item.patientId.toLowerCase() === patientId.toLowerCase() && item.password === password);
    if (!user) return send(res, 401, { error: "Invalid patient ID or password" });
    return send(res, 200, { token: tokenFor(user), user: publicUser(user) });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/activate") {
    const body = await readBody(req);
    const patientId = String(body.patientId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = normalizePhone(body.phone);
    if (!patientId || !email || !phone) {
      return send(res, 400, { error: "Patient ID, email, and phone are required" });
    }
    const { verificationId, code } = createOtpRecord({ patientId, email, phone, purpose: "activation" });
    const delivery = await deliverOtp({ email, phone, code, purpose: "activation" });
    const sent = delivery.some(item => item.sent);
    return send(res, sent ? 200 : 202, {
      message: sent
        ? "Verification code sent to your email and phone number."
        : "Verification code generated, but delivery providers are not configured yet.",
      verificationId,
      expiresInSeconds: OTP_TTL_MS / 1000,
      delivery,
      setupRequired: !sent
    });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/verify-otp") {
    const body = await readBody(req);
    const verificationId = String(body.verificationId || "").trim();
    const code = String(body.code || "").trim();
    if (!verificationId || !code) return send(res, 400, { error: "Verification ID and code are required" });
    const result = verifyOtpCode(verificationId, code, "activation");
    if (!result.ok) return send(res, 400, { error: result.error });
    return send(res, 200, { message: "Verification successful" });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/reset-password") {
    const body = await readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const phone = normalizePhone(body.phone);
    const patientId = String(body.patientId || "").trim();
    if (!email && !patientId) return send(res, 400, { error: "Email or patient ID is required" });
    const user = users.find(item =>
      (email && item.email.toLowerCase() === email) ||
      (patientId && item.patientId.toLowerCase() === patientId.toLowerCase())
    );
    const destinationEmail = email || user?.email || "";
    const destinationPhone = phone || user?.phone || "";
    const { verificationId, code } = createOtpRecord({ patientId: patientId || user?.patientId || "", email: destinationEmail, phone: destinationPhone, purpose: "password-reset" });
    const delivery = await deliverOtp({ email: destinationEmail, phone: destinationPhone, code, purpose: "password reset" });
    const sent = delivery.some(item => item.sent);
    return send(res, sent ? 200 : 202, {
      message: sent
        ? "Password reset code sent."
        : "Password reset code generated, but delivery providers are not configured yet.",
      verificationId,
      expiresInSeconds: OTP_TTL_MS / 1000,
      delivery,
      setupRequired: !sent
    });
  }

  if (req.method === "GET" && url.pathname === "/api/appointments") {
    return send(res, 200, { appointments });
  }

  if (req.method === "POST" && url.pathname === "/api/appointments") {
    const body = await readBody(req);
    const required = ["department", "doctor", "date", "time", "reason"];
    const missing = required.filter(key => !body[key]);
    if (missing.length) return send(res, 400, { error: `Missing: ${missing.join(", ")}` });
    const appointment = {
      id: `APT-${Date.now().toString().slice(-6)}`,
      patientId: body.patientId || "MB-2026-001",
      department: body.department,
      doctor: body.doctor,
      date: body.date,
      time: body.time,
      reason: body.reason,
      status: "Upcoming"
    };
    appointments = [appointment, ...appointments];
    return send(res, 201, { appointment });
  }

  return send(res, 404, { error: "API route not found" });
}

function serveStatic(req, res, url) {
  let requested = decodeURIComponent(url.pathname);
  if (requested === "/") requested = "/index.html";
  const filePath = path.normalize(path.join(ROOT, requested));

  if (!filePath.startsWith(ROOT)) {
    return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      return send(res, 404, fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), "text/html; charset=utf-8");
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, contentTypes[ext] || "application/octet-stream");
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return serveStatic(req, res, url);
  } catch (error) {
    return send(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`MediBridge is running at http://localhost:${PORT}`);
});
