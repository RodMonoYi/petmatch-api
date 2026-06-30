/**
 * Calcula a distância em quilômetros entre duas coordenadas geográficas
 * usando a fórmula de Haversine
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Arredonda para 2 casas decimais
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Parse localização geográfica do formato JSON string
 */
export function parseLocation(location: string | null): { latitude: number; longitude: number } | null {
  if (!location) return null;
  try {
    return JSON.parse(location);
  } catch (error) {
    return null;
  }
}


