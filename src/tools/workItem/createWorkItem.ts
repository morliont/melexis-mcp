import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as azdev from 'azure-devops-node-api';
import { z } from 'zod';
import { McpTool } from '../types';
import { AzureDevOpsConfig } from '../../types/config';

/**
 * Tool for creating a work item in Azure DevOps
 */
export class CreateWorkItemTool implements McpTool {
  public name = 'create_work_item';
  public description = 'Create a new work item';

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
            'The project to create the work item in (uses default project if not specified)',
          ),
        title: z.string().describe('The title of the work item'),
        workItemType: z
          .string()
          .describe('The type of work item (e.g., Bug, Task, User Story)'),
        description: z
          .string()
          .optional()
          .describe('The description of the work item'),
        assignedTo: z
          .string()
          .optional()
          .describe('The user to assign the work item to'),
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

          // Create the work item
          const patchDocument = [
            {
              op: 'add',
              path: '/fields/System.Title',
              value: args.title,
            },
          ];

          if (args.description) {
            patchDocument.push({
              op: 'add',
              path: '/fields/System.Description',
              value: args.description,
            });
          }

          if (args.assignedTo) {
            patchDocument.push({
              op: 'add',
              path: '/fields/System.AssignedTo',
              value: args.assignedTo,
            });
          }

          const workItem = await witApi.createWorkItem(
            undefined,
            patchDocument,
            project,
            args.workItemType,
          );

          if (!workItem) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Failed to create work item.',
                },
              ],
            };
          }

          // Format the work item
          const fields = workItem.fields || {};
          const formattedWorkItem = {
            id: workItem.id,
            title: fields['System.Title'],
            state: fields['System.State'],
            type: fields['System.WorkItemType'],
            assignedTo: fields['System.AssignedTo']?.displayName,
            url: `${connection.serverUrl}/${project}/_workitems/edit/${workItem.id}`,
          };

          return {
            content: [
              {
                type: 'text',
                text:
                  `# Work Item Created\n\n` +
                  `**ID**: ${formattedWorkItem.id}\n` +
                  `**Title**: ${formattedWorkItem.title}\n` +
                  `**Type**: ${formattedWorkItem.type}\n` +
                  `**State**: ${formattedWorkItem.state}\n` +
                  `**Assigned To**: ${formattedWorkItem.assignedTo || 'Unassigned'}\n` +
                  `**URL**: ${formattedWorkItem.url}\n`,
              },
            ],
          };
        } catch (error: any) {
          console.error('Error creating work item:', error);
          return {
            content: [
              {
                type: 'text',
                text: `Error creating work item: ${error.message}`,
              },
            ],
          };
        }
      },
    );
  }
}
