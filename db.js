/*
 * ARQUIVO: db.js
 * -----------------
 * Contém toda a lógica do banco de dados (IndexedDB).
 */

// Referência global do banco de dados
let db;

// Constantes de Configuração
const DB_NAME = 'ConnectValeDB_V4'; 
const DB_VERSION = 1;
const DEFAULT_CENTRAIS = ['Iporanga', 'Rio Preto', 'Juquiaguassu'];
const PLANOS = { 'start': 'Start – R$150', 'master': 'Master – R$179,90' };
const VENCIMENTOS = ['10', '25', '5', '15', '20', '30']; 
const STATUS = { 'nao-instalado': 'Não instalado', 'instalado': 'Instalado', 'cancelado': 'Cancelado' };
const PAGAMENTOS = ['Dinheiro', 'PIX', 'Boleto'];

/**
 * Inicializa o IndexedDB
 */
async function initDB() {
    db = await idb.openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('clients')) {
                const clientStore = db.createObjectStore('clients', { keyPath: 'id', autoIncrement: true });
                clientStore.createIndex('nome', 'nome', { unique: false });
                clientStore.createIndex('nome_central_idx', ['nome', 'central'], { unique: true });
            }
            if (!db.objectStoreNames.contains('installations')) {
                 const instStore = db.createObjectStore('installations', { keyPath: 'id', autoIncrement: true });
                 instStore.createIndex('clientId', 'clientId', { unique: false });
            }
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
        },
    });
}

/**
 * Carrega todos os dados do DB para o estado do app
 */
async function loadData() {
    let clients = await db.getAll('clients');
    let installations = await db.getAll('installations');
    let storedSettings = await db.get('settings', 'appSettings');
    
    let settings;
    if (storedSettings) {
        settings = storedSettings.value;
    } else {
        settings = { centrais: DEFAULT_CENTRAIS, lastBackup: null };
        await db.put('settings', { key: 'appSettings', value: settings });
    }
    
    const state = {
        clients,
        installations,
        settings,
        consts: {
            DEFAULT_CENTRAIS: settings.centrais || DEFAULT_CENTRAIS,
            PLANOS,
            VENCIMENTOS,
            STATUS,
            PAGAMENTOS
        }
    };
    
    window.APP_STATE = state;
    return state;
}

/**
 * Valida dados do cliente
 */
function validateClientData(clientData) {
    const errors = [];
    
    if (!clientData.nome?.trim()) errors.push('Nome é obrigatório');
    if (!clientData.central) errors.push('Central é obrigatória');
    if (!clientData.plano) errors.push('Plano é obrigatório');
    if (!clientData.venc) errors.push('Vencimento é obrigatório');
    
    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }
    
    return true;
}

/**
 * Salva/Atualiza cliente
 */
async function saveClient(clienteData, editingClientId) {
    validateClientData(clienteData);
    
    if(editingClientId) {
        const originalClient = await db.get('clients', editingClientId);
        clienteData.status = originalClient.status; 
        await db.put('clients', { ...originalClient, ...clienteData, id: editingClientId });
        return { message: 'Cliente atualizado!' };
    } else {
        clienteData.status = 'nao-instalado'; 
        await db.add('clients', { ...clienteData, createdAt: new Date().toISOString() });
        return { message: 'Cliente salvo!' };
    }
}

/**
 * Importa múltiplos clientes
 */
async function importClients(nomes, central, plano, venc) {
    const clientsToAdd = nomes.split('\n')
        .filter(nome => nome.trim())
        .map(nome => ({
            nome: nome.trim(),
            central,
            plano,
            venc,
            status: 'nao-instalado',
            createdAt: new Date().toISOString()
        }));

    for (const client of clientsToAdd) {
        await db.add('clients', client);
    }
    
    return { message: `${clientsToAdd.length} clientes importados!` };
}

/**
 * Salva/Atualiza instalação
 */
async function saveInstallation(instalacaoData, clienteId, editingInstallationId) {
    const installationData = {
        ...instalacaoData,
        clientId: clienteId,
        total: (parseFloat(instalacaoData.v1) || 0) + (parseFloat(instalacaoData.v2) || 0),
        createdAt: new Date().toISOString()
    };

    if (editingInstallationId) {
        await db.put('installations', { ...installationData, id: editingInstallationId });
        return { message: 'Instalação atualizada!' };
    } else {
        await db.add('installations', installationData);
        
        // Atualiza status do cliente para "instalado"
        const client = await db.get('clients', clienteId);
        await db.put('clients', { ...client, status: 'instalado' });
        
        return { message: 'Instalação registrada!' };
    }
}

/**
 * Exclui cliente e suas instalações
 */
async function deleteClient(id) {
    // Remove instalações associadas
    const installations = await db.getAll('installations');
    const clientInstallations = installations.filter(i => i.clientId === id);
    
    for (const inst of clientInstallations) {
        await db.delete('installations', inst.id);
    }
    
    // Remove cliente
    await db.delete('clients', id);
    return { message: 'Cliente excluído!' };
}

/**
 * Cancela cliente (muda status)
 */
async function cancelClient(id) {
    const client = await db.get('clients', id);
    await db.put('clients', { ...client, status: 'cancelado' });
    return { message: 'Cliente cancelado!' };
}

/**
 * Salva configurações
 */
async function saveSettings(newSettings) {
    await db.put('settings', { key: 'appSettings', value: newSettings });
    return { message: 'Configurações salvas!' };
}

/**
 * Migra clientes entre centrais
 */
async function migrateAndRemoveCentral(centralAntiga, novaCentral, clientesParaMigrar, settings) {
    for (const clientId of clientesParaMigrar) {
        const client = await db.get('clients', clientId);
        await db.put('clients', { ...client, central: novaCentral });
    }
    
    // Remove central das configurações
    const updatedCentrais = settings.centrais.filter(c => c !== centralAntiga);
    await saveSettings({ ...settings, centrais: updatedCentrais });
    
    return { message: `Central ${centralAntiga} removida e clientes migrados!` };
}

/**
 * Remove central (apenas se não houver clientes)
 */
async function removeCentral(central, settings) {
    const clients = await db.getAll('clients');
    const clientesNaCentral = clients.filter(c => c.central === central);
    
    if (clientesNaCentral.length > 0) {
        throw new Error(`Não é possível remover. Existem ${clientesNaCentral.length} clientes nesta central.`);
    }
    
    const updatedCentrais = settings.centrais.filter(c => c !== central);
    await saveSettings({ ...settings, centrais: updatedCentrais });
    
    return { message: `Central ${central} removida!` };
}

/**
 * Restaura backup
 */
async function restoreBackup(data) {
    // Limpa dados atuais
    const clients = await db.getAll('clients');
    const installations = await db.getAll('installations');
    
    for (const client of clients) {
        await db.delete('clients', client.id);
    }
    for (const installation of installations) {
        await db.delete('installations', installation.id);
    }
    
    // Restaura novos dados
    for (const client of data.clients) {
        await db.add('clients', client);
    }
    for (const installation of data.installations) {
        await db.add('installations', installation);
    }
    await db.put('settings', { key: 'appSettings', value: data.settings });
    
    return { message: 'Backup restaurado com sucesso!' };
}

// Expõe a função de cálculo do dashboard
window.getDashboardData = function(clients, installations) {
    const clientesNaoCanceladosIds = clients.filter(c => c.status !== 'cancelado').map(c => c.id);
    const validInstallations = installations.filter(i => clientesNaoCanceladosIds.includes(i.clientId));

    const totalGeral = validInstallations.reduce((acc, i) => acc + (i.total || 0), 0);
    
    const totaisPorPagamento = validInstallations.reduce((acc, i) => {
        if (i.t1 && i.v1) acc[i.t1] = (acc[i.t1] || 0) + (i.v1 || 0);
        if (i.t2 && i.v2) acc[i.t2] = (acc[i.t2] || 0) + (i.v2 || 0);
        return acc;
    }, {});

    const totaisPorCentral = validInstallations.reduce((acc, i) => {
        if (i.central) acc[i.central] = (acc[i.central] || 0) + (i.total || 0);
        return acc;
    }, {});
    
    const ultimasInstalacoes = installations.slice(-5).reverse();

    return {
        totalGeral,
        validInstallations,
        totaisPorPagamento,
        totaisPorCentral,
        ultimasInstalacoes
    };
}