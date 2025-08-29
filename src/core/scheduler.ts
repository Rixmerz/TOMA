import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { ScheduleOptions } from '@/types/tmux.js';

export interface ScheduledTask {
  id: string;
  minutes: number;
  note: string;
  target_window: string;
  scheduled_at: Date;
  execute_at: Date;
  pid?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private noteFilePath: string;

  constructor(noteFilePath: string = '/tmp/toma_next_check_note.txt') {
    this.noteFilePath = noteFilePath;
  }

  async scheduleTask(options: ScheduleOptions): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const executeAt = new Date(now.getTime() + options.minutes * 60 * 1000);

    // Determine target window - prioritize PM session info, then target_window, then default
    let targetWindow = options.target_window || 'tmux-orc:0';
    if (options.pm_session_name) {
      const windowIndex = options.pm_window_index || 0;
      targetWindow = `${options.pm_session_name}:${windowIndex}`;
    }

    const task: ScheduledTask = {
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
    } else {
      throw new Error('Failed to schedule task');
    }
  }

  private async createNoteFile(task: ScheduledTask): Promise<void> {
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

  private async scheduleSystemTask(task: ScheduledTask): Promise<boolean> {
    try {
      const seconds = task.minutes * 60;
      const command = [
        'bash', '-c',
        `sleep ${seconds} && tmux send-keys -t "${task.target_window}" "Time for orchestrator check! cat ${this.noteFilePath}" && sleep 1 && tmux send-keys -t "${task.target_window}" Enter`
      ];

      const child = spawn(command[0], command.slice(1), {
        detached: true,
        stdio: 'ignore'
      });

      child.unref();
      
      task.pid = child.pid;
      task.status = 'running';
      
      return true;
    } catch (error) {
      console.error('Error scheduling system task:', error);
      task.status = 'failed';
      return false;
    }
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    if (task.pid && task.status === 'running') {
      try {
        process.kill(task.pid, 'SIGTERM');
        task.status = 'completed';
        return true;
      } catch (error) {
        console.error(`Error canceling task ${taskId}:`, error);
        return false;
      }
    }

    return false;
  }

  getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  getActiveTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values()).filter(task => 
      task.status === 'pending' || task.status === 'running'
    );
  }

  async scheduleProgressReview(sessionName: string, minutes: number = 30, pmSessionName?: string, pmWindowIndex?: number): Promise<string> {
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

  async scheduleOrchestratorCheck(minutes: number = 15, pmSessionName?: string, pmWindowIndex?: number): Promise<string> {
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

  async scheduleEngineerStandup(sessionName: string, minutes: number = 480, pmSessionName?: string, pmWindowIndex?: number): Promise<string> {
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
