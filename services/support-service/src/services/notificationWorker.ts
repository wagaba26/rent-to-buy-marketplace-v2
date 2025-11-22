/**
 * Notification Worker Service
 * Processes notifications asynchronously from message queue
 * Decouples notification sending from critical transaction flows
 */

import { Pool } from 'pg';
import { MessageQueueClient, Message } from '@rent-to-own/message-queue';
import { EncryptionService } from '@rent-to-own/encryption';
import { SMSProvider, EmailProvider, WhatsAppProvider, NotificationResponse } from './notificationProviders';
import { MessageTemplatingService } from './messageTemplating';

export interface NotificationJob {
  notificationId: string;
  userId: string;
  type: string;
  channel: 'sms' | 'email' | 'whatsapp';
  recipient: string; // Encrypted
  templateId?: string;
  templateVariables?: Record<string, string | number | boolean>;
  subject?: string;
  message?: string;
  scheduledFor?: number; // Timestamp
  priority?: 'low' | 'normal' | 'high';
}

export class NotificationWorker {
  private pool: Pool;
  private messageQueue: MessageQueueClient;
  private encryptionService: EncryptionService;
  private smsProvider: SMSProvider;
  private emailProvider: EmailProvider;
  private whatsappProvider: WhatsAppProvider;
  private templatingService: MessageTemplatingService;
  private isProcessing: boolean = false;

  constructor(
    pool: Pool,
    messageQueue: MessageQueueClient,
    encryptionService: EncryptionService,
    smsProvider: SMSProvider,
    emailProvider: EmailProvider,
    whatsappProvider: WhatsAppProvider,
    templatingService: MessageTemplatingService
  ) {
    this.pool = pool;
    this.messageQueue = messageQueue;
    this.encryptionService = encryptionService;
    this.smsProvider = smsProvider;
    this.emailProvider = emailProvider;
    this.whatsappProvider = whatsappProvider;
    this.templatingService = templatingService;
  }

  /**
   * Start the notification worker
   */
  async start(): Promise<void> {
    try {
      // Subscribe to notification queue
      await this.messageQueue.subscribe(
        'notifications.queue',
        'notification-worker-queue',
        'notification.send',
        async (message: Message) => {
          await this.processNotificationJob(message.payload as NotificationJob);
        }
      );

      // Also process scheduled notifications from database
      this.startScheduledNotificationProcessor();

      console.log('Notification worker started');
    } catch (error) {
      console.error('Failed to start notification worker:', error);
      throw error;
    }
  }

  /**
   * Process a notification job
   */
  private async processNotificationJob(job: NotificationJob): Promise<void> {
    try {
      // Check if notification is scheduled for future
      if (job.scheduledFor && job.scheduledFor > Date.now()) {
        // Re-queue for later
        await this.messageQueue.publish('notifications.queue', 'notification.send', {
          type: 'notification.send',
          payload: job,
          timestamp: Date.now(),
        });
        return;
      }

      // Decrypt recipient
      let recipient: string;
      try {
        recipient = this.encryptionService.decrypt(job.recipient);
      } catch (error) {
        console.error(`Failed to decrypt recipient for notification ${job.notificationId}:`, error);
        await this.updateNotificationStatus(job.notificationId, 'failed', 'Failed to decrypt recipient');
        return;
      }

      // Get or render message
      let finalMessage: string = job.message || '';
      let finalSubject: string | undefined = job.subject;

      // If template is provided, render it
      if (job.templateId) {
        const template = this.templatingService.getTemplate(job.templateId);
        if (!template) {
          await this.updateNotificationStatus(job.notificationId, 'failed', `Template ${job.templateId} not found`);
          return;
        }

        // Validate variables
        if (job.templateVariables) {
          const validation = this.templatingService.validateVariables(template, job.templateVariables);
          if (!validation.valid) {
            await this.updateNotificationStatus(
              job.notificationId,
              'failed',
              `Missing template variables: ${validation.missing.join(', ')}`
            );
            return;
          }
        }

        // Render template
        const rendered = this.templatingService.renderTemplate(
          template,
          job.channel,
          job.templateVariables || {}
        );

        // Extract subject for email
        if (job.channel === 'email' && rendered.includes('__SUBJECT__:')) {
          const parts = rendered.split('__BODY__:');
          if (parts.length === 2) {
            finalSubject = parts[0].replace('__SUBJECT__:', '');
            finalMessage = parts[1];
          }
        } else {
          finalMessage = rendered;
        }
      }

      // Send notification based on channel
      let response: NotificationResponse;
      switch (job.channel) {
        case 'sms':
          response = await this.smsProvider.sendSMS({
            to: recipient,
            message: finalMessage,
          });
          break;
        case 'email':
          response = await this.emailProvider.sendEmail({
            to: recipient,
            subject: finalSubject || 'Notification from Rent-to-Own',
            htmlBody: finalMessage,
            textBody: finalMessage.replace(/<[^>]*>/g, ''), // Strip HTML for text version
          });
          break;
        case 'whatsapp':
          response = await this.whatsappProvider.sendWhatsApp({
            to: recipient,
            message: finalMessage,
          });
          break;
        default:
          await this.updateNotificationStatus(job.notificationId, 'failed', `Unsupported channel: ${job.channel}`);
          return;
      }

      // Update notification status
      if (response.success) {
        await this.updateNotificationStatus(
          job.notificationId,
          'sent',
          response.message,
          response.externalId,
          response.cost
        );

        // Emit event for UI update
        await this.messageQueue.publish('support.events', 'notification.sent', {
          type: 'notification.sent',
          payload: {
            notificationId: job.notificationId,
            userId: job.userId,
            channel: job.channel,
            status: 'sent',
          },
          timestamp: Date.now(),
        });
      } else {
        await this.updateNotificationStatus(job.notificationId, 'failed', response.message);
      }
    } catch (error: any) {
      console.error(`Error processing notification job ${job.notificationId}:`, error);
      await this.updateNotificationStatus(job.notificationId, 'failed', error.message || 'Unknown error');
    }
  }

  /**
   * Update notification status in database
   */
  private async updateNotificationStatus(
    notificationId: string,
    status: 'sent' | 'failed' | 'delivered',
    message?: string,
    externalId?: string,
    cost?: number
  ): Promise<void> {
    try {
      const updates: string[] = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
      const values: any[] = [status];
      let paramCount = 2;

      if (status === 'sent' || status === 'delivered') {
        updates.push('sent_at = CURRENT_TIMESTAMP');
      }

      if (externalId) {
        updates.push(`external_id = $${paramCount++}`);
        values.push(externalId);
      }

      if (cost !== undefined) {
        updates.push(`cost = $${paramCount++}`);
        values.push(cost);
      }

      if (message) {
        updates.push(`error_message = $${paramCount++}`);
        values.push(message);
      }

      values.push(notificationId);

      await this.pool.query(
        `UPDATE notifications SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        values
      );
    } catch (error) {
      console.error('Failed to update notification status:', error);
    }
  }

  /**
   * Start processor for scheduled notifications from database
   */
  private startScheduledNotificationProcessor(): void {
    // Check for scheduled notifications every minute
    setInterval(async () => {
      if (this.isProcessing) return;
      
      this.isProcessing = true;
      try {
        const result = await this.pool.query(
          `SELECT id, user_id, type, channel, encrypted_recipient, template_id, template_variables, 
                  subject, message, scheduled_for, priority
           FROM notifications
           WHERE status = 'pending'
             AND scheduled_for IS NOT NULL
             AND scheduled_for <= $1
           ORDER BY priority DESC, scheduled_for ASC
           LIMIT 50`,
          [new Date()]
        );

        for (const row of result.rows) {
          const job: NotificationJob = {
            notificationId: row.id,
            userId: row.user_id,
            type: row.type,
            channel: row.channel,
            recipient: row.encrypted_recipient,
            templateId: row.template_id,
            templateVariables: row.template_variables,
            subject: row.subject,
            message: row.message,
            scheduledFor: row.scheduled_for ? new Date(row.scheduled_for).getTime() : undefined,
            priority: row.priority || 'normal',
          };

          // Queue for processing
          await this.messageQueue.publish('notifications.queue', 'notification.send', {
            type: 'notification.send',
            payload: job,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error('Error processing scheduled notifications:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 60000); // Check every minute
  }
}

