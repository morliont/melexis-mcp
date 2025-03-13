import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AxiosInstance } from 'axios';
import { z } from 'zod';
import { McpTool } from '../types';
import { AtlassianConfig } from '../../types/config';

/**
 * Tool for querying issues in Jira
 */
export class QueryWorkItemsTool implements McpTool {
  public name = 'query_work_items';
  public description = 'Query Jira issues with filters';

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
            'The project to query issues from (uses default project if not specified)',
          ),
        assignee: z
          .string()
          .optional()
          .describe('Filter by assigned user (username or display name)'),
        status: z
          .array(z.string())
          .optional()
          .describe('Filter by status (e.g., "To Do", "In Progress", "Done")'),
        issueType: z
          .array(z.string())
          .optional()
          .describe('Filter by issue types (e.g., "Bug", "Task", "Story")'),
        labels: z.array(z.string()).optional().describe('Filter by labels'),
        maxResults: z
          .number()
          .optional()
          .describe('Maximum number of results to return (default: 20)'),
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

          // Build the JQL query
          let jql = `project = "${project}"`;

          // Add filters
          if (args.assignee) {
            jql += ` AND assignee = "${args.assignee}"`;
          }

          if (args.status && args.status.length > 0) {
            const statuses = args.status.map((s) => `"${s}"`).join(', ');
            jql += ` AND status IN (${statuses})`;
          }

          if (args.issueType && args.issueType.length > 0) {
            const types = args.issueType.map((t) => `"${t}"`).join(', ');
            jql += ` AND issuetype IN (${types})`;
          }

          if (args.labels && args.labels.length > 0) {
            const labelConditions = args.labels
              .map((label) => `labels = "${label}"`)
              .join(' AND ');
            jql += ` AND (${labelConditions})`;
          }

          // Order by updated date
          jql += ' ORDER BY updated DESC';

          // Set max results
          const maxResults = args.maxResults || 20;

          // Define the type for Jira search request
          interface JiraSearchRequest {
            jql: string;
            maxResults: number;
            fields: string[];
          }

          // Execute the query
          const searchRequest: JiraSearchRequest = {
            jql,
            maxResults,
            fields: [
              'summary',
              'status',
              'assignee',
              'issuetype',
              'priority',
              'labels',
              'created',
              'updated',
              'description',
            ],
          };

          const response = await connection.post(
            '/rest/api/3/search',
            searchRequest,
          );

          const searchResult = response.data;

          if (
            !searchResult ||
            !searchResult.issues ||
            searchResult.issues.length === 0
          ) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No issues found matching the criteria.',
                },
              ],
            };
          }

          // Define the type for Jira issues
          interface JiraIssue {
            id: string;
            key: string;
            fields: {
              summary: string;
              status: { name: string };
              issuetype: { name: string };
              assignee?: { displayName: string };
              priority?: { name: string };
              labels?: string[];
              created: string;
              updated: string;
            };
          }

          // Format the issues
          const formattedIssues = searchResult.issues.map(
            (issue: JiraIssue) => {
              return {
                id: issue.id,
                key: issue.key,
                summary: issue.fields.summary,
                status: issue.fields.status.name,
                type: issue.fields.issuetype.name,
                assignee: issue.fields.assignee?.displayName || 'Unassigned',
                priority: issue.fields.priority?.name || 'Not set',
                labels: issue.fields.labels || [],
                created: new Date(issue.fields.created).toLocaleString(),
                updated: new Date(issue.fields.updated).toLocaleString(),
                url: `${config.instanceUrl}/browse/${issue.key}`,
              };
            },
          );

          return {
            content: [
              {
                type: 'text',
                text: `# Issues\n\nFound ${formattedIssues.length} issues matching your criteria:\n\n${formattedIssues
                  .map(
                    (issue: {
                      key: string;
                      summary: string;
                      type: string;
                      status: string;
                      assignee: string;
                      priority: string;
                      labels: string[];
                      created: string;
                      updated: string;
                      url: string;
                    }) =>
                      `## ${issue.key}: ${issue.summary}\n` +
                      `**Type**: ${issue.type}\n` +
                      `**Status**: ${issue.status}\n` +
                      `**Assigned To**: ${issue.assignee}\n` +
                      `**Priority**: ${issue.priority}\n` +
                      `**Labels**: ${issue.labels.length > 0 ? issue.labels.join(', ') : 'None'}\n` +
                      `**Created**: ${issue.created}\n` +
                      `**Updated**: ${issue.updated}\n` +
                      `**URL**: ${issue.url}\n`,
                  )
                  .join('\n')}`,
              },
            ],
          };
        } catch (error: any) {
          console.error('Error querying issues:', error);
          return {
            content: [
              {
                type: 'text',
                text: `Error querying issues: ${error.message}`,
              },
            ],
          };
        }
      },
    );
  }
}
