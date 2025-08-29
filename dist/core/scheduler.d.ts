import { ScheduleOptions } from '../types/tmux.js';
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
export declare class Scheduler {
    private tasks;
    private noteFilePath;
    constructor(noteFilePath?: string);
    scheduleTask(options: ScheduleOptions): Promise<string>;
    private createNoteFile;
    private scheduleSystemTask;
    cancelTask(taskId: string): Promise<boolean>;
    getTask(taskId: string): ScheduledTask | undefined;
    getAllTasks(): ScheduledTask[];
    getActiveTasks(): ScheduledTask[];
    scheduleProgressReview(sessionName: string, minutes?: number, pmSessionName?: string, pmWindowIndex?: number): Promise<string>;
    scheduleOrchestratorCheck(minutes?: number, pmSessionName?: string, pmWindowIndex?: number): Promise<string>;
    scheduleEngineerStandup(sessionName: string, minutes?: number, pmSessionName?: string, pmWindowIndex?: number): Promise<string>;
}
//# sourceMappingURL=scheduler.d.ts.map