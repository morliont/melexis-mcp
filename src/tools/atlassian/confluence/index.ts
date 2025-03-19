import { ListSpacesTool } from './listSpaces';
import { GetSpaceTool } from './getSpace';
import { GetPageTool } from './getPage';

export { ListSpacesTool, GetSpaceTool, GetPageTool };

/**
 * Get all Confluence tools
 *
 * @returns Array of Confluence tools
 */
export function getConfluenceTools() {
  return [new ListSpacesTool(), new GetSpaceTool(), new GetPageTool()];
}
