import { Pool } from 'pg';

export interface GeoFence {
  id: string;
  vehicleId: string;
  zoneName: string;
  zoneType: 'allowed' | 'restricted';
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  isActive: boolean;
}

export interface GeoFenceCheck {
  isViolation: boolean;
  zoneType?: 'allowed' | 'restricted';
  zoneName?: string;
  distanceFromCenter?: number;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a location is within any authorized zone for a vehicle
 */
export async function checkGeoFence(
  pool: Pool,
  vehicleId: string,
  latitude: number,
  longitude: number
): Promise<GeoFenceCheck> {
  try {
    // Get all active authorized zones for this vehicle
    const result = await pool.query(
      `SELECT id, zone_name, zone_type, center_latitude, center_longitude, radius_meters
       FROM authorized_zones
       WHERE vehicle_id = $1 AND is_active = true`,
      [vehicleId]
    );

    if (result.rows.length === 0) {
      // No zones defined - allow all by default
      return { isViolation: false };
    }

    const zones: GeoFence[] = result.rows.map((row) => ({
      id: row.id,
      vehicleId,
      zoneName: row.zone_name,
      zoneType: row.zone_type,
      centerLatitude: parseFloat(row.center_latitude),
      centerLongitude: parseFloat(row.center_longitude),
      radiusMeters: parseFloat(row.radius_meters),
      isActive: true,
    }));

    // Check if location is within any zone
    for (const zone of zones) {
      const distance = calculateDistance(
        latitude,
        longitude,
        zone.centerLatitude,
        zone.centerLongitude
      );

      if (distance <= zone.radiusMeters) {
        // Location is within a zone
        if (zone.zoneType === 'restricted') {
          // Violation: entered restricted zone
          return {
            isViolation: true,
            zoneType: 'restricted',
            zoneName: zone.zoneName,
            distanceFromCenter: distance,
          };
        } else {
          // Location is within an allowed zone - no violation
          return {
            isViolation: false,
            zoneType: 'allowed',
            zoneName: zone.zoneName,
            distanceFromCenter: distance,
          };
        }
      }
    }

    // Location is not within any zone
    // Check if there are allowed zones - if so, this is a violation
    const hasAllowedZones = zones.some((z) => z.zoneType === 'allowed');
    if (hasAllowedZones) {
      return {
        isViolation: true,
        zoneType: 'allowed', // Violation: left allowed zone
        zoneName: undefined,
        distanceFromCenter: undefined,
      };
    }

    // Only restricted zones exist, and we're not in any - no violation
    return { isViolation: false };
  } catch (error) {
    console.error('Error checking geo-fence:', error);
    // Fail open - don't block vehicle if geo-fencing check fails
    return { isViolation: false };
  }
}

/**
 * Check if vehicle has left authorized zones (geo-fence violation)
 */
export async function checkZoneViolation(
  pool: Pool,
  vehicleId: string,
  latitude: number,
  longitude: number
): Promise<{ isViolation: boolean; details?: any }> {
  const check = await checkGeoFence(pool, vehicleId, latitude, longitude);
  
  if (check.isViolation) {
    return {
      isViolation: true,
      details: {
        zoneType: check.zoneType,
        zoneName: check.zoneName,
        distanceFromCenter: check.distanceFromCenter,
        latitude,
        longitude,
      },
    };
  }

  return { isViolation: false };
}

