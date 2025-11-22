import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { NotFoundError, ValidationError } from '@rent-to-own/errors';
import { SupportRoutingService } from '../services/supportRouting';

export function supportRoutes(
  pool: Pool,
  messageQueue: MessageQueueClient,
  routingService: SupportRoutingService
): Router {
  const router = Router();

  // Create support ticket
  router.post('/tickets', async (req: Request, res: Response) => {
    try {
      const { userId, subject, description, category, priority = 'medium' } = req.body;

      if (!userId || !subject || !description || !category) {
        throw new ValidationError('userId, subject, description, and category are required');
      }

      const result = await pool.query(
        `INSERT INTO support_tickets (user_id, subject, description, category, priority, status)
         VALUES ($1, $2, $3, $4, $5, 'open')
         RETURNING *`,
        [userId, subject, description, category, priority]
      );

      const ticket = result.rows[0];

      // Auto-route ticket to appropriate team
      try {
        const routing = await routingService.routeTicket(ticket.id, category, priority);
        console.log(`Ticket ${ticket.id} routed: ${routing.reason}`);
      } catch (error) {
        console.error('Error routing ticket:', error);
        // Continue even if routing fails
      }

      // Publish ticket created event
      await messageQueue.publish('support.events', 'support.ticket.created', {
        type: 'support.ticket.created',
        payload: {
          ticketId: ticket.id,
          userId: ticket.user_id,
          category: ticket.category,
          priority: ticket.priority,
        },
        timestamp: Date.now(),
      });

      res.status(201).json({
        success: true,
        data: { ticket },
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

  // Get user tickets
  router.get('/tickets/user/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { status, limit = 50, offset = 0 } = req.query;

      let query = 'SELECT * FROM support_tickets WHERE user_id = $1';
      const values: any[] = [userId];
      let paramCount = 2;

      if (status) {
        query += ` AND status = $${paramCount++}`;
        values.push(status);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
      values.push(parseInt(limit as string), parseInt(offset as string));

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: { tickets: result.rows },
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

  // Get ticket details
  router.get('/tickets/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const ticketResult = await pool.query('SELECT * FROM support_tickets WHERE id = $1', [id]);
      if (ticketResult.rows.length === 0) {
        throw new NotFoundError('Support ticket');
      }

      const messagesResult = await pool.query(
        'SELECT * FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC',
        [id]
      );

      res.json({
        success: true,
        data: {
          ticket: ticketResult.rows[0],
          messages: messagesResult.rows,
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

  // Add message to ticket
  router.post('/tickets/:id/messages', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, message, isFromSupport = false } = req.body;

      if (!userId || !message) {
        throw new ValidationError('userId and message are required');
      }

      // Verify ticket exists
      const ticketCheck = await pool.query('SELECT id FROM support_tickets WHERE id = $1', [id]);
      if (ticketCheck.rows.length === 0) {
        throw new NotFoundError('Support ticket');
      }

      const result = await pool.query(
        `INSERT INTO ticket_messages (ticket_id, user_id, message, is_from_support)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [id, userId, message, isFromSupport]
      );

      // Update ticket updated_at
      await pool.query('UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);

      res.status(201).json({
        success: true,
        data: { message: result.rows[0] },
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

  // Update ticket status
  router.patch('/tickets/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, assignedTo } = req.body;

      if (!status || !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
        throw new ValidationError('Valid status is required');
      }

      const updates: string[] = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
      const values: any[] = [status];
      let paramCount = 2;

      if (assignedTo) {
        updates.push(`assigned_to = $${paramCount++}`);
        values.push(assignedTo);
      }

      if (status === 'resolved') {
        updates.push('resolved_at = CURRENT_TIMESTAMP');
      }

      values.push(id);

      const result = await pool.query(
        `UPDATE support_tickets SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Support ticket');
      }

      res.json({
        success: true,
        data: { ticket: result.rows[0] },
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

  // Get team statistics
  router.get('/teams/stats', async (req: Request, res: Response) => {
    try {
      const stats = await routingService.getTeamStatistics();
      res.json({
        success: true,
        data: { teams: stats },
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

  // Manually assign ticket to team
  router.post('/tickets/:id/assign', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { teamId } = req.body;

      if (!teamId) {
        throw new ValidationError('teamId is required');
      }

      await routingService.assignToTeam(id, teamId);

      const ticket = await pool.query('SELECT * FROM support_tickets WHERE id = $1', [id]);

      res.json({
        success: true,
        data: { ticket: ticket.rows[0] },
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

