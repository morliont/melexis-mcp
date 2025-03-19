import { ListProjectsTool } from './listProjects';

export { ListProjectsTool };

/**
 * Get all project tools
 *
 * @returns Array of project tools
 */
export function getProjectTools() {
  return [new ListProjectsTool()];
}
