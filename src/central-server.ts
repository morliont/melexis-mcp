import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AtlassianConnection } from './connections/atlassian-connection';
import { GitlabConnection } from './connections/gitlab-connection';
import { CentralConfig, AtlassianConfig, GitlabConfig } from './types/config';
import { version } from '../package.json';

/**
 * Central MCP Server
 *
 * Manages all service connections and provides a unified interface
 */
export class McpCentralServer {
  private server: McpServer;
  private atlassianConnection: AtlassianConnection;
  private gitlabConnection: GitlabConnection;

  /**
   * Create a new Central MCP Server
   *
   * @param config The central server configuration
   */
  constructor(config: CentralConfig) {
    this.server = new McpServer({
      name: 'mcp-central',
      version: version,
    });

    // Initialize the Atlassian connection
    this.atlassianConnection = new AtlassianConnection(config.atlassian);

    // Initialize the Gitlab connection
    this.gitlabConnection = new GitlabConnection(config.gitlab);

    // Register all tools
    this.registerAllTools();
  }

  /**
   * Register all tools from all services
   */
  private registerAllTools(): void {
    // Get tools from Atlassian connection
    const atlassianTools = this.atlassianConnection.getTools();
    const gitlabTools = this.gitlabConnection.getTools();

    // Register each tool with the server
    atlassianTools.forEach((tool) => {
      tool.register(
        this.server,
        this.atlassianConnection.getAxiosInstance(),
        this.atlassianConnection.getConfig() as AtlassianConfig,
      );
    });

    gitlabTools.forEach((tool) => {
      tool.register(
        this.server,
        this.gitlabConnection.getAxiosInstance(),
        this.gitlabConnection.getConfig() as GitlabConfig,
      );
    });
  }

  /**
   * Test all service connections
   *
   * @returns Object containing connection status for each service
   */
  async testConnections(): Promise<{
    atlassian: boolean;
    gitlab: boolean;
  }> {
    const atlassianStatus = await this.atlassianConnection.testConnection();
    const gitlabStatus = await this.gitlabConnection.testConnection();

    return {
      atlassian: atlassianStatus,
      gitlab: gitlabStatus,
    };
  }

  /**
   * Get the MCP server instance
   *
   * @returns The MCP server instance
   */
  getServer(): McpServer {
    return this.server;
  }
} 