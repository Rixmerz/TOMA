import { TmuxSession, TmuxWindow, TmuxWindowInfo, TmuxStatus, MessageOptions, OrchestratorConfig } from '../types/tmux.js';
export declare class TmuxManager {
    private config;
    constructor(config?: Partial<OrchestratorConfig>);
    getSessions(): Promise<TmuxSession[]>;
    getSessionWindows(sessionName: string): Promise<TmuxWindow[]>;
    captureWindowContent(sessionName: string, windowIndex: number, numLines?: number): Promise<string>;
    getWindowInfo(sessionName: string, windowIndex: number): Promise<TmuxWindowInfo>;
    sendMessage(options: MessageOptions): Promise<boolean>;
    sendKeys(target: string, keys: string): Promise<boolean>;
    createSession(sessionName: string, startDirectory?: string): Promise<boolean>;
    createWindow(sessionName: string, windowName: string, startDirectory?: string): Promise<number | null>;
    renameWindow(sessionName: string, windowIndex: number, newName: string): Promise<boolean>;
    killSession(sessionName: string): Promise<boolean>;
    killWindow(sessionName: string, windowIndex: number): Promise<boolean>;
    getAllStatus(): Promise<TmuxStatus>;
    findWindowsByName(windowName: string): Promise<Array<{
        session: string;
        index: number;
    }>>;
    createMonitoringSnapshot(): Promise<string>;
}
//# sourceMappingURL=tmux-manager.d.ts.map