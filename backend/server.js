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
const historyClients = new Set();
const devices = {};

const SIX_HOURS = 6 * 60 * 60 * 1000;
const REQUIRED_SAMPLES = 10;
const SAMPLE_DELAY = 30 * 1000;

// ===================== CONTROL =====================

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
  res.send("IoT Backend running");
});

// ===================== SENSOR STREAM =====================

app.get("/api/sensors/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  if (latestReading) {
    sseSend(res, "reading", latestReading);
  }

  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

// ===================== HISTORY STREAM =====================

app.get("/api/history/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  historyClients.add(res);

  req.on("close", () => {
    historyClients.delete(res);
  });
});

// ===================== DATABASE SAVE =====================

async function storeToDB(deviceName, data) {
  try {
    await pool.query(
      `INSERT INTO sensor_readings 
        (device_name, temperature, humidity, light, soil, water, pump, kind, timestamp) 
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        deviceName,
        data.temperature,
        data.humidity,
        data.light,
        data.soil,
        data.water,
        data.pump,
        "sample",
        new Date()
      ]
    );

    // Get latest saved row
    const result = await pool.query(
      `SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 1`
    );

    // Send history update
    for (const client of historyClients) {
      sseSend(client, "history", result.rows[0]);
    }

    console.log("Saved to PostgreSQL");

  } catch (err) {
    console.log("DB error", err.message);
  }
}

// ===================== SAMPLING =====================

function startSampling(deviceName) {
  console.log("Starting 10 samples");
  let count = 0;

  const interval = setInterval(async () => {
    const current = devices[deviceName]?.status;

    if (!current) return;

    await storeToDB(deviceName, current);
    count++;
    
    console.log(`Saved sample ${count}/10`);

    if (count >= REQUIRED_SAMPLES) {
      clearInterval(interval);
      devices[deviceName].lastBatch = Date.now();
      console.log("Batch completed");
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

  if (now - devices[deviceName].lastBatch >= SIX_HOURS) {
    devices[deviceName].lastBatch = now;
    startSampling(deviceName);
  }
}

// ===================== RECEIVE ESP32 =====================

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
  latestReading = data;

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
  checkSampling(deviceName);

  res.json({ status: "ok" });
});

// ===================== CONTROL =====================

app.post("/api/control/light", (req, res) => {
  controlState.light = req.body.state === true || req.body.state === 1 || req.body.state === "1";
  res.json(controlState);
});

app.post("/api/control/pump", (req, res) => {
  controlState.pump = req.body.state === true || req.body.state === 1 || req.body.state === "1";
  res.json(controlState);
});

app.get("/api/control", (req, res) => {
  res.json(controlState);
});

// ===================== HISTORY API =====================

app.get("/api/sensors/history", async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM sensor_readings ORDER BY timestamp DESC`
  );
  res.json(result.rows);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Backend running on 3000");
});