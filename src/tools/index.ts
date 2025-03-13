import { getProjectTools } from './project';
import { getWorkItemTools } from './workItem';
import { getConfluenceTools } from './confluence';
import { ToolRegistry } from './types';

export { ToolRegistry } from './types';

/**
 * Get all tools
 *
 * @returns A tool registry with all tools registered
 */
export function getAllTools(): ToolRegistry {
  const registry = new ToolRegistry();

  // Register all tools
  getProjectTools().forEach((tool) => registry.registerTool(tool));
  getWorkItemTools().forEach((tool) => registry.registerTool(tool));
  getConfluenceTools().forEach((tool) => registry.registerTool(tool));

  return registry;
}
