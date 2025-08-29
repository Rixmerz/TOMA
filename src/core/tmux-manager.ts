import { exec } from 'child_process';
import { promisify } from 'util';
import {
  TmuxSession,
  TmuxWindow,
  TmuxWindowInfo,
  TmuxStatus,
  MessageOptions,
  OrchestratorConfig
} from '@/types/tmux.js';

const execAsync = promisify(exec);

export class TmuxManager {
  private config: OrchestratorConfig;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = {
      safety_mode: true,
      max_lines_capture: 1000,
      default_schedule_minutes: 15,
      orchestrator_window: 'tmux-orc:0',
      ...config
    };
  }

  async getSessions(): Promise<TmuxSession[]> {
    try {
      const { stdout } = await execAsync('tmux list-sessions -F "#{session_name}:#{session_attached}"');
      const sessions: TmuxSession[] = [];

      for (const line of stdout.trim().split('\n')) {
        if (!line) continue;
        const [sessionName, attached] = line.split(':');
        
        const windows = await this.getSessionWindows(sessionName);
        sessions.push({
          name: sessionName,
          windows,
          attached: attached === '1'
        });
      }

      return sessions;
    } catch (error) {
      console.error('Error getting tmux sessions:', error);
      return [];
    }
  }

  async getSessionWindows(sessionName: string): Promise<TmuxWindow[]> {
    try {
      const { stdout } = await execAsync(
        `tmux list-windows -t "${sessionName}" -F "#{window_index}:#{window_name}:#{window_active}:#{window_panes}:#{window_layout}"`
      );
      
      const windows: TmuxWindow[] = [];
      for (const line of stdout.trim().split('\n')) {
        if (!line) continue;
        const [index, name, active, panes, layout] = line.split(':');
        windows.push({
          session_name: sessionName,
          window_index: parseInt(index),
          window_name: name,
          active: active === '1',
          panes: parseInt(panes),
          layout
        });
      }

      return windows;
    } catch (error) {
      console.error(`Error getting windows for session ${sessionName}:`, error);
      return [];
    }
  }

  async captureWindowContent(sessionName: string, windowIndex: number, numLines: number = 50): Promise<string> {
    const lines = Math.min(numLines, this.config.max_lines_capture);
    
    try {
      const { stdout } = await execAsync(
        `tmux capture-pane -t "${sessionName}:${windowIndex}" -p -S -${lines}`
      );
      return stdout;
    } catch (error) {
      return `Error capturing window content: ${error}`;
    }
  }

  async getWindowInfo(sessionName: string, windowIndex: number): Promise<TmuxWindowInfo> {
    try {
      const { stdout } = await execAsync(
        `tmux display-message -t "${sessionName}:${windowIndex}" -p "#{window_name}:#{window_active}:#{window_panes}:#{window_layout}"`
      );

      if (stdout.trim()) {
        const [name, active, panes, layout] = stdout.trim().split(':');
        const content = await this.captureWindowContent(sessionName, windowIndex);
        
        return {
          name,
          active: active === '1',
          panes: parseInt(panes),
          layout,
          content
        };
      }
      
      return { name: '', active: false, panes: 0, layout: '', error: 'No window info available' };
    } catch (error) {
      return { name: '', active: false, panes: 0, layout: '', error: `Could not get window info: ${error}` };
    }
  }

  async sendMessage(options: MessageOptions): Promise<boolean> {
    const { target, message, delay = 500 } = options;
    
    try {
      // Send the message
      await execAsync(`tmux send-keys -t "${target}" "${message}"`);
      
      // Wait for UI to register
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Send Enter
      await execAsync(`tmux send-keys -t "${target}" Enter`);
      
      return true;
    } catch (error) {
      console.error(`Error sending message to ${target}:`, error);
      return false;
    }
  }

  async sendKeys(target: string, keys: string): Promise<boolean> {
    try {
      await execAsync(`tmux send-keys -t "${target}" "${keys}"`);
      return true;
    } catch (error) {
      console.error(`Error sending keys to ${target}:`, error);
      return false;
    }
  }

  async createSession(sessionName: string, startDirectory?: string): Promise<boolean> {
    try {
      const dirOption = startDirectory ? `-c "${startDirectory}"` : '';
      await execAsync(`tmux new-session -d -s "${sessionName}" ${dirOption}`);
      return true;
    } catch (error) {
      console.error(`Error creating session ${sessionName}:`, error);
      return false;
    }
  }

  async createWindow(sessionName: string, windowName: string, startDirectory?: string): Promise<number | null> {
    try {
      const dirOption = startDirectory ? `-c "${startDirectory}"` : '';
      const { stdout } = await execAsync(
        `tmux new-window -t "${sessionName}" -n "${windowName}" ${dirOption} -P -F "#{window_index}"`
      );
      return parseInt(stdout.trim());
    } catch (error) {
      console.error(`Error creating window ${windowName} in session ${sessionName}:`, error);
      return null;
    }
  }

  async renameWindow(sessionName: string, windowIndex: number, newName: string): Promise<boolean> {
    try {
      await execAsync(`tmux rename-window -t "${sessionName}:${windowIndex}" "${newName}"`);
      return true;
    } catch (error) {
      console.error(`Error renaming window ${sessionName}:${windowIndex}:`, error);
      return false;
    }
  }

  async killSession(sessionName: string): Promise<boolean> {
    try {
      await execAsync(`tmux kill-session -t "${sessionName}"`);
      return true;
    } catch (error) {
      console.error(`Error killing session ${sessionName}:`, error);
      return false;
    }
  }

  async killWindow(sessionName: string, windowIndex: number): Promise<boolean> {
    try {
      await execAsync(`tmux kill-window -t "${sessionName}:${windowIndex}"`);
      return true;
    } catch (error) {
      console.error(`Error killing window ${sessionName}:${windowIndex}:`, error);
      return false;
    }
  }

  async getAllStatus(): Promise<TmuxStatus> {
    const sessions = await this.getSessions();
    const status: TmuxStatus = {
      timestamp: new Date().toISOString(),
      sessions: []
    };

    for (const session of sessions) {
      const sessionData: {
        name: string;
        attached: boolean;
        windows: Array<{
          index: number;
          name: string;
          active: boolean;
          info: TmuxWindowInfo;
        }>;
      } = {
        name: session.name,
        attached: session.attached,
        windows: []
      };

      for (const window of session.windows) {
        const windowInfo = await this.getWindowInfo(session.name, window.window_index);
        sessionData.windows.push({
          index: window.window_index,
          name: window.window_name,
          active: window.active,
          info: windowInfo
        });
      }

      status.sessions.push(sessionData);
    }

    return status;
  }

  async findWindowsByName(windowName: string): Promise<Array<{ session: string; index: number }>> {
    const sessions = await this.getSessions();
    const matches: Array<{ session: string; index: number }> = [];

    for (const session of sessions) {
      for (const window of session.windows) {
        if (window.window_name.toLowerCase().includes(windowName.toLowerCase())) {
          matches.push({
            session: session.name,
            index: window.window_index
          });
        }
      }
    }

    return matches;
  }

  async createMonitoringSnapshot(): Promise<string> {
    const status = await this.getAllStatus();
    
    let snapshot = `Tmux Monitoring Snapshot - ${status.timestamp}\n`;
    snapshot += '='.repeat(50) + '\n\n';

    for (const session of status.sessions) {
      snapshot += `Session: ${session.name} (${session.attached ? 'ATTACHED' : 'DETACHED'})\n`;
      snapshot += '-'.repeat(30) + '\n';

      for (const window of session.windows) {
        snapshot += `  Window ${window.index}: ${window.name}`;
        if (window.active) {
          snapshot += ' (ACTIVE)';
        }
        snapshot += '\n';

        if (window.info.content) {
          const contentLines = window.info.content.split('\n');
          const recentLines = contentLines.slice(-10);
          snapshot += '    Recent output:\n';
          for (const line of recentLines) {
            if (line.trim()) {
              snapshot += `    | ${line}\n`;
            }
          }
        }
        snapshot += '\n';
      }
    }

    return snapshot;
  }
}
