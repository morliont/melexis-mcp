import axios from 'axios';
import { AtlassianConfig } from '../types/config';
import { getAllAtlassianTools } from '../tools';
import type { McpTool } from '../tools/types';
import { BaseConnection } from './base-connection';
import { version } from '../../package.json';

/**
 * Atlassian Connection
 *
 * Handles connection and interaction with Atlassian products
 */
export class AtlassianConnection extends BaseConnection {
  private serverInfo: { name: string; version: string };

  /**
   * Create a new Atlassian Connection
   *
   * @param config The Atlassian configuration
   */
  constructor(config: AtlassianConfig) {
    super();
    this.validateConfig(config);
    this.config = config;
    this.serverInfo = {
      name: 'atlassian-mcp',
      version: version,
    };

    // Initialize the tool registry
    this.toolRegistry = getAllAtlassianTools();

    // Initialize the Atlassian connection
    this.initializeConnection();
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
  protected initializeConnection(): void {
    try {
      // Create axios instance with authentication
      this.axiosInstance = axios.create({
        baseURL: this.config.instanceUrl,
        auth: {
          username: (this.config as AtlassianConfig).email,
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
   * Get all registered tools
   *
   * @returns Array of registered tools
   */
  public getTools(): McpTool[] {
    return this.toolRegistry.getAllTools();
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
}
