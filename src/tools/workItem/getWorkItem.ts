import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AxiosInstance } from 'axios';
import { z } from 'zod';
import { McpTool } from '../types';
import { AtlassianConfig } from '../../types/config';

/**
 * Helper function to convert ADF to plain text
 *
 * @param adfObject The Atlassian Document Format object
 * @returns Plain text representation of the ADF content
 */
function convertAdfToText(adfObject: any): string {
  if (!adfObject) return 'No description';

  // If it's already a string, return it
  if (typeof adfObject === 'string') return adfObject;

  try {
    // Handle ADF document structure
    if (
      adfObject.version &&
      adfObject.type === 'doc' &&
      Array.isArray(adfObject.content)
    ) {
      let result = '';

      // Process each content node
      for (const node of adfObject.content) {
        result += processNode(node) + '\n';
      }

      return result.trim();
    }

    // Fallback for unknown format
    return JSON.stringify(adfObject);
  } catch (error) {
    console.error('Error converting ADF to text:', error);
    return 'Error parsing description';
  }
}

/**
 * Process an ADF node and its children recursively
 *
 * @param node The ADF node to process
 * @returns Text representation of the node
 */
function processNode(node: any): string {
  if (!node) return '';

  // Handle text nodes
  if (node.type === 'text') {
    let text = node.text || '';

    // Apply text formatting if available
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'strong') text = `**${text}**`;
        if (mark.type === 'em') text = `*${text}*`;
        if (mark.type === 'code') text = `\`${text}\``;
        if (mark.type === 'strike') text = `~~${text}~~`;
      }
    }

    return text;
  }

  // Handle paragraph nodes
  if (node.type === 'paragraph') {
    if (Array.isArray(node.content)) {
      return node.content.map(processNode).join('');
    }
    return '';
  }

  // Handle heading nodes
  if (node.type === 'heading') {
    const level = node.attrs?.level || 1;
    const prefix = '#'.repeat(level) + ' ';

    if (Array.isArray(node.content)) {
      return prefix + node.content.map(processNode).join('');
    }
    return prefix;
  }

  // Handle bullet list nodes
  if (node.type === 'bulletList' && Array.isArray(node.content)) {
    return node.content
      .map((item: any) => processListItem(item, '* '))
      .join('\n');
  }

  // Handle ordered list nodes
  if (node.type === 'orderedList' && Array.isArray(node.content)) {
    return node.content
      .map((item: any, index: number) =>
        processListItem(item, `${index + 1}. `),
      )
      .join('\n');
  }

  // Handle code block nodes
  if (node.type === 'codeBlock') {
    const language = node.attrs?.language || '';
    let code = '';

    if (Array.isArray(node.content)) {
      code = node.content.map(processNode).join('');
    }

    return '```' + language + '\n' + code + '\n```';
  }

  // Handle blockquote nodes
  if (node.type === 'blockquote' && Array.isArray(node.content)) {
    return node.content.map((n: any) => '> ' + processNode(n)).join('\n');
  }

  // Handle rule (horizontal line) nodes
  if (node.type === 'rule') {
    return '---';
  }

  // Handle link nodes
  if (node.type === 'inlineCard' && node.attrs?.url) {
    return node.attrs.url;
  }

  // Handle other nodes with content
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(processNode).join('');
  }

  return '';
}

/**
 * Process a list item node
 *
 * @param node The list item node
 * @param prefix The prefix to use for the list item
 * @returns Text representation of the list item
 */
function processListItem(node: any, prefix: string): string {
  if (node.type !== 'listItem' || !Array.isArray(node.content)) {
    return prefix;
  }

  return prefix + node.content.map(processNode).join('');
}

/**
 * Tool for getting an issue from Jira
 */
export class GetWorkItemTool implements McpTool {
  public name = 'get_work_item';
  public description = 'Get a Jira issue by ID or key';

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
        issueIdOrKey: z.string().describe('The ID or key of the Jira issue'),
        project: z
          .string()
          .optional()
          .describe(
            'The project containing the issue (uses default project if not specified)',
          ),
      },
      async (args, _extras) => {
        console.log(`Executing get_work_item with args:`, args);
        try {
          if (!connection) {
            console.error('No connection to Atlassian API');
            throw new Error('No connection to Atlassian API');
          }

          // Use provided project or fall back to default project
          const project = args.project || config.defaultProject;

          // If issueIdOrKey doesn't include a project key, prepend the project
          let issueIdOrKey = args.issueIdOrKey;
          console.log(`Original issueIdOrKey: ${issueIdOrKey}`);

          if (!/^[A-Z]+-\d+$/.test(issueIdOrKey) && project) {
            // If it's just a number, prepend the project key
            if (/^\d+$/.test(issueIdOrKey)) {
              issueIdOrKey = `${project}-${issueIdOrKey}`;
              console.log(
                `Prepended project key, new issueIdOrKey: ${issueIdOrKey}`,
              );
            } else {
              console.error(`Invalid issue ID or key format: ${issueIdOrKey}`);
              throw new Error('Invalid issue ID or key format');
            }
          }

          // Get the issue from Jira
          console.log(
            `Making API request to: /rest/api/3/issue/${issueIdOrKey}`,
          );
          try {
            const response = await connection.get(
              `/rest/api/3/issue/${issueIdOrKey}`,
            );
            console.log(`API response status: ${response.status}`);
            const issue = response.data;

            if (!issue) {
              console.error(`Issue ${issueIdOrKey} not found.`);
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `Issue ${issueIdOrKey} not found.`,
                  },
                ],
              };
            }

            // Format the issue
            console.log(`Formatting issue data for ${issue.key}`);
            const formattedIssue = {
              id: issue.id,
              key: issue.key,
              title: issue.fields.summary,
              status: issue.fields.status.name,
              type: issue.fields.issuetype.name,
              assignee: issue.fields.assignee?.displayName || 'Unassigned',
              priority: issue.fields.priority?.name,
              labels: issue.fields.labels || [],
              url: `${config.instanceUrl}/browse/${issue.key}`,
              description: convertAdfToText(issue.fields.description),
              created: new Date(issue.fields.created).toLocaleString(),
              updated: new Date(issue.fields.updated).toLocaleString(),
            };

            console.log(
              `Successfully formatted issue data, returning response`,
            );

            // Create the response text
            const responseText =
              `# Issue ${formattedIssue.key}: ${formattedIssue.title}\n\n` +
              `**Type**: ${formattedIssue.type}\n` +
              `**Status**: ${formattedIssue.status}\n` +
              `**Assigned To**: ${formattedIssue.assignee}\n` +
              `**Priority**: ${formattedIssue.priority || 'Not set'}\n` +
              `**Labels**: ${formattedIssue.labels.length > 0 ? formattedIssue.labels.join(', ') : 'None'}\n` +
              `**Created**: ${formattedIssue.created}\n` +
              `**Updated**: ${formattedIssue.updated}\n` +
              `**URL**: ${formattedIssue.url}\n\n` +
              `## Description\n\n${formattedIssue.description}\n`;

            // Log the response length
            console.log(
              `Response text length: ${responseText.length} characters`,
            );

            // Return the response with the correct type
            console.log(`Returning response for issue ${formattedIssue.key}`);
            return {
              content: [
                {
                  type: 'text' as const,
                  text: responseText,
                },
              ],
            };
          } catch (apiError: any) {
            console.error(
              `API error for issue ${issueIdOrKey}:`,
              apiError.message,
            );
            if (apiError.response) {
              console.error(`Response status: ${apiError.response.status}`);
              console.error(`Response data:`, apiError.response.data);
            }
            throw apiError;
          }
        } catch (error: any) {
          console.error('Error getting issue:', error);
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error getting issue: ${error.message}`,
              },
            ],
          };
        }
      },
    );
  }
}
