const EARTH_RADIUS_KM = 6371; // Earth's radius in kilometers

// Calculate the bounding box for a given center point and radius
export function getBoundingBox(lat, lon, radiusKm) {
    const latChange = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
    const lonChange = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);

    return {
        minLat: lat - latChange,
        maxLat: lat + latChange,
        minLon: lon - lonChange,
        maxLon: lon + lonChange
    };
}

// Calculate distance between two points using Haversine formula
export function getDistance(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
}