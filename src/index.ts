import * as dotenv from 'dotenv';
import { AtlassianServer } from './server';
import { AtlassianConfig } from './types/config';
import { SSEManager } from './sse-server';

// Load environment variables
dotenv.config();

// Log version info
console.log('Atlassian MCP Server - Starting up');
// Skip version logging to avoid linter errors
console.log('Starting server...');

// Create the server configuration from environment variables
const config: AtlassianConfig = {
  instanceUrl: process.env.ATLASSIAN_INSTANCE_URL || '',
  apiToken: process.env.ATLASSIAN_API_TOKEN || '',
  email: process.env.ATLASSIAN_EMAIL || '',
  defaultProject: process.env.ATLASSIAN_DEFAULT_PROJECT,
  apiVersion: process.env.ATLASSIAN_API_VERSION,
};

// Get server configuration
const port = parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || '0.0.0.0';

// Validate the required configuration
if (!config.instanceUrl) {
  console.error(
    'Error: ATLASSIAN_INSTANCE_URL environment variable is required',
  );
  process.exit(1);
}

if (!config.apiToken) {
  console.error('Error: ATLASSIAN_API_TOKEN environment variable is required');
  process.exit(1);
}

if (!config.email) {
  console.error('Error: ATLASSIAN_EMAIL environment variable is required');
  process.exit(1);
}

// Create and initialize the server
const server = new AtlassianServer(config);

// Run the server
async function runServer() {
  // Test the connection to Atlassian
  const connectionSuccessful = await server.testConnection();

  if (!connectionSuccessful) {
    console.error('Error: Failed to connect to Atlassian API');
    process.exit(1);
  }

  console.log('Successfully connected to Atlassian API');
  console.log(`Instance URL: ${config.instanceUrl}`);

  if (config.defaultProject) {
    console.log(`Default Project: ${config.defaultProject}`);
  }

  // Create and start the SSE manager
  const sseManager = new SSEManager(server, port, host);
  await sseManager.start();

  console.log('Atlassian MCP Server running with SSE');
  console.log(`Server is available at http://${host}:${port}`);
  console.log(
    `Connect to http://${host}:${port}/sse to establish an SSE connection`,
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
  console.error('Fatal error in main():', error);
  process.exit(1);
});
