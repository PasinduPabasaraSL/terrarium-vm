const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

// ===================== DB SETUP =====================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool
  .connect()
  .then(() => console.log("PostgreSQL connected"))
  .catch((err) => console.error("PostgreSQL connection error:", err));

// Create table if not exists
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id SERIAL PRIMARY KEY,
      device_name TEXT,
      temperature FLOAT,
      humidity FLOAT,
      light FLOAT,
      soil FLOAT,
      pump BOOLEAN,
      kind TEXT,
      timestamp TIMESTAMP
    );
  `);

  console.log("Database table ready");
}

initDB();

// ===================== STATE =====================
let latestReading = null;
const sseClients = new Set();
const devices = {};

const SAMPLE_EVERY_MS = 30 * 60 * 1000;

// ===================== SSE HELPERS =====================
function sseSend(res, event, dataObj) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(dataObj)}\n\n`);
}

// ===================== ROUTES =====================

app.get("/", (req, res) => {
  res.send("IoT Backend is running");
});

// SSE stream
app.get("/api/sensors/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  sseSend(res, "hello", { ok: true, ts: new Date().toISOString() });

  if (latestReading) sseSend(res, "reading", latestReading);

  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

// ===================== CORE STORAGE =====================
async function storeToDB(deviceName, data, kind) {
  try {
    await pool.query(
      `
      INSERT INTO sensor_readings
      (device_name, temperature, humidity, light, soil, pump, kind, timestamp)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        deviceName,
        data.temperature,
        data.humidity,
        data.light,
        data.soil,
        data.pump,
        kind,
        new Date(),
      ]
    );
  } catch (err) {
    console.error("DB insert error:", err.message);
  }
}

// ===================== MEMORY + LOGIC =====================
function storeReadingToMemory(data) {
  const deviceName = (data.deviceName || "terrarium-1").toString();

  const pumpBool =
    data.pump === 1 || data.pump === true || data.pump === "1";

  const temperature =
    typeof data.temperature === "number" ? data.temperature : null;
  const humidity =
    typeof data.humidity === "number" ? data.humidity : null;
  const light = typeof data.light === "number" ? data.light : null;
  const soil = typeof data.soil === "number" ? data.soil : null;

  if (!devices[deviceName]) {
    devices[deviceName] = { status: null, history: [] };
  }

  const prevPump = devices[deviceName].status?.pump ?? null;

  const now = Date.now();

  const lastSample = devices[deviceName].history
    .filter((r) => r.kind === "sample")
    .slice(-1)[0];

  const lastSampleMs = lastSample
    ? new Date(lastSample.timestamp).getTime()
    : 0;

  const sampleDue = !lastSample || now - lastSampleMs >= SAMPLE_EVERY_MS;

  // SAMPLE
  if (sampleDue) {
    const sample = {
      kind: "sample",
      timestamp: new Date().toISOString(),
      temperature,
      humidity,
      light,
      soil,
      pump: pumpBool,
    };

    devices[deviceName].history.push(sample);

    // async DB save
    storeToDB(deviceName, sample, "sample");
  }

  // EVENT
  const pumpChanged =
    prevPump !== null && typeof prevPump === "boolean" && pumpBool !== prevPump;

  if (pumpChanged) {
    const event = {
      kind: "event",
      timestamp: new Date().toISOString(),
      temperature,
      humidity,
      light,
      soil,
      pump: pumpBool,
      event: pumpBool ? "PUMP_ON" : "PUMP_OFF",
    };

    devices[deviceName].history.push(event);

    storeToDB(deviceName, event, event.event);
  }

  devices[deviceName].status = {
    temperature,
    humidity,
    light,
    soil,
    pump: pumpBool,
  };

  return { storedSample: sampleDue, storedEvent: pumpChanged };
}

// ===================== SENSOR INPUT =====================
app.post("/api/sensors", (req, res) => {
  const data = {
    ...req.body,
    timestamp: new Date().toISOString(),
  };

  latestReading = data;

  console.log("Received:", data);

  // push to SSE clients
  for (const clientRes of sseClients) {
    sseSend(clientRes, "reading", data);
  }

  const result = storeReadingToMemory(data);

  res.status(200).json({ status: "ok", ...result });
});

// ===================== LATEST =====================
app.get("/api/sensors/latest", (req, res) => {
  const deviceName = (req.query.deviceName || "terrarium-1").toString();

  if (devices[deviceName]?.status) {
    return res.json(devices[deviceName].status);
  }

  return res.json(latestReading);
});

// ===================== HISTORY =====================
app.get("/api/sensors/history", (req, res) => {
  const deviceName = (req.query.deviceName || "terrarium-1").toString();
  const days = Math.min(parseInt(req.query.days || "7", 10), 120);

  if (!devices[deviceName]) return res.json([]);

  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = devices[deviceName].history.filter(
    (r) => new Date(r.timestamp) >= from
  );

  res.json(rows);
});

// ===================== HEALTH =====================
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ===================== START SERVER =====================
app.listen(3000, "0.0.0.0", () => {
  console.log("Backend running on http://0.0.0.0:3000");
});