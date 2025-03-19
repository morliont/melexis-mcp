import axios from 'axios';
import { GitlabConfig } from '../types/config';
import { getAllGitlabTools } from '../tools';
import type { McpTool } from '../tools/types';
import { BaseConnection } from './base-connection';
import { version } from '../../package.json';

/**
 * Gitlab Connection
 *
 * Handles connection and interaction with Gitlab products
 */
export class GitlabConnection extends BaseConnection {
  private serverInfo: { name: string; version: string };

  /**
   * Create a new Gitlab Connection
   *
   * @param config The Gitlab configuration
   */
  constructor(config: GitlabConfig) {
    super();
    this.validateConfig(config);
    this.config = config;
    this.serverInfo = {
      name: 'gitlab-mcp',
      version: version,
    };

    // Initialize the tool registry
    this.toolRegistry = getAllGitlabTools();

    // Initialize the Gitlab connection
    this.initializeConnection();
  }

  /**
   * Validate the Gitlab configuration
   *
   * @param config Configuration to validate
   * @throws Error if configuration is invalid
   */
  private validateConfig(config: GitlabConfig): void {
    if (!config.instanceUrl) {
      throw new Error('Instance URL is required');
    }

    if (!config.apiToken) {
      throw new Error('API Token is required');
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
   * Initialize the Gitlab connection
   */
  protected initializeConnection(): void {
    try {
      // Create axios instance with authentication
      this.axiosInstance = axios.create({
        baseURL: this.config.instanceUrl,
        headers: {
          'Private-Token': this.config.apiToken,
        },
      });
      console.log('Gitlab connection initialized');
    } catch (error) {
      console.error('Failed to initialize Gitlab connection:', error);
      this.axiosInstance = null;
    }
  }

  /**
   * Test the connection to Gitlab
   *
   * @returns A promise that resolves to true if the connection is successful
   */
  public async testConnection(): Promise<boolean> {
    try {
      if (!this.axiosInstance) {
        return false;
      }

      // Test connection by getting accessible resources
      const response = await this.axiosInstance.get('/api/v4/user');

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
