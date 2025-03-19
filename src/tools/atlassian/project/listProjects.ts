import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AxiosInstance } from 'axios';
import { McpTool } from '../../types';

/**
 * Tool for listing all projects in Jira
 */
export class ListProjectsTool implements McpTool {
  public name = 'list_jira_projects';
  public description = 'List all Jira projects';

  /**
   * Register the tool with the MCP server
   *
   * @param server The MCP server
   * @param connection The Atlassian API connection
   */
  public register(server: McpServer, connection: AxiosInstance | null): void {
    server.tool(this.name, {}, async (_args, _extras) => {
      try {
        if (!connection) {
          throw new Error('No connection to Atlassian API');
        }

        // Fetch the projects from Jira API
        const response = await connection.get('/rest/api/3/project');
        const projects = response.data;

        if (!projects || projects.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No projects found in this Jira instance.',
              },
            ],
          };
        }

        // Format the projects list
        const formattedProjects = projects.map((project: any) => {
          return {
            id: project.id,
            key: project.key,
            name: project.name,
            description: project.description,
            projectTypeKey: project.projectTypeKey,
            simplified: project.simplified,
            style: project.style,
            url: project.self,
          };
        });

        return {
          content: [
            {
              type: 'text',
              text: `# Projects\n\nFound ${projects.length} projects in this Jira instance:\n\n${formattedProjects
                .map(
                  (p: any) =>
                    `## ${p.name} (${p.key})\n**ID**: ${p.id}\n**Description**: ${
                      p.description || 'No description'
                    }\n**Type**: ${p.projectTypeKey}\n**Style**: ${
                      p.style
                    }\n**Simplified**: ${
                      p.simplified ? 'Yes' : 'No'
                    }\n**URL**: ${p.url || 'N/A'}\n`,
                )
                .join('\n')}`,
            },
          ],
        };
      } catch (error: any) {
        console.error('Error fetching projects:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching projects: ${error.message}`,
            },
          ],
        };
      }
    });
  }
}
