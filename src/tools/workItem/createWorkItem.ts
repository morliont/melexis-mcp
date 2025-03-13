import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AxiosInstance } from 'axios';
import { z } from 'zod';
import { McpTool } from '../types';
import { AtlassianConfig } from '../../types/config';

/**
 * Tool for creating an issue in Jira
 */
export class CreateWorkItemTool implements McpTool {
  public name = 'create_work_item';
  public description = 'Create a new Jira issue';

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
        project: z
          .string()
          .optional()
          .describe(
            'The project to create the issue in (uses default project if not specified)',
          ),
        summary: z.string().describe('The summary (title) of the issue'),
        issueType: z
          .string()
          .describe('The type of issue (e.g., Bug, Task, Story)'),
        description: z
          .string()
          .optional()
          .describe('The description of the issue'),
        assignee: z
          .string()
          .optional()
          .describe('The account ID or username to assign the issue to'),
        priority: z.string().optional().describe('The priority of the issue'),
        labels: z
          .array(z.string())
          .optional()
          .describe('Labels to add to the issue'),
      },
      async (args, _extras) => {
        try {
          if (!connection) {
            throw new Error('No connection to Atlassian API');
          }

          // Use provided project or fall back to default project
          const project = args.project || config.defaultProject;
          if (!project) {
            throw new Error(
              'No project specified and no default project configured',
            );
          }

          // Create the issue
          // Define the type for the issueData object to avoid TypeScript errors
          interface JiraIssueFields {
            project: { key: string };
            summary: string;
            issuetype: { name: string };
            description?: {
              type: string;
              version: number;
              content: Array<{
                type: string;
                content: Array<{
                  type: string;
                  text: string;
                }>;
              }>;
            };
            assignee?: { id?: string; name?: string };
            priority?: { name: string };
            labels?: string[];
          }

          interface JiraIssueData {
            fields: JiraIssueFields;
          }

          const issueData: JiraIssueData = {
            fields: {
              project: {
                key: project,
              },
              summary: args.summary,
              issuetype: {
                name: args.issueType,
              },
            },
          };

          // Add optional fields
          if (args.description) {
            issueData.fields.description = {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: args.description,
                    },
                  ],
                },
              ],
            };
          }

          if (args.assignee) {
            // Try to determine if it's an account ID or username
            if (args.assignee.startsWith('user:')) {
              issueData.fields.assignee = {
                id: args.assignee.substring(5),
              };
            } else {
              // Assume it's a username/email
              issueData.fields.assignee = {
                name: args.assignee,
              };
            }
          }

          if (args.priority) {
            issueData.fields.priority = {
              name: args.priority,
            };
          }

          if (args.labels && args.labels.length > 0) {
            issueData.fields.labels = args.labels;
          }

          // Create the issue
          const response = await connection.post(
            '/rest/api/3/issue',
            issueData,
          );
          const issue = response.data;

          if (!issue || !issue.key) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Failed to create issue.',
                },
              ],
            };
          }

          // Get the full issue details
          const issueResponse = await connection.get(
            `/rest/api/3/issue/${issue.key}`,
          );
          const fullIssue = issueResponse.data;

          // Format the issue
          const formattedIssue = {
            id: fullIssue.id,
            key: fullIssue.key,
            summary: fullIssue.fields.summary,
            status: fullIssue.fields.status.name,
            type: fullIssue.fields.issuetype.name,
            assignee: fullIssue.fields.assignee?.displayName || 'Unassigned',
            priority: fullIssue.fields.priority?.name || 'Not set',
            url: `${config.instanceUrl}/browse/${fullIssue.key}`,
          };

          return {
            content: [
              {
                type: 'text',
                text:
                  `# Issue Created\n\n` +
                  `**Key**: ${formattedIssue.key}\n` +
                  `**Summary**: ${formattedIssue.summary}\n` +
                  `**Type**: ${formattedIssue.type}\n` +
                  `**Status**: ${formattedIssue.status}\n` +
                  `**Assigned To**: ${formattedIssue.assignee}\n` +
                  `**Priority**: ${formattedIssue.priority}\n` +
                  `**URL**: ${formattedIssue.url}\n`,
              },
            ],
          };
        } catch (error: any) {
          console.error('Error creating issue:', error);
          return {
            content: [
              {
                type: 'text',
                text: `Error creating issue: ${error.message}`,
              },
            ],
          };
        }
      },
    );
  }
}
