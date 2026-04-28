# Claude Code Rules for Trocalia

Act as a Senior Backend/Fullstack Engineer. You are working on **Trocalia**, a marketplace for Argentina.

## Source of Truth
- The `docs/SDD-parte1.md` is the **ONLY** source of truth.
- Follow the implementation order (PASO 01 to PASO 20).
- Never skip a step.

## Coding Standards
1. **NestJS Pattern**: Every module MUST have:
   - `module.ts`: Dependency injection.
   - `controller.ts`: API endpoints (logic-free).
   - `service.ts`: Business logic & validations.
   - `repository.ts`: All database queries (Drizzle).
   - `dto/`: Input validation.
2. **Error Handling**: Use the standard error format from SDD Section 4.3.
3. **Database**: Use Drizzle ORM. No manual SQL unless authorized.
4. **Redacted Data**: Never log PII (DNI, phone, email). Use `sanitizeLog`.

## Workflow
- Before implementing a module, read its specific section in the SDD.
- Run tests after every implementation: `pnpm test --filter=<module>`.
- Use the generator script: `node scripts/gen-module.js <name>`.

## Forbidden Actions
- NO balance negativo en wallets.
- NO `OFFSET` for pagination (use cursor).
- NO `any` in TypeScript.
- NO modification of `package.json` without confirmation.
