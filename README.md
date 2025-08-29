# TOMA - Tmux Orchestrator MCP Adapter

TOMA (Tmux Orchestrator MCP Adapter) is an MCP server that provides AI-powered tmux session management and orchestration capabilities. It migrates the functionality of the original Tmux-Orchestrator workspace tool into a Model Context Protocol server, eliminating token burning from manual documentation reading and providing intelligent automation tools.

## Features

### Core Tmux Management
- **Session Management**: Create, list, and manage tmux sessions
- **Window Operations**: Create, rename, kill, and monitor tmux windows
- **Content Capture**: Capture and analyze window content
- **Inter-Agent Communication**: Send messages between Claude agents in different windows

### Engineer Session Management
- **Simplified Session Creation**: Create "ingeniero" (engineer) sessions with single window initialization
- **Generic Engineer Briefing**: Non-role-specific briefing that allows internal sub-agent delegation
- **Project Idea Distribution**: Send project ideas and requirements to engineer sessions
- **Status Monitoring**: Request and track progress updates from engineers

### Scheduling and Automation (PM-Only Tools)
- **Task Scheduling**: Schedule orchestrator check-ins and progress reviews (PM use only)
- **Automated Standups**: Schedule daily engineer standups (PM use only)
- **Progress Monitoring**: Automated progress tracking and reporting (PM use only)
- **Smart Notifications**: Context-aware notifications and reminders (PM use only)

### Communication Tools
- **Message Broadcasting**: Send messages to multiple engineer sessions
- **Inter-Engineer Communication**: Facilitate communication between different engineer instances
- **Status Updates**: Automated status update requests and tracking

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Rixmerz/TOMA.git
   cd TOMA
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## MCP Configuration

Add TOMA to your MCP configuration file (typically `~/.config/mcp/config.json`):

```json
{
  "toma": {
    "command": "node",
    "args": ["/path/to/TOMA/dist/index.js", "--stdio"],
    "env": {
      "NODE_ENV": "production",
      "TOMA_LOG_LEVEL": "info",
      "TOMA_SAFETY_MODE": "true"
    }
  }
}
```

## Architecture and Use Case

### Intended Usage Pattern
TOMA is designed for a specific PM-Engineer workflow:

1. **Project Manager (PM)**: A free CLI agent with TOMA MCP access
   - Creates engineer sessions using `create_engineer_session`
   - Uses scheduling tools to monitor progress
   - Sends project ideas and coordinates between engineers
   - Has access to all TOMA tools

2. **Engineer**: A single tmux window labeled "ingeniero"
   - Receives generic briefing allowing internal sub-agent delegation
   - Manages specialized sub-agents internally (frontend, backend, testing, etc.)
   - Does NOT use TOMA's scheduling tools (PM-only)
   - Communicates with PM through TOMA's messaging system

### Key Design Principles
- **Single Window**: Engineers get one tmux window, not multiple role-specific windows
- **Internal Delegation**: Engineers handle role specialization via internal sub-agents
- **PM Oversight**: Only PM uses scheduling and monitoring tools
- **Simple Interface**: TOMA serves as a bridge between PM and engineer instances

## Available MCP Tools

### Core Tmux Management (14 tools)
- `tmux_get_sessions` - Get all tmux sessions and their windows
- `tmux_get_session_windows` - Get windows for a specific session
- `tmux_capture_window` - Capture content from a tmux window
- `tmux_get_window_info` - Get detailed window information
- `tmux_send_message` - Send message to Claude agent in tmux window
- `tmux_send_keys` - Send raw keys to tmux window
- `tmux_create_session` - Create new tmux session
- `tmux_create_window` - Create new window in session
- `tmux_rename_window` - Rename a tmux window
- `tmux_kill_session` - Kill a tmux session
- `tmux_kill_window` - Kill a tmux window
- `tmux_get_all_status` - Get comprehensive status of all sessions
- `tmux_find_windows_by_name` - Find windows by name
- `tmux_create_monitoring_snapshot` - Create monitoring snapshot

### PM-Only Scheduling Tools (6 tools)
- `schedule_task` - Schedule task with note (PM-only)
- `schedule_progress_review` - Schedule engineer progress review (PM-only)
- `schedule_orchestrator_check` - Schedule orchestrator oversight check (PM-only)
- `schedule_engineer_standup` - Schedule daily engineer standup (PM-only)
- `get_scheduled_tasks` - Get all scheduled tasks
- `cancel_scheduled_task` - Cancel a scheduled task

### Engineer Session Management (6 tools)
- `create_engineer_session` - Create new engineer session with single window
- `send_project_idea` - Send project idea to engineer session
- `get_project_ideas` - Get all saved project ideas
- `request_status_update` - Request status update from engineer
- `send_message_between_engineers` - Send message between engineers
- `broadcast_message` - Broadcast message to multiple sessions
- `terminate_engineer_session` - Terminate engineer session

## Usage Examples

### Creating an Engineer Session
```typescript
// Create a generic engineer session (single window labeled "ingeniero")
await mcp.callTool('create_engineer_session', {
  session_name: 'ingeniero-frontend',
  project_path: '/path/to/project',
  briefing: 'Focus on React components and UI improvements. Use internal sub-agents for specialized tasks.'
});
```

### Sending a Project Idea
```typescript
await mcp.callTool('send_project_idea', {
  session_name: 'ingeniero-backend',
  title: 'API Authentication System',
  description: 'Implement JWT-based authentication',
  requirements: ['JWT tokens', 'User registration', 'Password reset'],
  priority: 'high',
  estimated_hours: 16
});
```

### Scheduling Progress Reviews (PM-Only)
```typescript
// PM schedules review in 30 minutes
await mcp.callTool('schedule_progress_review', {
  session_name: 'ingeniero-frontend',
  minutes: 30
});
```

### Broadcasting Messages
```typescript
await mcp.callTool('broadcast_message', {
  sessions: ['ingeniero-frontend', 'ingeniero-backend'],
  message: 'Daily standup in 10 minutes. Please prepare your updates.'
});
```

## Migration from Original System

TOMA replaces the original Tmux-Orchestrator workspace approach with several key improvements:

1. **No Token Burning**: Eliminates the need to load CLAUDE.md documentation
2. **MCP Integration**: Native MCP protocol support for better AI integration
3. **Enhanced Automation**: Intelligent scheduling and monitoring tools
4. **Better Communication**: Structured inter-agent communication
5. **Simplified Architecture**: Single-window engineer sessions with internal sub-agent delegation

## Development

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Testing
```bash
npm test
```

## Environment Variables

- `NODE_ENV` - Environment (development/production)
- `TOMA_LOG_LEVEL` - Logging level (error/warn/info/debug)
- `TOMA_SAFETY_MODE` - Enable safety confirmations (true/false)
- `TOMA_MAX_LINES_CAPTURE` - Maximum lines to capture from windows
- `TOMA_DEFAULT_SCHEDULE_MINUTES` - Default scheduling interval

## Architecture

TOMA is built with:
- **TypeScript** for type safety and better development experience
- **MCP SDK** for Model Context Protocol integration
- **Node.js** child_process for tmux interaction
- **Modular Design** with separate managers for different concerns

## Acknowledgments

TOMA is inspired by and migrated from the original **Tmux-Orchestrator** workspace tool created by Jason Edward. The original project provided the foundational concepts and functionality that TOMA builds upon.

**Original Project**: [Tmux-Orchestrator](https://github.com/Jedward23/Tmux-Orchestrator)  
**Original Author**: Jason Edward (@Jedward23)

We extend our gratitude to the original author for creating the innovative tmux orchestration concepts that made TOMA possible. This project represents an evolution of those ideas into the Model Context Protocol ecosystem.

## License

MIT License - See LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/Rixmerz/TOMA).
