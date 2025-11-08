/*
 * ARQUIVO: app.js
 * -----------------
 * O "Cérebro" do aplicativo.
 */

// Estado global do aplicativo
let state = {};
let filters = {
    filterClienteText: '',
    filterClienteCentral: 'todos',
    filterClienteVencimento: 'todos',
    filterFinanceiroCentral: 'todos',
    filterFinanceiroPagamento: 'todos',
    filterFinanceiroPlano: 'todos',
    filterFinanceiroVencimento: 'todos'
};
let currentTab = 'dashboard';
let debounceTimer = null;

// VARIÁVEIS DE PAGINAÇÃO
let clientsPerPage = 20; 
let currentClientPage = 1; 

// Referências do DOM (serão inicializadas dentro de main, após DOMContentLoaded)
let appWrapperEl;
let appEl;
let toastEl;
let modalEl;

// Expõe variáveis de Paginação para o UI.js
window.clientsPerPage = clientsPerPage;
window.currentClientPage = currentClientPage; 

/**
 * Função principal de inicialização
 */
async function main() {
    try {
        // Inicializa referências do DOM aqui (após DOMContentLoaded)
        appWrapperEl = document.getElementById('app-wrapper'); 
        appEl = document.getElementById('app'); 
        toastEl = document.getElementById('toast-container');
        modalEl = document.getElementById('modal-container');

        // Verificação de segurança: elementos obrigatórios
        if (!appWrapperEl || !appEl || !toastEl || !modalEl) {
            throw new Error('Elementos DOM obrigatórios não encontrados. Verifique se #app-wrapper, #app, #toast-container e #modal-container existem no HTML.');
        }

        // Inicializa os módulos
        initUI(appWrapperEl, appEl, toastEl, modalEl);
        
        await initDB();
        await reloadDataAndRender(true); // 'true' força o render completo inicial
        attachListeners();

        showToast('Sistema CONNECT VALE carregado com sucesso!', 'success', 3000);

    } catch (err) {
        console.error("ERRO FATAL AO INICIAR O APP:", err);
        
        // Fallback visual para erro
        if (appEl) {
            appEl.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <h2 style="color: var(--danger-color);">Erro ao carregar o sistema</h2>
                    <p>${err.message}</p>
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
                        Tentar Novamente
                    </button>
                </div>
            `;
        } else {
            // Caso appEl também não exista (situação rara), log no console apenas.
            console.error('Elemento #app não existe no DOM para exibir fallback.');
        }
    }
}

/**
 * Recarrega os dados do DB e renderiza a UI
 */
async function reloadDataAndRender(fullRender = false) {
    try {
        state = await loadData();
        window.APP_STATE = state; 
        
        window.currentClientPage = currentClientPage; 
        
        render(state, filters, currentTab, fullRender); 
    } catch (error) {
        console.error('Erro ao recarregar dados:', error);
        showToast('Erro ao carregar dados', 'error');
    }
}

/**
 * Anexa todos os listeners de eventos
 */
function attachListeners() {
    if (!appWrapperEl || !modalEl) {
        console.warn('attachListeners: elementos do DOM ausentes, listeners não anexados.');
        return;
    }
    
    // Listener principal para cliques no app
    appWrapperEl.addEventListener('click', async (e) => { 
        const target = e.target;
        const action = target.dataset.action || target.closest('[data-action]')?.dataset.action;
        const id = parseInt(target.dataset.id || target.closest('[data-id]')?.dataset.id, 10);
        const central = target.dataset.central || target.closest('[data-central]')?.dataset.central;

        try {
            // --- Navegação e Tema ---
            if (target.id === 'theme-switcher' || target.closest('#theme-switcher')) {
                const newTheme = (localStorage.getItem('theme') || 'dark') === 'light' ? 'dark' : 'light';
                localStorage.setItem('theme', newTheme);
                reloadDataAndRender(true); 
                return;
            }
            
            if (target.matches('.tab-button')) { 
                currentTab = target.dataset.tab; 
                currentClientPage = 1; 
                reloadDataAndRender(); 
                return;
            }

            // --- Navegação da Paginação ---
            if (target.id === 'btn-prev-page' && currentClientPage > 1) {
                currentClientPage--;
                reloadDataAndRender();
                return;
            }
            if (target.id === 'btn-next-page') {
                const filteredClients = state.clients.filter(c => {
                    const nomeMatch = c.nome.toLowerCase().includes(filters.filterClienteText.toLowerCase());
                    const centralMatch = (filters.filterClienteCentral === 'todos') || (c.central === filters.filterClienteCentral);
                    const vencMatch = (filters.filterClienteVencimento === 'todos') || (c.venc == filters.filterClienteVencimento);
                    return nomeMatch && centralMatch && vencMatch;
                });
                const totalPages = Math.ceil(filteredClients.length / clientsPerPage);
                
                if (currentClientPage < totalPages) {
                    currentClientPage++;
                    reloadDataAndRender();
                }
                return;
            }
            
            // --- Ações de Cliente ---
            if (target.id === 'btn-novo-cliente') { 
                renderClienteModal(); 
                return; 
            }
            if (target.id === 'btn-importar-clientes') { 
                renderImportarModal(); 
                return; 
            }
            if (action === 'editar') { 
                renderClienteModal(state.clients.find(c => c.id === id)); 
                return; 
            }
            
            if (action === 'cancelar') {
                if (confirm('Tem certeza que deseja CANCELAR este cliente? Ele sairá do financeiro.')) {
                    const { message } = await cancelClient(id);
                    showToast(message);
                    await reloadDataAndRender();
                }
                return;
            }

            // --- Ações de Instalação ---
            if (action === 'instalar') {
                renderInstalacaoModal({}, state.clients.find(c => c.id === id)); 
                return;
            }
            if (action === 'editar-instalacao') {
                const instalacao = state.installations.find(i => i.id === id);
                renderInstalacaoModal(instalacao, state.clients.find(c => c.id === instalacao.clientId));
                return;
            }
            if (action === 'abrir-instalacao-cliente') {
                const instalacao = state.installations.find(i => i.clientId === id);
                const cliente = state.clients.find(c => c.id === id);
                if (instalacao) {
                    renderInstalacaoModal(instalacao, cliente);
                } else {
                    showToast('Nenhuma instalação encontrada. Registre uma nova.', 'error');
                    renderInstalacaoModal({}, cliente);
                }
                return;
            }
            
            // --- Ações de Configuração ---
            if (action === 'abrir-excluir-central') {
                const clientesNessaCentral = state.clients.filter(c => c.central === central);
                renderExcluirCentralModal(central, clientesNessaCentral, state.settings);
                return;
            }
            if (target.id === 'btn-adicionar-central') {
                const novaCentralInput = document.getElementById('nova-central');
                const novaCentral = novaCentralInput.value.trim();
                
                if (!novaCentral) {
                    showToast('Digite o nome da nova central', 'error');
                    return;
                }
                
                if (state.settings.centrais.includes(novaCentral)) {
                    showToast('Esta central já existe', 'error');
                    return;
                }
                
                state.settings.centrais.push(novaCentral);
                await saveSettings(state.settings);
                showToast(`Central "${novaCentral}" adicionada!`);
                novaCentralInput.value = '';
                await reloadDataAndRender();
                return;
            }

            // --- Ações de Relatórios ---
            if (target.id === 'export-pdf' || target.id === 'export-excel') {
                const { validInstallations } = getDashboardData(state.clients, state.installations);
                if (target.id === 'export-pdf') {
                    exportPDF(validInstallations);
                } else {
                    exportExcel(validInstallations);
                }
                return;
            }
            if (target.id === 'backup-dados') {
                await backupData();
                return;
            }
            if (target.id === 'restaurar-dados-btn') {
                document.getElementById('restaurar-dados-input')?.click(); 
                return;
            }

        } catch (error) {
            console.error('Erro no listener principal:', error);
            showToast(`Erro: ${error.message}`, 'error');
        }
    });

    // Listener para filtros e inputs
    appWrapperEl.addEventListener('input', e => {
        const id = e.target.id;
        
        // Inclui todos os IDs de filtro que estão no Dashboard e Clientes
        if (['filtro-cliente', 'filtro-cliente-central', 'filtro-cliente-vencimento', 
             'filtro-fin-central', 'filtro-fin-pagamento', 
             'filtro-fin-plano', 'filtro-fin-vencimento'].includes(id)) {
            
            // Clientes
            if (id === 'filtro-cliente') filters.filterClienteText = e.target.value;
            if (id === 'filtro-cliente-central') filters.filterClienteCentral = e.target.value;
            if (id === 'filtro-cliente-vencimento') filters.filterClienteVencimento = e.target.value;
            
            // Financeiro (Dashboard)
            if (id === 'filtro-fin-central') filters.filterFinanceiroCentral = e.target.value;
            if (id === 'filtro-fin-pagamento') filters.filterFinanceiroPagamento = e.target.value;
            if (id === 'filtro-fin-plano') filters.filterFinanceiroPlano = e.target.value;
            if (id === 'filtro-fin-vencimento') filters.filterFinanceiroVencimento = e.target.value;
            
            // CORREÇÃO CRÍTICA: Ao filtrar, voltamos para a primeira página
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentClientPage = 1; 
                reloadDataAndRender();
            }, 300);
        }
    });
    
    // Listener para o input de restaurar (change)
    appWrapperEl.addEventListener('change', e => {
        if (e.target.id === 'restaurar-dados-input') {
            handleRestoreFile(e);
        }
        
        // Listener para migração de central
        if (e.target.id === 'nova-central-migracao') {
            const btnMigrar = document.getElementById('btn-migrar-excluir');
            btnMigrar.disabled = !e.target.value;
        }
    });
    
    // Listener para formulários e Modais (Submits e Clicks)
    modalEl.addEventListener('click', async (e) => {
        const target = e.target;
        const action = target.dataset.action;
        const id = parseInt(target.dataset.id, 10);
        const central = target.dataset.central;
        
        try {
            if (action === 'cancelar-modal' || target.matches('.modal-overlay')) {
                await closeModal(reloadDataAndRender);
                return;
            }

            if (action === 'excluir-cliente') {
                if (confirm('EXCLUIR? Tem certeza? Isso apaga o cliente e todas as instalações associadas a ele PERMANENTEMENTE!')) {
                    const { message } = await deleteClient(id);
                    showToast(message);
                    await closeModal(reloadDataAndRender); 
                }
                return;
            }
            
            if (action === 'confirmar-excluir-central') {
                const { message } = await removeCentral(central, state.settings);
                showToast(message);
                await closeModal(reloadDataAndRender);
                return;
            }
            
            // Migração e exclusão de central
            if (target.id === 'btn-migrar-excluir') {
                const novaCentral = document.getElementById('nova-central-migracao').value;
                const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
                const clientesParaMigrar = Array.from(checkboxes).map(cb => parseInt(cb.value));
                
                if (!novaCentral || clientesParaMigrar.length === 0) {
                    showToast('Selecione uma central e pelo menos um cliente', 'error');
                    return;
                }
                
                const centralAntiga = document.querySelector('[data-action="abrir-excluir-central"]').dataset.central;
                const { message } = await migrateAndRemoveCentral(centralAntiga, novaCentral, clientesParaMigrar, state.settings);
                showToast(message);
                await closeModal(reloadDataAndRender);
                return;
            }

        } catch (error) {
            console.error('Erro no listener do modal:', error);
            showToast(`Erro: ${error.message}`, 'error');
        }
    });
    
    modalEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const formId = e.target.id;
            
            if (formId === 'cliente-form') {
                const nome = document.getElementById('nome').value.trim();
                const central = document.getElementById('central').value;
                const plano = document.getElementById('plano').value;
                const venc = document.getElementById('venc').value;
                const editingClientId = parseInt(e.target.querySelector('button[data-action="excluir-cliente"]')?.dataset.id, 10);
                
                const clienteData = { nome, central, plano, venc };
                const { message } = await saveClient(clienteData, editingClientId);
                showToast(message);
                
            } else if (formId === 'instalacao-form') {
                const clientId = parseInt(document.getElementById('clientId').value, 10);
                const editingInstallationId = document.getElementById('editingInstallationId').value || null;
                const central = document.getElementById('central_inst').value;
                const plano = document.getElementById('plano_inst').value;
                const venc = document.getElementById('venc_inst').value;
                const t1 = document.getElementById('t1_select').value;
                const v1 = parseFloat(document.getElementById('v1_input').value) || 0;
                const t2 = document.getElementById('t2_select').value;
                const v2 = parseFloat(document.getElementById('v2_input').value) || 0;
                
                const instalacaoData = { central, plano, venc, t1, v1, t2, v2 };
                const { message } = await saveInstallation(instalacaoData, clientId, editingInstallationId);
                showToast(message);
                
            } else if (formId === 'importar-form') {
                const nomes = document.getElementById('nomes').value;
                const central = document.getElementById('central_import').value;
                const plano = document.getElementById('plano_import').value;
                const venc = document.getElementById('venc_import').value;
                
                if (!nomes.trim()) {
                    showToast('Digite os nomes dos clientes', 'error');
                    return;
                }
                
                const { message } = await importClients(nomes, central, plano, venc);
                showToast(message);
            }
            
            // Sucesso! Fecha o modal e recarrega tudo.
            await closeModal(reloadDataAndRender);
            
        } catch (error) {
            if (error.name === 'ConstraintError') {
                showToast('Erro: Já existe um cliente com este nome nesta central.', 'error');
            } else {
                showToast(`Erro ao salvar: ${error.message}`, 'error');
            }
        }
    });
    
    modalEl.addEventListener('input', e => {
        if (e.target.id === 't2_select') {
            const v2Input = document.getElementById('v2_input');
            if (e.target.value === '') {
                v2Input.disabled = true;
                v2Input.value = '';
            } else {
                v2Input.disabled = false;
            }
        }
    });
    
    // Listeners globais
    window.addEventListener('focus', reloadDataAndRender);
    window.addEventListener('data-changed', reloadDataAndRender);
    
    // Enter no input de nova central
    appWrapperEl.addEventListener('keypress', e => {
        if (e.target.id === 'nova-central' && e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('btn-adicionar-central').click();
        }
    });
}

// Inicia o aplicativo
document.addEventListener('DOMContentLoaded', main);
