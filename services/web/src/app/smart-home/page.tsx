"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wifi,
  WifiOff,
  Thermometer,
  Droplets,
  DoorOpen,
  Zap,
  Camera,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiBase } from "@/lib/api";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const sensorTypes = [
  { type: "temperature", icon: Thermometer, unit: "°F", color: "text-orange-500", bg: "bg-orange-500/10" },
  { type: "humidity", icon: Droplets, unit: "%", color: "text-blue-500", bg: "bg-blue-500/10" },
  { type: "door", icon: DoorOpen, unit: "", color: "text-violet-500", bg: "bg-violet-500/10" },
  { type: "power", icon: Zap, unit: "W", color: "text-amber-500", bg: "bg-amber-500/10" },
];

export default function SmartHomePage() {
  const [haConnected, setHaConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check HA status
    fetch(`${getApiBase()}/smarthome/status`)
      .then((r) => r.json())
      .then((data) => setHaConnected(data.ha_connected))
      .catch(() => setHaConnected(false))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div {...fadeIn} transition={{ duration: 0.3 }} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Smart Home</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sensors, cameras, and device monitoring
          </p>
        </div>
        <div className={cn(
          "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
          haConnected ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
        )}>
          {haConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {haConnected ? "HA Connected" : "HA Not Connected"}
        </div>
      </motion.div>

      {/* Not Connected State */}
      {!loading && !haConnected && (
        <motion.div {...fadeIn} transition={{ duration: 0.3, delay: 0.05 }}>
          <div className="rounded-2xl border-2 border-dashed border-border p-6 sm:p-12 text-center">
            <WifiOff className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-semibold">Home Assistant Not Connected</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Set <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">HA_URL</code> and{" "}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">HA_TOKEN</code> in your{" "}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">.env</code> file to connect.
            </p>
            <div className="mt-6 rounded-lg bg-card border border-border p-4 max-w-sm mx-auto text-left">
              <p className="text-xs font-mono text-muted-foreground">
                HA_URL=http://homeassistant.local:8123<br />
                HA_TOKEN=your_long_lived_access_token
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sensor Grid (placeholder when not connected) */}
      <motion.div {...fadeIn} transition={{ duration: 0.3, delay: 0.1 }}>
        <h2 className="text-lg font-semibold mb-3">Sensors</h2>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {sensorTypes.map((sensor) => (
            <div
              key={sensor.type}
              className="rounded-2xl border border-border bg-card p-3 sm:p-4 transition-colors duration-200 hover:bg-accent/50 cursor-pointer min-h-[44px]"
            >
              <div className="flex items-center gap-3">
                <sensor.icon className={cn("h-5 w-5 shrink-0", sensor.color)} />
                <div>
                  <p className="text-sm font-medium capitalize">{sensor.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {haConnected ? "Monitoring" : "Waiting for HA"}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold font-mono text-muted-foreground">
                  —{sensor.unit && <span className="text-sm ml-0.5">{sensor.unit}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Cameras */}
      <motion.div {...fadeIn} transition={{ duration: 0.3, delay: 0.15 }}>
        <h2 className="text-lg font-semibold mb-3">Cameras</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {["Front Door", "Backyard", "Garage"].map((name) => (
            <div
              key={name}
              className="rounded-2xl border border-border bg-card overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors duration-200"
            >
              <div className="aspect-video bg-muted flex items-center justify-center">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="px-4 py-3">
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {haConnected ? "Live" : "Offline"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Alerts */}
      <motion.div {...fadeIn} transition={{ duration: 0.3, delay: 0.2 }}>
        <h2 className="text-lg font-semibold mb-3">Alerts</h2>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500/40 mb-2" />
            <p className="text-sm font-medium">No active alerts</p>
            <p className="text-xs text-muted-foreground mt-1">
              Sensor alerts will appear here when Home Assistant is connected
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
