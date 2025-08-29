import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
export class EngineerManager {
    tmux;
    projectIdeasPath;
    constructor(tmux, projectIdeasPath = '/tmp/toma_project_ideas.json') {
        this.tmux = tmux;
        this.projectIdeasPath = projectIdeasPath;
    }
    async createEngineerSession(config) {
        const { session_name, project_path, briefing } = config;
        try {
            // Create the main session
            const sessionCreated = await this.tmux.createSession(session_name, project_path);
            if (!sessionCreated) {
                throw new Error(`Failed to create session: ${session_name}`);
            }
            // Rename the first window to "ingeniero" (engineer)
            await this.tmux.renameWindow(session_name, 0, 'ingeniero');
            // Start Claude in the first window
            await this.tmux.sendKeys(`${session_name}:0`, 'claude');
            await this.tmux.sendKeys(`${session_name}:0`, 'Enter');
            // Wait for Claude to start
            await new Promise(resolve => setTimeout(resolve, 5000));
            // Send briefing to Claude
            const engineerBriefing = this.generateEngineerBriefing(project_path, briefing);
            await this.tmux.sendMessage({
                target: `${session_name}:0`,
                message: engineerBriefing
            });
            return true;
        }
        catch (error) {
            console.error(`Error creating engineer session ${session_name}:`, error);
            return false;
        }
    }
    generateEngineerBriefing(projectPath, customBriefing) {
        const baseBriefing = `You are an AI engineer responsible for the codebase at: ${projectPath}

Your primary duties include:
1. Analyzing the project structure and understanding the codebase
2. Working on assigned tasks and priorities from the Project Manager
3. Following git discipline (commit every 30 minutes)
4. Communicating progress and blockers clearly to the PM
5. Managing sub-agents internally for different specialized tasks
6. Maintaining high code quality standards

Git Discipline Rules (MANDATORY):
- Commit every 30 minutes: git add -A && git commit -m "Progress: [description]"
- Never work >1 hour without committing
- Use meaningful commit messages
- Create feature branches for new work
- Tag stable versions before major changes

Internal Sub-Agent Management:
- You can delegate specialized tasks to internal sub-agents (frontend, backend, testing, etc.)
- Coordinate between your sub-agents to ensure cohesive development
- The Project Manager will communicate with you, not your sub-agents directly
- Report consolidated progress from all your sub-agents to the PM

First, analyze the project to understand:
- Project type (check package.json, requirements.txt, etc.)
- Current issues or priorities
- Main application purpose
- Available development tools and setup

Wait for instructions from the Project Manager before beginning work.`;
        return customBriefing ? `${baseBriefing}\n\nAdditional Instructions:\n${customBriefing}` : baseBriefing;
    }
    async sendProjectIdea(sessionName, idea) {
        try {
            // Save the project idea to file
            await this.saveProjectIdea(idea);
            // Send the project idea to the engineer
            const message = `New Project Idea: ${idea.title}

Description: ${idea.description}

Requirements:
${idea.requirements.map(req => `- ${req}`).join('\n')}

Priority: ${idea.priority.toUpperCase()}
${idea.estimated_hours ? `Estimated Hours: ${idea.estimated_hours}` : ''}
${idea.assigned_to ? `Assigned To: ${idea.assigned_to}` : ''}

Please review this project idea and provide:
1. Technical feasibility assessment
2. Implementation approach
3. Potential challenges
4. Time estimate refinement`;
            return await this.tmux.sendMessage({
                target: `${sessionName}:0`,
                message
            });
        }
        catch (error) {
            console.error(`Error sending project idea to ${sessionName}:`, error);
            return false;
        }
    }
    async saveProjectIdea(idea) {
        try {
            let ideas = [];
            if (existsSync(this.projectIdeasPath)) {
                const content = await readFile(this.projectIdeasPath, 'utf8');
                ideas = JSON.parse(content);
            }
            ideas.push({
                ...idea,
                assigned_to: idea.assigned_to || 'unassigned'
            });
            await writeFile(this.projectIdeasPath, JSON.stringify(ideas, null, 2));
        }
        catch (error) {
            console.error('Error saving project idea:', error);
            throw error;
        }
    }
    async getProjectIdeas() {
        try {
            if (!existsSync(this.projectIdeasPath)) {
                return [];
            }
            const content = await readFile(this.projectIdeasPath, 'utf8');
            return JSON.parse(content);
        }
        catch (error) {
            console.error('Error reading project ideas:', error);
            return [];
        }
    }
    async requestStatusUpdate(sessionName) {
        const message = `STATUS UPDATE REQUEST

Please provide a comprehensive status update including:

1. COMPLETED TASKS (since last update):
   - List specific tasks/features completed
   - Include any commits made

2. CURRENT WORK:
   - What you're currently working on
   - Progress percentage if applicable

3. BLOCKERS/ISSUES:
   - Any technical challenges
   - Dependencies waiting on others
   - Resource needs

4. NEXT STEPS:
   - Immediate next tasks (next 2-4 hours)
   - Planned work for rest of day

5. GIT STATUS:
   - Last commit time and message
   - Any uncommitted changes
   - Branch status

Please be specific and include relevant details for project coordination.`;
        return await this.tmux.sendMessage({
            target: `${sessionName}:0`,
            message
        });
    }
    async sendMessageBetweenEngineers(fromSession, toSession, message) {
        const formattedMessage = `MESSAGE FROM ${fromSession.toUpperCase()}:

${message}

---
This message was sent via the orchestrator system.`;
        return await this.tmux.sendMessage({
            target: `${toSession}:0`,
            message: formattedMessage
        });
    }
    async broadcastMessage(sessions, message, excludeSession) {
        const results = [];
        for (const session of sessions) {
            if (excludeSession && session === excludeSession) {
                continue;
            }
            const formattedMessage = `BROADCAST MESSAGE:

${message}

---
This message was broadcast to all active engineer sessions.`;
            const result = await this.tmux.sendMessage({
                target: `${session}:0`,
                message: formattedMessage
            });
            results.push(result);
        }
        return results;
    }
    async terminateEngineerSession(sessionName, reason) {
        try {
            // Send termination notice
            if (reason) {
                await this.tmux.sendMessage({
                    target: `${sessionName}:0`,
                    message: `SESSION TERMINATION NOTICE: ${reason}\n\nPlease commit any outstanding work immediately. Session will be terminated in 30 seconds.`
                });
                // Wait 30 seconds for final commits
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
            // Kill the session
            return await this.tmux.killSession(sessionName);
        }
        catch (error) {
            console.error(`Error terminating engineer session ${sessionName}:`, error);
            return false;
        }
    }
}
//# sourceMappingURL=engineer-manager.js.map