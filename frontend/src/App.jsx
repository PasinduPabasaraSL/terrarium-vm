import React, { useState, useEffect } from "react";
import { Thermometer, Droplets, Sun, Leaf, Menu, X } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ---------- History Page ----------
function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch("http://104.214.174.52:5000/api/sensors/history")
      .then((r) => r.json())
      .then((data) => {
        const mapped = data.map((row) => ({
          time: new Date(row.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          date: new Date(row.timestamp).toLocaleDateString(),
          temperature: Number(row.temperature ?? 0),
          humidity: Number(row.humidity ?? 0),
          soil: Number(row.soil ?? 0),
        }));
        setHistory(mapped);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load history.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Temperature History */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Thermometer size={18} className="text-red-400" />
          Temperature History
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={32} unit="°C" />
            <Tooltip formatter={(v) => [`${v} °C`, "Temperature"]} />
            <Line type="monotone" dataKey="temperature" stroke="#ff6b6b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Humidity History */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Droplets size={18} className="text-blue-400" />
          Humidity History
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={32} unit="%" />
            <Tooltip formatter={(v) => [`${v} %`, "Humidity"]} />
            <Line type="monotone" dataKey="humidity" stroke="#4dabf7" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Soil Moisture History */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Leaf size={18} className="text-green-500" />
          Soil Moisture History
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={32} unit="%" />
            <Tooltip formatter={(v) => [`${v} %`, "Soil Moisture"]} />
            <Line type="monotone" dataKey="soil" stroke="#51cf66" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Raw Table */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow overflow-x-auto">
        <h3 className="font-medium mb-4">All Readings</h3>
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="pb-2 pr-4 font-medium">Date</th>
              <th className="pb-2 pr-4 font-medium">Time</th>
              <th className="pb-2 pr-4 font-medium">Temp (°C)</th>
              <th className="pb-2 pr-4 font-medium">Humidity (%)</th>
              <th className="pb-2 font-medium">Soil (%)</th>
            </tr>
          </thead>
          <tbody>
            {history.slice().reverse().map((row, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-2 pr-4 text-gray-500">{row.date}</td>
                <td className="py-2 pr-4">{row.time}</td>
                <td className="py-2 pr-4 text-red-500">{row.temperature.toFixed(1)}</td>
                <td className="py-2 pr-4 text-blue-500">{row.humidity.toFixed(1)}</td>
                <td className="py-2 text-green-600">{row.soil}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Dashboard Page ----------
function DashboardPage({ sensorData, tempHistory, humidityHistory, lastUpdated }) {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white rounded-2xl p-4 md:p-5 shadow">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span>Temperature</span>
            <Thermometer size={18} />
          </div>
          <div className="text-xl md:text-2xl font-semibold">
            {sensorData.temperature.toFixed(1)} °C
          </div>
          <p className="text-xs md:text-sm text-green-600 mt-1">Healthy</p>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 shadow">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span>Humidity</span>
            <Droplets size={18} />
          </div>
          <div className="text-xl md:text-2xl font-semibold">
            {sensorData.humidity.toFixed(1)} %
          </div>
          <p className="text-xs md:text-sm text-green-600 mt-1">Healthy</p>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 shadow">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span>Light Level</span>
            <Sun size={18} />
          </div>
          <div className="text-xl md:text-2xl font-semibold">
            {sensorData.light.toFixed(1)} lux
          </div>
          <p className="text-xs md:text-sm text-yellow-600 mt-1">
            {sensorData.light < 50 ? "Low" : "Normal"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 shadow">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span>Soil Moisture</span>
            <Leaf size={18} />
          </div>
          <div className="text-xl md:text-2xl font-semibold">{sensorData.soil}%</div>
          <p className="text-xs md:text-sm text-green-600 mt-1">
            {sensorData.soil < 20 ? "Dry" : "Healthy"}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 md:p-5 shadow">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span>Water Level</span>
            <Leaf size={18} />
          </div>
          <div className="text-xl md:text-2xl font-semibold">
            {sensorData.water === 1 ? "Available" : "Empty"}
          </div>
            <p
              className={`text-xs md:text-sm mt-1 ${
                sensorData.water === 1 ? "text-green-600" : "text-red-600"
              }`}
            >
              {sensorData.water === 1 ? "Water Detected" : "No Water"}
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 text-sm">
        <div className="bg-white rounded-2xl p-4 md:p-5 shadow">
          System Status
          <div className="text-green-600">All systems operational</div>
        </div>
        <div className="bg-white rounded-2xl p-4 md:p-5 shadow">
          Active Sensors
          <div className="font-medium">4 / 4</div>
        </div>
      </div>
    </div>
  );
}

// ---------- Main App ----------
export default function TerrariumDashboard() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    light: 0,
    soil: 0,
    water: 0,
    pump: 0,
  });
  const [tempHistory, setTempHistory] = useState([]);
  const [humidityHistory, setHumidityHistory] = useState([]);

  useEffect(() => {
    const es = new EventSource(
      "http://104.214.174.52:5000/api/sensors/stream"
    );

    es.addEventListener("reading", (e) => {
      const data = JSON.parse(e.data);

      setSensorData({
        temperature: Number(data.temperature ?? 0),
        humidity: Number(data.humidity ?? 0),
        light: Number(data.light ?? 0),
        soil: Number(data.soil ?? 0),
        water: Number(data.water ?? 0),
        pump: Number(data.pump ?? 0),
      });

      setLastUpdated(new Date().toLocaleTimeString());

      const label = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setTempHistory((prev) => [
        ...prev.slice(-19),
        { time: label, value: Number(data.temperature ?? 0) },
      ]);

      setHumidityHistory((prev) => [
        ...prev.slice(-19),
        { time: label, value: Number(data.humidity ?? 0) },
      ]);
    });

    es.onerror = (err) => console.error("SSE error:", err);

    return () => es.close();
  }, []);

  const navigate = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  const pageTitle = activePage === "dashboard" ? "Terrarium Monitor" : "Sensor History";

  return (
    <div className="flex min-h-screen bg-[#f7faf7] relative">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-[#2f4f3e] text-white p-6 z-30
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0 md:shrink-0 md:min-h-screen md:h-auto
        `}
      >
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-semibold">TerraMonitor</h1>
          <button
            className="md:hidden text-white opacity-70 hover:opacity-100"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="space-y-4 text-sm">
          <div
            className={`cursor-pointer ${activePage === "dashboard" ? "font-medium" : "opacity-80"}`}
            onClick={() => navigate("dashboard")}
          >
            Dashboard
          </div>
          <div
            className={`cursor-pointer ${activePage === "history" ? "font-medium" : "opacity-80"}`}
            onClick={() => navigate("history")}
          >
            History
          </div>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">

        {/* Mobile top bar */}
        <div className="flex md:hidden items-center gap-3 px-4 py-4 border-b border-gray-100 bg-[#f7faf7] sticky top-0 z-10">
          <button
            className="p-1 rounded hover:bg-gray-200 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} className="text-[#2f4f3e]" />
          </button>
          <span className="text-xl font-semibold text-gray-800">{pageTitle}</span>
        </div>

        <div className="p-4 md:p-8">
          <h2 className="hidden md:block text-2xl font-semibold mb-6">{pageTitle}</h2>

          {activePage === "dashboard" && (
            <DashboardPage
              sensorData={sensorData}
              tempHistory={tempHistory}
              humidityHistory={humidityHistory}
              lastUpdated={lastUpdated}
            />
          )}

          {activePage === "history" && <HistoryPage />}
        </div>
      </main>
    </div>
  );
}