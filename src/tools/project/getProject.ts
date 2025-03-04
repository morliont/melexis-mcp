import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as azdev from 'azure-devops-node-api';
import { z } from 'zod';
import { McpTool } from '../types';

/**
 * Tool for getting project details from Azure DevOps
 */
export class GetProjectTool implements McpTool {
  public name = 'get_project';
  public description = 'Get project details';

  /**
   * Register the tool with the MCP server
   *
   * @param server The MCP server
   * @param connection The Azure DevOps connection
   */
  public register(server: McpServer, connection: azdev.WebApi | null): void {
    server.tool(
      this.name,
      {
        projectId: z.string().describe('The ID or name of the project'),
      },
      async (args, _extras) => {
        try {
          if (!connection) {
            throw new Error('No connection to Azure DevOps');
          }

          // Get the Core API
          const coreApi = await connection.getCoreApi();

          // Fetch the project with capabilities
          const project = await coreApi.getProject(
            args.projectId,
            true, // includeCapabilities
            false, // includeHistory
          );

          if (!project) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Project ${args.projectId} not found`,
                },
              ],
            };
          }

          // Format the project details
          let formattedDetails = `# Project: ${project.name}\n\n`;
          formattedDetails += `**ID**: ${project.id}\n`;
          formattedDetails += `**Description**: ${
            project.description || 'No description'
          }\n`;
          formattedDetails += `**State**: ${project.state}\n`;
          formattedDetails += `**Visibility**: ${project.visibility}\n`;
          formattedDetails += `**URL**: ${project.url || 'N/A'}\n`;

          // Add default team info if available
          if (project.defaultTeam) {
            formattedDetails += `\n## Default Team\n`;
            formattedDetails += `**Name**: ${project.defaultTeam.name}\n`;
            formattedDetails += `**ID**: ${project.defaultTeam.id}\n`;
          }

          // Add capabilities if available
          if (project.capabilities) {
            formattedDetails += `\n## Capabilities\n`;
            for (const [key, value] of Object.entries(project.capabilities)) {
              formattedDetails += `**${key}**: ${JSON.stringify(value)}\n`;
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: formattedDetails,
              },
            ],
          };
        } catch (error: any) {
          console.error('Error fetching project details:', error);
          return {
            content: [
              {
                type: 'text',
                text: `Error fetching project details: ${error.message}`,
              },
            ],
          };
        }
      },
    );
  }
}
