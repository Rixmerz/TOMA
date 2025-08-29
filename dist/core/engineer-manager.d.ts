import { TmuxManager } from './tmux-manager.js';
import { EngineerSessionConfig, ProjectIdea } from '../types/tmux.js';
export declare class EngineerManager {
    private tmux;
    private projectIdeasPath;
    constructor(tmux: TmuxManager, projectIdeasPath?: string);
    createEngineerSession(config: EngineerSessionConfig): Promise<boolean>;
    private generateEngineerBriefing;
    sendProjectIdea(sessionName: string, idea: ProjectIdea): Promise<boolean>;
    saveProjectIdea(idea: ProjectIdea): Promise<void>;
    getProjectIdeas(): Promise<ProjectIdea[]>;
    requestStatusUpdate(sessionName: string): Promise<boolean>;
    sendMessageBetweenEngineers(fromSession: string, toSession: string, message: string): Promise<boolean>;
    broadcastMessage(sessions: string[], message: string, excludeSession?: string): Promise<boolean[]>;
    terminateEngineerSession(sessionName: string, reason?: string): Promise<boolean>;
}
//# sourceMappingURL=engineer-manager.d.ts.map