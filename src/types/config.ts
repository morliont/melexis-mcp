/**
 * Atlassian configuration type definition
 */
export interface AtlassianConfig {
  /**
   * The Atlassian Cloud instance URL (e.g., https://your-domain.atlassian.net)
   */
  instanceUrl: string;

  /**
   * API token for authentication
   */
  apiToken: string;

  /**
   * Email address associated with the API token
   */
  email: string;

  /**
   * Optional default Jira project to use when not specified
   */
  defaultProject?: string;

  /**
   * Optional API version to use (defaults to latest)
   */
  apiVersion?: string;
}
