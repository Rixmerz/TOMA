import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';
export class Scheduler {
    tasks = new Map();
    noteFilePath;
    constructor(noteFilePath = '/tmp/toma_next_check_note.txt') {
        this.noteFilePath = noteFilePath;
    }
    async scheduleTask(options) {
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const now = new Date();
        const executeAt = new Date(now.getTime() + options.minutes * 60 * 1000);
        // Determine target window - prioritize PM session info, then target_window, then default
        let targetWindow = options.target_window || 'tmux-orc:0';
        if (options.pm_session_name) {
            const windowIndex = options.pm_window_index || 0;
            targetWindow = `${options.pm_session_name}:${windowIndex}`;
        }
        const task = {
            id: taskId,
            minutes: options.minutes,
            note: options.note,
            target_window: targetWindow,
            scheduled_at: now,
            execute_at: executeAt,
            status: 'pending'
        };
        // Create note file
        await this.createNoteFile(task);
        // Schedule the task
        const success = await this.scheduleSystemTask(task);
        if (success) {
            this.tasks.set(taskId, task);
            return taskId;
        }
        else {
            throw new Error('Failed to schedule task');
        }
    }
    async createNoteFile(task) {
        const noteContent = [
            `=== Next Check Note (${task.scheduled_at.toISOString()}) ===`,
            `Scheduled for: ${task.minutes} minutes`,
            `Target: ${task.target_window}`,
            `Execute at: ${task.execute_at.toISOString()}`,
            '',
            task.note
        ].join('\n');
        await writeFile(this.noteFilePath, noteContent, 'utf8');
    }
    async scheduleSystemTask(task) {
        try {
            const seconds = task.minutes * 60;
            const command = [
                'bash', '-c',
                `sleep ${seconds} && tmux send-keys -t "${task.target_window}" "cat ${this.noteFilePath}" && sleep 1 && tmux send-keys -t "${task.target_window}" Enter`
            ];
            const child = spawn(command[0], command.slice(1), {
                detached: true,
                stdio: 'ignore'
            });
            child.unref();
            task.pid = child.pid;
            task.status = 'running';
            return true;
        }
        catch (error) {
            console.error('Error scheduling system task:', error);
            task.status = 'failed';
            return false;
        }
    }
    async cancelTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            return false;
        }
        if (task.pid && task.status === 'running') {
            try {
                process.kill(task.pid, 'SIGTERM');
                task.status = 'completed';
                return true;
            }
            catch (error) {
                console.error(`Error canceling task ${taskId}:`, error);
                return false;
            }
        }
        return false;
    }
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    getAllTasks() {
        return Array.from(this.tasks.values());
    }
    getActiveTasks() {
        return Array.from(this.tasks.values()).filter(task => task.status === 'pending' || task.status === 'running');
    }
    async scheduleProgressReview(sessionName, minutes = 30, pmSessionName, pmWindowIndex) {
        const note = `Progress review for session: ${sessionName}\n` +
            `Please provide status update:\n` +
            `1. Completed tasks\n` +
            `2. Current work\n` +
            `3. Any blockers\n` +
            `4. Next steps`;
        return this.scheduleTask({
            minutes,
            note,
            target_window: `${sessionName}:0`,
            pm_session_name: pmSessionName,
            pm_window_index: pmWindowIndex
        });
    }
    async scheduleOrchestratorCheck(minutes = 15, pmSessionName, pmWindowIndex) {
        const note = `Regular orchestrator oversight check\n` +
            `Review all active sessions and provide status summary`;
        return this.scheduleTask({
            minutes,
            note,
            target_window: 'tmux-orc:0',
            pm_session_name: pmSessionName,
            pm_window_index: pmWindowIndex
        });
    }
    async scheduleEngineerStandup(sessionName, minutes = 480, pmSessionName, pmWindowIndex) {
        const note = `Daily standup for engineer: ${sessionName}\n` +
            `Please provide:\n` +
            `- Yesterday's accomplishments\n` +
            `- Today's goals\n` +
            `- Any impediments`;
        return this.scheduleTask({
            minutes,
            note,
            target_window: `${sessionName}:0`,
            pm_session_name: pmSessionName,
            pm_window_index: pmWindowIndex
        });
    }
}
//# sourceMappingURL=scheduler.js.map