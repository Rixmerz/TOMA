#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { TmuxManager } from './core/tmux-manager.js';
import { Scheduler } from './core/scheduler.js';
import { EngineerManager } from './core/engineer-manager.js';
import { ProjectIdea, EngineerSessionConfig } from './types/tmux.js';

// Disable console logging in stdio mode for MCP compatibility
const noop = () => {};
console.log = noop;
console.info = noop;
console.warn = noop;
console.error = noop;

async function main() {
  const server = new Server(
    { name: 'toma', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  // Initialize core components
  const tmuxManager = new TmuxManager();
  const scheduler = new Scheduler();
  const engineerManager = new EngineerManager(tmuxManager);

  // Define MCP tools
  const tools = [
    // Core Tmux Management Tools
    {
      name: 'tmux_get_sessions',
      description: 'Get all tmux sessions and their windows',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'tmux_get_session_windows',
      description: 'Get windows for a specific tmux session',
      inputSchema: {
        type: 'object',
        properties: {
          session_name: { type: 'string', description: 'Name of the tmux session' }
        },
        required: ['session_name']
      }
    },
    {
      name: 'tmux_capture_window',
      description: 'Capture content from a tmux window',
      inputSchema: {
        type: 'object',
        properties: {
          session_name: { type: 'string', description: 'Name of the tmux session' },
          window_index: { type: 'number', description: 'Index of the window' },
          num_lines: { type: 'number', description: 'Number of lines to capture (default: 50)' }
        },
        required: ['session_name', 'window_index']
      }
    },
    {
      name: 'tmux_get_window_info',
      description: 'Get detailed information about a specific window',
      inputSchema: {
        type: 'object',
        properties: {
          session_name: { type: 'string', description: 'Name of the tmux session' },
          window_index: { type: 'number', description: 'Index of the window' }
        },
        required: ['session_name', 'window_index']
      }
    },
    {
      name: 'tmux_send_message',
      description: 'Send a message to a Claude agent in a tmux window',
      inputSchema: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Target window (session:window format)' },
          message: { type: 'string', description: 'Message to send' },
          delay: { type: 'number', description: 'Delay in milliseconds before sending Enter (default: 500)' }
        },
        required: ['target', 'message']
      }
    },
    {
      name: 'tmux_send_keys',
      description: 'Send raw keys to a tmux window',
      inputSchema: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Target window (session:window format)' },
          keys: { type: 'string', description: 'Keys to send' }
        },
        required: ['target', 'keys']
      }
    },
    {
      name: 'tmux_create_session',
      description: 'Create a new tmux session',
      inputSchema: {
        type: 'object',
        properties: {
          session_name: { type: 'string', description: 'Name for the new session' },
          start_directory: { type: 'string', description: 'Starting directory for the session' }
        },
        required: ['session_name']
      }
    },
    {
      name: 'tmux_create_window',
      description: 'Create a new window in a tmux session',
      inputSchema: {
        type: 'object',
        properties: {
          session_name: { type: 'string', description: 'Name of the tmux session' },
          window_name: { type: 'string', description: 'Name for the new window' },
          start_directory: { type: 'string', description: 'Starting directory for the window' }
        },
        required: ['session_name', 'window_name']
      }
    },
    {
      name: 'tmux_rename_window',
      description: 'Rename a tmux window',
      inputSchema: {
        type: 'object',
        properties: {
          session_name: { type: 'string', description: 'Name of the tmux session' },
          window_index: { type: 'number', description: 'Index of the window' },
          new_name: { type: 'string', description: 'New name for the window' }
        },
        required: ['session_name', 'window_index', 'new_name']
      }
    },
    {
      name: 'tmux_kill_session',
      description: 'Kill a tmux session',
      inputSchema: {
        type: 'object',
        properties: {
          session_name: { type: 'string', description: 'Name of the session to kill' }
        },
        required: ['session_name']
      }
    },
    {
      name: 'tmux_kill_window',
      description: 'Kill a tmux window',
      inputSchema: {
        type: 'object',
        properties: {
          session_name: { type: 'string', description: 'Name of the tmux session' },
          window_index: { type: 'number', description: 'Index of the window to kill' }
        },
        required: ['session_name', 'window_index']
      }
    },
    {
      name: 'tmux_get_all_status',
      description: 'Get comprehensive status of all tmux sessions and windows',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'tmux_find_windows_by_name',
      description: 'Find windows by name across all sessions',
      inputSchema: {
        type: 'object',
        properties: {
          window_name: { type: 'string', description: 'Window name to search for (partial match)' }
        },
        required: ['window_name']
      }
    },
    {
      name: 'tmux_create_monitoring_snapshot',
      description: 'Create a comprehensive monitoring snapshot for analysis',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    },

    // Scheduling Tools
    {
      name: 'schedule_task',
      description: 'Schedule a task with a note to be executed later (PM-only tool)',
      inputSchema: {
        type: 'object',
        properties: {
          minutes: { type: 'number', description: 'Minutes from now to execute the task' },
          note: { type: 'string', description: 'Note/message for the scheduled task' },
          target_window: { type: 'string', description: 'Target window (default: tmux-orc:0)' }
        },
        required: ['minutes', 'note']
      }
    },
    {
      name: 'schedule_progress_review',
      description: 'Schedule a progress review for an engineer session (PM-only tool)',
      inputSchema: {
        type: 'object',
        properties: {
          session_name: { type: 'string', description: 'Name of the engineer session' },
          minutes: { type: 'number', description: 'Minutes from now (default: 30)' }
        },
        required: ['session_name']
      }
    },
    {
      name: 'schedule_orchestrator_check',
      description: 'Schedule a regular orchestrator oversight check (PM-only tool)',
      inputSchema: {
        type: 'object',
        properties: {
          minutes: { type: 'number', description: 'Minutes from now (default: 15)' }
        },
        required: []
      }
    },
    {
      name: 'schedule_engineer_standup',
      description: 'Schedule a daily standup for an engineer (PM-only tool)',
      inputSchema: {
        type: 'object',
        properties: {
          session_name: { type: 'string', description: 'Name of the engineer session' },
          minutes: { type: 'number', description: 'Minutes from now (default: 480 - 8 hours)' }
        },
        required: ['session_name']
      }
    },
    {
      name: 'get_scheduled_tasks',
      description: 'Get all scheduled tasks',
      inputSchema: {
        type: 'object',
        properties: {
          active_only: { type: 'boolean', description: 'Return only active tasks (default: false)' }
        },
        required: []
      }
    },
    {
      name: 'cancel_scheduled_task',
      description: 'Cancel a scheduled task',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'ID of the task to cancel' }
        },
        required: ['task_id']
      }
    },

    // Engineer Session Management Tools
    {
      name: 'create_engineer_session',
      description: 'Create a new engineer session with generic initialization (single window labeled "ingeniero")',
      inputSchema: {
        type: 'object',
        properties: {
          session_name: { type: 'string', description: 'Name for the engineer session (e.g., "ingeniero")' },
          project_path: { type: 'string', description: 'Path to the project directory' },
          briefing: { type: 'string', description: 'Custom briefing instructions' }
        },
        required: ['session_name', 'project_path']
      }
    },
    {
      name: 'send_project_idea',
      description: 'Send a project idea to an engineer session',
      inputSchema: {
        type: 'object',
        properties: {
          session_name: { type: 'string', description: 'Name of the engineer session' },
          title: { type: 'string', description: 'Project title' },
          description: { type: 'string', description: 'Project description' },
          requirements: { type: 'array', items: { type: 'string' }, description: 'List of requirements' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Project priority' },
          estimated_hours: { type: 'number', description: 'Estimated hours to complete' },
          assigned_to: { type: 'string', description: 'Who the project is assigned to' }
        },
        required: ['session_name', 'title', 'description', 'requirements', 'priority']
      }
    },
    {
      name: 'get_project_ideas',
      description: 'Get all saved project ideas',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'request_status_update',
      description: 'Request a comprehensive status update from an engineer',
      inputSchema: {
        type: 'object',
        properties: {
          session_name: { type: 'string', description: 'Name of the engineer session' }
        },
        required: ['session_name']
      }
    },
    {
      name: 'send_message_between_engineers',
      description: 'Send a message from one engineer to another',
      inputSchema: {
        type: 'object',
        properties: {
          from_session: { type: 'string', description: 'Source engineer session' },
          to_session: { type: 'string', description: 'Target engineer session' },
          message: { type: 'string', description: 'Message to send' }
        },
        required: ['from_session', 'to_session', 'message']
      }
    },
    {
      name: 'broadcast_message',
      description: 'Broadcast a message to multiple engineer sessions',
      inputSchema: {
        type: 'object',
        properties: {
          sessions: { type: 'array', items: { type: 'string' }, description: 'List of session names' },
          message: { type: 'string', description: 'Message to broadcast' },
          exclude_session: { type: 'string', description: 'Session to exclude from broadcast' }
        },
        required: ['sessions', 'message']
      }
    },
    {
      name: 'terminate_engineer_session',
      description: 'Terminate an engineer session with optional reason',
      inputSchema: {
        type: 'object',
        properties: {
          session_name: { type: 'string', description: 'Name of the session to terminate' },
          reason: { type: 'string', description: 'Reason for termination' }
        },
        required: ['session_name']
      }
    }
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        // Core Tmux Management Tools
        case 'tmux_get_sessions': {
          const sessions = await tmuxManager.getSessions();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(sessions, null, 2)
            }]
          };
        }

        case 'tmux_get_session_windows': {
          const sessionName = args?.session_name as string;
          const windows = await tmuxManager.getSessionWindows(sessionName);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(windows, null, 2)
            }]
          };
        }

        case 'tmux_capture_window': {
          const sessionName = args?.session_name as string;
          const windowIndex = args?.window_index as number;
          const numLines = (args?.num_lines as number) || 50;
          const content = await tmuxManager.captureWindowContent(sessionName, windowIndex, numLines);
          return {
            content: [{
              type: 'text',
              text: content
            }]
          };
        }

        case 'tmux_get_window_info': {
          const sessionName = args?.session_name as string;
          const windowIndex = args?.window_index as number;
          const info = await tmuxManager.getWindowInfo(sessionName, windowIndex);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(info, null, 2)
            }]
          };
        }

        case 'tmux_send_message': {
          const target = args?.target as string;
          const message = args?.message as string;
          const delay = (args?.delay as number) || 500;
          const success = await tmuxManager.sendMessage({ target, message, delay });
          return {
            content: [{
              type: 'text',
              text: `Message ${success ? 'sent successfully' : 'failed to send'} to ${target}`
            }]
          };
        }

        case 'tmux_send_keys': {
          const target = args?.target as string;
          const keys = args?.keys as string;
          const success = await tmuxManager.sendKeys(target, keys);
          return {
            content: [{
              type: 'text',
              text: `Keys ${success ? 'sent successfully' : 'failed to send'} to ${target}`
            }]
          };
        }

        case 'tmux_create_session': {
          const sessionName = args?.session_name as string;
          const startDirectory = args?.start_directory as string;
          const success = await tmuxManager.createSession(sessionName, startDirectory);
          return {
            content: [{
              type: 'text',
              text: `Session ${sessionName} ${success ? 'created successfully' : 'failed to create'}`
            }]
          };
        }

        case 'tmux_create_window': {
          const sessionName = args?.session_name as string;
          const windowName = args?.window_name as string;
          const startDirectory = args?.start_directory as string;
          const windowIndex = await tmuxManager.createWindow(sessionName, windowName, startDirectory);
          return {
            content: [{
              type: 'text',
              text: windowIndex !== null 
                ? `Window ${windowName} created successfully with index ${windowIndex}`
                : `Failed to create window ${windowName}`
            }]
          };
        }

        case 'tmux_rename_window': {
          const sessionName = args?.session_name as string;
          const windowIndex = args?.window_index as number;
          const newName = args?.new_name as string;
          const success = await tmuxManager.renameWindow(sessionName, windowIndex, newName);
          return {
            content: [{
              type: 'text',
              text: `Window ${success ? 'renamed successfully' : 'failed to rename'}`
            }]
          };
        }

        case 'tmux_kill_session': {
          const sessionName = args?.session_name as string;
          const success = await tmuxManager.killSession(sessionName);
          return {
            content: [{
              type: 'text',
              text: `Session ${sessionName} ${success ? 'killed successfully' : 'failed to kill'}`
            }]
          };
        }

        case 'tmux_kill_window': {
          const sessionName = args?.session_name as string;
          const windowIndex = args?.window_index as number;
          const success = await tmuxManager.killWindow(sessionName, windowIndex);
          return {
            content: [{
              type: 'text',
              text: `Window ${success ? 'killed successfully' : 'failed to kill'}`
            }]
          };
        }

        case 'tmux_get_all_status': {
          const status = await tmuxManager.getAllStatus();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(status, null, 2)
            }]
          };
        }

        case 'tmux_find_windows_by_name': {
          const windowName = args?.window_name as string;
          const matches = await tmuxManager.findWindowsByName(windowName);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(matches, null, 2)
            }]
          };
        }

        case 'tmux_create_monitoring_snapshot': {
          const snapshot = await tmuxManager.createMonitoringSnapshot();
          return {
            content: [{
              type: 'text',
              text: snapshot
            }]
          };
        }

        // Scheduling Tools
        case 'schedule_task': {
          const minutes = args?.minutes as number;
          const note = args?.note as string;
          const targetWindow = args?.target_window as string;
          const taskId = await scheduler.scheduleTask({ minutes, note, target_window: targetWindow });
          return {
            content: [{
              type: 'text',
              text: `Task scheduled successfully with ID: ${taskId}`
            }]
          };
        }

        case 'schedule_progress_review': {
          const sessionName = args?.session_name as string;
          const minutes = (args?.minutes as number) || 30;
          const taskId = await scheduler.scheduleProgressReview(sessionName, minutes);
          return {
            content: [{
              type: 'text',
              text: `Progress review scheduled for ${sessionName} in ${minutes} minutes. Task ID: ${taskId}`
            }]
          };
        }

        case 'schedule_orchestrator_check': {
          const minutes = (args?.minutes as number) || 15;
          const taskId = await scheduler.scheduleOrchestratorCheck(minutes);
          return {
            content: [{
              type: 'text',
              text: `Orchestrator check scheduled in ${minutes} minutes. Task ID: ${taskId}`
            }]
          };
        }

        case 'schedule_engineer_standup': {
          const sessionName = args?.session_name as string;
          const minutes = (args?.minutes as number) || 480;
          const taskId = await scheduler.scheduleEngineerStandup(sessionName, minutes);
          return {
            content: [{
              type: 'text',
              text: `Engineer standup scheduled for ${sessionName} in ${minutes} minutes. Task ID: ${taskId}`
            }]
          };
        }

        case 'get_scheduled_tasks': {
          const activeOnly = args?.active_only as boolean;
          const tasks = activeOnly ? scheduler.getActiveTasks() : scheduler.getAllTasks();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(tasks, null, 2)
            }]
          };
        }

        case 'cancel_scheduled_task': {
          const taskId = args?.task_id as string;
          const success = await scheduler.cancelTask(taskId);
          return {
            content: [{
              type: 'text',
              text: `Task ${taskId} ${success ? 'cancelled successfully' : 'failed to cancel or not found'}`
            }]
          };
        }

        // Engineer Session Management Tools
        case 'create_engineer_session': {
          const config: EngineerSessionConfig = {
            session_name: args?.session_name as string,
            project_path: args?.project_path as string,
            briefing: args?.briefing as string
          };

          const success = await engineerManager.createEngineerSession(config);
          return {
            content: [{
              type: 'text',
              text: `Engineer session ${config.session_name} ${success ? 'created successfully with single "ingeniero" window' : 'failed to create'}`
            }]
          };
        }

        case 'send_project_idea': {
          const sessionName = args?.session_name as string;
          const idea: ProjectIdea = {
            title: args?.title as string,
            description: args?.description as string,
            requirements: args?.requirements as string[],
            priority: args?.priority as 'high' | 'medium' | 'low',
            estimated_hours: args?.estimated_hours as number,
            assigned_to: args?.assigned_to as string
          };

          const success = await engineerManager.sendProjectIdea(sessionName, idea);
          return {
            content: [{
              type: 'text',
              text: `Project idea ${success ? 'sent successfully' : 'failed to send'} to ${sessionName}`
            }]
          };
        }

        case 'get_project_ideas': {
          const ideas = await engineerManager.getProjectIdeas();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(ideas, null, 2)
            }]
          };
        }

        case 'request_status_update': {
          const sessionName = args?.session_name as string;
          const success = await engineerManager.requestStatusUpdate(sessionName);
          return {
            content: [{
              type: 'text',
              text: `Status update request ${success ? 'sent successfully' : 'failed to send'} to ${sessionName}`
            }]
          };
        }

        case 'send_message_between_engineers': {
          const fromSession = args?.from_session as string;
          const toSession = args?.to_session as string;
          const message = args?.message as string;
          const success = await engineerManager.sendMessageBetweenEngineers(fromSession, toSession, message);
          return {
            content: [{
              type: 'text',
              text: `Message ${success ? 'sent successfully' : 'failed to send'} from ${fromSession} to ${toSession}`
            }]
          };
        }

        case 'broadcast_message': {
          const sessions = args?.sessions as string[];
          const message = args?.message as string;
          const excludeSession = args?.exclude_session as string;
          const results = await engineerManager.broadcastMessage(sessions, message, excludeSession);
          const successCount = results.filter(r => r).length;
          return {
            content: [{
              type: 'text',
              text: `Broadcast message sent to ${successCount}/${results.length} sessions`
            }]
          };
        }

        case 'terminate_engineer_session': {
          const sessionName = args?.session_name as string;
          const reason = args?.reason as string;
          const success = await engineerManager.terminateEngineerSession(sessionName, reason);
          return {
            content: [{
              type: 'text',
              text: `Engineer session ${sessionName} ${success ? 'terminated successfully' : 'failed to terminate'}`
            }]
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  });

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  process.exit(1);
});

// Start the server
main().catch(error => {
  process.exit(1);
});
