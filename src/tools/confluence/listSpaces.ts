import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AxiosInstance } from 'axios';
import { McpTool } from '../types';
import { AtlassianConfig } from '../../types/config';

/**
 * Tool for listing all spaces in Confluence
 */
export class ListSpacesTool implements McpTool {
  public name = 'list_confluence_spaces';
  public description = 'List all Confluence spaces';

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
    server.tool(this.name, {}, async (_args, _extras) => {
      try {
        if (!connection) {
          throw new Error('No connection to Atlassian API');
        }

        // Fetch the spaces from Confluence API
        const response = await connection.get('/wiki/rest/api/space');
        const spaces = response.data.results;

        if (!spaces || spaces.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No spaces found in this Confluence instance.',
              },
            ],
          };
        }

        // Format the spaces list
        const formattedSpaces = spaces.map((space: any) => {
          return {
            id: space.id,
            key: space.key,
            name: space.name,
            type: space.type,
            status: space.status,
            description: space.description ? space.description.plain.value : '',
            url: `${config.instanceUrl}/wiki/spaces/${space.key}`,
          };
        });

        return {
          content: [
            {
              type: 'text',
              text: `# Confluence Spaces\n\nFound ${spaces.length} spaces in this Confluence instance:\n\n${formattedSpaces
                .map(
                  (s: any) =>
                    `## ${s.name} (${s.key})\n**ID**: ${s.id}\n**Type**: ${s.type}\n**Status**: ${s.status}\n**Description**: ${
                      s.description || 'No description'
                    }\n**URL**: ${s.url}\n`,
                )
                .join('\n')}`,
            },
          ],
        };
      } catch (error: any) {
        console.error('Error fetching Confluence spaces:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching Confluence spaces: ${error.message}`,
            },
          ],
        };
      }
    });
  }
}
