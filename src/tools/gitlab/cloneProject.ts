import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AxiosInstance } from 'axios';
import { GitlabConfig } from '../../types/config';
import { McpTool } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

const execAsync = promisify(exec);

export class CloneProjectTool implements McpTool {
  public name = 'clone_gitlab_project';
  public description = 'Clone a GitLab project to the Repositories folder';

  public register(
    server: McpServer,
    connection: AxiosInstance | null,
    _config: GitlabConfig,
  ): void {
    server.tool(
      this.name,
      {
        projectId: z.string().describe('The ID of the GitLab project to clone'),
        directory: z
          .string()
          .describe('The directory to clone the project into'),
      },
      async (args) => {
        try {
          if (!connection) {
            throw new Error('No connection to GitLab API');
          }

          if (!args.projectId) {
            throw new Error('Project ID is required');
          }

          if (!args.directory) {
            throw new Error('Directory is required');
          }

          // Get project details from GitLab API
          const response = await connection.get(
            `/api/v4/projects/${args.projectId}`,
          );
          const project = response.data;

          if (!project) {
            throw new Error('Project not found');
          }

          // Create directory if it doesn't exist
          if (!fs.existsSync(args.directory)) {
            fs.mkdirSync(args.directory, { recursive: true });
          }

          // Clone the repository
          const clonePath = path.join(args.directory, project.name);
          await execAsync(`git clone ${project.ssh_url_to_repo} ${clonePath}`);

          return {
            content: [
              {
                type: 'text',
                text: `Successfully cloned project ${project.name} to ${clonePath}`,
              },
            ],
          };
        } catch (error: any) {
          console.error('Error cloning GitLab project:', error);
          throw new Error(`Failed to clone GitLab project: ${error.message}`);
        }
      },
    );
  }
}
