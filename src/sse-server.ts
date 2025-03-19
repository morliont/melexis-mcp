import { createServer, IncomingMessage, ServerResponse } from 'http';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { McpCentralServer } from './central-server';

/**
 * Class that manages SSE connections for the MCP server
 */
export class SSEManager {
  private centralServer: McpCentralServer;
  private httpServer: ReturnType<typeof createServer>;
  private sessions: Map<string, SSEServerTransport> = new Map();
  private port: number;
  private host: string;

  /**
   * Create a new SSE manager
   *
   * @param server The central server instance
   * @param port The port to listen on
   * @param host The host to listen on
   */
  constructor(
    centralServer: McpCentralServer,
    port: number = 3000,
    host: string = '0.0.0.0',
  ) {
    this.centralServer = centralServer;
    this.port = port;
    this.host = host;
    this.httpServer = createServer(this.handleRequest.bind(this));
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (pathname === '/sse') {
      // Create a new transport for this connection
      const transport = new SSEServerTransport('/message', res);

      // Generate a unique session ID
      const sessionId = transport.sessionId;
      this.sessions.set(sessionId, transport);

      // Connect the transport to the central server
      try {
        await this.centralServer.getServer().connect(transport);
        console.log(`New SSE connection established: ${sessionId}`);

        // Handle client disconnect
        req.on('close', () => {
          console.log(`Client disconnected: ${sessionId}`);
          this.sessions.delete(sessionId);
        });
      } catch (error) {
        console.error('Error connecting transport:', error);
        this.sessions.delete(sessionId);
        res.end();
      }
    } else if (pathname === '/message') {
      // Handle message POST request
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) {
        res.writeHead(400);
        res.end('Missing sessionId');
        return;
      }

      const transport = this.sessions.get(sessionId);
      if (!transport) {
        res.writeHead(404);
        res.end('Session not found');
        return;
      }

      // Let the transport handle the message
      try {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const message = JSON.parse(body);
            transport.handlePostMessage(req, res, message);
          } catch (error) {
            console.error('Error handling message:', error);
            res.writeHead(400);
            res.end('Invalid message format');
          }
        });
      } catch (error) {
        console.error('Error handling message:', error);
        res.writeHead(500);
        res.end('Internal server error');
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  }

  /**
   * Start the SSE server
   */
  async start(): Promise<void> {
    const connectionStatus = await this.centralServer.testConnections();
    
    if (!connectionStatus.atlassian) {
      throw new Error('Atlassian service is not available');
    }

    this.httpServer.listen(this.port, this.host);
    console.log(`SSE server listening at http://${this.host}:${this.port}`);
  }

  /**
   * Stop the SSE server
   */
  async stop(): Promise<void> {
    this.httpServer.close();
    this.sessions.clear();
  }
}
