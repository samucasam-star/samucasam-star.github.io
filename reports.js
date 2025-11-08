/*
 * ARQUIVO: reports.js
 * -----------------
 * Contém toda a lógica de exportação (PDF, Excel)
 * e Backup/Restauração (JSON).
 */

/**
 * Exporta o relatório financeiro para PDF
 */
function exportPDF(installationsToExport) {
    if (installationsToExport.length === 0) {
        showToast('Não há dados financeiros para exportar.', 'error');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text("Relatório Financeiro - CONNECT VALE", 20, 20);
    
    // Data do relatório
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
    
    // Tabela
    doc.autoTable({
        head: [['Cliente', 'Central', 'Data', 'Total']],
        body: installationsToExport.map(i => [
            i.nome,
            i.central,
            new Date(i.createdAt).toLocaleDateString('pt-BR'),
            formatCurrency(i.total)
        ]),
        startY: 40,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [0, 90, 158] } // Cor primária
    });
    
    doc.save(`relatorio_financeiro_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Exporta o relatório financeiro para Excel
 */
function exportExcel(installationsToExport) {
    if (installationsToExport.length === 0) {
        showToast('Não há dados financeiros para exportar.', 'error');
        return;
    }
    
    const data = installationsToExport.map(i => ({
        'Cliente': i.nome,
        'Central': i.central,
        'Data': new Date(i.createdAt).toLocaleDateString('pt-BR'),
        'Total': i.total,
        'Valor 1': i.v1,
        'Tipo 1': i.t1,
        'Valor 2': i.v2,
        'Tipo 2': i.t2,
        'Plano': i.plano,
        'Vencimento': i.venc
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financeiro");
    
    // Ajusta largura das colunas
    const colWidths = [
        { wch: 25 }, // Cliente
        { wch: 15 }, // Central
        { wch: 12 }, // Data
        { wch: 15 }, // Total
        { wch: 12 }, // Valor 1
        { wch: 12 }, // Tipo 1
        { wch: 12 }, // Valor 2
        { wch: 12 }, // Tipo 2
        { wch: 15 }, // Plano
        { wch: 12 }  // Vencimento
    ];
    ws['!cols'] = colWidths;
    
    XLSX.writeFile(wb, `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Cria e baixa um arquivo de backup
 */
async function backupData() {
    try {
        const { clients, installations, settings } = window.APP_STATE;
        const data = {
            clients,
            installations,
            settings,
            backupDate: new Date().toISOString(),
            version: 'ConnectValeDB_V4'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-connect-vale-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        // Atualiza data do último backup
        settings.lastBackup = new Date().toISOString();
        await saveSettings(settings);
        
        showToast('Backup realizado com sucesso!');
    } catch (error) {
        showToast(`Erro ao fazer backup: ${error.message}`, 'error');
    }
}

/**
 * Lê um arquivo de backup
 */
function handleRestoreFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        let data;
        try {
            data = JSON.parse(event.target.result);
            
            // Validação do arquivo de backup
            if (!data.clients || !data.installations || !data.settings) {
                throw new Error('Arquivo de backup inválido ou formato antigo.');
            }
            
            if (data.version !== 'ConnectValeDB_V4') {
                throw new Error('Versão do backup incompatível.');
            }
        } catch (error) {
            showToast(`Erro ao ler o arquivo: ${error.message}`, 'error');
            return;
        }

        if (!confirm('ATENÇÃO: Isso substituirá TODOS os dados atuais. Tem certeza que deseja continuar?')) {
            return;
        }

        try {
            const { message } = await restoreBackup(data);
            showToast(message);
            // Dispara evento para recarregar a aplicação
            window.dispatchEvent(new CustomEvent('data-changed')); 
        } catch (error) {
            showToast(`Falha na restauração: ${error.message}`, 'error');
        }
    };
    
    reader.onerror = () => {
        showToast('Erro ao ler o arquivo.', 'error');
    };
    
    reader.readAsText(file);
    
    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = null;
}