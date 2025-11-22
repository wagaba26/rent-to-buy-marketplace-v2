import * as amqp from 'amqplib';
import { EventEmitter } from 'events';

export interface MessageQueueConfig {
  url: string;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface Message {
  type: string;
  payload: any;
  timestamp: number;
  correlationId?: string;
}

export class MessageQueueClient extends EventEmitter {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private config: MessageQueueConfig;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(config: MessageQueueConfig) {
    super();
    this.config = config;
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.config.url);
      this.channel = await this.connection.createChannel();
      
      this.connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err);
        this.emit('error', err);
      });

      this.connection.on('close', () => {
        console.log('RabbitMQ connection closed, attempting reconnect...');
        setTimeout(() => this.connect(), this.retryDelay);
      });

      console.log('Connected to RabbitMQ');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async publish(exchange: string, routingKey: string, message: Message): Promise<boolean> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    try {
      await this.channel.assertExchange(exchange, 'topic', { durable: true });
      const published = this.channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      if (!published) {
        throw new Error('Message could not be published');
      }

      return true;
    } catch (error) {
      console.error('Failed to publish message:', error);
      throw error;
    }
  }

  async subscribe(
    exchange: string,
    queue: string,
    routingKey: string,
    handler: (message: Message) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    try {
      await this.channel.assertExchange(exchange, 'topic', { durable: true });
      await this.channel.assertQueue(queue, { durable: true });
      await this.channel.bindQueue(queue, exchange, routingKey);

      await this.channel.consume(queue, async (msg) => {
        if (!msg) return;

        try {
          const message: Message = JSON.parse(msg.content.toString());
          await handler(message);
          this.channel!.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          // Retry logic with exponential backoff
          const retries = msg.properties.headers?.retries || 0;
          if (retries < this.retryAttempts) {
            await this.channel!.nack(msg, false, false);
            // Republish with retry count
            await this.publish(exchange, routingKey, {
              ...message,
              retries: retries + 1,
            } as any);
          } else {
            // Move to dead letter queue
            this.channel!.nack(msg, false, false);
            console.error('Message failed after max retries, moving to DLQ');
          }
        }
      });

      console.log(`Subscribed to ${exchange} with routing key ${routingKey}`);
    } catch (error) {
      console.error('Failed to subscribe:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }
}

