import { All, Controller, Logger, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpPublicService } from './mcp-public.service';
import { Public } from '../common/decorators/public.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';

/**
 * Public read-only MCP server: agents can search the catalog and read listings,
 * categories, and shops without authentication. Rate limited per IP.
 */
@Public()
@Controller('mcp/public')
export class McpPublicController {
  private readonly logger = new Logger(McpPublicController.name);

  constructor(private readonly service: McpPublicService) {}

  @All()
  @RateLimit({ ttl: 3600, limit: 600 })
  async handle(@Req() req: Request, @Res() res: Response) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const server = this.service.buildServer();

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      this.logger.error('Public MCP request failed', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'MCP_INTERNAL_ERROR' });
      }
    }
  }
}
