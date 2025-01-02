// Improved src/utils/geoUtils.js
const EARTH_RADIUS_KM = 6371;

export function getBoundingBox(lat, lon, radiusKm) {
    // Convert latitude and longitude to radians
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;

    // Angular radius
    const angularRadius = radiusKm / EARTH_RADIUS_KM;

    // Calculate bounds
    const latMin = latRad - angularRadius;
    const latMax = latRad + angularRadius;
    const lonMin = lonRad - angularRadius / Math.cos(latRad);
    const lonMax = lonRad + angularRadius / Math.cos(latRad);

    // Convert back to degrees
    return {
        minLat: (latMin * 180) / Math.PI,
        maxLat: (latMax * 180) / Math.PI,
        minLon: (lonMin * 180) / Math.PI,
        maxLon: (lonMax * 180) / Math.PI
    };
}

export function getDistance(lat1, lon1, lat2, lon2) {
    // Convert to radians
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lon1Rad = (lon1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const lon2Rad = (lon2 * Math.PI) / 180;

    // Haversine formula
    const dLat = lat2Rad - lat1Rad;
    const dLon = lon2Rad - lon1Rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return +(EARTH_RADIUS_KM * c).toFixed(2); // Return with 2 decimal places
}