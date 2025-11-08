/*
 * ARQUIVO: ui.js
 * -----------------
 * Lógica de Renderização e Componentes da Interface.
 */

let appWrapper, appContainer, toastContainer, modalContainer;

// Expõe funções globais para uso no app.js
window.initUI = initUI;
window.render = render;
window.showToast = showToast;
window.closeModal = closeModal;
window.renderClienteModal = renderClienteModal;
window.renderInstalacaoModal = renderInstalacaoModal;
window.renderImportarModal = renderImportarModal;
window.renderExcluirCentralModal = renderExcluirCentralModal;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;

/**
 * Inicializa e armazena as referências do DOM.
 */
function initUI(wrapper, container, toast, modal) {
    appWrapper = wrapper;
    appContainer = container;
    toastContainer = toast;
    modalContainer = modal;
    
    // Configuração inicial do tema
    setupTheme();
}

/**
 * Define o tema (Claro/Escuro) na tag <html>.
 */
function setupTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
}

/**
 * Função principal de renderização.
 */
function render(state, filters, currentTab, fullRender = false) {
    // 1. Renderiza a estrutura estática (Header e Nav) se for o primeiro render
    if (fullRender) {
        appContainer.innerHTML = renderAppStructure(currentTab);
        setupTheme(); // Re-aplica o tema após renderizar
    }

    // 2. Renderiza o conteúdo da aba principal
    const mainContentEl = document.getElementById('main-content');
    if (mainContentEl) {
        switch (currentTab) {
            case 'dashboard':
                mainContentEl.innerHTML = renderDashboardTab(state, filters);
                // Inicializa o gráfico após a renderização do DOM
                initializeChart(state);
                break;
            case 'clients':
                mainContentEl.innerHTML = renderClientsTab(state, filters);
                break;
            case 'settings':
                mainContentEl.innerHTML = renderSettingsTab(state);
                break;
            default:
                mainContentEl.innerHTML = renderDashboardTab(state, filters);
                initializeChart(state);
        }
    }
    
    // 3. Atualiza o estado da navegação (apenas a classe 'active')
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === currentTab);
    });
}

/* =========================================== */
/* ESTRUTURA BASE E UTILITÁRIOS        */
/* =========================================== */

/**
 * Renderiza o Header e a Navegação (Estrutura Estática)
 */
function renderAppStructure(currentTab) {
    const isDark = (localStorage.getItem('theme') || 'dark') === 'dark';
    const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    
    const navButtons = [
        { id: 'dashboard', label: 'Dashboard', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v7"/></svg>`},
        { id: 'clients', label: 'Clientes', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`},
        { id: 'settings', label: 'Configurações', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1.51-1V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`}
    ];

    const navHtml = navButtons.map(btn => `
        <button class="tab-button ${btn.id === currentTab ? 'active' : ''}" data-tab="${btn.id}">
            ${btn.icon}
            <span>${btn.label}</span>
        </button>
    `).join('');

    return `
        <header>
            <h1 class="app-title">CONNECT VALE</h1>
            <button id="theme-switcher" class="theme-switcher" title="Alternar Tema">
                ${isDark ? sunIcon : moonIcon}
            </button>
        </header>
        <nav class="tabs">
            ${navHtml}
        </nav>
        <main id="main-content"></main>
    `;
}

/**
 * Formata um valor numérico para moeda BRL.
 */
function formatCurrency(value) {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/**
 * Formata uma string de data ISO 8601 para DD/MM/AAAA.
 */
function formatDate(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString('pt-BR');
    } catch {
        return 'Data inválida';
    }
}

/**
 * Exibe uma notificação Toast.
 */
function showToast(message, type = 'success', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    
    // Adiciona o ícone de fechamento
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-action';
    closeBtn.innerHTML = 'X';
    closeBtn.onclick = () => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); };
    toast.appendChild(closeBtn);

    toastContainer.appendChild(toast);
    
    // Mostra o toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Esconde o toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500); 
    }, duration);
}

/**
 * Fecha o modal atual.
 */
async function closeModal(onComplete) {
    const overlay = modalContainer.querySelector('.modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        // Espera a transição acabar antes de remover o conteúdo
        await new Promise(resolve => setTimeout(resolve, 300)); 
        modalContainer.innerHTML = '';
        if (onComplete) {
            await onComplete();
        }
    }
}

/**
 * Abre o modal com o conteúdo fornecido.
 */
function openModal(contentHtml) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
        <div class="modal-content" onclick="event.stopPropagation()">
            ${contentHtml}
        </div>
    `;
    modalContainer.innerHTML = ''; // Limpa antes de adicionar
    modalContainer.appendChild(overlay);
}

/* =========================================== */
/* RENDERIZAÇÃO DE ABAS          */
/* =========================================== */

/**
 * Renderiza a Aba Dashboard (KPIs + Financeiro)
 */
function renderDashboardTab(state, filters) {
    const { clients, installations, consts } = state;
    const { totalGeral, validInstallations, totaisPorPagamento, totaisPorCentral, ultimasInstalacoes } = getDashboardData(clients, installations);

    // 1. FILTRAGEM FINANCEIRA
    const filteredInstallations = validInstallations.filter(i => {
        const centralMatch = (filters.filterFinanceiroCentral === 'todos') || (i.central === filters.filterFinanceiroCentral);
        const pagamentoMatch = (filters.filterFinanceiroPagamento === 'todos') || (i.t1 === filters.filterFinanceiroPagamento || i.t2 === filters.filterFinanceiroPagamento);
        const planoMatch = (filters.filterFinanceiroPlano === 'todos') || (i.plano === filters.filterFinanceiroPlano);
        const vencMatch = (filters.filterFinanceiroVencimento === 'todos') || (i.venc === filters.filterFinanceiroVencimento);
        return centralMatch && pagamentoMatch && planoMatch && vencMatch;
    });
    
    const filteredTotal = filteredInstallations.reduce((acc, i) => acc + (i.total || 0), 0);

    // 2. CONTEÚDO DOS KPIs
    const kpiHtml = `
        <div class="dashboard-grid">
            <div class="stat-card">
                <h3>TOTAL GERAL DE ARRECADAÇÃO</h3>
                <p>${formatCurrency(totalGeral)}</p>
                <span class="details">Desde o início dos registros</span>
            </div>
            <div class="stat-card warning">
                <h3>Instalações Não-Instaladas</h3>
                <p>${clients.filter(c => c.status === 'nao-instalado').length}</p>
                <span class="details">Clientes aguardando instalação.</span>
            </div>
            <div class="stat-card danger">
                <h3>Clientes Cancelados</h3>
                <p>${clients.filter(c => c.status === 'cancelado').length}</p>
                <span class="details">Clientes inativos ou cancelados.</span>
            </div>
            <div class="stat-card">
                <h3>Arrecadação Filtrada</h3>
                <p>${formatCurrency(filteredTotal)}</p>
                <span class="details">Baseado nos filtros abaixo.</span>
            </div>
        </div>
    `;
    
    // 3. FILTROS E RELATÓRIOS
    const filterOptions = (options, currentFilter) => 
        `<option value="todos">Todos</option>` + 
        options.map(opt => 
            `<option value="${opt}" ${opt === currentFilter ? 'selected' : ''}>${opt}</option>`
        ).join('');

    const filterHtml = `
        <div class="card">
            <h2 class="card-title">Filtros de Instalações e Relatórios</h2>
            <div class="filters">
                <div class="form-group">
                    <label for="filtro-fin-central">Central</label>
                    <select id="filtro-fin-central" class="form-control">
                        ${filterOptions(consts.DEFAULT_CENTRAIS, filters.filterFinanceiroCentral)}
                    </select>
                </div>
                <div class="form-group">
                    <label for="filtro-fin-pagamento">Forma de Pagamento</label>
                    <select id="filtro-fin-pagamento" class="form-control">
                        ${filterOptions(consts.PAGAMENTOS, filters.filterFinanceiroPagamento)}
                    </select>
                </div>
                <div class="form-group">
                    <label for="filtro-fin-plano">Plano</label>
                    <select id="filtro-fin-plano" class="form-control">
                        ${filterOptions(Object.keys(consts.PLANOS), filters.filterFinanceiroPlano)}
                    </select>
                </div>
                <div class="form-group">
                    <label for="filtro-fin-vencimento">Vencimento</label>
                    <select id="filtro-fin-vencimento" class="form-control">
                        ${filterOptions(consts.VENCIMENTOS.sort((a,b) => a-b), filters.filterFinanceiroVencimento)}
                    </select>
                </div>
                <div class="btn-group">
                    <button id="export-pdf" class="btn btn-primary">Exportar PDF</button>
                    <button id="export-excel" class="btn btn-secondary">Exportar Excel</button>
                </div>
            </div>
        </div>
    `;

    // 4. GRÁFICOS E ÚLTIMAS INSTALAÇÕES
    const chartHtml = `
        <div class="dashboard-layout">
            <div class="card">
                <h2 class="card-title">Distribuição por Central</h2>
                <div class="chart-container">
                    <canvas id="centralChart"></canvas>
                </div>
            </div>
            <div class="card">
                <h2 class="card-title">Últimas 5 Instalações</h2>
                ${ultimasInstalacoes.map(i => `
                    <div class="list-item">
                        <span>${i.nome} - ${i.central}</span>
                        <strong>${formatCurrency(i.total)}</strong>
                    </div>
                `).join('')}
                ${ultimasInstalacoes.length === 0 ? '<p>Nenhuma instalação registrada recentemente.</p>' : ''}
            </div>
        </div>
    `;

    return kpiHtml + filterHtml + chartHtml;
}

/**
 * Inicializa e renderiza o Chart.js.
 */
function initializeChart(state) {
    const { totaisPorCentral } = getDashboardData(state.clients, state.installations);
    const chartData = {
        labels: Object.keys(totaisPorCentral),
        datasets: [{
            label: 'Arrecadação por Central',
            data: Object.values(totaisPorCentral),
            backgroundColor: [
                '#005a9e', '#059669', '#f0ad4e', '#d9534f', '#6c757d', '#17a2b8', '#ffc107', '#28a745'
            ],
        }]
    };
    
    // Destroi o gráfico anterior se existir
    if (window.myChart) {
        window.myChart.destroy();
    }

    const ctx = document.getElementById('centralChart')?.getContext('2d');
    if (ctx) {
        window.myChart = new window.Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: document.documentElement.classList.contains('dark') ? '#f2f2f7' : '#212529'
                        }
                    }
                }
            }
        });
    }
}

/**
 * Renderiza a Aba Clientes (Lista + Paginação)
 */
function renderClientsTab(state, filters) {
    const { clients, consts } = state;
    
    // 1. APLICAÇÃO DOS FILTROS
    const filteredClients = clients.filter(c => {
        const nomeMatch = c.nome.toLowerCase().includes(filters.filterClienteText.toLowerCase());
        const centralMatch = (filters.filterClienteCentral === 'todos') || (c.central === filters.filterClienteCentral);
        const vencMatch = (filters.filterClienteVencimento === 'todos') || (c.venc == filters.filterClienteVencimento);
        return nomeMatch && centralMatch && vencMatch && c.status !== 'cancelado';
    });
    
    // 2. PAGINAÇÃO
    const totalClients = filteredClients.length;
    const totalPages = Math.ceil(totalClients / window.clientsPerPage);
    const start = (window.currentClientPage - 1) * window.clientsPerPage;
    const end = start + window.clientsPerPage;
    const paginatedClients = filteredClients.slice(start, end);
    
    // 3. FILTROS E BOTÕES
    const filterOptions = (options, currentFilter) => 
        `<option value="todos">Todos</option>` + 
        options.map(opt => 
            `<option value="${opt}" ${opt == currentFilter ? 'selected' : ''}>${opt}</option>`
        ).join('');
        
    const filterHtml = `
        <div class="card">
            <h2 class="card-title">Filtros de Clientes</h2>
            <div class="filters">
                <div class="form-group">
                    <label for="filtro-cliente">Buscar por Nome</label>
                    <input type="text" id="filtro-cliente" value="${filters.filterClienteText}" placeholder="Digite o nome do cliente">
                </div>
                <div class="form-group">
                    <label for="filtro-cliente-central">Central</label>
                    <select id="filtro-cliente-central" class="form-control">
                        ${filterOptions(consts.DEFAULT_CENTRAIS, filters.filterClienteCentral)}
                    </select>
                </div>
                <div class="form-group">
                    <label for="filtro-cliente-vencimento">Vencimento</label>
                    <select id="filtro-cliente-vencimento" class="form-control">
                        ${filterOptions(consts.VENCIMENTOS.sort((a,b) => a-b), filters.filterClienteVencimento)}
                    </select>
                </div>
            </div>
            <div class="btn-group" style="margin-top: 1rem;">
                <button id="btn-novo-cliente" class="btn btn-primary">Novo Cliente</button>
                <button id="btn-importar-clientes" class="btn btn-secondary">Importar Clientes</button>
            </div>
        </div>
    `;

    // 4. TABELA E PAGINAÇÃO
    const tableHtml = `
        <div class="card">
            <h2 class="card-title">Lista de Clientes (${totalClients})</h2>
            <div class="responsive-table">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Central</th>
                            <th>Plano</th>
                            <th>Venc.</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedClients.map(c => `
                            <tr>
                                <td>${c.nome}</td>
                                <td>${c.central}</td>
                                <td>${consts.PLANOS[c.plano] || 'N/A'}</td>
                                <td>${c.venc}</td>
                                <td><span class="status-badge status-${c.status}">${consts.STATUS[c.status]}</span></td>
                                <td>
                                    <div class="btn-group">
                                        <button class="btn btn-primary" data-action="editar" data-id="${c.id}" title="Editar Cliente">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                        </button>
                                        <button class="btn ${c.status === 'instalado' ? 'btn-secondary' : 'btn-warning'}" 
                                                data-action="${c.status === 'instalado' ? 'abrir-instalacao-cliente' : 'instalar'}" 
                                                data-id="${c.id}" 
                                                title="${c.status === 'instalado' ? 'Ver Instalação' : 'Registrar Instalação'}">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                                <polyline points="22 4 12 14.01 9 11.01"/>
                                            </svg>
                                        </button>
                                        <button class="btn btn-danger" data-action="cancelar" data-id="${c.id}" title="Cancelar Cliente">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- PAGINAÇÃO -->
            ${totalPages > 1 ? `
                <div class="pagination">
                    <button id="btn-prev-page" class="btn btn-secondary" ${window.currentClientPage <= 1 ? 'disabled' : ''}>
                        Anterior
                    </button>
                    <span>Página ${window.currentClientPage} de ${totalPages}</span>
                    <button id="btn-next-page" class="btn btn-secondary" ${window.currentClientPage >= totalPages ? 'disabled' : ''}>
                        Próxima
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    return filterHtml + tableHtml;
}

/**
 * Renderiza a Aba Configurações
 */
function renderSettingsTab(state) {
    const { settings, consts } = state;
    
    return `
        <div class="card">
            <h2 class="card-title">Configurações do Sistema</h2>
            
            <div class="form-group">
                <label>Centrais Disponíveis</label>
                <div id="centrais-list">
                    ${settings.centrais.map(central => `
                        <div class="list-item">
                            <span>${central}</span>
                            <button class="btn btn-danger" data-action="abrir-excluir-central" data-central="${central}">
                                Excluir
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="form-group">
                <label for="nova-central">Adicionar Nova Central</label>
                <div class="btn-group">
                    <input type="text" id="nova-central" placeholder="Nome da nova central" class="form-control">
                    <button id="btn-adicionar-central" class="btn btn-primary">Adicionar</button>
                </div>
            </div>
            
            <div class="form-group">
                <h3>Backup e Restauração</h3>
                <div class="btn-group">
                    <button id="backup-dados" class="btn btn-primary">Fazer Backup</button>
                    <button id="restaurar-dados-btn" class="btn btn-secondary">Restaurar Backup</button>
                    <input type="file" id="restaurar-dados-input" accept=".json" style="display: none;">
                </div>
                ${settings.lastBackup ? `
                    <p><small>Último backup: ${new Date(settings.lastBackup).toLocaleString()}</small></p>
                ` : ''}
            </div>
        </div>
    `;
}

/* =========================================== */
/* MODAIS                                      */
/* =========================================== */

/**
 * Renderiza o modal de cliente
 */
function renderClienteModal(cliente = null) {
    const isEditing = !!cliente;
    const { consts } = window.APP_STATE;
    
    const modalHtml = `
        <h2>${isEditing ? 'Editar' : 'Novo'} Cliente</h2>
        <form id="cliente-form">
            <div class="form-group">
                <label for="nome">Nome do Cliente *</label>
                <input type="text" id="nome" value="${cliente?.nome || ''}" required>
            </div>
            
            <div class="form-group">
                <label for="central">Central *</label>
                <select id="central" required>
                    <option value="">Selecione uma central</option>
                    ${consts.DEFAULT_CENTRAIS.map(central => `
                        <option value="${central}" ${cliente?.central === central ? 'selected' : ''}>${central}</option>
                    `).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label for="plano">Plano *</label>
                <select id="plano" required>
                    <option value="">Selecione um plano</option>
                    ${Object.entries(consts.PLANOS).map(([key, value]) => `
                        <option value="${key}" ${cliente?.plano === key ? 'selected' : ''}>${value}</option>
                    `).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label for="venc">Dia de Vencimento *</label>
                <select id="venc" required>
                    <option value="">Selecione o vencimento</option>
                    ${consts.VENCIMENTOS.sort((a,b) => a-b).map(venc => `
                        <option value="${venc}" ${cliente?.venc == venc ? 'selected' : ''}>Dia ${venc}</option>
                    `).join('')}
                </select>
            </div>
            
            <div class="btn-group">
                <button type="button" data-action="cancelar-modal" class="btn btn-secondary">Cancelar</button>
                ${isEditing ? `
                    <button type="button" data-action="excluir-cliente" data-id="${cliente.id}" class="btn btn-danger">Excluir</button>
                ` : ''}
                <button type="submit" class="btn btn-primary">${isEditing ? 'Atualizar' : 'Salvar'}</button>
            </div>
        </form>
    `;
    
    openModal(modalHtml);
}

/**
 * Renderiza o modal de instalação
 */
function renderInstalacaoModal(instalacao = null, cliente = null) {
    const isEditing = !!instalacao;
    const { consts } = window.APP_STATE;
    
    const modalHtml = `
        <h2>${isEditing ? 'Editar' : 'Nova'} Instalação - ${cliente?.nome}</h2>
        <form id="instalacao-form">
            <input type="hidden" id="clientId" value="${cliente?.id}">
            <input type="hidden" id="editingInstallationId" value="${instalacao?.id || ''}">
            
            <div class="form-group">
                <label for="central_inst">Central</label>
                <select id="central_inst" required>
                    <option value="">Selecione uma central</option>
                    ${consts.DEFAULT_CENTRAIS.map(central => `
                        <option value="${central}" ${instalacao?.central === central ? 'selected' : ''}>${central}</option>
                    `).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label for="plano_inst">Plano</label>
                <select id="plano_inst" required>
                    <option value="">Selecione um plano</option>
                    ${Object.entries(consts.PLANOS).map(([key, value]) => `
                        <option value="${key}" ${instalacao?.plano === key ? 'selected' : ''}>${value}</option>
                    `).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label for="venc_inst">Dia de Vencimento</label>
                <select id="venc_inst" required>
                    <option value="">Selecione o vencimento</option>
                    ${consts.VENCIMENTOS.sort((a,b) => a-b).map(venc => `
                        <option value="${venc}" ${instalacao?.venc == venc ? 'selected' : ''}>Dia ${venc}</option>
                    `).join('')}
                </select>
            </div>
            
            <h3>Pagamentos</h3>
            
            <div class="form-group">
                <label for="t1_select">Tipo de Pagamento 1 *</label>
                <select id="t1_select" required>
                    <option value="">Selecione</option>
                    ${consts.PAGAMENTOS.map(pag => `
                        <option value="${pag}" ${instalacao?.t1 === pag ? 'selected' : ''}>${pag}</option>
                    `).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label for="v1_input">Valor 1 *</label>
                <input type="number" id="v1_input" step="0.01" value="${instalacao?.v1 || ''}" required>
            </div>
            
            <div class="form-group">
                <label for="t2_select">Tipo de Pagamento 2 (Opcional)</label>
                <select id="t2_select">
                    <option value="">Nenhum</option>
                    ${consts.PAGAMENTOS.map(pag => `
                        <option value="${pag}" ${instalacao?.t2 === pag ? 'selected' : ''}>${pag}</option>
                    `).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label for="v2_input">Valor 2</label>
                <input type="number" id="v2_input" step="0.01" value="${instalacao?.v2 || ''}" ${!instalacao?.t2 ? 'disabled' : ''}>
            </div>
            
            <div class="btn-group">
                <button type="button" data-action="cancelar-modal" class="btn btn-secondary">Cancelar</button>
                <button type="submit" class="btn btn-primary">${isEditing ? 'Atualizar' : 'Salvar'} Instalação</button>
            </div>
        </form>
    `;
    
    openModal(modalHtml);
}

/**
 * Renderiza o modal de importação
 */
function renderImportarModal() {
    const { consts } = window.APP_STATE;
    
    const modalHtml = `
        <h2>Importar Clientes</h2>
        <form id="importar-form">
            <div class="form-group">
                <label for="nomes">Nomes dos Clientes (um por linha) *</label>
                <textarea id="nomes" rows="10" placeholder="Digite os nomes dos clientes, um por linha&#10;Exemplo:&#10;João Silva&#10;Maria Santos" required></textarea>
            </div>
            
            <div class="form-group">
                <label for="central_import">Central *</label>
                <select id="central_import" required>
                    <option value="">Selecione uma central</option>
                    ${consts.DEFAULT_CENTRAIS.map(central => `
                        <option value="${central}">${central}</option>
                    `).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label for="plano_import">Plano *</label>
                <select id="plano_import" required>
                    <option value="">Selecione um plano</option>
                    ${Object.entries(consts.PLANOS).map(([key, value]) => `
                        <option value="${key}">${value}</option>
                    `).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label for="venc_import">Dia de Vencimento *</label>
                <select id="venc_import" required>
                    <option value="">Selecione o vencimento</option>
                    ${consts.VENCIMENTOS.sort((a,b) => a-b).map(venc => `
                        <option value="${venc}">Dia ${venc}</option>
                    `).join('')}
                </select>
            </div>
            
            <div class="btn-group">
                <button type="button" data-action="cancelar-modal" class="btn btn-secondary">Cancelar</button>
                <button type="submit" class="btn btn-primary">Importar Clientes</button>
            </div>
        </form>
    `;
    
    openModal(modalHtml);
}

/**
 * Renderiza o modal de exclusão de central
 */
function renderExcluirCentralModal(central, clientes, settings) {
    const modalHtml = `
        <h2>Excluir Central: ${central}</h2>
        
        ${clientes.length > 0 ? `
            <div class="alert alert-warning">
                <strong>Atenção!</strong> Existem ${clientes.length} cliente(s) nesta central.
                Você precisa migrá-los para outra central antes de excluir.
            </div>
            
            <div class="form-group">
                <label for="nova-central-migracao">Migrar para central:</label>
                <select id="nova-central-migracao">
                    <option value="">Selecione a nova central</option>
                    ${settings.centrais.filter(c => c !== central).map(c => `
                        <option value="${c}">${c}</option>
                    `).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label>Clientes a migrar:</label>
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-dark); padding: 0.5rem; border-radius: var(--border-radius-sharp);">
                    ${clientes.map(cliente => `
                        <div class="form-check">
                            <input type="checkbox" id="cliente-${cliente.id}" value="${cliente.id}" checked>
                            <label for="cliente-${cliente.id}">${cliente.nome}</label>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="btn-group">
                <button type="button" data-action="cancelar-modal" class="btn btn-secondary">Cancelar</button>
                <button type="button" id="btn-migrar-excluir" class="btn btn-primary" disabled>
                    Migrar e Excluir
                </button>
            </div>
        ` : `
            <p>Tem certeza que deseja excluir a central "${central}"?</p>
            <div class="btn-group">
                <button type="button" data-action="cancelar-modal" class="btn btn-secondary">Cancelar</button>
                <button type="button" data-action="confirmar-excluir-central" data-central="${central}" class="btn btn-danger">
                    Excluir Central
                </button>
            </div>
        `}
    `;
    
    openModal(modalHtml);
}