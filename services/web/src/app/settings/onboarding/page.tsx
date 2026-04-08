"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Building2,
  DoorOpen,
  FileText,
  Wrench,
  Wifi,
  Rocket,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    id: "welcome",
    title: "Welcome to HomeBase AI",
    description: "Let's set up your home operating system. This takes about 5 minutes.",
    icon: Home,
  },
  {
    id: "property",
    title: "Home Profile",
    description: "Tell us about your property — address, builder, and purchase date.",
    icon: Building2,
    fields: [
      { name: "name", label: "Home Name", placeholder: "e.g., Cottontail Way Home" },
      { name: "address", label: "Address", placeholder: "809 Cottontail Way" },
      { name: "city", label: "City", placeholder: "Celina" },
      { name: "state", label: "State", placeholder: "TX" },
      { name: "zip", label: "ZIP Code", placeholder: "75009" },
      { name: "builder", label: "Builder", placeholder: "Taylor Morrison" },
      { name: "model", label: "Builder Model", placeholder: "Bordeaux" },
      { name: "purchase_date", label: "Purchase Date", placeholder: "", type: "date" },
    ],
  },
  {
    id: "rooms",
    title: "Rooms",
    description: "Select the rooms in your home. You can add more later.",
    icon: DoorOpen,
    options: [
      "Primary Bedroom", "Guest Bedroom", "Kids Room", "Kitchen",
      "Living Room", "Dining Room", "Office", "Garage",
      "Primary Bath", "Guest Bath", "Laundry", "Patio",
    ],
  },
  {
    id: "documents",
    title: "Documents",
    description: "Upload your key home documents. We'll auto-classify and index them.",
    icon: FileText,
    docTypes: ["Warranty Packet", "Insurance Policy", "HOA CC&Rs", "Closing Documents"],
  },
  {
    id: "appliances",
    title: "Key Appliances",
    description: "List your major appliances so we can track warranties and maintenance.",
    icon: Wrench,
    options: [
      "HVAC System", "Water Heater", "Washer", "Dryer",
      "Refrigerator", "Dishwasher", "Oven/Range", "Microwave",
      "Garage Door Opener", "Irrigation System", "Water Softener", "Pool Equipment",
    ],
  },
  {
    id: "smarthome",
    title: "Smart Home",
    description: "Connect Home Assistant for sensor monitoring and automation.",
    icon: Wifi,
    optional: true,
  },
  {
    id: "ready",
    title: "You're All Set!",
    description: "HomeBase AI is ready. Try asking a question about your home.",
    icon: Rocket,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [selectedAppliances, setSelectedAppliances] = useState<Set<string>>(new Set());

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const toggleSet = (set: Set<string>, setFn: (s: Set<string>) => void, item: string) => {
    const next = new Set(set);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    setFn(next);
  };

  const handleFinish = () => {
    // Save property ID if it was created
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-8 flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                i <= currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-border bg-card p-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <step.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{step.title}</h2>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>

            {/* Property form */}
            {step.id === "property" && step.fields && (
              <div className="grid gap-3 sm:grid-cols-2">
                {step.fields.map((field) => (
                  <div key={field.name} className={field.name === "address" ? "sm:col-span-2" : ""}>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      {field.label}
                    </label>
                    <input
                      type={field.type || "text"}
                      value={formData[field.name] || ""}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Room / Appliance selection */}
            {(step.id === "rooms" || step.id === "appliances") && step.options && (
              <div className="grid gap-2 sm:grid-cols-3">
                {step.options.map((opt) => {
                  const selected = step.id === "rooms" ? selectedRooms.has(opt) : selectedAppliances.has(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() =>
                        step.id === "rooms"
                          ? toggleSet(selectedRooms, setSelectedRooms, opt)
                          : toggleSet(selectedAppliances, setSelectedAppliances, opt)
                      }
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      {selected && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Documents step */}
            {step.id === "documents" && step.docTypes && (
              <div className="space-y-2">
                {step.docTypes.map((doc) => (
                  <div
                    key={doc}
                    className="flex items-center gap-3 rounded-lg border border-border px-4 py-3"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1">{doc}</span>
                    <label className="text-xs text-primary cursor-pointer hover:underline">
                      Upload
                      <input type="file" accept=".pdf" className="hidden" />
                    </label>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-2">
                  You can upload more documents anytime from the Document Vault.
                </p>
              </div>
            )}

            {/* Smart home step */}
            {step.id === "smarthome" && (
              <div className="rounded-lg bg-muted/50 border border-border p-4 text-center">
                <Wifi className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm">Home Assistant integration is optional.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure HA_URL and HA_TOKEN in Settings when ready.
                </p>
              </div>
            )}

            {/* Ready step */}
            {step.id === "ready" && (
              <div className="text-center py-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Rocket className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Your home operating system is configured. Head to the dashboard to explore.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={isFirst}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-0 transition-all duration-150 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          {isLast ? (
            <button
              onClick={handleFinish}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-150 cursor-pointer"
            >
              Go to Dashboard
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep((s) => s + 1)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-150 cursor-pointer"
            >
              {currentStep === 0 ? "Get Started" : "Next"}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
