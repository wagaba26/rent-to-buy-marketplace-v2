/**
 * Support Request Routing Service
 * Routes support requests to appropriate teams based on category, priority, and workload
 */

import { Pool } from 'pg';
import { MessageQueueClient } from '@rent-to-own/message-queue';

export interface SupportTeam {
  id: string;
  name: string;
  categories: string[];
  maxConcurrentTickets: number;
  currentTickets: number;
  priorityLevels: ('low' | 'medium' | 'high' | 'urgent')[];
  available: boolean;
}

export interface TicketRouting {
  ticketId: string;
  teamId: string;
  assignedTo?: string;
  reason: string;
}

export class SupportRoutingService {
  private pool: Pool;
  private messageQueue: MessageQueueClient;
  private teams: Map<string, SupportTeam>;

  constructor(pool: Pool, messageQueue: MessageQueueClient) {
    this.pool = pool;
    this.messageQueue = messageQueue;
    this.teams = new Map();
    this.initializeTeams();
  }

  /**
   * Initialize support teams
   */
  private initializeTeams() {
    // Technical Support Team
    this.teams.set('technical', {
      id: 'technical',
      name: 'Technical Support',
      categories: ['technical', 'app_issue', 'account_access', 'bug_report'],
      maxConcurrentTickets: 50,
      currentTickets: 0,
      priorityLevels: ['low', 'medium', 'high', 'urgent'],
      available: true,
    });

    // Payment Support Team
    this.teams.set('payment', {
      id: 'payment',
      name: 'Payment Support',
      categories: ['payment', 'billing', 'refund', 'payment_method'],
      maxConcurrentTickets: 30,
      currentTickets: 0,
      priorityLevels: ['medium', 'high', 'urgent'],
      available: true,
    });

    // Vehicle Support Team
    this.teams.set('vehicle', {
      id: 'vehicle',
      name: 'Vehicle Support',
      categories: ['vehicle', 'reservation', 'delivery', 'maintenance', 'upgrade'],
      maxConcurrentTickets: 40,
      currentTickets: 0,
      priorityLevels: ['low', 'medium', 'high', 'urgent'],
      available: true,
    });

    // Credit Support Team
    this.teams.set('credit', {
      id: 'credit',
      name: 'Credit Support',
      categories: ['credit', 'application', 'approval', 'scoring'],
      maxConcurrentTickets: 25,
      currentTickets: 0,
      priorityLevels: ['medium', 'high', 'urgent'],
      available: true,
    });

    // General Support Team (catch-all)
    this.teams.set('general', {
      id: 'general',
      name: 'General Support',
      categories: ['general', 'inquiry', 'feedback', 'other'],
      maxConcurrentTickets: 100,
      currentTickets: 0,
      priorityLevels: ['low', 'medium', 'high'],
      available: true,
    });

    // Urgent/Escalation Team
    this.teams.set('escalation', {
      id: 'escalation',
      name: 'Escalation Team',
      categories: [], // Handles all categories for urgent tickets
      maxConcurrentTickets: 20,
      currentTickets: 0,
      priorityLevels: ['urgent'],
      available: true,
    });
  }

  /**
   * Route a support ticket to the appropriate team
   */
  async routeTicket(
    ticketId: string,
    category: string,
    priority: 'low' | 'medium' | 'high' | 'urgent'
  ): Promise<TicketRouting> {
    try {
      // Update team workloads
      await this.updateTeamWorkloads();

      // Find appropriate team
      let selectedTeam: SupportTeam | undefined;

      // Urgent tickets go to escalation team
      if (priority === 'urgent') {
        selectedTeam = this.teams.get('escalation');
      } else {
        // Find team that handles this category and has capacity
        for (const team of this.teams.values()) {
          if (
            team.available &&
            team.categories.includes(category) &&
            team.priorityLevels.includes(priority) &&
            team.currentTickets < team.maxConcurrentTickets
          ) {
            selectedTeam = team;
            break;
          }
        }
      }

      // Fallback to general support if no specific team found
      if (!selectedTeam) {
        selectedTeam = this.teams.get('general');
      }

      if (!selectedTeam) {
        throw new Error('No available support team found');
      }

      // Assign ticket to team
      await this.pool.query(
        `UPDATE support_tickets 
         SET assigned_to = $1, status = 'in_progress', updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [selectedTeam.id, ticketId]
      );

      // Increment team ticket count
      selectedTeam.currentTickets++;

      // Emit routing event
      await this.messageQueue.publish('support.events', 'support.ticket.routed', {
        type: 'support.ticket.routed',
        payload: {
          ticketId,
          teamId: selectedTeam.id,
          teamName: selectedTeam.name,
          category,
          priority,
        },
        timestamp: Date.now(),
      });

      return {
        ticketId,
        teamId: selectedTeam.id,
        reason: `Routed to ${selectedTeam.name} based on category (${category}) and priority (${priority})`,
      };
    } catch (error) {
      console.error('Error routing ticket:', error);
      throw error;
    }
  }

  /**
   * Auto-route tickets that are open but not assigned
   */
  async autoRoutePendingTickets(): Promise<void> {
    try {
      const result = await this.pool.query(
        `SELECT id, category, priority 
         FROM support_tickets 
         WHERE status = 'open' AND assigned_to IS NULL
         ORDER BY 
           CASE priority
             WHEN 'urgent' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             WHEN 'low' THEN 4
           END,
         created_at ASC
         LIMIT 20`
      );

      for (const row of result.rows) {
        await this.routeTicket(row.id, row.category, row.priority);
      }
    } catch (error) {
      console.error('Error in auto-routing tickets:', error);
    }
  }

  /**
   * Update team workloads from database
   */
  private async updateTeamWorkloads(): Promise<void> {
    try {
      const result = await this.pool.query(
        `SELECT assigned_to, COUNT(*) as count
         FROM support_tickets
         WHERE status IN ('open', 'in_progress')
           AND assigned_to IS NOT NULL
         GROUP BY assigned_to`
      );

      // Reset all team counts
      for (const team of this.teams.values()) {
        team.currentTickets = 0;
      }

      // Update from database
      for (const row of result.rows) {
        const team = this.teams.get(row.assigned_to);
        if (team) {
          team.currentTickets = parseInt(row.count);
        }
      }
    } catch (error) {
      console.error('Error updating team workloads:', error);
    }
  }

  /**
   * Get team statistics
   */
  async getTeamStatistics(): Promise<Record<string, any>> {
    await this.updateTeamWorkloads();

    const stats: Record<string, any> = {};
    for (const team of this.teams.values()) {
      stats[team.id] = {
        name: team.name,
        currentTickets: team.currentTickets,
        maxTickets: team.maxConcurrentTickets,
        utilization: (team.currentTickets / team.maxConcurrentTickets) * 100,
        available: team.available,
      };
    }

    return stats;
  }

  /**
   * Manually assign ticket to a specific team
   */
  async assignToTeam(ticketId: string, teamId: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    if (!team.available) {
      throw new Error(`Team ${teamId} is not available`);
    }

    await this.pool.query(
      `UPDATE support_tickets 
       SET assigned_to = $1, status = 'in_progress', updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [teamId, ticketId]
    );

    team.currentTickets++;
  }
}

