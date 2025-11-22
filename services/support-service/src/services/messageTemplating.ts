/**
 * Message Templating Service
 * Provides templating functionality for customizing messages
 */

export interface TemplateVariables {
  [key: string]: string | number | boolean;
}

export interface MessageTemplate {
  id: string;
  name: string;
  type: 'onboarding' | 'payment_reminder' | 'delinquency' | 'marketing' | 'support' | 'custom';
  channels: ('sms' | 'email' | 'whatsapp')[];
  subject?: string; // For email
  smsTemplate: string;
  emailTemplate?: string;
  whatsappTemplate?: string;
  variables: string[]; // List of required variables
  description?: string;
}

export class MessageTemplatingService {
  private templates: Map<string, MessageTemplate>;

  constructor() {
    this.templates = new Map();
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default templates for common use cases
   */
  private initializeDefaultTemplates() {
    // Onboarding confirmation
    this.templates.set('onboarding_confirmation', {
      id: 'onboarding_confirmation',
      name: 'Onboarding Confirmation',
      type: 'onboarding',
      channels: ['sms', 'email', 'whatsapp'],
      subject: 'Welcome to Rent-to-Own Marketplace',
      smsTemplate: 'Hi {{name}}, welcome to Rent-to-Own! Your account has been created. Your user ID is {{userId}}. Start browsing vehicles now!',
      emailTemplate: `
        <h2>Welcome {{name}}!</h2>
        <p>Thank you for joining Rent-to-Own Marketplace. Your account has been successfully created.</p>
        <p><strong>User ID:</strong> {{userId}}</p>
        <p>You can now start browsing our vehicle catalog and apply for rent-to-own plans.</p>
        <p>Best regards,<br>Rent-to-Own Team</p>
      `,
      whatsappTemplate: 'Hi {{name}}, welcome to Rent-to-Own! 🚗 Your account has been created. Your user ID is {{userId}}. Start browsing vehicles now!',
      variables: ['name', 'userId'],
    });

    // Payment reminder
    this.templates.set('payment_reminder', {
      id: 'payment_reminder',
      name: 'Payment Reminder',
      type: 'payment_reminder',
      channels: ['sms', 'email', 'whatsapp'],
      subject: 'Payment Reminder - {{amount}} due on {{dueDate}}',
      smsTemplate: 'Hi {{name}}, this is a reminder that your payment of {{amount}} is due on {{dueDate}}. Please ensure funds are available.',
      emailTemplate: `
        <h2>Payment Reminder</h2>
        <p>Hi {{name}},</p>
        <p>This is a friendly reminder that your payment is due soon.</p>
        <ul>
          <li><strong>Amount:</strong> {{amount}}</li>
          <li><strong>Due Date:</strong> {{dueDate}}</li>
          <li><strong>Vehicle:</strong> {{vehicleName}}</li>
        </ul>
        <p>Please ensure funds are available in your mobile money account.</p>
        <p>Thank you,<br>Rent-to-Own Team</p>
      `,
      whatsappTemplate: 'Hi {{name}}, ⏰ Payment reminder: {{amount}} due on {{dueDate}}. Please ensure funds are available.',
      variables: ['name', 'amount', 'dueDate', 'vehicleName'],
    });

    // Delinquency notice
    this.templates.set('delinquency_notice', {
      id: 'delinquency_notice',
      name: 'Delinquency Notice',
      type: 'delinquency',
      channels: ['sms', 'email', 'whatsapp'],
      subject: 'Urgent: Payment Overdue - {{daysOverdue}} days',
      smsTemplate: 'URGENT: Your payment of {{amount}} is {{daysOverdue}} days overdue. Please make payment immediately to avoid service interruption. Contact support: {{supportPhone}}',
      emailTemplate: `
        <h2>Urgent: Payment Overdue</h2>
        <p>Hi {{name}},</p>
        <p>Your payment is now overdue. Immediate action is required.</p>
        <ul>
          <li><strong>Amount:</strong> {{amount}}</li>
          <li><strong>Days Overdue:</strong> {{daysOverdue}}</li>
          <li><strong>Vehicle:</strong> {{vehicleName}}</li>
        </ul>
        <p><strong>Please make payment immediately to avoid service interruption.</strong></p>
        <p>If you have any questions, contact our support team at {{supportPhone}} or {{supportEmail}}.</p>
        <p>Best regards,<br>Rent-to-Own Team</p>
      `,
      whatsappTemplate: '🚨 URGENT: Payment of {{amount}} is {{daysOverdue}} days overdue. Please pay immediately to avoid service interruption. Support: {{supportPhone}}',
      variables: ['name', 'amount', 'daysOverdue', 'vehicleName', 'supportPhone', 'supportEmail'],
    });

    // Marketing campaign
    this.templates.set('marketing_campaign', {
      id: 'marketing_campaign',
      name: 'Marketing Campaign',
      type: 'marketing',
      channels: ['sms', 'email', 'whatsapp'],
      subject: '{{campaignTitle}}',
      smsTemplate: '{{message}} {{promoCode}}',
      emailTemplate: `
        <h2>{{campaignTitle}}</h2>
        <p>{{message}}</p>
        {{#if promoCode}}
        <p><strong>Promo Code:</strong> {{promoCode}}</p>
        {{/if}}
        <p>{{callToAction}}</p>
      `,
      whatsappTemplate: '{{message}} {{promoCode}}',
      variables: ['campaignTitle', 'message', 'promoCode', 'callToAction'],
    });

    // Support ticket created
    this.templates.set('support_ticket_created', {
      id: 'support_ticket_created',
      name: 'Support Ticket Created',
      type: 'support',
      channels: ['email', 'whatsapp'],
      subject: 'Support Ticket #{{ticketId}} Created',
      emailTemplate: `
        <h2>Support Ticket Created</h2>
        <p>Hi {{name}},</p>
        <p>We have received your support request.</p>
        <ul>
          <li><strong>Ticket ID:</strong> {{ticketId}}</li>
          <li><strong>Subject:</strong> {{subject}}</li>
          <li><strong>Category:</strong> {{category}}</li>
        </ul>
        <p>Our team will review your request and respond within 24 hours.</p>
        <p>You can track your ticket status in your account dashboard.</p>
        <p>Best regards,<br>Rent-to-Own Support Team</p>
      `,
      whatsappTemplate: 'Hi {{name}}, we received your support request (Ticket #{{ticketId}}). We\'ll respond within 24 hours.',
      variables: ['name', 'ticketId', 'subject', 'category'],
    });
  }

  /**
   * Get a template by ID
   */
  getTemplate(templateId: string): MessageTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Register a custom template
   */
  registerTemplate(template: MessageTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Render a template with variables
   */
  renderTemplate(template: MessageTemplate, channel: 'sms' | 'email' | 'whatsapp', variables: TemplateVariables): string {
    let templateString: string;

    switch (channel) {
      case 'sms':
        templateString = template.smsTemplate;
        break;
      case 'email':
        templateString = template.emailTemplate || template.smsTemplate;
        break;
      case 'whatsapp':
        templateString = template.whatsappTemplate || template.smsTemplate;
        break;
      default:
        templateString = template.smsTemplate;
    }

    // Simple template rendering - replace {{variable}} with values
    let rendered = templateString;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, String(value));
    }

    // Handle subject separately for email
    if (channel === 'email' && template.subject) {
      let subject = template.subject;
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        subject = subject.replace(regex, String(value));
      }
      // Store rendered subject in a special variable
      rendered = `__SUBJECT__:${subject}__BODY__:${rendered}`;
    }

    return rendered;
  }

  /**
   * Validate that all required variables are provided
   */
  validateVariables(template: MessageTemplate, variables: TemplateVariables): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    
    for (const requiredVar of template.variables) {
      if (!(requiredVar in variables)) {
        missing.push(requiredVar);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Get all templates by type
   */
  getTemplatesByType(type: MessageTemplate['type']): MessageTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.type === type);
  }

  /**
   * List all available templates
   */
  listTemplates(): MessageTemplate[] {
    return Array.from(this.templates.values());
  }
}

