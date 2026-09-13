import type { Facility } from "@/src/types/api";

// Offline-friendly location behavior for the hackathon. We do not pretend to
// geocode arbitrary text; instead, every Indian location gets a stable map
// center and the same seeded facilities are laid out around it.
export function seededLocationCenter(location: string) {
  let hash = 2166136261;
  for (const char of location.trim().toLowerCase()) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const normalized = (hash >>> 0) / 4294967295;
  const second = ((Math.imul(hash, 1103515245) + 12345) >>> 0) / 4294967295;
  return {
    lat: 8.4 + normalized * 26.4,
    lng: 68.7 + second * 28.4,
  };
}

export function seededDistanceKm(location: string, facilityId: string, index: number) {
  let hash = 17;
  for (const char of `${location.trim().toLowerCase()}:${facilityId}:${index}`) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  // 0.5–10.0 km, stable for the selected location and seeded facility.
  return Number((0.5 + ((hash >>> 0) % 96) / 10).toFixed(1));
}

export function remapSeededFacilities(facilities: Facility[], location: string) {
  const center = seededLocationCenter(location);
  return facilities.map((facility, index) => {
    const distance = seededDistanceKm(location, facility.id, index);
    const angle = ((index * 137.5) * Math.PI) / 180;
    return {
      ...facility,
      lat: center.lat + (distance / 111) * Math.cos(angle),
      lng: center.lng + (distance / (111 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(angle),
      distance_km: distance,
    };
  });
}
