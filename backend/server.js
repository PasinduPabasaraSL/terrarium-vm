const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

// ===================== DATABASE =====================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then(() => console.log("PostgreSQL connected"))
  .catch(err => console.error(err));

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sensor_readings(
      id SERIAL PRIMARY KEY,
      device_name TEXT,
      temperature FLOAT,
      humidity FLOAT,
      light FLOAT,
      soil FLOAT,
      water INTEGER,
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

// Time & Sampling constants
const SIX_HOURS = 6 * 60 * 60 * 1000;
const REQUIRED_SAMPLES = 10;
const SAMPLE_DELAY = 30 * 1000;


// ===================== DEVICE CONTROL =====================

let controlState = {
  light: false,
  pump: false 
};

// ===================== SSE =====================

function sseSend(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// ===================== ROUTES =====================

app.get("/", (req, res) => {
  res.send("IoT Backend is running");
});

// ===================== STREAM =====================

app.get("/api/sensors/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (latestReading) {
    sseSend(res, "reading", latestReading);
  }

  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

// ===================== DATABASE INSERT =====================

async function storeToDB(deviceName, data) {
  try {
    await pool.query(`
      INSERT INTO sensor_readings (
        device_name, temperature, humidity, light, soil, water, pump, kind, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      deviceName,
      data.temperature,
      data.humidity,
      data.light,
      data.soil,
      data.water,
      data.pump,
      "sample",
      new Date()
    ]);

    console.log("Saved to PostgreSQL");
  } catch (err) {
    console.log("DB Error:", err.message);
  }
}

// ===================== 6 HOUR SAMPLING =====================

function startSampling(deviceName) {
  console.log("Starting 10 sample collection");
  let count = 0;

  const interval = setInterval(async () => {
    const current = devices[deviceName]?.status;
    if (!current) return;

    await storeToDB(deviceName, { ...current });
    count++;
    console.log(`Saved sample ${count}/10`);

    if (count >= REQUIRED_SAMPLES) {
      clearInterval(interval);
      devices[deviceName].lastBatch = Date.now();
      console.log("10 samples completed");
    }
  }, SAMPLE_DELAY);
}

function checkSampling(deviceName) {
  if (!devices[deviceName]) {
    devices[deviceName] = {
      status: null,
      lastBatch: 0
    };
  }

  const now = Date.now();
  const last = devices[deviceName].lastBatch;

  if (now - last >= SIX_HOURS) {
    devices[deviceName].lastBatch = now;
    startSampling(deviceName);
  }
}

// ===================== SENSOR RECEIVE =====================

app.post("/api/sensors", (req, res) => {
  const data = {
    temperature: Number(req.body.temperature ?? 0),
    humidity: Number(req.body.humidity ?? 0),
    light: Number(req.body.light ?? 0),
    soil: Number(req.body.soil ?? 0),
    water: Number(req.body.water ?? 0),
    pump: req.body.pump == 1 || req.body.pump === true,
    timestamp: new Date().toISOString()
  };

  const deviceName = req.body.deviceName || "terrarium-1";
  console.log("Received:", data);
  latestReading = data;

  // Realtime frontend dispatch
  for (const client of sseClients) {
    sseSend(client, "reading", data);
  }

  if (!devices[deviceName]) {
    devices[deviceName] = {
      status: null,
      lastBatch: 0
    };
  }

  devices[deviceName].status = data;

  // Check 6 hour timer
  checkSampling(deviceName);

  res.json({ status: "ok" });
});


// ===================== LIGHT CONTROL =====================

app.post("/api/control/light", (req,res)=>{

  const state =
    req.body.state === true ||
    req.body.state === 1 ||
    req.body.state === "1";

  controlState.light = state;

  console.log(
    "Light command:",
    state ? "ON" : "OFF"
  );

  res.json({
    status:"ok",
    light:controlState.light
  });

});

// ===================== PUMP CONTROL =====================

app.post("/api/control/pump", (req,res)=>{

  const state =
    req.body.state === true ||
    req.body.state === 1 ||
    req.body.state === "1";

  controlState.pump = state;

  console.log(
    "Pump command:",
    state ? "ON" : "OFF"
  );

  res.json({
    status:"ok",
    pump:controlState.pump
  });

});


// ===================== GET CONTROL STATUS (ESP32) =====================

app.get("/api/control", (req,res)=>{
  res.json(controlState);
});

// ===================== HISTORY =====================

app.get("/api/sensors/history", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM sensor_readings ORDER BY timestamp DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ===================== HEALTH =====================

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ===================== START =====================

app.listen(3000, "0.0.0.0", () => {
  console.log("Backend running on port 3000");
});