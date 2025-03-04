import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as azdev from 'azure-devops-node-api';
import { z } from 'zod';
import { McpTool } from '../types';
import { AzureDevOpsConfig } from '../../types/config';

/**
 * Tool for querying work items in Azure DevOps
 */
export class QueryWorkItemsTool implements McpTool {
  public name = 'query_work_items';
  public description = 'Query work items with filters';

  /**
   * Register the tool with the MCP server
   *
   * @param server The MCP server
   * @param connection The Azure DevOps connection
   * @param config The Azure DevOps configuration
   */
  public register(
    server: McpServer,
    connection: azdev.WebApi | null,
    config: AzureDevOpsConfig,
  ): void {
    server.tool(
      this.name,
      {
        project: z
          .string()
          .optional()
          .describe(
            'The project to query work items from (uses default project if not specified)',
          ),
        assignedTo: z
          .string()
          .optional()
          .describe('Filter by assigned user (email or display name)'),
        currentIteration: z
          .boolean()
          .optional()
          .describe('Filter by current iteration'),
        workItemTypes: z
          .array(z.string())
          .optional()
          .describe('Filter by work item types'),
        states: z.array(z.string()).optional().describe('Filter by states'),
      },
      async (args, _extras) => {
        try {
          if (!connection) {
            throw new Error('No connection to Azure DevOps');
          }

          // Use provided project or fall back to default project
          const project = args.project || config.defaultProject;
          if (!project) {
            throw new Error(
              'No project specified and no default project configured',
            );
          }

          // Get the Work Item Tracking API
          const witApi = await connection.getWorkItemTrackingApi();

          // Build the WIQL query
          let query = `SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType], [System.Tags], [System.IterationPath] FROM WorkItems WHERE [System.TeamProject] = '${project}'`;

          // Add filters
          if (args.assignedTo) {
            query += ` AND [System.AssignedTo] = '${args.assignedTo}'`;
          }

          if (args.currentIteration) {
            query += ` AND [System.IterationPath] = @currentIteration`;
          }

          if (args.workItemTypes && args.workItemTypes.length > 0) {
            const types = args.workItemTypes
              .map((type) => `'${type}'`)
              .join(', ');
            query += ` AND [System.WorkItemType] IN (${types})`;
          }

          if (args.states && args.states.length > 0) {
            const states = args.states.map((state) => `'${state}'`).join(', ');
            query += ` AND [System.State] IN (${states})`;
          }

          query += ' ORDER BY [System.ChangedDate] DESC';

          // Execute the query
          const queryResult = await witApi.queryByWiql({ query });

          if (
            !queryResult ||
            !queryResult.workItems ||
            queryResult.workItems.length === 0
          ) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No work items found matching the criteria.',
                },
              ],
            };
          }

          // Get full work item details
          const workItemIds = queryResult.workItems
            .map((wi) => wi.id)
            .filter((id): id is number => id !== undefined);

          const workItems = await witApi.getWorkItems(workItemIds);

          if (!workItems) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Failed to fetch work item details.',
                },
              ],
            };
          }

          // Format the work items
          const formattedWorkItems = workItems.map((wi) => {
            const fields = wi.fields || {};
            return {
              id: wi.id,
              title: fields['System.Title'],
              state: fields['System.State'],
              type: fields['System.WorkItemType'],
              assignedTo: fields['System.AssignedTo']?.displayName,
              iterationPath: fields['System.IterationPath'],
              tags: fields['System.Tags'],
              url: `${connection.serverUrl}/${project}/_workitems/edit/${wi.id}`,
            };
          });

          return {
            content: [
              {
                type: 'text',
                text: `# Work Items\n\nFound ${formattedWorkItems.length} work items:\n\n${formattedWorkItems
                  .map(
                    (wi) =>
                      `## ${wi.id}: ${wi.title}\n` +
                      `**Type**: ${wi.type}\n` +
                      `**State**: ${wi.state}\n` +
                      `**Assigned To**: ${wi.assignedTo || 'Unassigned'}\n` +
                      `**Iteration**: ${wi.iterationPath}\n` +
                      `**Tags**: ${wi.tags || 'None'}\n` +
                      `**URL**: ${wi.url}\n`,
                  )
                  .join('\n')}`,
              },
            ],
          };
        } catch (error: any) {
          console.error('Error querying work items:', error);
          return {
            content: [
              {
                type: 'text',
                text: `Error querying work items: ${error.message}`,
              },
            ],
          };
        }
      },
    );
  }
}
