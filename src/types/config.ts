/**
 * Base configuration type for all services
 */
export interface BaseConfig {
  /**
   * The service instance URL
   */
  instanceUrl: string;

  /**
   * API token for authentication
   */
  apiToken: string;
}

/**
 * Atlassian configuration type definition
 */
export interface AtlassianConfig extends BaseConfig {
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

/**
 * Gitlab configuration type definition
 */
export interface GitlabConfig extends BaseConfig {
  /**
   * Optional default Gitlab project to use when not specified
   */
  defaultProject?: string;
}

/**
 * Central server configuration
 */
export interface CentralConfig {
  /**
   * Port to listen on
   */
  port: number;

  /**
   * Host to listen on
   */
  host: string;

  /**
   * Atlassian configuration
   */
  atlassian: AtlassianConfig;

  /**
   * Gitlab configuration
   */
  gitlab: GitlabConfig;
}
