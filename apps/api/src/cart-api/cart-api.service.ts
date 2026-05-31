import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import {
  agentCartItems,
  agentCarts,
  listings,
  shopSubscriptions,
} from '../database/schema';

type DB = NodePgDatabase<typeof schema>;

export interface AgentCartItemInput {
  listingId: string;
  quantity: number;
}

export interface CreateCartInput {
  items: AgentCartItemInput[];
  buyerEmail: string;
  shippingAddress?: Record<string, unknown>;
  idempotencyKey?: string;
}

@Injectable()
export class CartApiService {
  private readonly logger = new Logger(CartApiService.name);
  private readonly preference: Preference;
  private readonly payment: Payment;
  private readonly backUrl: string;

  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DB) {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN ?? '',
    });
    this.preference = new Preference(client);
    this.payment = new Payment(client);
    this.backUrl = process.env.APP_URL ?? 'https://trocalia.com.ar';
  }

  async createCart(input: CreateCartInput) {
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }
    if (!input.buyerEmail || !/^\S+@\S+\.\S+$/.test(input.buyerEmail)) {
      throw new BadRequestException('Valid buyerEmail is required');
    }

    // 1. Idempotency — if the key was already used, return the prior cart
    if (input.idempotencyKey) {
      const [existing] = await this.db
        .select()
        .from(agentCarts)
        .where(eq(agentCarts.idempotencyKey, input.idempotencyKey))
        .limit(1);
      if (existing) {
        return this.formatCart(existing);
      }
    }

    // 2. Resolve listings + validate eligibility
    const listingIds = input.items.map((i) => i.listingId);
    const rows = await this.db
      .select({
        id: listings.id,
        userId: listings.userId,
        title: listings.title,
        price: listings.price,
        currency: listings.currency,
        status: listings.status,
        agentPurchasable: listings.agentPurchasable,
        deletedAt: listings.deletedAt,
      })
      .from(listings)
      .where(and(inArray(listings.id, listingIds), isNull(listings.deletedAt)));

    if (rows.length !== listingIds.length) {
      throw new NotFoundException('One or more listings were not found');
    }

    const ineligible = rows.filter(
      (r) => r.status !== 'active' || !r.agentPurchasable,
    );
    if (ineligible.length > 0) {
      throw new BadRequestException(
        `These listings are not available for agent purchase: ${ineligible
          .map((r) => r.id)
          .join(', ')}`,
      );
    }

    const sellerIds = Array.from(new Set(rows.map((r) => r.userId)));
    const activeSubs = await this.db
      .select({ userId: shopSubscriptions.userId })
      .from(shopSubscriptions)
      .where(
        and(
          inArray(shopSubscriptions.userId, sellerIds),
          eq(shopSubscriptions.status, 'active'),
        ),
      );
    const subSellers = new Set(activeSubs.map((s) => s.userId));
    const sellersWithoutSub = sellerIds.filter((id) => !subSellers.has(id));
    if (sellersWithoutSub.length > 0) {
      throw new BadRequestException(
        'Some sellers do not have an active Shop subscription required for agent purchases',
      );
    }

    const currencies = new Set(rows.map((r) => r.currency));
    if (currencies.size > 1) {
      throw new BadRequestException(
        'All cart items must use the same currency',
      );
    }
    const currency = rows[0].currency;

    const byId = new Map(rows.map((r) => [r.id, r]));
    let total = 0;
    const enriched = input.items.map((i) => {
      const row = byId.get(i.listingId)!;
      if (!Number.isInteger(i.quantity) || i.quantity <= 0) {
        throw new BadRequestException(
          `Invalid quantity for listing ${i.listingId}`,
        );
      }
      const unitPrice = Number(row.price);
      total += unitPrice * i.quantity;
      return {
        listingId: row.id,
        sellerId: row.userId,
        title: row.title,
        unitPrice,
        currency: row.currency,
        quantity: i.quantity,
      };
    });

    // 3. Persist + create MP preference
    try {
      const [cart] = await this.db
        .insert(agentCarts)
        .values({
          buyerEmail: input.buyerEmail,
          status: 'pending_payment',
          totalAmount: total.toFixed(2),
          currency,
          shippingAddress: input.shippingAddress,
          idempotencyKey: input.idempotencyKey ?? null,
        })
        .returning();

      await this.db.insert(agentCartItems).values(
        enriched.map((e) => ({
          cartId: cart.id,
          listingId: e.listingId,
          sellerId: e.sellerId,
          quantity: e.quantity,
          unitPrice: e.unitPrice.toFixed(2),
          currency: e.currency,
          title: e.title,
        })),
      );

      const pref = await this.preference.create({
        body: {
          items: enriched.map((e) => ({
            id: e.listingId,
            title: e.title,
            quantity: e.quantity,
            unit_price: e.unitPrice,
            currency_id: currency,
          })),
          payer: { email: input.buyerEmail },
          external_reference: `agent_cart_${cart.id}`,
          back_urls: {
            success: `${this.backUrl}/agent-cart/success?cart=${cart.id}`,
            failure: `${this.backUrl}/agent-cart/failure?cart=${cart.id}`,
            pending: `${this.backUrl}/agent-cart/pending?cart=${cart.id}`,
          },
          auto_return: 'approved',
          notification_url: `${this.backUrl}/api/v1/agent-cart/webhook`,
        },
      });

      const [updated] = await this.db
        .update(agentCarts)
        .set({
          mpPreferenceId: pref.id ?? null,
          updatedAt: new Date(),
        })
        .where(eq(agentCarts.id, cart.id))
        .returning();

      return this.formatCart(updated, pref.init_point);
    } catch (err) {
      const isUniqueViolation =
        (err as { code?: string }).code === '23505' ||
        ((err as Error).message ?? '').includes('idx_agent_carts_idempotency');
      if (input.idempotencyKey && isUniqueViolation) {
        const [existing] = await this.db
          .select()
          .from(agentCarts)
          .where(eq(agentCarts.idempotencyKey, input.idempotencyKey))
          .limit(1);
        if (existing) return this.formatCart(existing);
      }
      this.logger.error('Failed to create agent cart', err);
      throw err;
    }
  }

  async getCart(id: string) {
    const [cart] = await this.db
      .select()
      .from(agentCarts)
      .where(eq(agentCarts.id, id))
      .limit(1);
    if (!cart) throw new NotFoundException('Cart not found');

    const items = await this.db
      .select()
      .from(agentCartItems)
      .where(eq(agentCartItems.cartId, id));

    return {
      ...this.formatCart(cart),
      items: items.map((i) => ({
        listingId: i.listingId,
        title: i.title,
        unitPrice: i.unitPrice,
        currency: i.currency,
        quantity: i.quantity,
      })),
    };
  }

  async handleWebhook(body: { type?: string; data?: { id?: string | number } }) {
    if (body.type !== 'payment' || !body.data?.id) return;
    let paymentInfo;
    try {
      paymentInfo = await this.payment.get({ id: String(body.data.id) });
    } catch (err) {
      this.logger.warn(`Failed to fetch MP payment ${body.data.id}`, err);
      return;
    }
    const extRef = (paymentInfo as { external_reference?: string })
      .external_reference;
    if (!extRef?.startsWith('agent_cart_')) return;
    const cartId = extRef.replace('agent_cart_', '');

    const status = paymentInfo.status;
    const newStatus: 'paid' | 'failed' | 'cancelled' | 'pending_payment' =
      status === 'approved'
        ? 'paid'
        : status === 'rejected'
          ? 'failed'
          : status === 'cancelled' || status === 'refunded'
            ? 'cancelled'
            : 'pending_payment';

    await this.db
      .update(agentCarts)
      .set({
        status: newStatus,
        mpPaymentId: String(body.data.id),
        paidAt: newStatus === 'paid' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(agentCarts.id, cartId));

    this.logger.log(`Agent cart ${cartId} updated to ${newStatus}`);
  }

  private formatCart(
    cart: typeof agentCarts.$inferSelect,
    initPoint?: string,
  ) {
    return {
      orderId: cart.id,
      status: cart.status,
      totalAmount: cart.totalAmount,
      currency: cart.currency,
      paymentUrl: initPoint ?? null,
      mpPreferenceId: cart.mpPreferenceId,
      createdAt: cart.createdAt,
    };
  }
}
