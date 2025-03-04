import { GetRepositoryTool } from './getRepository';
import { ListRepositoriesTool } from './listRepositories';
import { SearchRepositoryCodeTool } from './searchRepositoryCode';

export { GetRepositoryTool, ListRepositoriesTool, SearchRepositoryCodeTool };

/**
 * Get all repository tools
 *
 * @returns Array of repository tools
 */
export function getRepositoryTools() {
  return [
    new GetRepositoryTool(),
    new ListRepositoriesTool(),
    new SearchRepositoryCodeTool(),
  ];
}
