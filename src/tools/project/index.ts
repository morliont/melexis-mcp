import { ListProjectsTool } from './listProjects';
import { GetProjectTool } from './getProject';

export { ListProjectsTool, GetProjectTool };

/**
 * Get all project tools
 *
 * @returns Array of project tools
 */
export function getProjectTools() {
  return [new ListProjectsTool(), new GetProjectTool()];
}
