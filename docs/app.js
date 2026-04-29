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

const IDEAS_DATA = [];

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

    // Google Sheet Backend Configuration
    const SHEET_URL = "https://script.google.com/macros/s/AKfycbxrIiR5ExeBNIrTEkA2W69e2_4lFQ9rIwD1YXoZ8MwMI6VnPjRxKRb8V5CuCDMBl5UO/exec";

    async function fetchSheetIdeas() {
        try {
            console.log("Iniciando fetch de ideas desde:", SHEET_URL);
            const response = await fetch(`${SHEET_URL}?action=get`, {
                method: 'GET',
                mode: 'cors',
                redirect: 'follow'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Datos recibidos de Google Sheet:", data);
            
            // Si data es un objeto con una propiedad ideas o similar, ajustarlo
            const ideas = Array.isArray(data) ? data : (data.ideas || []);
            
            return ideas.map(idea => ({
                id: idea.id || Math.random(),
                title: idea.title || idea.Title || "Sin título",
                description: idea.description || idea.Description || "Sin descripción",
                author: idea.author || idea.Author || "Anónimo",
                votes: parseInt(idea.votes || idea.Votes || 0),
                status: idea.status || idea.Status || "Nueva",
                estimate: idea.estimate || idea.Estimate || "",
                comments_count: idea.comments_count || 0
            }));
        } catch (e) {
            console.error("Error detallado al obtener ideas:", e);
            return [];
        }
    }

    // Idea Rendering Helper (Google Sheet version)
    function createIdeaCard(idea) {
        const card = document.createElement('div');
        card.className = 'idea-card';
        
        // Formatear comentarios con un renglón de por medio
        const commentsHtml = (idea.comments || [])
            .map(c => `<div class="simple-comment">${c}</div>`)
            .join('<div class="comment-spacer"></div>');

        card.innerHTML = `
            <div class="idea-header">
                <div class="idea-status-tag">${idea.status}</div>
                <div class="idea-votes">
                    <button class="btn-vote">🔥</button>
                    <span class="vote-count">${idea.votes}</span>
                </div>
            </div>
            ${idea.estimate ? `<div class="idea-estimate-tag">Estimación: ${idea.estimate}</div>` : ''}
            <h3>${idea.title}</h3>
            <p class="idea-desc">${idea.description}</p>
            <div class="idea-author">Propuesta por: <strong>@${idea.author}</strong></div>
            
            <div class="idea-footer-simple">
                <div class="simple-comments-container">
                    ${commentsHtml || '<p class="no-comments-text">Sin comentarios aún...</p>'}
                </div>
                <div class="simple-input-group">
                    <input type="text" class="inline-comment-input" placeholder="Escribe un comentario y presiona Enter..." 
                        onkeydown="if(event.key === 'Enter') window.submitSimpleComment('${idea.id}', this.value)">
                </div>
            </div>
        `;
        // Vote handling
        const voteBtn = card.querySelector('.btn-vote');
        voteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await fetch(SHEET_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ action: 'vote', id: idea.id })
                });
                renderIdeas();
            } catch (err) {
                console.error('Voting error', err);
            }
        });
        return card;
    }

    window.submitSimpleComment = async (ideaId, comment) => {
        if (!comment.trim()) return;
        try {
            await fetch(SHEET_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'addComment', ideaId, comment })
            });
            alert('Comentario agregado!');
            renderIdeas();
        } catch (e) {
            console.error("Error adding comment", e);
        }
    };

    async function renderIdeas() {
        ideasContainer.innerHTML = '<div class="loading">Sincronizando con Google Sheet…</div>';
        const sheetIdeas = await fetchSheetIdeas();
        ideasContainer.innerHTML = '';
        if (sheetIdeas.length === 0) {
            ideasContainer.innerHTML = '<p class="no-ideas">No hay ideas publicadas aún. ¡Sé el primero!</p>';
            return;
        }
        // Sort by votes descending
        sheetIdeas.sort((a, b) => b.votes - a.votes);
        sheetIdeas.forEach(idea => {
            ideasContainer.appendChild(createIdeaCard(idea));
        });
    }

    renderIdeas();

    const ideaModal = document.getElementById('idea-modal');
    const ideaTitleInput = document.getElementById('idea-title');
    const ideaDescInput = document.getElementById('idea-description');
    const ideaEstimateInput = document.getElementById('idea-estimate');

    document.getElementById('btn-new-idea').addEventListener('click', () => {
        ideaModal.classList.add('active');
        ideaTitleInput.focus();
    });

    const closeModal = () => {
        ideaModal.classList.remove('active');
        ideaTitleInput.value = '';
        ideaDescInput.value = '';
        ideaEstimateInput.value = '';
    };

    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('btn-cancel').addEventListener('click', closeModal);

    document.getElementById('btn-submit-idea').addEventListener('click', async () => {
        const title = ideaTitleInput.value.trim();
        const desc = ideaDescInput.value.trim();
        const estimate = ideaEstimateInput.value.trim();
        if (title && desc) {
            try {
                await fetch(SHEET_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ action: 'add', title, description: desc, estimate })
                });
                closeModal();
                alert('Idea enviada! Sincronizando con la hoja de cálculo...');
                // Pequeño delay para que GAS termine de procesar antes de re-consultar
                setTimeout(renderIdeas, 1500);
            } catch (e) {
                console.error('Error adding idea', e);
                alert('No se pudo guardar la idea.');
            }
        } else {
            alert('Por favor, completa al menos el título y la descripción.');
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
