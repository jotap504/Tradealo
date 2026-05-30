import {
  All,
  Controller,
  Logger,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpShopService } from './mcp-shop.service';
import { Public } from '../common/decorators/public.decorator';
import { ApiTokenAuthGuard } from '../common/guards/api-token-auth.guard';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import type { VerifiedToken } from '../api-tokens/api-tokens.service';

/**
 * MCP Shop server endpoint. Accepts JSON-RPC 2.0 over HTTP with optional SSE
 * for streaming responses. Authenticated by API token via ApiTokenAuthGuard;
 * @Public() bypasses the global JwtAuthGuard since these requests use
 * `Authorization: Bearer trc_*` instead of a JWT.
 */
@Public()
@UseGuards(ApiTokenAuthGuard)
@Controller('mcp/shop')
export class McpShopController {
  private readonly logger = new Logger(McpShopController.name);

  constructor(private readonly service: McpShopService) {}

  @All()
  @RateLimit({ ttl: 60, limit: 100, keyBy: 'user' })
  async handle(@Req() req: Request, @Res() res: Response) {
    const token = req.user as unknown as VerifiedToken | undefined;
    if (!token) {
      res.status(401).json({ error: 'UNAUTHENTICATED' });
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const server = this.service.buildServer(token);

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      this.logger.error('MCP request failed', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'MCP_INTERNAL_ERROR' });
      }
    }
  }
}
