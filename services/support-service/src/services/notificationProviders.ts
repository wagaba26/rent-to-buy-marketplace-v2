/**
 * Notification Provider Services
 * Handles SMS, Email, and WhatsApp messaging through external providers
 * Decoupled from main service to avoid blocking critical flows
 */

export interface NotificationProviderConfig {
  apiKey: string;
  apiSecret?: string;
  baseUrl?: string;
  environment: 'sandbox' | 'production';
}

export interface SendSMSRequest {
  to: string;
  message: string;
  senderId?: string;
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  from?: string;
}

export interface SendWhatsAppRequest {
  to: string;
  message: string;
  templateId?: string;
  templateParams?: Record<string, string>;
}

export interface NotificationResponse {
  success: boolean;
  providerId?: string;
  externalId?: string;
  status: 'sent' | 'failed' | 'pending';
  message?: string;
  cost?: number;
}

/**
 * SMS Provider Service
 * Integrates with SMS providers (e.g., Twilio, Africa's Talking, etc.)
 */
export class SMSProvider {
  private config: NotificationProviderConfig;

  constructor(config: NotificationProviderConfig) {
    this.config = config;
  }

  async sendSMS(request: SendSMSRequest): Promise<NotificationResponse> {
    try {
      // In production, integrate with actual SMS provider API
      // Examples: Twilio, Africa's Talking, Vonage, etc.
      
      // Validate phone number
      if (!this.isValidPhoneNumber(request.to)) {
        return {
          success: false,
          status: 'failed',
          message: 'Invalid phone number format',
        };
      }

      // Simulate API call delay
      await this.simulateApiDelay();

      // Simulate success rate (95% in production, 90% in sandbox)
      const successRate = this.config.environment === 'production' ? 0.95 : 0.90;
      const isSuccess = Math.random() < successRate;

      if (isSuccess) {
        const externalId = `SMS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return {
          success: true,
          providerId: 'sms-provider',
          externalId,
          status: 'sent',
          message: 'SMS sent successfully',
          cost: 0.05, // Example cost per SMS
        };
      } else {
        const failureReasons = [
          'Invalid phone number',
          'Insufficient credits',
          'Network error',
          'Provider API error',
        ];
        const reason = failureReasons[Math.floor(Math.random() * failureReasons.length)];
        return {
          success: false,
          status: 'failed',
          message: `SMS failed: ${reason}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        message: error.message || 'SMS sending failed',
      };
    }
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic validation - adjust based on your region
    const phoneRegex = /^(\+?256|0)?[0-9]{9}$/; // Uganda format example
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  }

  private async simulateApiDelay(): Promise<void> {
    const delay = 300 + Math.random() * 700; // 300ms - 1s
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Email Provider Service
 * Integrates with email providers (e.g., SendGrid, AWS SES, Mailgun, etc.)
 */
export class EmailProvider {
  private config: NotificationProviderConfig;

  constructor(config: NotificationProviderConfig) {
    this.config = config;
  }

  async sendEmail(request: SendEmailRequest): Promise<NotificationResponse> {
    try {
      // In production, integrate with actual email provider API
      // Examples: SendGrid, AWS SES, Mailgun, Postmark, etc.

      // Validate email
      if (!this.isValidEmail(request.to)) {
        return {
          success: false,
          status: 'failed',
          message: 'Invalid email address',
        };
      }

      // Simulate API call delay
      await this.simulateApiDelay();

      // Simulate success rate (98% in production, 95% in sandbox)
      const successRate = this.config.environment === 'production' ? 0.98 : 0.95;
      const isSuccess = Math.random() < successRate;

      if (isSuccess) {
        const externalId = `EMAIL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return {
          success: true,
          providerId: 'email-provider',
          externalId,
          status: 'sent',
          message: 'Email sent successfully',
          cost: 0.001, // Example cost per email
        };
      } else {
        const failureReasons = [
          'Invalid email address',
          'Bounce detected',
          'Provider API error',
          'Rate limit exceeded',
        ];
        const reason = failureReasons[Math.floor(Math.random() * failureReasons.length)];
        return {
          success: false,
          status: 'failed',
          message: `Email failed: ${reason}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        message: error.message || 'Email sending failed',
      };
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async simulateApiDelay(): Promise<void> {
    const delay = 200 + Math.random() * 300; // 200ms - 500ms
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * WhatsApp Provider Service
 * Integrates with WhatsApp Business API providers (e.g., Twilio, WhatsApp Business API, etc.)
 */
export class WhatsAppProvider {
  private config: NotificationProviderConfig;

  constructor(config: NotificationProviderConfig) {
    this.config = config;
  }

  async sendWhatsApp(request: SendWhatsAppRequest): Promise<NotificationResponse> {
    try {
      // In production, integrate with actual WhatsApp Business API
      // Examples: Twilio WhatsApp API, WhatsApp Business API, etc.

      // Validate phone number
      if (!this.isValidPhoneNumber(request.to)) {
        return {
          success: false,
          status: 'failed',
          message: 'Invalid phone number format',
        };
      }

      // Simulate API call delay
      await this.simulateApiDelay();

      // Simulate success rate (92% in production, 88% in sandbox)
      const successRate = this.config.environment === 'production' ? 0.92 : 0.88;
      const isSuccess = Math.random() < successRate;

      if (isSuccess) {
        const externalId = `WA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return {
          success: true,
          providerId: 'whatsapp-provider',
          externalId,
          status: 'sent',
          message: 'WhatsApp message sent successfully',
          cost: 0.08, // Example cost per WhatsApp message
        };
      } else {
        const failureReasons = [
          'Invalid phone number',
          'User not on WhatsApp',
          'Provider API error',
          'Template not approved',
        ];
        const reason = failureReasons[Math.floor(Math.random() * failureReasons.length)];
        return {
          success: false,
          status: 'failed',
          message: `WhatsApp failed: ${reason}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        message: error.message || 'WhatsApp sending failed',
      };
    }
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^(\+?256|0)?[0-9]{9}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  }

  private async simulateApiDelay(): Promise<void> {
    const delay = 400 + Math.random() * 600; // 400ms - 1s
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}

