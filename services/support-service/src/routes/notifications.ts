import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { EncryptionService } from '@rent-to-own/encryption';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { NotFoundError, ValidationError } from '@rent-to-own/errors';
import { MessageTemplatingService } from '../services/messageTemplating';
import { DeliveryTrackingService } from '../services/deliveryTracking';

export function notificationRoutes(
  pool: Pool,
  encryptionService: EncryptionService,
  messageQueue: MessageQueueClient,
  templatingService: MessageTemplatingService,
  deliveryTrackingService: DeliveryTrackingService
): Router {
  const router = Router();

  // Get user notifications
  router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { status, channel, limit = 50, offset = 0 } = req.query;

      let query = 'SELECT * FROM notifications WHERE user_id = $1';
      const values: any[] = [userId];
      let paramCount = 2;

      if (status) {
        query += ` AND status = $${paramCount++}`;
        values.push(status);
      }
      if (channel) {
        query += ` AND channel = $${paramCount++}`;
        values.push(channel);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
      values.push(parseInt(limit as string), parseInt(offset as string));

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: { notifications: result.rows },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  // Send notification (queues for async processing)
  router.post('/send', async (req: Request, res: Response) => {
    try {
      const {
        userId,
        type,
        channel,
        recipient, // Plain text - will be encrypted
        templateId,
        templateVariables,
        subject,
        message,
        scheduledFor, // ISO date string or timestamp
        priority = 'normal',
      } = req.body;

      if (!userId || !type || !channel || !recipient) {
        throw new ValidationError('userId, type, channel, and recipient are required');
      }

      if (!['sms', 'email', 'whatsapp'].includes(channel)) {
        throw new ValidationError('Channel must be sms, email, or whatsapp');
      }

      // Validate template if provided
      if (templateId) {
        const template = templatingService.getTemplate(templateId);
        if (!template) {
          throw new ValidationError(`Template ${templateId} not found`);
        }

        if (!template.channels.includes(channel)) {
          throw new ValidationError(`Template ${templateId} does not support channel ${channel}`);
        }

        if (templateVariables) {
          const validation = templatingService.validateVariables(template, templateVariables);
          if (!validation.valid) {
            throw new ValidationError(`Missing template variables: ${validation.missing.join(', ')}`);
          }
        }
      } else if (!message) {
        throw new ValidationError('Either templateId or message is required');
      }

      // Encrypt recipient
      const encryptedRecipient = encryptionService.encrypt(recipient);

      // Parse scheduledFor
      let scheduledTimestamp: number | undefined;
      if (scheduledFor) {
        scheduledTimestamp = typeof scheduledFor === 'string' 
          ? new Date(scheduledFor).getTime() 
          : scheduledFor;
        
        if (isNaN(scheduledTimestamp)) {
          throw new ValidationError('Invalid scheduledFor date');
        }
      }

      // Create notification record
      const result = await pool.query(
        `INSERT INTO notifications 
         (user_id, type, title, message, channel, encrypted_recipient, status, 
          template_id, template_variables, subject, scheduled_for, priority)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          userId,
          type,
          subject || `Notification: ${type}`,
          message || null,
          channel,
          encryptedRecipient,
          templateId || null,
          templateVariables ? JSON.stringify(templateVariables) : null,
          subject || null,
          scheduledTimestamp ? new Date(scheduledTimestamp) : null,
          priority,
        ]
      );

      const notification = result.rows[0];

      // Queue for async processing (if not scheduled for future)
      if (!scheduledTimestamp || scheduledTimestamp <= Date.now()) {
        await messageQueue.publish('notifications.queue', 'notification.send', {
          type: 'notification.send',
          payload: {
            notificationId: notification.id,
            userId,
            type,
            channel,
            recipient: encryptedRecipient,
            templateId,
            templateVariables,
            subject,
            message,
            scheduledFor: scheduledTimestamp,
            priority,
          },
          timestamp: Date.now(),
        });
      }

      // Emit event
      await messageQueue.publish('support.events', 'notification.created', {
        type: 'notification.created',
        payload: {
          notificationId: notification.id,
          userId,
          type,
          channel,
        },
        timestamp: Date.now(),
      });

      res.status(201).json({
        success: true,
        data: { notification },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  // Send bulk notifications (for campaigns)
  router.post('/send/bulk', async (req: Request, res: Response) => {
    try {
      const {
        userIds,
        type,
        channel,
        templateId,
        templateVariables, // Base variables, will be merged with per-user variables
        perUserVariables, // Map of userId -> variables
        subject,
        message,
        scheduledFor,
        priority = 'normal',
      } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new ValidationError('userIds array is required');
      }

      if (!type || !channel) {
        throw new ValidationError('type and channel are required');
      }

      // Limit bulk sends to prevent abuse
      if (userIds.length > 1000) {
        throw new ValidationError('Maximum 1000 recipients per bulk send');
      }

      const notificationIds: string[] = [];

      // Create notifications for each user
      for (const userId of userIds) {
        // Get user-specific variables
        const userVars = perUserVariables?.[userId] || {};
        const mergedVars = { ...templateVariables, ...userVars };

        // Get user recipient (in production, fetch from user service)
        // For now, we'll need it in perUserVariables
        const recipient = userVars.recipient;
        if (!recipient) {
          console.warn(`Skipping user ${userId} - no recipient provided`);
          continue;
        }

        const encryptedRecipient = encryptionService.encrypt(recipient);

        let scheduledTimestamp: number | undefined;
        if (scheduledFor) {
          scheduledTimestamp = typeof scheduledFor === 'string' 
            ? new Date(scheduledFor).getTime() 
            : scheduledFor;
        }

        const result = await pool.query(
          `INSERT INTO notifications 
           (user_id, type, title, message, channel, encrypted_recipient, status, 
            template_id, template_variables, subject, scheduled_for, priority)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10, $11)
           RETURNING id`,
          [
            userId,
            type,
            subject || `Notification: ${type}`,
            message || null,
            channel,
            encryptedRecipient,
            templateId || null,
            mergedVars ? JSON.stringify(mergedVars) : null,
            subject || null,
            scheduledTimestamp ? new Date(scheduledTimestamp) : null,
            priority,
          ]
        );

        notificationIds.push(result.rows[0].id);

        // Queue for processing
        if (!scheduledTimestamp || scheduledTimestamp <= Date.now()) {
          await messageQueue.publish('notifications.queue', 'notification.send', {
            type: 'notification.send',
            payload: {
              notificationId: result.rows[0].id,
              userId,
              type,
              channel,
              recipient: encryptedRecipient,
              templateId,
              templateVariables: mergedVars,
              subject,
              message,
              scheduledFor: scheduledTimestamp,
              priority,
            },
            timestamp: Date.now(),
          });
        }
      }

      res.status(201).json({
        success: true,
        data: {
          count: notificationIds.length,
          notificationIds,
        },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  // Get available templates
  router.get('/templates', async (req: Request, res: Response) => {
    try {
      const { type } = req.query;

      const templates = type
        ? templatingService.getTemplatesByType(type as any)
        : templatingService.listTemplates();

      res.json({
        success: true,
        data: { templates },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  // Get template by ID
  router.get('/templates/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const template = templatingService.getTemplate(id);

      if (!template) {
        throw new NotFoundError('Template');
      }

      res.json({
        success: true,
        data: { template },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  // Track email open (webhook endpoint)
  router.get('/track/open/:notificationId', async (req: Request, res: Response) => {
    try {
      const { notificationId } = req.params;
      const metadata = req.query;

      await deliveryTrackingService.trackEmailOpen(notificationId, metadata as Record<string, any>);

      // Return 1x1 transparent pixel
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      res.set('Content-Type', 'image/gif');
      res.send(pixel);
    } catch (error: any) {
      console.error('Error tracking email open:', error);
      // Still return pixel to avoid breaking email clients
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      res.set('Content-Type', 'image/gif');
      res.send(pixel);
    }
  });

  // Track link click
  router.get('/track/click/:notificationId', async (req: Request, res: Response) => {
    try {
      const { notificationId } = req.params;
      const { url } = req.query;

      if (!url) {
        throw new ValidationError('url parameter is required');
      }

      await deliveryTrackingService.trackClick(notificationId, url as string, req.query as Record<string, any>);

      // Redirect to the actual URL
      res.redirect(url as string);
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  // Get analytics
  router.get('/analytics', async (req: Request, res: Response) => {
    try {
      const { type, channel, startDate, endDate } = req.query;

      const analytics = await deliveryTrackingService.getAnalytics(
        type as string | undefined,
        channel as 'sms' | 'email' | 'whatsapp' | undefined,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: { analytics },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  // Get channel performance
  router.get('/analytics/channels', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      const performance = await deliveryTrackingService.getChannelPerformance(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: { performance },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  // Mark notification as read/delivered
  router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['sent', 'delivered', 'failed', 'opened', 'clicked'].includes(status)) {
        throw new ValidationError('Valid status is required');
      }

      const updates: string[] = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
      const values: any[] = [status];
      let paramCount = 2;

      if (status === 'sent' || status === 'delivered') {
        updates.push('sent_at = CURRENT_TIMESTAMP');
      }

      values.push(id);

      const result = await pool.query(
        `UPDATE notifications SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Notification');
      }

      // Track delivery if status changed to delivered/opened/clicked
      if (['delivered', 'opened', 'clicked'].includes(status)) {
        const notification = result.rows[0];
        await deliveryTrackingService.trackDelivery({
          notificationId: id,
          channel: notification.channel,
          status: status as any,
          timestamp: new Date(),
        });
      }

      res.json({
        success: true,
        data: { notification: result.rows[0] },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  return router;
}
