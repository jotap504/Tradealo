export const CONFIG_SEED = [
  // ─── TOKENS: recompensas ────────────────────────────────────────────────────
  { key: 'tokens.reward.registration',    category: 'tokens_rewards', label: 'Tokens al registrarse',              dataType: 'integer', value: 5,              defaultValue: 5,              unit: 'tokens',        isPublic: false, validation: { min: 0, max: 100 } },
  { key: 'tokens.reward.kyc.phone',       category: 'tokens_rewards', label: 'Tokens por verificar teléfono',      dataType: 'integer', value: 3,              defaultValue: 3,              unit: 'tokens',        isPublic: false, validation: { min: 0, max: 100 } },
  { key: 'tokens.reward.kyc.dni',         category: 'tokens_rewards', label: 'Tokens por verificar DNI',           dataType: 'integer', value: 15,             defaultValue: 15,             unit: 'tokens',        isPublic: false, validation: { min: 0, max: 200 } },
  { key: 'tokens.reward.kyc.address',     category: 'tokens_rewards', label: 'Tokens por verificar domicilio',     dataType: 'integer', value: 10,             defaultValue: 10,             unit: 'tokens',        isPublic: false, validation: { min: 0, max: 200 } },
  { key: 'tokens.reward.kyc.selfie',      category: 'tokens_rewards', label: 'Tokens por selfie verificada',       dataType: 'integer', value: 10,             defaultValue: 10,             unit: 'tokens',        isPublic: false, validation: { min: 0, max: 200 } },
  { key: 'tokens.reward.first_sale',      category: 'tokens_rewards', label: 'Tokens por primera venta',           dataType: 'integer', value: 5,              defaultValue: 5,              unit: 'tokens',        isPublic: false, validation: { min: 0, max: 100 } },
  { key: 'tokens.reward.referral.signup', category: 'tokens_rewards', label: 'Tokens por referido registrado',     dataType: 'integer', value: 5,              defaultValue: 5,              unit: 'tokens',        isPublic: false, validation: { min: 0, max: 100 } },
  { key: 'tokens.reward.review_given',    category: 'tokens_rewards', label: 'Tokens por dejar una reseña',        dataType: 'integer', value: 1,              defaultValue: 1,              unit: 'tokens',        isPublic: false, validation: { min: 0, max: 20  } },

  // ─── TOKENS: cuotas gratuitas ───────────────────────────────────────────────
  { key: 'tokens.quota.monthly',          category: 'tokens_quota',   label: 'Publicaciones gratis por mes',       dataType: 'integer', value: 5,              defaultValue: 5,              unit: 'publicaciones', isPublic: false, validation: { min: 0, max: 50 } },
  { key: 'tokens.quota.on_registration',  category: 'tokens_quota',   label: 'Publicaciones gratis al inicio',     dataType: 'integer', value: 3,              defaultValue: 3,              unit: 'publicaciones', isPublic: false, validation: { min: 0, max: 20 } },

  // ─── TOKENS: vencimiento ───────────────────────────────────────────────────
  { key: 'tokens.expiry.days',            category: 'tokens_quota',   label: 'Días hasta vencimiento de tokens comprados', dataType: 'integer', value: 365, defaultValue: 365,            unit: 'días',          isPublic: false, validation: { min: 30, max: 730 } },

  // ─── LISTINGS: costos ──────────────────────────────────────────────────────
  { key: 'listing.cost.standard',         category: 'listing_costs',  label: 'Tokens: publicación standard',       dataType: 'integer', value: 2,              defaultValue: 2,              unit: 'tokens',        isPublic: true,  validation: { min: 0, max: 100 } },
  { key: 'listing.cost.premium',          category: 'listing_costs',  label: 'Tokens: publicación premium',        dataType: 'integer', value: 5,              defaultValue: 5,              unit: 'tokens',        isPublic: true,  validation: { min: 0, max: 100 } },
  { key: 'listing.cost.collectible',      category: 'listing_costs',  label: 'Tokens: publicación coleccionable',  dataType: 'integer', value: 3,              defaultValue: 3,              unit: 'tokens',        isPublic: true,  validation: { min: 0, max: 100 } },
  { key: 'listing.cost.renewal_pct',      category: 'listing_costs',  label: '% descuento al renovar',             dataType: 'integer', value: 50,             defaultValue: 50,             unit: '%',             isPublic: false, validation: { min: 0, max: 100 } },

  // ─── LISTINGS: duración ────────────────────────────────────────────────────
  { key: 'listing.duration.available',    category: 'listing_duration', label: 'Duraciones disponibles (días)',    dataType: 'json',    value: [30,60,90],     defaultValue: [30,60,90],     unit: null,            isPublic: true,  validation: null },
  { key: 'listing.duration.default',      category: 'listing_duration', label: 'Duración por defecto (días)',      dataType: 'integer', value: 30,             defaultValue: 30,             unit: 'días',          isPublic: false, validation: { min: 1, max: 365 } },
  { key: 'listing.duration.multiplier.30', category: 'listing_duration', label: 'Multiplicador 30 días',           dataType: 'decimal', value: 1.0,            defaultValue: 1.0,            unit: null,            isPublic: false, validation: { min: 0.1, max: 10 } },
  { key: 'listing.duration.multiplier.60', category: 'listing_duration', label: 'Multiplicador 60 días',           dataType: 'decimal', value: 1.5,            defaultValue: 1.5,            unit: null,            isPublic: false, validation: { min: 0.1, max: 10 } },
  { key: 'listing.duration.multiplier.90', category: 'listing_duration', label: 'Multiplicador 90 días',           dataType: 'decimal', value: 1.8,            defaultValue: 1.8,            unit: null,            isPublic: false, validation: { min: 0.1, max: 10 } },
  { key: 'listing.duration.warning_days', category: 'listing_duration', label: 'Días previos para avisar vencimiento', dataType: 'integer', value: 5,           defaultValue: 5,              unit: 'días',          isPublic: false, validation: { min: 1, max: 30 } },

  // ─── IA ────────────────────────────────────────────────────────────────────
  { key: 'ai.text.enabled',               category: 'ai',             label: 'IA generación de texto activa',      dataType: 'boolean', value: true,           defaultValue: true,           unit: null,            isPublic: false, validation: null },
  { key: 'ai.text.provider',              category: 'ai',             label: 'Proveedor IA texto',                 dataType: 'select',  value: 'deepseek',     defaultValue: 'deepseek',     unit: null,            isPublic: false, validation: { options: ['deepseek','qwen'] } },
  { key: 'ai.text.model',                 category: 'ai',             label: 'Modelo IA texto',                    dataType: 'string',  value: 'deepseek-chat',defaultValue: 'deepseek-chat',unit: null,            isPublic: false, validation: null },
  { key: 'ai.daily_limit_per_user',       category: 'ai',             label: 'Generaciones IA por día/usuario',    dataType: 'integer', value: 10,             defaultValue: 10,             unit: 'generaciones',  isPublic: false, validation: { min: 0, max: 100 } },

  // ─── FEATURE FLAGS ─────────────────────────────────────────────────────────
  { key: 'features.premium_listings',     category: 'features',       label: 'Publicaciones premium activas',      dataType: 'boolean', value: true,           defaultValue: true,           unit: null,            isPublic: false, validation: null },
  { key: 'features.collectibles',         category: 'features',       label: 'Coleccionables activos',             dataType: 'boolean', value: true,           defaultValue: true,           unit: null,            isPublic: false, validation: null },
  { key: 'features.ai_generation',        category: 'features',       label: 'Generación IA activa',               dataType: 'boolean', value: true,           defaultValue: true,           unit: null,            isPublic: false, validation: null },
  { key: 'features.new_registrations',    category: 'features',       label: 'Nuevos registros permitidos',        dataType: 'boolean', value: true,           defaultValue: true,           unit: null,            isPublic: false, validation: null },
  { key: 'features.maintenance_mode',     category: 'features',       label: 'Modo mantenimiento',                 dataType: 'boolean', value: false,          defaultValue: false,          unit: null,            isPublic: true,  validation: null },

  // ─── MODERACIÓN ────────────────────────────────────────────────────────────
  { key: 'moderation.auto_approve_verified',   category: 'moderation', label: 'Auto-aprobar listings de usuarios verificados', dataType: 'boolean', value: true, defaultValue: true, unit: null, isPublic: false, validation: null },
  { key: 'moderation.risk_score_auto_reject',  category: 'moderation', label: 'Score de riesgo para rechazo automático',       dataType: 'integer', value: 80,   defaultValue: 80,   unit: 'pts',isPublic: false, validation: { min: 0, max: 100 } },
  { key: 'moderation.risk_score_manual_review',category: 'moderation', label: 'Score de riesgo para revisión manual',          dataType: 'integer', value: 40,   defaultValue: 40,   unit: 'pts',isPublic: false, validation: { min: 0, max: 100 } },
] as const
