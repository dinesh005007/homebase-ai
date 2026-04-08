"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Phone,
  Mail,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

interface ClaimCheckResult {
  warranty_applicable: boolean;
  warranty_details: string | null;
  insurance_applicable: boolean;
  deductible: number | null;
  recommendation: string;
}

export default function CoveragePage() {
  const [propertyId] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("homebase_property_id") || ""
      : ""
  );

  // Claim check state
  const [issueDescription, setIssueDescription] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [checking, setChecking] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimCheckResult | null>(null);

  const handleClaimCheck = async () => {
    if (!issueDescription || !propertyId) return;
    setChecking(true);
    setClaimResult(null);

    try {
      const res = await fetch(`${API_URL}/coverage/claim-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: propertyId,
          issue_description: issueDescription,
          estimated_repair_cost: estimatedCost ? parseFloat(estimatedCost) : null,
        }),
      });
      setClaimResult(await res.json());
    } catch {
      setClaimResult({
        warranty_applicable: false,
        warranty_details: null,
        insurance_applicable: false,
        deductible: null,
        recommendation: "Could not check coverage. Is the API running?",
      });
    } finally {
      setChecking(false);
    }
  };

  // Placeholder warranty data (would come from API)
  const warranties = [
    { provider: "Taylor Morrison", type: "1-Year Workmanship", end: "2027-03-25", active: true, daysLeft: 351 },
    { provider: "Taylor Morrison", type: "2-Year Systems", end: "2028-03-25", active: true, daysLeft: 716 },
    { provider: "Taylor Morrison", type: "10-Year Structural", end: "2036-03-25", active: true, daysLeft: 3639 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div {...fadeIn} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold tracking-tight">Coverage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Warranties, insurance, and claim assistance
        </p>
      </motion.div>

      {/* Warranty Timeline */}
      <motion.div {...fadeIn} transition={{ duration: 0.3, delay: 0.05 }}>
        <h2 className="text-lg font-semibold mb-3">Warranty Timeline</h2>
        <div className="space-y-2">
          {warranties.map((w) => (
            <div
              key={w.type}
              className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{w.type}</p>
                <p className="text-xs text-muted-foreground">{w.provider}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-bold text-emerald-500">{w.daysLeft}d</p>
                <p className="text-[11px] text-muted-foreground">expires {w.end}</p>
              </div>
              {/* Progress bar */}
              <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(100, (w.daysLeft / 365) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Insurance Summary */}
      <motion.div {...fadeIn} transition={{ duration: 0.3, delay: 0.1 }}>
        <h2 className="text-lg font-semibold mb-3">Insurance</h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Shield className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No insurance policies added</p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload your insurance policy document to auto-extract coverage details
            </p>
          </div>
        </div>
      </motion.div>

      {/* Claim Check Assistant */}
      <motion.div {...fadeIn} transition={{ duration: 0.3, delay: 0.15 }}>
        <h2 className="text-lg font-semibold mb-3">Claim Check Assistant</h2>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Describe an issue and we'll check if it's covered by warranty or insurance.
          </p>
          <textarea
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder="e.g., Grout cracking in master bathroom, HVAC making grinding noise..."
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
          <div className="flex gap-3">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="number"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="Estimated repair cost (optional)"
                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleClaimCheck}
              disabled={checking || !issueDescription || !propertyId}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors duration-150 cursor-pointer"
            >
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <HelpCircle className="h-4 w-4" />}
              Check Coverage
            </button>
          </div>

          {/* Result */}
          {claimResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-border bg-background p-4 space-y-3"
            >
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  {claimResult.warranty_applicable ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">
                    Warranty: {claimResult.warranty_applicable ? "Covered" : "Not covered"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {claimResult.insurance_applicable ? (
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">
                    Insurance: {claimResult.insurance_applicable ? `$${claimResult.deductible?.toLocaleString()} deductible` : "No policy"}
                  </span>
                </div>
              </div>
              {claimResult.warranty_details && (
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted rounded p-2">
                  {claimResult.warranty_details}
                </pre>
              )}
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
                <p className="text-sm font-medium text-primary">Recommendation</p>
                <p className="text-sm mt-1">{claimResult.recommendation}</p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
