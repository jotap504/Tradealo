const ROADMAP_DATA = [
  {
    "step": 1,
    "title": "Setup monorepo",
    "description": "Configuración de Turborepo y estructura de carpetas.",
    "tasks": [
      "Inicializar monorepo con pnpm y Turborepo",
      "Configurar apps/api (NestJS) y apps/web (Next.js)",
      "Crear paquetes compartidos (shared-types, shared-utils)",
      "Configurar Docker Compose (PostgreSQL, Redis, ES)",
      "Definir pipelines en turbo.json"
    ]
  },
  {
    "step": 2,
    "title": "Schema de base de datos",
    "description": "Definición de entidades con Drizzle y migraciones.",
    "tasks": [
      "Configurar Drizzle ORM en apps/api",
      "Definir esquemas de Users, Wallets y Listings",
      "Configurar extensión PostGIS en PostgreSQL",
      "Ejecutar pnpm drizzle-kit generate/migrate",
      "Crear factory de conexión a base de datos"
    ]
  },
  {
    "step": 3,
    "title": "Módulo: System Config",
    "description": "Base de configuración dinámica del negocio.",
    "tasks": [
      "Implementar SystemConfigService con caché en Redis",
      "Crear tabla system_configs y su historial",
      "Ejecutar seed inicial de configuraciones",
      "Implementar ConfigGuard para acceso administrativo"
    ]
  },
  {
    "step": 4,
    "title": "Módulo: Auth",
    "description": "Sistema de autenticación y seguridad JWT.",
    "tasks": [
      "Implementar Registro y Login con bcrypt",
      "Configurar Passport JWT y estrategias de guard",
      "Implementar rotación de Refresh Tokens",
      "Integrar envío de email de verificación",
      "Configurar Rate Limiting para endpoints sensibles"
    ]
  },
  {
    "step": 5,
    "title": "Módulo: Users & Profiles",
    "description": "Gestión de perfiles y datos de usuario.",
    "tasks": [
      "Implementar CRUD de perfiles de usuario",
      "Configurar carga de avatares a Cloudflare R2",
      "Implementar lógica de completitud de perfil",
      "Asegurar privacidad de datos sensibles (PII)"
    ]
  },
  {
    "step": 6,
    "title": "Módulo: KYC & Verification",
    "description": "Validación de identidad y niveles de acceso.",
    "tasks": [
      "Implementar flujo de verificación de DNI",
      "Configurar bucket privado en R2 para documentos",
      "Implementar encriptación AES-256 para datos KYC",
      "Lógica de actualización de kycLevel",
      "Integrar validación OTP para teléfono"
    ]
  },
  {
    "step": 7,
    "title": "Módulo: Token Wallet",
    "description": "Sistema de créditos y transacciones internas.",
    "tasks": [
      "Implementar WalletService (credit/debit)",
      "Asegurar transacciones atómicas con Drizzle",
      "Implementar lógica FEFO para expiración de tokens",
      "Registrar historial inmutable en credit_transactions",
      "Validar invariantes de balance >= 0"
    ]
  },
  {
    "step": 8,
    "title": "Módulo: Token Packs & MercadoPago",
    "description": "Pasarela de pagos y compra de créditos.",
    "tasks": [
      "Integrar SDK oficial de MercadoPago",
      "Implementar validación de firma HMAC en webhooks",
      "Gestión de idempotencia con purchase_id",
      "Sistema de promociones y cupones de descuento",
      "Notificar acreditación exitosa"
    ]
  },
  {
    "step": 9,
    "title": "Módulo: Listings",
    "description": "Publicación y gestión de anuncios.",
    "tasks": [
      "Implementar creación de listings con validación KYC2",
      "Cálculo de costos dinámico según duración",
      "Integración con PostGIS para geolocalización",
      "Gestión de imágenes con R2 (presigned URLs)",
      "Sistema de cuotas gratuitas mensuales"
    ]
  },
  {
    "step": 10,
    "title": "Módulo: AI Generation",
    "description": "IA para optimización de anuncios.",
    "tasks": [
      "Integrar API de DeepSeek para generación de texto",
      "Configurar prompts de sistema específicos",
      "Implementar límites diarios por usuario en Redis",
      "Sugerencia inteligente de categorías y atributos"
    ]
  }
];

const MODULES_DATA = [
  {
    "id": "6.1",
    "title": "Configuración del Sistema",
    "responsibility": "Única fuente de verdad para configuración dinámica del negocio.",
    "rules": [
        "TODOS los valores de negocio se leen desde aquí.",
        "Nunca hardcodear valores de negocio.",
        "Usa Redis (TTL 5 min) como caché primario."
    ],
    "contract": "interface IConfigService {\n  get<T>(key: string): Promise<T>\n}",
    "status": "pendiente"
  },
  {
    "id": "6.2",
    "title": "Autenticación",
    "responsibility": "Registro, login, refresh de tokens, logout, verificación de email.",
    "rules": [
        "Email único (409 DUPLICATE_EMAIL).",
        "Rotación obligatoria de Refresh Tokens.",
        "Acreditar tokens de bienvenida tras registro.",
        "Rate limit: 5 intentos fallidos en 15 min."
    ],
    "contract": "POST /auth/register\nPOST /auth/login\nPOST /auth/refresh",
    "status": "pendiente"
  }
];

const IDEAS_DATA = [
  {
    "id": 1,
    "title": "IA de Verificación de Estado (Vision)",
    "author": "Juan Pablo",
    "description": "Usar Qwen-VL para analizar las fotos de los productos y asignar automáticamente un estado (Nuevo, Usado - Como Nuevo, etc.) para evitar estafas.",
    "votes": 15,
    "status": "In Discussion",
    "tags": ["AI", "Security"],
    "comments": [
        "Podríamos integrarlo directamente en el flujo de publicación.",
        "Ahorraría mucho tiempo de moderación manual."
    ]
  },
  {
    "id": 2,
    "title": "Sistema de 'Canje Directo' (Barter)",
    "author": "Equipo Tradealo",
    "description": "Permitir que dos usuarios acuerden un intercambio directo de productos más una diferencia en Tokens si fuera necesario.",
    "votes": 28,
    "status": "Approved",
    "tags": ["Core", "Business"],
    "comments": [
        "Es la esencia del nombre original (Trocalia/Tradealo).",
        "Necesitamos un contrato digital de intercambio seguro."
    ]
  },
  {
    "id": 3,
    "title": "Notificaciones vía WhatsApp Directo",
    "author": "Santi",
    "description": "Integrar un bot que avise al vendedor por WhatsApp cuando alguien está interesado, sin que tenga que entrar a la web.",
    "votes": 42,
    "status": "In Progress",
    "tags": ["UX", "Notifications"],
    "comments": [
        "OneSignal ya lo soporta, pero WhatsApp es más directo en Argentina."
    ]
  }
];

const RULES_DATA = [
    { id: "001", title: "Propiedad de Datos", desc: "Nunca exponer datos de un usuario a otro sin verificar ownership." },
    { id: "002", title: "Balance No Negativo", desc: "Nunca permitir balance negativo en el wallet." },
    { id: "003", title: "Protección PII", desc: "Nunca guardar PII (DNI, fotos de documentos) en texto plano." },
    { id: "004", title: "Sin Hardcoding", desc: "Nunca hardcodear 'AR', 'ARS' o '+54' — usar constantes." },
    { id: "005", title: "Where Obligatorio", desc: "Nunca hacer SELECT sin WHERE en tablas sensibles." },
    { id: "006", title: "Paginación por Cursor", desc: "Nunca usar OFFSET para paginación — usar cursor-based siempre." },
    { id: "007", title: "Logs Sanitizados", desc: "Nunca loguear passwords, tokens, DNI o emails completos." },
    { id: "008", title: "Validación HMAC", desc: "Nunca procesar un webhook de pago sin validar su firma HMAC." },
    { id: "009", title: "Integridad del Wallet", desc: "Nunca modificar el wallet sin generar un credit_transaction." },
    { id: "010", title: "Servicio de Config", desc: "Nunca leer system_config de la DB directamente — usar ConfigService." }
];

function init() {
    const roadmapContainer = document.getElementById('roadmap-container');
    const rulesContainer = document.getElementById('rules-container');
    const modulesContainer = document.getElementById('modules-container');
    const ideasContainer = document.getElementById('ideas-container');
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    const viewTitle = document.getElementById('view-title');

    // Inject Roadmap
    ROADMAP_DATA.forEach(item => {
        const card = document.createElement('div');
        card.className = 'step-card';
        card.innerHTML = `
            <span class="step-num">PASO ${String(item.step).padStart(2, '0')}</span>
            <div class="step-status ${item.step === 1 ? 'current' : ''}"></div>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            <div class="step-tasks hidden">
                <ul>
                    ${item.tasks.map(t => `<li>${t}</li>`).join('')}
                </ul>
            </div>
        `;
        card.addEventListener('click', () => {
            const tasks = card.querySelector('.step-tasks');
            tasks.classList.toggle('hidden');
        });
        roadmapContainer.appendChild(card);
    });

    // Inject Modules
    MODULES_DATA.forEach(mod => {
        const item = document.createElement('div');
        item.className = 'module-item';
        item.innerHTML = `
            <div class="module-header">
                <h3>${mod.id} - ${mod.title}</h3>
                <span class="badge">${mod.status}</span>
            </div>
            <div class="module-content">
                <p><strong>Responsabilidad:</strong> ${mod.responsibility}</p>
                <ul class="module-rules">
                    ${mod.rules.map(r => `<li>${r}</li>`).join('')}
                </ul>
                ${mod.contract ? `<div class="code-block"><pre>${mod.contract}</pre></div>` : ''}
            </div>
        `;
        modulesContainer.appendChild(item);
    });

    // Inject Rules
    RULES_DATA.forEach(rule => {
        const card = document.createElement('div');
        card.className = 'rule-card';
        card.innerHTML = `
            <h3><span class="rule-num">${rule.id}</span> ${rule.title}</h3>
            <p>${rule.desc}</p>
        `;
        rulesContainer.appendChild(card);
    });

    // Idea Rendering Helper
    function createIdeaCard(idea) {
        const card = document.createElement('div');
        card.className = 'idea-card new-idea-anim';
        card.innerHTML = `
            <div class="idea-header">
                <div class="idea-status-tag">${idea.status || 'Nueva'}</div>
                <div class="idea-votes">
                    <button class="btn-vote">🔥</button>
                    <span class="vote-count">${idea.votes || 1}</span>
                </div>
            </div>
            <h3>${idea.title}</h3>
            <p class="idea-desc">${idea.description}</p>
            <div class="idea-author">Por: <strong>${idea.author || 'Tú (Local)'}</strong></div>
            <div class="idea-tags">
                ${(idea.tags || ['UserFeedback']).map(tag => `<span class="tag">#${tag}</span>`).join('')}
            </div>
            <div class="idea-comments">
                <h4>Comentarios / Sub-ideas:</h4>
                <ul>
                    ${(idea.comments || ['Esperando feedback del equipo...']).map(c => `<li>${c}</li>`).join('')}
                </ul>
            </div>
        `;

        const voteBtn = card.querySelector('.btn-vote');
        voteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const countSpan = card.querySelector('.vote-count');
            let currentVotes = parseInt(countSpan.textContent);
            countSpan.textContent = currentVotes + 1;
            voteBtn.style.transform = 'scale(1.5)';
            setTimeout(() => voteBtn.style.transform = 'scale(1)', 200);
        });

        return card;
    }

    // Load and Inject Ideas
    function renderIdeas() {
        ideasContainer.innerHTML = '';
        let localIdeas = [];
        try {
            localIdeas = JSON.parse(localStorage.getItem('tradealo_local_ideas') || '[]');
        } catch (e) {
            console.error("LocalStorage blocked or corrupted", e);
        }
        
        // Combined list: local ideas first (newest first), then official ones
        const allIdeas = [...localIdeas].reverse().concat(IDEAS_DATA);
        allIdeas.forEach(idea => {
            ideasContainer.appendChild(createIdeaCard(idea));
        });
    }

    renderIdeas();

    const ideaModal = document.getElementById('idea-modal');
    const ideaTextarea = document.getElementById('idea-textarea');

    document.getElementById('btn-new-idea').addEventListener('click', () => {
        ideaModal.classList.add('active');
        ideaTextarea.focus();
    });

    const closeModal = () => {
        ideaModal.classList.remove('active');
        ideaTextarea.value = '';
    };

    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('btn-cancel').addEventListener('click', closeModal);

    document.getElementById('btn-submit-idea').addEventListener('click', () => {
        const text = ideaTextarea.value.trim();
        if (text) {
            const newIdea = {
                id: Date.now(),
                title: text.split('\n')[0].substring(0, 50),
                description: text,
                author: "Tú",
                votes: 1,
                status: "Nueva",
                tags: ["Comunidad"],
                comments: ["¡Gracias por tu propuesta! La revisaremos pronto."]
            };

            // Local State Update
            try {
                const currentLocal = JSON.parse(localStorage.getItem('tradealo_local_ideas') || '[]');
                currentLocal.push(newIdea);
                localStorage.setItem('tradealo_local_ideas', JSON.stringify(currentLocal));
            } catch (e) {
                console.warn("Could not save idea to localStorage", e);
            }

            // UI Update: Re-render all to ensure order
            renderIdeas();
            
            closeModal();
            
            // Scroll to the newest idea
            ideasContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            alert("Por favor, escribe tu idea antes de enviar.");
        }
    });

    // Navigation Logic
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('sidebar-toggle');

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
        toggleBtn.classList.toggle('active');
    }

    toggleBtn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetView = item.getAttribute('data-view');
            
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            views.forEach(v => v.classList.add('hidden'));
            document.getElementById(`${targetView}-view`).classList.remove('hidden');
            
            viewTitle.textContent = item.textContent;

            // Close sidebar on mobile after selection
            if (window.innerWidth <= 991) {
                toggleSidebar();
            }
        });
    });

    // Copy Utility
    document.querySelectorAll('.btn-copy, #copy-sdd').forEach(btn => {
        btn.addEventListener('click', () => {
            let text = "";
            if (btn.id === 'copy-sdd') {
                text = "Actúa como un experto desarrollador de NestJS/Next.js. El SDD de Tradealo es nuestra única fuente de verdad.";
            } else {
                text = btn.previousElementSibling.textContent;
            }
            navigator.clipboard.writeText(text);
            const originalText = btn.textContent;
            btn.textContent = 'Copiado!';
            setTimeout(() => btn.textContent = originalText, 2000);
        });
    });
}

document.addEventListener('DOMContentLoaded', init);
