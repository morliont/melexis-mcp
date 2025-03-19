import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AxiosInstance } from 'axios';
import { z } from 'zod';
import { McpTool } from '../../types';
import { AtlassianConfig } from '../../../types/config';

/**
 * Tool for getting a specific Confluence page
 */
export class GetPageTool implements McpTool {
  public name = 'get_confluence_page';
  public description = 'Get content from a specific Confluence page';

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
        pageId: z.string().describe('The ID of the Confluence page'),
      },
      async (args, _extras) => {
        try {
          if (!connection) {
            throw new Error('No connection to Atlassian API');
          }

          const { pageId } = args;

          // Fetch the page from Confluence API with expanded body content
          const response = await connection.get(
            `/wiki/rest/api/content/${pageId}`,
            {
              params: {
                expand: 'body.storage,version,space,history,metadata',
              },
            },
          );

          const page = response.data;

          if (!page) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No page found with ID: ${pageId}`,
                },
              ],
            };
          }

          // Format the page details
          const formattedPage = {
            id: page.id,
            title: page.title,
            type: page.type,
            spaceKey: page.space?.key,
            spaceName: page.space?.name,
            version: page.version?.number,
            createdBy: page.history?.createdBy?.displayName || 'Unknown',
            createdDate: page.history?.createdDate || 'Unknown',
            lastUpdatedBy:
              page.history?.lastUpdated?.by?.displayName || 'Unknown',
            lastUpdatedDate: page.history?.lastUpdated?.when || 'Unknown',
            content: page.body?.storage?.value || 'No content',
            url: `${config.instanceUrl}/wiki${page._links.webui}`,
          };

          // Get the page content
          const htmlContent = formattedPage.content;

          // Simple HTML to Markdown conversion for common elements
          let markdownContent = htmlContent
            .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
            .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
            .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
            .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
            .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
            .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
            .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
            .replace(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
            .replace(/<ul[^>]*>(.*?)<\/ul>/gis, '$1\n')
            .replace(/<ol[^>]*>(.*?)<\/ol>/gis, '$1\n')
            .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
            .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n\n')
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");

          // Remove any remaining HTML tags
          markdownContent = markdownContent.replace(/<[^>]*>/g, '');

          return {
            content: [
              {
                type: 'text',
                text:
                  `# ${formattedPage.title}\n\n` +
                  `**Space**: ${formattedPage.spaceName} (${formattedPage.spaceKey})\n` +
                  `**Version**: ${formattedPage.version}\n` +
                  `**Created by**: ${formattedPage.createdBy} on ${formattedPage.createdDate}\n` +
                  `**Last updated by**: ${formattedPage.lastUpdatedBy} on ${formattedPage.lastUpdatedDate}\n` +
                  `**URL**: ${formattedPage.url}\n\n` +
                  `## Content\n\n${markdownContent}`,
              },
            ],
          };
        } catch (error: any) {
          console.error('Error fetching Confluence page:', error);
          return {
            content: [
              {
                type: 'text',
                text: `Error fetching Confluence page: ${error.message}`,
              },
            ],
          };
        }
      },
    );
  }
}
