import { getDb } from './db';

/**
 * Audit Logging Service
 * Records security-sensitive operations for compliance and monitoring
 */

export interface AuditLogEntry {
    userId?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    success?: boolean;
    errorMessage?: string;
}

export class AuditLogger {
    /**
     * Log an action to the audit log
     */
    static async log(entry: AuditLogEntry): Promise<void> {
        const db = getDb();

        try {
            await db.query(
                `INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id, 
          ip_address, user_agent, metadata, success, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    entry.userId || null,
                    entry.action,
                    entry.resourceType || null,
                    entry.resourceId || null,
                    entry.ipAddress || null,
                    entry.userAgent || null,
                    entry.metadata ? JSON.stringify(entry.metadata) : null,
                    entry.success !== false, // Default to true
                    entry.errorMessage || null,
                ]
            );
        } catch (error) {
            // Don't throw error to prevent audit logging from breaking the main flow
            console.error('Failed to write audit log:', error);
        }
    }

    /**
     * Log authentication events
     */
    static async logAuth(
        action: 'login' | 'logout' | 'login_failed' | 'register' | 'password_reset',
        userId: string | null,
        ipAddress?: string,
        userAgent?: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.log({
            userId: userId || undefined,
            action: `auth.${action}`,
            resourceType: 'user',
            resourceId: userId || undefined,
            ipAddress,
            userAgent,
            metadata,
            success: !action.includes('failed'),
        });
    }

    /**
     * Log retailer management events
     */
    static async logRetailer(
        action: 'register' | 'approve' | 'deny' | 'suspend' | 'access_code_generated',
        retailerId: string,
        adminId?: string,
        ipAddress?: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.log({
            userId: adminId,
            action: `retailer.${action}`,
            resourceType: 'retailer',
            resourceId: retailerId,
            ipAddress,
            metadata,
        });
    }

    /**
     * Log vehicle management events
     */
    static async logVehicle(
        action: 'create' | 'update' | 'delete' | 'reserve',
        vehicleId: string,
        retailerId?: string,
        ipAddress?: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.log({
            userId: retailerId,
            action: `vehicle.${action}`,
            resourceType: 'vehicle',
            resourceId: vehicleId,
            ipAddress,
            metadata,
        });
    }

    /**
     * Log application events
     */
    static async logApplication(
        action: 'submit' | 'approve' | 'reject' | 'withdraw' | 'status_change',
        applicationId: string,
        userId?: string,
        ipAddress?: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.log({
            userId,
            action: `application.${action}`,
            resourceType: 'application',
            resourceId: applicationId,
            ipAddress,
            metadata,
        });
    }

    /**
     * Log security events
     */
    static async logSecurity(
        action: 'rate_limit_exceeded' | 'invalid_token' | 'unauthorized_access' | 'mfa_enabled' | 'mfa_disabled',
        userId?: string,
        ipAddress?: string,
        userAgent?: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.log({
            userId,
            action: `security.${action}`,
            ipAddress,
            userAgent,
            metadata,
            success: !action.includes('exceeded') && !action.includes('invalid') && !action.includes('unauthorized'),
        });
    }

    /**
     * Log permission changes
     */
    static async logPermission(
        action: 'grant' | 'revoke',
        userId: string,
        permission: string,
        grantedBy?: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.log({
            userId: grantedBy,
            action: `permission.${action}`,
            resourceType: 'user',
            resourceId: userId,
            metadata: {
                ...metadata,
                permission,
            },
        });
    }

    /**
     * Get audit logs with filtering
     */
    static async getLogs(filters: {
        userId?: string;
        action?: string;
        resourceType?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Promise<any[]> {
        const db = getDb();

        let query = 'SELECT * FROM audit_logs WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        if (filters.userId) {
            query += ` AND user_id = $${paramIndex++}`;
            params.push(filters.userId);
        }

        if (filters.action) {
            query += ` AND action LIKE $${paramIndex++}`;
            params.push(`${filters.action}%`);
        }

        if (filters.resourceType) {
            query += ` AND resource_type = $${paramIndex++}`;
            params.push(filters.resourceType);
        }

        if (filters.startDate) {
            query += ` AND created_at >= $${paramIndex++}`;
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            query += ` AND created_at <= $${paramIndex++}`;
            params.push(filters.endDate);
        }

        query += ' ORDER BY created_at DESC';

        if (filters.limit) {
            query += ` LIMIT $${paramIndex++}`;
            params.push(filters.limit);
        }

        if (filters.offset) {
            query += ` OFFSET $${paramIndex++}`;
            params.push(filters.offset);
        }

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get audit log statistics
     */
    static async getStats(filters: {
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        totalLogs: number;
        failedActions: number;
        uniqueUsers: number;
        actionBreakdown: Record<string, number>;
    }> {
        const db = getDb();

        let whereClause = '1=1';
        const params: any[] = [];
        let paramIndex = 1;

        if (filters.startDate) {
            whereClause += ` AND created_at >= $${paramIndex++}`;
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            whereClause += ` AND created_at <= $${paramIndex++}`;
            params.push(filters.endDate);
        }

        // Total logs
        const totalResult = await db.query(
            `SELECT COUNT(*) as count FROM audit_logs WHERE ${whereClause}`,
            params
        );

        // Failed actions
        const failedResult = await db.query(
            `SELECT COUNT(*) as count FROM audit_logs WHERE ${whereClause} AND success = FALSE`,
            params
        );

        // Unique users
        const usersResult = await db.query(
            `SELECT COUNT(DISTINCT user_id) as count FROM audit_logs WHERE ${whereClause}`,
            params
        );

        // Action breakdown
        const actionsResult = await db.query(
            `SELECT action, COUNT(*) as count 
       FROM audit_logs 
       WHERE ${whereClause} 
       GROUP BY action 
       ORDER BY count DESC`,
            params
        );

        const actionBreakdown: Record<string, number> = {};
        for (const row of actionsResult.rows) {
            actionBreakdown[row.action] = parseInt(row.count);
        }

        return {
            totalLogs: parseInt(totalResult.rows[0].count),
            failedActions: parseInt(failedResult.rows[0].count),
            uniqueUsers: parseInt(usersResult.rows[0].count),
            actionBreakdown,
        };
    }
}
