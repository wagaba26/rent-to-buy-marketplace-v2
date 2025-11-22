import { Pool } from 'pg';
import { checkZoneViolation } from './geofencing';

export interface RiskAssessment {
  hasRisk: boolean;
  riskType?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  details?: any;
  userId?: string;
}

// Risk thresholds
const RISK_THRESHOLDS = {
  SPEED_LIMIT: 120, // km/h
  SPEED_WARNING: 100, // km/h
  SPEED_CRITICAL: 150, // km/h
  HARSH_BRAKING_THRESHOLD: 0.7, // g-force
  HARSH_ACCELERATION_THRESHOLD: 3.0, // m/s²
  EXCESSIVE_IDLING_MINUTES: 30, // minutes
  LOW_FUEL_THRESHOLD: 10, // percentage
  LOW_BATTERY_VOLTAGE: 11.5, // volts
  GPS_SIGNAL_WEAK: 3, // signal strength out of 5
};

/**
 * Get user ID for vehicle from payment plan or reservation
 */
async function getUserIdForVehicle(pool: Pool, vehicleId: string): Promise<string | null> {
  try {
    // In production, this would query payment service or vehicle service
    // For now, we'll try to get from a vehicle-user mapping or payment plans
    // This is a placeholder - you'd need to implement actual service communication
    
    // Option 1: Query payment service via HTTP (fault-tolerant)
    // Option 2: Maintain a local cache of vehicle-user mappings
    // Option 3: Query from a shared database/table
    
    // Placeholder: Return null if not found (service continues to function)
    return null;
  } catch (error) {
    console.error('Error getting user ID for vehicle:', error);
    return null; // Fail gracefully
  }
}

/**
 * Check for tampering attempts
 */
async function detectTampering(
  pool: Pool,
  vehicleId: string,
  data: any
): Promise<{ detected: boolean; details?: any }> {
  const indicators: string[] = [];

  // Check device tamper status
  if (data.deviceTamperStatus === true) {
    indicators.push('Device tamper flag set');
  }

  // Check GPS signal loss with engine running
  if (data.engineStatus === 'on' && (!data.gpsSignalStrength || data.gpsSignalStrength < RISK_THRESHOLDS.GPS_SIGNAL_WEAK)) {
    indicators.push('GPS signal lost while engine running');
  }

  // Check for sudden GPS location jumps (possible device removal/relocation)
  if (data.latitude && data.longitude) {
    // Get last known location
    const lastLocation = await pool.query(
      `SELECT latitude, longitude, timestamp
       FROM telematics_data
       WHERE vehicle_id = $1 AND latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY timestamp DESC
       LIMIT 1
       OFFSET 1`,
      [vehicleId]
    );

    if (lastLocation.rows.length > 0) {
      const last = lastLocation.rows[0];
      const timeDiff = (Date.now() - new Date(last.timestamp).getTime()) / 1000 / 60; // minutes
      
      // Calculate distance between last and current location
      const distance = calculateDistance(
        parseFloat(last.latitude),
        parseFloat(last.longitude),
        data.latitude,
        data.longitude
      );

      // Check for unrealistic movement (more than 200 km/h would be possible)
      const speedKmh = (distance / 1000) / (timeDiff / 60);
      if (timeDiff < 5 && speedKmh > 200) {
        indicators.push(`Unrealistic location jump: ${speedKmh.toFixed(0)} km/h`);
      }
    }
  }

  if (indicators.length > 0) {
    return {
      detected: true,
      details: { indicators },
    };
  }

  return { detected: false };
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
 * Check for excessive idling
 */
async function checkExcessiveIdling(
  pool: Pool,
  vehicleId: string,
  data: any
): Promise<{ detected: boolean; details?: any }> {
  // Check current idling duration
  if (data.idlingDurationSeconds && data.engineStatus === 'on' && data.speed === 0) {
    const idlingMinutes = data.idlingDurationSeconds / 60;
    
    if (idlingMinutes > RISK_THRESHOLDS.EXCESSIVE_IDLING_MINUTES) {
      return {
        detected: true,
        details: {
          idlingMinutes: idlingMinutes.toFixed(2),
          threshold: RISK_THRESHOLDS.EXCESSIVE_IDLING_MINUTES,
        },
      };
    }
  }

  return { detected: false };
}

/**
 * Check for harsh braking patterns
 */
function checkHarshBraking(data: any): { detected: boolean; details?: any } {
  if (data.brakingForce && data.brakingForce > RISK_THRESHOLDS.HARSH_BRAKING_THRESHOLD) {
    return {
      detected: true,
      details: {
        brakingForce: data.brakingForce,
        threshold: RISK_THRESHOLDS.HARSH_BRAKING_THRESHOLD,
      },
    };
  }

  return { detected: false };
}

/**
 * Check for harsh acceleration patterns
 */
function checkHarshAcceleration(data: any): { detected: boolean; details?: any } {
  if (data.acceleration && Math.abs(data.acceleration) > RISK_THRESHOLDS.HARSH_ACCELERATION_THRESHOLD) {
    return {
      detected: true,
      details: {
        acceleration: data.acceleration,
        threshold: RISK_THRESHOLDS.HARSH_ACCELERATION_THRESHOLD,
      },
    };
  }

  return { detected: false };
}

/**
 * Main risk assessment function with comprehensive anomaly detection
 */
export async function processTelematicsData(
  pool: Pool,
  vehicleId: string,
  data: any
): Promise<RiskAssessment> {
  const assessment: RiskAssessment = {
    hasRisk: false,
  };

  // Get user ID for this vehicle (fault-tolerant)
  const userId = await getUserIdForVehicle(pool, vehicleId);
  assessment.userId = userId || undefined;

  // Risk detection logic - comprehensive checks
  const risks: Array<{ type: string; severity: 'low' | 'medium' | 'high' | 'critical'; details: any }> = [];

  // 1. Speed violation detection
  if (data.speed && data.speed > RISK_THRESHOLDS.SPEED_WARNING) {
    const severity =
      data.speed > RISK_THRESHOLDS.SPEED_CRITICAL
        ? 'critical'
        : data.speed > RISK_THRESHOLDS.SPEED_LIMIT + 10
        ? 'high'
        : 'medium';

    risks.push({
      type: 'speed_violation',
      severity,
      details: {
        speed: data.speed,
        limit: RISK_THRESHOLDS.SPEED_LIMIT,
        overLimit: data.speed - RISK_THRESHOLDS.SPEED_LIMIT,
      },
    });
  }

  // 2. Geo-fencing violation (check authorized zones)
  if (data.latitude && data.longitude) {
    const geoCheck = await checkZoneViolation(pool, vehicleId, data.latitude, data.longitude);
    if (geoCheck.isViolation) {
      risks.push({
        type: 'geo_fence_violation',
        severity: 'high',
        details: geoCheck.details,
      });
    }
  }

  // 3. Tampering detection
  const tamperingCheck = await detectTampering(pool, vehicleId, data);
  if (tamperingCheck.detected) {
    risks.push({
      type: 'tampering_detected',
      severity: 'critical',
      details: tamperingCheck.details,
    });
  }

  // 4. Harsh braking detection
  const brakingCheck = checkHarshBraking(data);
  if (brakingCheck.detected) {
    risks.push({
      type: 'harsh_braking',
      severity: 'medium',
      details: brakingCheck.details,
    });
  }

  // 5. Harsh acceleration detection
  const accelerationCheck = checkHarshAcceleration(data);
  if (accelerationCheck.detected) {
    risks.push({
      type: 'harsh_acceleration',
      severity: 'medium',
      details: accelerationCheck.details,
    });
  }

  // 6. Excessive idling detection
  const idlingCheck = await checkExcessiveIdling(pool, vehicleId, data);
  if (idlingCheck.detected) {
    risks.push({
      type: 'excessive_idling',
      severity: 'low',
      details: idlingCheck.details,
    });
  }

  // 7. Engine status mismatch (engine off but moving)
  if (data.engineStatus === 'off' && data.speed && data.speed > 0) {
    risks.push({
      type: 'engine_mismatch',
      severity: 'high',
      details: {
        engineStatus: data.engineStatus,
        speed: data.speed,
      },
    });
  }

  // 8. Low fuel level
  if (data.fuelLevel !== undefined && data.fuelLevel < RISK_THRESHOLDS.LOW_FUEL_THRESHOLD) {
    risks.push({
      type: 'low_fuel',
      severity: 'low',
      details: {
        fuelLevel: data.fuelLevel,
        threshold: RISK_THRESHOLDS.LOW_FUEL_THRESHOLD,
      },
    });
  }

  // 9. Low battery voltage
  if (data.batteryVoltage && data.batteryVoltage < RISK_THRESHOLDS.LOW_BATTERY_VOLTAGE) {
    risks.push({
      type: 'low_battery',
      severity: 'medium',
      details: {
        batteryVoltage: data.batteryVoltage,
        threshold: RISK_THRESHOLDS.LOW_BATTERY_VOLTAGE,
      },
    });
  }

  // Aggregate risks and determine highest severity
  if (risks.length > 0) {
    assessment.hasRisk = true;
    
    // Get the highest severity risk
    const highestRisk = risks.reduce((prev, current) => {
      const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
      return severityOrder[current.severity] > severityOrder[prev.severity] ? current : prev;
    });

    assessment.riskType = highestRisk.type;
    assessment.severity = highestRisk.severity;
    assessment.details = {
      ...highestRisk.details,
      allRisks: risks.map((r) => ({ type: r.type, severity: r.severity })),
    };
  }

  return assessment;
}

