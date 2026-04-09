"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

/**
 * Shared hook that auto-fetches the first property from the API.
 * Caches the property ID in localStorage for offline resilience.
 * All pages should use this instead of reading localStorage directly.
 */
export function usePropertyId() {
  const [propertyId, setPropertyId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try localStorage first for instant render
    const cached = localStorage.getItem("homebase_property_id");
    if (cached) {
      setPropertyId(cached);
    }

    // Then fetch from API to ensure it's valid
    api.listProperties()
      .then((properties) => {
        if (properties.length > 0) {
          const id = String(properties[0].id);
          setPropertyId(id);
          localStorage.setItem("homebase_property_id", id);
        }
      })
      .catch(() => {
        // API unavailable — keep cached value
      })
      .finally(() => setLoading(false));
  }, []);

  return { propertyId, loading };
}
