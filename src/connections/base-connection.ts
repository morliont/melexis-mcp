import { AxiosInstance } from 'axios';
import { McpTool } from '../tools/types';
import { BaseConfig } from '../types/config';
import { ToolRegistry } from '../tools';

/**
 * Base class for all service connections
 */
export abstract class BaseConnection {
  protected config: BaseConfig;
  protected axiosInstance: AxiosInstance | null = null;
  protected toolRegistry: ToolRegistry;

  /**
   * Initialize the connection to the service
   */
  protected abstract initializeConnection(): void;

  /**
   * Test the connection to the service
   *
   * @returns A promise that resolves to true if the connection is successful
   */
  public abstract testConnection(): Promise<boolean>;

  /**
   * Get all tools registered for this connection
   *
   * @returns Array of registered tools
   */
  public abstract getTools(): McpTool[];

  /**
   * Get the axios instance for making API calls
   */
  public getAxiosInstance(): AxiosInstance | null {
    return this.axiosInstance;
  }

  /**
   * Get the configuration
   */
  public getConfig(): BaseConfig {
    return this.config;
  }
}
