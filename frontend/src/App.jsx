import React, { useState, useEffect } from "react";
import { Thermometer, Droplets, Sun, Leaf } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function TerrariumDashboard() {
  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    light: 0,
    soil: 0,
  });

  const [tempHistory, setTempHistory] = useState([]);
  const [humidityHistory, setHumidityHistory] = useState([]);

  useEffect(() => {
    const es = new EventSource("http://192.168.1.106:3000/api/sensors/stream");

    es.addEventListener("reading", (e) => {
      const data = JSON.parse(e.data);

      setSensorData({
        temperature: Number(data.temperature ?? 0),
        humidity: Number(data.humidity ?? 0),
        light: Number(data.light ?? 0),
        soil: Number(data.soil ?? 0),
      });

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

    es.onerror = (err) => {
      console.error("SSE error:", err);
    };

    return () => {
      es.close();
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f7faf7]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#2f4f3e] text-white p-6">
        <h1 className="text-xl font-semibold mb-8">TerraMonitor</h1>
        <nav className="space-y-4 text-sm">
          <div className="font-medium">Dashboard</div>
          <div className="opacity-80">Analytics</div>
          <div className="opacity-80">Sensors</div>
          <div className="opacity-80">Plants</div>
          <div className="opacity-80">Settings</div>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-semibold mb-6">Terrarium Monitor</h2>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span>Temperature</span>
              <Thermometer size={18} />
            </div>
            <div className="text-2xl font-semibold">
              {sensorData.temperature.toFixed(1)} °C
            </div>
            <p className="text-sm text-green-600 mt-1">Healthy</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span>Humidity</span>
              <Droplets size={18} />
            </div>
            <div className="text-2xl font-semibold">
              {sensorData.humidity.toFixed(1)} %
            </div>
            <p className="text-sm text-green-600 mt-1">Healthy</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span>Light Level</span>
              <Sun size={18} />
            </div>
            <div className="text-2xl font-semibold">
              {sensorData.light.toFixed(1)} lux
            </div>
            <p className="text-sm text-yellow-600 mt-1">
              {sensorData.light < 50 ? "Low" : "Normal"}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span>Soil Moisture</span>
              <Leaf size={18} />
            </div>
            <div className="text-2xl font-semibold">{sensorData.soil}%</div>
            <p className="text-sm text-green-600 mt-1">
              {sensorData.soil < 20 ? "Dry" : "Healthy"}
            </p>
          </div>
        </div>

        {/* Charts */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow">
            <h3 className="font-medium mb-4">Temperature Trends</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={tempHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#ff6b6b"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow">
            <h3 className="font-medium mb-4">Humidity Trends</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={humidityHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#4dabf7"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div> */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow">
            <h3 className="font-medium mb-4">Temperature Trends</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={tempHistory.filter((item, index) => {
                return index % 1800 === 0;
              })}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time"
                  tickFormatter={(time) => {
                    // Remove seconds if present
                    return time.split(':').slice(0, 2).join(':') + ' ' + time.split(' ')[1];
                  }}
                />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#ff6b6b"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow">
            <h3 className="font-medium mb-4">Humidity Trends</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={humidityHistory.filter((item, index) => {
                return index % 1800 === 0;
              })}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time"
                  tickFormatter={(time) => {
                    return time.split(':').slice(0, 2).join(':') + ' ' + time.split(' ')[1];
                  }}
                />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#4dabf7"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Footer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 text-sm">
          <div className="bg-white rounded-2xl p-5 shadow">
            System Status
            <div className="text-green-600">All systems operational</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow">
            Active Sensors
            <div className="font-medium">4 / 4</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow">
            Last Updated
            <div className="opacity-80">{new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      </main>
    </div>
  );
}