import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AxiosInstance } from 'axios';
import { z } from 'zod';
import { McpTool } from '../../types';
import { AtlassianConfig } from '../../../types/config';

/**
 * Tool for getting a specific Confluence space
 */
export class GetSpaceTool implements McpTool {
  public name = 'get_confluence_space';
  public description = 'Get details about a specific Confluence space';

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
        spaceKey: z.string().describe('The key of the Confluence space'),
      },
      async (args, _extras) => {
        try {
          if (!connection) {
            throw new Error('No connection to Atlassian API');
          }

          const { spaceKey } = args;

          // Fetch the space from Confluence API
          const response = await connection.get(
            `/wiki/rest/api/space/${spaceKey}`,
          );
          const space = response.data;

          if (!space) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No space found with key: ${spaceKey}`,
                },
              ],
            };
          }

          // Format the space details
          const formattedSpace = {
            id: space.id,
            key: space.key,
            name: space.name,
            type: space.type,
            status: space.status,
            description: space.description
              ? space.description.plain.value
              : 'No description',
            url: `${config.instanceUrl}/wiki/spaces/${space.key}`,
          };

          // Get recent pages in the space
          const pagesResponse = await connection.get(
            `/wiki/rest/api/space/${spaceKey}/content`,
            {
              params: {
                limit: 10,
                expand: 'history',
                orderby: 'history.lastUpdated DESC',
              },
            },
          );

          const pages = pagesResponse.data.results || [];
          const recentPages = pages.map((page: any) => ({
            id: page.id,
            title: page.title,
            type: page.type,
            url: `${config.instanceUrl}/wiki${page._links.webui}`,
            lastUpdated: page.history?.lastUpdated?.when || 'Unknown',
          }));

          return {
            content: [
              {
                type: 'text',
                text:
                  `# Space: ${formattedSpace.name} (${formattedSpace.key})\n\n` +
                  `**ID**: ${formattedSpace.id}\n` +
                  `**Type**: ${formattedSpace.type}\n` +
                  `**Status**: ${formattedSpace.status}\n` +
                  `**Description**: ${formattedSpace.description}\n` +
                  `**URL**: ${formattedSpace.url}\n\n` +
                  `## Recent Pages\n\n` +
                  (recentPages.length > 0
                    ? recentPages
                        .map(
                          (p: any) =>
                            `- [${p.title}](${p.url}) (${p.type}, Last updated: ${p.lastUpdated})`,
                        )
                        .join('\n')
                    : 'No recent pages found in this space.'),
              },
            ],
          };
        } catch (error: any) {
          console.error('Error fetching Confluence space:', error);
          return {
            content: [
              {
                type: 'text',
                text: `Error fetching Confluence space: ${error.message}`,
              },
            ],
          };
        }
      },
    );
  }
}
