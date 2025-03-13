import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import axios from 'axios';
import { AtlassianConfig } from './types/config';
import { getAllTools } from './tools';
import type { ToolRegistry } from './tools';
import { version } from '../package.json';

/**
 * Atlassian MCP Server
 *
 * Implements a Model Context Protocol server for Atlassian products
 */
export class AtlassianServer {
  private server: McpServer;
  private config: AtlassianConfig;
  private axiosInstance: any = null;
  private serverInfo: { name: string; version: string };
  private toolRegistry: ToolRegistry;

  /**
   * Create a new Atlassian MCP Server
   *
   * @param config The Atlassian configuration
   */
  constructor(config: AtlassianConfig) {
    this.validateConfig(config);
    this.config = config;

    this.serverInfo = {
      name: 'atlassian-mcp',
      version: version,
    };

    // Initialize the MCP server
    this.server = new McpServer({
      name: this.serverInfo.name,
      version: this.serverInfo.version,
    });

    // Initialize the tool registry
    this.toolRegistry = getAllTools();

    // Initialize the Atlassian connection
    this.initializeConnection();

    // Register the tools
    this.registerTools();
  }

  /**
   * Validate the Atlassian configuration
   *
   * @param config Configuration to validate
   * @throws Error if configuration is invalid
   */
  private validateConfig(config: AtlassianConfig): void {
    if (!config.instanceUrl) {
      throw new Error('Instance URL is required');
    }

    if (!config.apiToken) {
      throw new Error('API Token is required');
    }

    if (!config.email) {
      throw new Error('Email is required');
    }

    // Validate instance URL format
    try {
      const url = new URL(config.instanceUrl);
      if (!url.hostname) {
        throw new Error('Invalid instance URL');
      }
    } catch (error) {
      throw new Error('Invalid instance URL format');
    }
  }

  /**
   * Initialize the Atlassian connection
   */
  private initializeConnection(): void {
    try {
      // Create axios instance with authentication
      this.axiosInstance = axios.create({
        baseURL: this.config.instanceUrl,
        auth: {
          username: this.config.email,
          password: this.config.apiToken,
        },
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      console.log('Atlassian connection initialized');
    } catch (error) {
      console.error('Failed to initialize Atlassian connection:', error);
      this.axiosInstance = null;
    }
  }

  /**
   * Register tools with the MCP server
   */
  private registerTools(): void {
    this.toolRegistry.registerAllTools(
      this.server,
      this.axiosInstance,
      this.config,
    );
  }

  /**
   * Test the connection to Atlassian
   *
   * @returns A promise that resolves to true if the connection is successful
   */
  public async testConnection(): Promise<boolean> {
    try {
      if (!this.axiosInstance) {
        return false;
      }

      // Test connection by getting accessible resources
      const response = await this.axiosInstance.get('/rest/api/3/myself');

      if (response.status === 200) {
        console.log(
          'Connection test successful. Connected as:',
          response.data.displayName,
        );
        return true;
      }

      return false;
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
