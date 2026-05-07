// const DEFAULT_GEOCODER_URL = "https://nominatim.openstreetmap.org/search";
// const DEFAULT_REVERSE_GEOCODER_URL = "https://nominatim.openstreetmap.org/reverse";
// const GEOCODER_TIMEOUT_MS = 12000;

// const cleanPart = (value) =>
//   String(value || "")
//     .replace(/\([^)]*\)/g, " ")
//     .replace(/\bC\/o\b/gi, " ")
//     .replace(/\bBlock\s*No\.?\s*\d+\b/gi, " ")
//     .replace(/\bSector\s*[-/]?\s*\d+\b/gi, " ")
//     .replace(/[|]/g, " ")
//     .replace(/\s+/g, " ")
//     .trim();

// const unique = (items) => [...new Set(items.filter(Boolean))];

// const buildQueries = ({ address, city }) => {
//   const rawAddress = String(address || "").trim();
//   const rawCity = String(city || "").trim();
//   const cleanedAddress = cleanPart(rawAddress);

//   const addressParts = cleanedAddress
//     .split(",")
//     .map((part) => cleanPart(part))
//     .filter(Boolean);

//   const shortAddress = addressParts.slice(-3).join(", ");
//   const shortestAddress = addressParts.slice(-2).join(", ");

//   return unique([
//     [rawAddress, rawCity].filter(Boolean).join(", "),
//     [cleanedAddress, rawCity].filter(Boolean).join(", "),
//     [shortAddress, rawCity].filter(Boolean).join(", "),
//     [shortestAddress, rawCity].filter(Boolean).join(", "),
//     rawCity,
//   ]);
// };

// const fetchGeocode = async (query) => {
//   const baseUrl = process.env.GEOCODER_URL || DEFAULT_GEOCODER_URL;
//   const url = new URL(baseUrl);
//   url.searchParams.set("q", query);
//   url.searchParams.set("format", "jsonv2");
//   url.searchParams.set("limit", "1");
//   url.searchParams.set("addressdetails", "1");

//   const controller = new AbortController();
//   const timeout = setTimeout(() => controller.abort(), GEOCODER_TIMEOUT_MS);

//   try {
//     const response = await fetch(url, {
//       headers: {
//         "User-Agent": "KirtanSarthi/1.0 (event-geocoding)",
//         Accept: "application/json",
//       },
//       signal: controller.signal,
//     });

//     if (!response.ok) {
//       throw new Error(`Geocoding failed with status ${response.status}`);
//     }

//     const results = await response.json();
//     const first = Array.isArray(results) ? results[0] : null;
//     const lat = Number(first?.lat);
//     const lng = Number(first?.lon);

//     if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
//       return null;
//     }

//     return {
//       type: "Point",
//       coordinates: [lng, lat],
//     };
//   } finally {
//     clearTimeout(timeout);
//   }
// };

// const fetchReverseGeocode = async ({ lat, lng }) => {
//   const baseUrl = process.env.REVERSE_GEOCODER_URL || DEFAULT_REVERSE_GEOCODER_URL;
//   const url = new URL(baseUrl);
//   url.searchParams.set("lat", String(lat));
//   url.searchParams.set("lon", String(lng));
//   url.searchParams.set("format", "jsonv2");
//   url.searchParams.set("addressdetails", "1");

//   const controller = new AbortController();
//   const timeout = setTimeout(() => controller.abort(), GEOCODER_TIMEOUT_MS);

//   try {
//     const response = await fetch(url, {
//       headers: {
//         "User-Agent": "KirtanSarthi/1.0 (reverse-geocoding)",
//         Accept: "application/json",
//       },
//       signal: controller.signal,
//     });

//     if (!response.ok) {
//       throw new Error(`Reverse geocoding failed with status ${response.status}`);
//     }

//     const result = await response.json();
//     return result?.address || null;
//   } finally {
//     clearTimeout(timeout);
//   }
// };

// exports.geocodeAddress = async ({ address, city }) => {
//   const queries = buildQueries({ address, city });
//   if (!queries.length) return null;

//   for (const query of queries) {
//     try {
//       const result = await fetchGeocode(query);
//       if (result) return result;
//     } catch (error) {
//       if (error.name === "AbortError") {
//         throw new Error("Geocoding timed out");
//       }
//     }
//   }

//   return null;
// };

// exports.reverseGeocodeCity = async ({ lat, lng }) => {
//   if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

//   try {
//     const address = await fetchReverseGeocode({ lat, lng });
//     const city =
//       address?.city ||
//       address?.town ||
//       address?.village ||
//       address?.municipality ||
//       address?.county ||
//       null;

//     return city ? String(city).trim().toLowerCase() : null;
//   } catch (error) {
//     if (error.name === "AbortError") {
//       throw new Error("Reverse geocoding timed out");
//     }
//     throw error;
//   }
// };


const DEFAULT_GEOCODER_URL = "https://nominatim.openstreetmap.org/search";
const DEFAULT_REVERSE_GEOCODER_URL = "https://nominatim.openstreetmap.org/reverse";
const GEOCODER_TIMEOUT_MS = 12000;

const cleanPart = (value) =>
  String(value || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\bC\/o\b/gi, " ")
    .replace(/\bBlock\s*No\.?\s*\d+\b/gi, " ")
    .replace(/\bSector\s*[-/]?\s*\d+\b/gi, " ")
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const unique = (items) => [...new Set(items.filter(Boolean))];

const buildQueries = ({ address, city }) => {
  const rawAddress = String(address || "").trim();
  const rawCity = String(city || "").trim();
  const cleanedAddress = cleanPart(rawAddress);

  const addressParts = cleanedAddress
    .split(",")
    .map((part) => cleanPart(part))
    .filter(Boolean);

  const shortAddress = addressParts.slice(-3).join(", ");
  const shortestAddress = addressParts.slice(-2).join(", ");

  return unique([
    [rawAddress, rawCity].filter(Boolean).join(", "),
    [cleanedAddress, rawCity].filter(Boolean).join(", "),
    [shortAddress, rawCity].filter(Boolean).join(", "),
    [shortestAddress, rawCity].filter(Boolean).join(", "),
    rawCity,
  ]);
};

const fetchGeocode = async (query) => {
  const baseUrl = process.env.GEOCODER_URL || DEFAULT_GEOCODER_URL;
  const url = new URL(baseUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEOCODER_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "KirtanSarthi/1.0 (event-geocoding)",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Geocoding failed with status ${response.status}`);
    }

    const results = await response.json();
    const first = Array.isArray(results) ? results[0] : null;
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return {
      type: "Point",
      coordinates: [lng, lat],
    };
  } finally {
    clearTimeout(timeout);
  }
};

const fetchReverseGeocode = async ({ lat, lng }) => {
  const baseUrl = process.env.REVERSE_GEOCODER_URL || DEFAULT_REVERSE_GEOCODER_URL;
  const url = new URL(baseUrl);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEOCODER_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "KirtanSarthi/1.0 (reverse-geocoding)",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed with status ${response.status}`);
    }

    const result = await response.json();
    return result?.address || null;
  } finally {
    clearTimeout(timeout);
  }
};

exports.geocodeAddress = async ({ address, city }) => {
  const queries = buildQueries({ address, city });
  if (!queries.length) return null;

  for (const query of queries) {
    try {
      const result = await fetchGeocode(query);
      if (result) return result;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Geocoding timed out");
      }
    }
  }

  return null;
};

exports.reverseGeocodeCity = async ({ lat, lng }) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  try {
    const address = await fetchReverseGeocode({ lat, lng });

    // FIX: Added suburb and district before municipality/county to avoid
    // returning a broad county-level name (e.g. "Jaipur") when the user
    // is actually in a town/village like Laxmangarh that Nominatim places
    // under that county. More specific fields are checked first.
    const city =
      address?.city ||
      address?.town ||
      address?.village ||
      address?.suburb ||
      address?.district ||
      address?.municipality ||
      address?.county ||
      null;

    return city ? String(city).trim().toLowerCase() : null;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Reverse geocoding timed out");
    }
    throw error;
  }
};