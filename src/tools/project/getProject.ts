import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AxiosInstance } from 'axios';
import { z } from 'zod';
import { McpTool } from '../types';
import { AtlassianConfig } from '../../types/config';

/**
 * Tool for getting project details from Jira
 */
export class GetProjectTool implements McpTool {
  public name = 'get_project';
  public description = 'Get Jira project details';

  /**
   * Register the tool with the MCP server
   *
   * @param server The MCP server
   * @param connection The Atlassian API connection
   * @param config The Atlassian configuration
   */
  public register(
    server: McpServer,
    connection: AxiosInstance | null,
    config: AtlassianConfig,
  ): void {
    server.tool(
      this.name,
      {
        projectIdOrKey: z.string().describe('The ID or key of the Jira project'),
      },
      async (args, _extras) => {
        try {
          if (!connection) {
            throw new Error('No connection to Atlassian API');
          }

          // Fetch the project from Jira
          const response = await connection.get(
            `/rest/api/3/project/${args.projectIdOrKey}`,
          );
          const project = response.data;

          if (!project) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Project ${args.projectIdOrKey} not found`,
                },
              ],
            };
          }

          // Format the project details
          let formattedDetails = `# Project: ${project.name} (${project.key})\n\n`;
          formattedDetails += `**ID**: ${project.id}\n`;
          formattedDetails += `**Description**: ${
            project.description || 'No description'
          }\n`;
          formattedDetails += `**Type**: ${project.projectTypeKey}\n`;
          formattedDetails += `**Style**: ${project.style}\n`;
          formattedDetails += `**Lead**: ${project.lead?.displayName || 'Not specified'}\n`;
          formattedDetails += `**URL**: ${config.instanceUrl}/browse/${project.key}\n`;

          // Add category info if available
          if (project.projectCategory) {
            formattedDetails += `\n## Category\n`;
            formattedDetails += `**Name**: ${project.projectCategory.name}\n`;
            formattedDetails += `**Description**: ${project.projectCategory.description || 'No description'}\n`;
          }

          // Add components if available
          if (project.components && project.components.length > 0) {
            formattedDetails += `\n## Components\n`;
            for (const component of project.components) {
              formattedDetails += `- **${component.name}**: ${component.description || 'No description'}\n`;
            }
          }

          // Add versions if available
          if (project.versions && project.versions.length > 0) {
            formattedDetails += `\n## Versions\n`;
            for (const version of project.versions) {
              formattedDetails += `- **${version.name}**: ${
                version.released ? 'Released' : 'Unreleased'
              }${version.description ? ` - ${version.description}` : ''}\n`;
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
