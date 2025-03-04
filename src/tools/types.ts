import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as azdev from 'azure-devops-node-api';
import { AzureDevOpsConfig } from '../types/config';

/**
 * Interface for MCP tools
 */
export interface McpTool {
  /**
   * The name of the tool
   */
  name: string;

  /**
   * The description of the tool
   */
  description: string;

  /**
   * Register the tool with the MCP server
   *
   * @param server The MCP server
   * @param connection The Azure DevOps connection
   * @param config The Azure DevOps configuration
   */
  register(
    server: McpServer,
    connection: azdev.WebApi | null,
    config: AzureDevOpsConfig,
  ): void;
}

/**
 * Tool registry for managing MCP tools
 */
export class ToolRegistry {
  private tools: McpTool[] = [];

  /**
   * Register a tool with the registry
   *
   * @param tool The tool to register
   */
  public registerTool(tool: McpTool): void {
    this.tools.push(tool);
  }

  /**
   * Register all tools with the MCP server
   *
   * @param server The MCP server
   * @param connection The Azure DevOps connection
   * @param config The Azure DevOps configuration
   */
  public registerAllTools(
    server: McpServer,
    connection: azdev.WebApi | null,
    config: AzureDevOpsConfig,
  ): void {
    this.tools.forEach((tool) => tool.register(server, connection, config));
  }

  /**
   * Get all registered tools
   *
   * @returns Array of registered tools
   */
  public getAllTools(): Array<{ name: string; description: string }> {
    return this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
    }));
  }
}
