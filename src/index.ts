import * as dotenv from 'dotenv';
import { McpCentralServer } from './central-server';
import { CentralConfig } from './types/config';
import { SSEManager } from './sse-server';

// Load environment variables
dotenv.config();

// Create the server configuration from environment variables
const config: CentralConfig = {
  atlassian: {
    instanceUrl: process.env.ATLASSIAN_INSTANCE_URL || '',
    apiToken: process.env.ATLASSIAN_API_TOKEN || '',
    email: process.env.ATLASSIAN_EMAIL || '',
    defaultProject: process.env.ATLASSIAN_DEFAULT_PROJECT,
    apiVersion: process.env.ATLASSIAN_API_VERSION,
  },
  gitlab: {
    instanceUrl: process.env.GITLAB_INSTANCE_URL || '',
    apiToken: process.env.GITLAB_ACCESS_TOKEN || '',
    defaultProject: process.env.GITLAB_DEFAULT_PROJECT,
  },
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
};

// Validate the required configuration
if (!config.atlassian.instanceUrl) {
  console.error(
    'Error: ATLASSIAN_INSTANCE_URL environment variable is required',
  );
  process.exit(1);
}

if (!config.atlassian.apiToken) {
  console.error('Error: ATLASSIAN_API_TOKEN environment variable is required');
  process.exit(1);
}

if (!config.atlassian.email) {
  console.error('Error: ATLASSIAN_EMAIL environment variable is required');
  process.exit(1);
}

if (!config.gitlab.instanceUrl) {
  console.error('Error: GITLAB_INSTANCE_URL environment variable is required');
  process.exit(1);
}

if (!config.gitlab.apiToken) {
  console.error('Error: GITLAB_API_TOKEN environment variable is required');
  process.exit(1);
}

// Create and initialize the central server
const centralServer = new McpCentralServer(config);

// Run the server
async function runServer() {
  // Test the connections
  const connectionStatus = await centralServer.testConnections();

  if (!connectionStatus.atlassian) {
    console.error('Error: Failed to connect to Atlassian API');
    process.exit(1);
  }

  if (!connectionStatus.gitlab) {
    console.error('Error: Failed to connect to Gitlab API');
    process.exit(1);
  }

  console.log('Successfully connected to Atlassian API');
  console.log(`Instance URL: ${config.atlassian.instanceUrl}`);

  console.log('Successfully connected to Gitlab API');
  console.log(`Instance URL: ${config.gitlab.instanceUrl}`);

  if (config.atlassian.defaultProject) {
    console.log(`Default Project: ${config.atlassian.defaultProject}`);
  }

  if (config.gitlab.defaultProject) {
    console.log(`Default Project: ${config.gitlab.defaultProject}`);
  }

  // Create and start the SSE manager
  const sseManager = new SSEManager(centralServer, config.port, config.host);
  await sseManager.start();

  console.log('MCP Central Server running with SSE');
  console.log(`Server is available at http://${config.host}:${config.port}`);
  console.log(
    `Connect to http://${config.host}:${config.port}/sse to establish an SSE connection`,
  );

  // Handle process termination
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await sseManager.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await sseManager.stop();
    process.exit(0);
  });
}

// Start the server
runServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
