export interface TmuxWindow {
    session_name: string;
    window_index: number;
    window_name: string;
    active: boolean;
    panes?: number;
    layout?: string;
}
export interface TmuxSession {
    name: string;
    windows: TmuxWindow[];
    attached: boolean;
}
export interface TmuxWindowInfo {
    name: string;
    active: boolean;
    panes: number;
    layout: string;
    content?: string;
    error?: string;
}
export interface TmuxStatus {
    timestamp: string;
    sessions: Array<{
        name: string;
        attached: boolean;
        windows: Array<{
            index: number;
            name: string;
            active: boolean;
            info: TmuxWindowInfo;
        }>;
    }>;
}
export interface ScheduleOptions {
    minutes: number;
    note: string;
    target_window?: string;
    pm_session_name?: string;
    pm_window_index?: number;
}
export interface MessageOptions {
    target: string;
    message: string;
    delay?: number;
}
export interface EngineerSessionConfig {
    session_name: string;
    project_path: string;
    briefing?: string;
}
export interface ProjectIdea {
    title: string;
    description: string;
    requirements: string[];
    priority: 'high' | 'medium' | 'low';
    estimated_hours?: number;
    assigned_to?: string;
}
export interface OrchestratorConfig {
    safety_mode: boolean;
    max_lines_capture: number;
    default_schedule_minutes: number;
    orchestrator_window: string;
}
//# sourceMappingURL=tmux.d.ts.map