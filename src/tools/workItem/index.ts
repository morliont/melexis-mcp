import { GetWorkItemTool } from './getWorkItem.js';
import { CreateWorkItemTool } from './createWorkItem.js';
import { QueryWorkItemsTool } from './queryWorkItems.js';

export { GetWorkItemTool, CreateWorkItemTool };

/**
 * Get all work item tools
 *
 * @returns Array of work item tools
 */
export function getWorkItemTools() {
  return [
    new GetWorkItemTool(),
    new CreateWorkItemTool(),
    new QueryWorkItemsTool(),
  ];
}
