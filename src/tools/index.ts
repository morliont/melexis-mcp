import { getProjectTools } from './atlassian/project';
import { getWorkItemTools } from './atlassian/workItem';
import { getConfluenceTools } from './atlassian/confluence';
import { ToolRegistry } from './types';
import { ListAllProjectsTool } from './gitlab/listAllProjects';

export { ToolRegistry } from './types';

/**
 * Get all tools
 *
 * @returns A tool registry with all tools registered
 */
export function getAllAtlassianTools(): ToolRegistry {
  const registry = new ToolRegistry();

  // Register all tools
  getProjectTools().forEach((tool) => registry.registerTool(tool));
  getWorkItemTools().forEach((tool) => registry.registerTool(tool));
  getConfluenceTools().forEach((tool) => registry.registerTool(tool));

  return registry;
}

export function getAllGitlabTools(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.registerTool(new ListAllProjectsTool());

  return registry;
}
