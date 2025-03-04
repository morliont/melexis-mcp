import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as azdev from 'azure-devops-node-api';
import { AzureDevOpsConfig } from './types/config';
import { getAllTools } from './tools';
import type { ToolRegistry } from './tools';
import { version } from '../package.json';

/**
 * Azure DevOps MCP Server
 *
 * Implements a Model Context Protocol server for Azure DevOps
 */
export class AzureDevOpsServer {
  private server: McpServer;
  private config: AzureDevOpsConfig;
  private connection: azdev.WebApi | null = null;
  private serverInfo: { name: string; version: string };
  private toolRegistry: ToolRegistry;

  /**
   * Create a new Azure DevOps MCP Server
   *
   * @param config The Azure DevOps configuration
   */
  constructor(config: AzureDevOpsConfig) {
    this.validateConfig(config);
    this.config = config;

    this.serverInfo = {
      name: 'azure-devops-mcp',
      version: version,
    };

    // Initialize the MCP server
    this.server = new McpServer({
      name: this.serverInfo.name,
      version: this.serverInfo.version,
    });

    // Initialize the tool registry
    this.toolRegistry = getAllTools();

    // Initialize the Azure DevOps connection
    this.initializeConnection();

    // Register the tools
    this.registerTools();
  }

  /**
   * Validate the Azure DevOps configuration
   *
   * @param config Configuration to validate
   * @throws Error if configuration is invalid
   */
  private validateConfig(config: AzureDevOpsConfig): void {
    if (!config.organizationUrl) {
      throw new Error('Organization URL is required');
    }

    if (!config.personalAccessToken) {
      throw new Error('Personal Access Token is required');
    }

    // Validate organization URL format
    try {
      const url = new URL(config.organizationUrl);
      if (!url.hostname) {
        throw new Error('Invalid organization URL');
      }
    } catch (error) {
      throw new Error('Invalid organization URL format');
    }
  }

  /**
   * Initialize the Azure DevOps connection
   */
  private initializeConnection(): void {
    try {
      // Create authentication handler
      const authHandler = azdev.getPersonalAccessTokenHandler(
        this.config.personalAccessToken,
      );

      // Create connection
      this.connection = new azdev.WebApi(
        this.config.organizationUrl,
        authHandler,
      );
      console.log('Azure DevOps connection initialized');
    } catch (error) {
      console.error('Failed to initialize Azure DevOps connection:', error);
      this.connection = null;
    }
  }

  /**
   * Register tools with the MCP server
   */
  private registerTools(): void {
    this.toolRegistry.registerAllTools(
      this.server,
      this.connection,
      this.config,
    );
  }

  /**
   * Test the connection to Azure DevOps
   *
   * @returns A promise that resolves to true if the connection is successful
   */
  public async testConnection(): Promise<boolean> {
    try {
      if (!this.connection) {
        return false;
      }

      // Get the Core API
      const coreApi = await this.connection.getCoreApi();

      // Try to get the first project
      const projects = await coreApi.getProjects();
      console.log(
        `Connection test successful. Found ${projects.length} projects.`,
      );

      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get the name of the server
   *
   * @returns The server name
   */
  public getName(): string {
    return this.serverInfo.name;
  }

  /**
   * Get the version of the server
   *
   * @returns The server version
   */
  public getVersion(): string {
    return this.serverInfo.version;
  }

  /**
   * Get all registered tools
   *
   * @returns Array of registered tools
   */
  public getTools(): Array<{ name: string; description: string }> {
    return this.toolRegistry.getAllTools();
  }

  /**
   * Connect to a transport
   *
   * @param transport The transport to connect to
   * @returns A promise that resolves when the connection is established
   */
  public async connect(transport: any): Promise<void> {
    console.log('Connecting to transport...');
    await this.server.connect(transport);
    console.log('Connected to transport');
  }
}
