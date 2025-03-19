import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AxiosInstance } from 'axios';
import { GitlabConfig } from '../../types/config';
import { McpTool } from '../types';

export class ListAllProjectsTool implements McpTool {
  public name = 'list_gitlab_projects';
  public description = 'List all accessible GitLab projects';

  public register(
    server: McpServer,
    connection: AxiosInstance | null,
    _config: GitlabConfig,
  ): void {
    server.tool(
      this.name,
      'List all accessible GitLab projects',
      async (_extras) => {
        try {
          if (!connection) {
            throw new Error('No connection to GitLab API');
          }

          const perPage = 50;
          let allProjects: any[] = [];
          let nextPageUrl =
            '/api/v4/projects?membership=true&pagination=keyset&per_page=' +
            perPage +
            '&order_by=id&sort=asc';

          while (nextPageUrl) {
            const response = await connection.get(nextPageUrl);
            const projects = response.data;

            if (!projects || projects.length === 0) {
              break;
            }

            allProjects = allProjects.concat(projects);

            // Get next page URL from Link header
            const linkHeader = response.headers['link'];
            if (!linkHeader) {
              break;
            }

            const nextLink = linkHeader
              .split(',')
              .find((link: string) => link.includes('rel="next"'));
            if (!nextLink) {
              break;
            }

            const match = nextLink.match(/<([^>]+)>/);
            nextPageUrl = match ? match[1].split('/api/v4')[1] : '';
          }

          if (allProjects.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No projects found.',
                },
              ],
            };
          }

          // Format the projects
          const formattedProjects = allProjects.map((project: any) => ({
            id: project.id,
            name: project.name,
            nameWithNamespace: project.name_with_namespace,
            description: project.description,
            webUrl: project.web_url,
            visibility: project.visibility,
            archived: project.archived,
            createdAt: project.created_at,
            lastActivityAt: project.last_activity_at,
            defaultBranch: project.default_branch,
            topics: project.topics,
            starCount: project.star_count,
            forksCount: project.forks_count,
          }));

          return {
            content: [
              {
                type: 'text',
                text: `Found ${formattedProjects.length} projects:`,
              },
              {
                type: 'resource',
                resource: {
                  text: 'GitLab Projects',
                  uri:
                    'data:application/json,' +
                    JSON.stringify(formattedProjects),
                  mimeType: 'application/json',
                },
              },
            ],
          };
        } catch (error: any) {
          console.error('Error fetching GitLab projects:', error);
          throw new Error(`Failed to fetch GitLab projects: ${error.message}`);
        }
      },
    );
  }
} 