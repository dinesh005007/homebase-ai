"use client";

import { motion } from "framer-motion";
import {
  Building2,
  Thermometer,
  Droplets,
  Zap,
  Wind,
  DoorOpen,
} from "lucide-react";

const systems = [
  { name: "HVAC", icon: Thermometer, status: "Operational", rooms: 8 },
  { name: "Plumbing", icon: Droplets, status: "Operational", rooms: 6 },
  { name: "Electrical", icon: Zap, status: "Operational", rooms: 12 },
  { name: "Ventilation", icon: Wind, status: "Operational", rooms: 4 },
];

const rooms = [
  { name: "Primary Bedroom", sqft: 280, systems: 4, assets: 6 },
  { name: "Kitchen", sqft: 220, systems: 5, assets: 12 },
  { name: "Living Room", sqft: 340, systems: 3, assets: 4 },
  { name: "Garage", sqft: 480, systems: 2, assets: 8 },
  { name: "Primary Bath", sqft: 120, systems: 4, assets: 7 },
  { name: "Laundry", sqft: 60, systems: 3, assets: 3 },
];

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function HomeProfilePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div {...fadeIn} transition={{ duration: 0.3 }}>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Home Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Rooms, systems, and assets for your property
        </p>
      </motion.div>

      {/* Property Card */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex items-start gap-4">
          <Building2 className="h-7 w-7 text-primary shrink-0" />
          <div>
            <h2 className="text-lg font-semibold">809 Cottontail Way</h2>
            <p className="text-sm text-muted-foreground">
              Celina, TX 75009
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span className="text-muted-foreground">
                Builder: <span className="text-foreground font-medium">Taylor Morrison</span>
              </span>
              <span className="text-muted-foreground">
                Model: <span className="text-foreground font-medium">Bordeaux</span>
              </span>
              <span className="text-muted-foreground">
                Closed: <span className="text-foreground font-medium">Mar 25, 2026</span>
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Systems */}
      <motion.div {...fadeIn} transition={{ duration: 0.3, delay: 0.1 }}>
        <h2 className="text-lg font-semibold mb-3">Systems</h2>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {systems.map((sys) => (
            <div
              key={sys.name}
              className="rounded-2xl border border-border bg-card p-3 sm:p-4 transition-colors duration-200 hover:bg-accent/50 cursor-pointer min-h-[44px]"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <sys.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">{sys.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {sys.rooms} rooms
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-emerald-500">{sys.status}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Rooms */}
      <motion.div {...fadeIn} transition={{ duration: 0.3, delay: 0.15 }}>
        <h2 className="text-lg font-semibold mb-3">Rooms</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <div
              key={room.name}
              className="rounded-2xl border border-border bg-card p-3 sm:p-4 transition-colors duration-200 hover:bg-accent/50 cursor-pointer min-h-[44px]"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <DoorOpen className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">{room.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {room.sqft} sq ft
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span>{room.systems} systems</span>
                <span>{room.assets} assets</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
