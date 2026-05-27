/* ═══════════════════════════════════════════════════════════
   dashboard.js — Dashboard Energia Renovável · Ceará
   Estrutura:
   1. Dados por ano (DATA)
   2. Dados estáticos (complexos, meses)
   3. Estado global
   4. Controle de tema
   5. Seletor de ano
   6. updateDashboard() — função central
   7. updateKPIs()
   8. updateYearLabels()
   9. buildCharts() — constrói/reconstrói Chart.js
   10. updateCharts() — troca dados sem recriar
   11. updateProgress()
   12. renderTable()
   13. Busca na tabela
   14. Inicialização
════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════
   1. DADOS POR ANO
   Cada chave numérica (2024, 2025, 2026) contém:
   - kpi:     valores dos cards e badges de variação
   - monthly: produção mensal eólica e solar (GWh)
   - matrix:  participação na matriz [eólica, solar, outras] (%)
   - goals:   metas de descarbonização com rótulo, % e cor
════════════════════════════════════════════════════════════ */
const DATA = {
  2024: {
    kpi: {
      capacity: '4,8 GW', matrix: '81%', wind: '3,2 GW', solar: '1,2 GW',
      badgeCapacity: '+6,1%', badgeMatrix: '+2,8%', badgeWind: '+4,2%', badgeSolar: '+14,7%',
      badgeCapacityDown: false, badgeMatrixDown: false,
    },
    monthly: {
      wind:  [420, 390, 370, 355, 310, 340, 410, 430, 460, 475, 450, 435],
      solar: [120, 132, 148, 165, 180, 198, 205, 200, 178, 155, 130, 118],
    },
    matrix: [66, 19, 15],
    goals: [
      { label: 'Redução de CO₂',               pct: 62, color: 'var(--green)'  },
      { label: 'Eficiência da rede',            pct: 74, color: 'var(--blue)'   },
      { label: 'Cobertura solar residencial',   pct: 31, color: 'var(--yellow)' },
      { label: 'Armazenamento em baterias',     pct: 18, color: 'var(--orange)' },
    ],
  },

  2025: {
    kpi: {
      capacity: '5,2 GW', matrix: '85%', wind: '3,4 GW', solar: '1,4 GW',
      badgeCapacity: '+8,3%', badgeMatrix: '+4,1%', badgeWind: '+5,6%', badgeSolar: '+18,2%',
      badgeCapacityDown: false, badgeMatrixDown: false,
    },
    monthly: {
      wind:  [445, 415, 390, 372, 328, 362, 438, 458, 488, 502, 478, 462],
      solar: [140, 155, 172, 195, 215, 235, 248, 240, 210, 182, 155, 138],
    },
    matrix: [65, 22, 13],
    goals: [
      { label: 'Redução de CO₂',               pct: 71, color: 'var(--green)'  },
      { label: 'Eficiência da rede',            pct: 80, color: 'var(--blue)'   },
      { label: 'Cobertura solar residencial',   pct: 42, color: 'var(--yellow)' },
      { label: 'Armazenamento em baterias',     pct: 26, color: 'var(--orange)' },
    ],
  },

  2026: {
    kpi: {
      capacity: '5,9 GW', matrix: '89%', wind: '3,7 GW', solar: '1,8 GW',
      badgeCapacity: '+13,5%', badgeMatrix: '+4,7%', badgeWind: '+8,8%', badgeSolar: '+28,6%',
      badgeCapacityDown: false, badgeMatrixDown: false,
    },
    monthly: {
      wind:  [470, 438, 412, 395, 348, 382, 465, 488, 518, 532, 505, 490],
      solar: [168, 185, 208, 232, 258, 280, 295, 288, 252, 218, 185, 165],
    },
    matrix: [63, 26, 11],
    goals: [
      { label: 'Redução de CO₂',               pct: 80, color: 'var(--green)'  },
      { label: 'Eficiência da rede',            pct: 88, color: 'var(--blue)'   },
      { label: 'Cobertura solar residencial',   pct: 55, color: 'var(--yellow)' },
      { label: 'Armazenamento em baterias',     pct: 37, color: 'var(--orange)' },
    ],
  },
};


/* ═══════════════════════════════════════════════════════════
   2. DADOS ESTÁTICOS
   Complexos de geração e rótulos de meses são independentes
   do ano selecionado, portanto declarados uma única vez.
════════════════════════════════════════════════════════════ */
const COMPLEXOS = [
  { name: 'Complexo Eólico Aracati',        city: 'Aracati',            type: 'eolica',  cap: 324, status: 'op'  },
  { name: 'Complexo Eólico Canoa Quebrada', city: 'Aracati',            type: 'eolica',  cap: 288, status: 'op'  },
  { name: 'Complexo Solar Quixadá',         city: 'Quixadá',            type: 'solar',   cap: 214, status: 'op'  },
  { name: 'Parque Eólico Osório Ceará',     city: 'Caucaia',            type: 'eolica',  cap: 195, status: 'op'  },
  { name: 'Complexo Solar Iguatu',          city: 'Iguatu',             type: 'solar',   cap: 180, status: 'op'  },
  { name: 'Complexo Eólico Araripe I-III',  city: 'Simões',             type: 'eolica',  cap: 162, status: 'op'  },
  { name: 'UFV Quixeramobim',               city: 'Quixeramobim',       type: 'solar',   cap: 148, status: 'op'  },
  { name: 'Complexo Híbrido Sobral',        city: 'Sobral',             type: 'hibrida', cap: 135, status: 'op'  },
  { name: 'Parque Eólico Icaraí',           city: 'Icaraí de Minas',   type: 'eolica',  cap: 120, status: 'op'  },
  { name: 'Complexo Solar Juazeiro Sul',    city: 'Juazeiro do Norte',  type: 'solar',   cap: 98,  status: 'con' },
];

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];


/* ═══════════════════════════════════════════════════════════
   3. ESTADO GLOBAL
   Variáveis compartilhadas entre as funções do módulo.
════════════════════════════════════════════════════════════ */
let currentYear = 2025;   // Ano atualmente exibido
let lineChart, donutChart; // Instâncias Chart.js reutilizadas
let isDark = true;         // Flag de tema


/* ═══════════════════════════════════════════════════════════
   4. CONTROLE DE TEMA (Escuro / Claro)
   Ao clicar no botão:
   - Alterna a flag isDark
   - Aplica o atributo data-theme no <html>
   - Reconstrói os gráficos para atualizar as cores de eixo,
     tooltip e grade (Chart.js não lê variáveis CSS sozinho)
════════════════════════════════════════════════════════════ */
const themeToggle = document.getElementById('themeToggle');

themeToggle.addEventListener('click', () => {
  isDark = !isDark;

  document.documentElement.setAttribute(
    'data-theme',
    isDark ? 'dark' : 'light'
  );

  themeToggle.innerHTML = isDark
    ? '<i data-lucide="moon"></i>'
    : '<i data-lucide="sun"></i>';

  lucide.createIcons();

  buildCharts(currentYear);
});


/* ═══════════════════════════════════════════════════════════
   5. SELETOR DE ANO
   Ao clicar num botão de ano:
   1. Remove a classe 'active' de todos os botões
   2. Adiciona 'active' no botão clicado
   3. Atualiza currentYear com o valor do atributo data-year
   4. Chama updateDashboard() que atualiza tudo em cadeia
════════════════════════════════════════════════════════════ */
document.getElementById('yearSelector').addEventListener('click', e => {
  if (!e.target.matches('.year-btn')) return; // Ignora cliques fora dos botões

  document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');

  currentYear = +e.target.dataset.year; // Converte string → número
  updateDashboard(currentYear);
});


/* ═══════════════════════════════════════════════════════════
   6. updateDashboard() — ORQUESTRADOR CENTRAL
   Chamada única que atualiza todos os componentes visuais
   quando o usuário troca o ano. A ordem importa:
   KPIs e labels primeiro (visuais imediatos), depois
   gráficos e barras (com animação própria).
════════════════════════════════════════════════════════════ */
function updateDashboard(year) {
  updateKPIs(year);
  updateYearLabels(year);
  updateCharts(year);     // Reutiliza instâncias existentes
  updateProgress(year);
}


/* ═══════════════════════════════════════════════════════════
   7. updateKPIs() — Atualiza os 4 cards de métricas
   Usa animateText() para um efeito de fade ao trocar valores,
   e setBadge() para ajustar a classe (up/down) do badge.
════════════════════════════════════════════════════════════ */
function updateKPIs(year) {
  const d = DATA[year].kpi;

  animateText('kpiCapacity', d.capacity);
  animateText('kpiMatrix',   d.matrix);
  animateText('kpiWind',     d.wind);
  animateText('kpiSolar',    d.solar);

  setBadge('kpiBadgeCapacity', d.badgeCapacity, d.badgeCapacityDown);
  setBadge('kpiBadgeMatrix',   d.badgeMatrix,   d.badgeMatrixDown);
  setBadge('kpiBadgeWind',     d.badgeWind,     false);
  setBadge('kpiBadgeSolar',    d.badgeSolar,    false);
}

/**
 * Anima a troca de texto com fade + slide vertical.
 * O timeout garante que o CSS transition complete antes
 * de inserir o novo valor (evita flash sem transição).
 */
function animateText(id, val) {
  const el = document.getElementById(id);
  el.style.opacity   = '0';
  el.style.transform = 'translateY(6px)';
  el.style.transition = 'opacity .18s, transform .18s';
  setTimeout(() => {
    el.textContent = val;
    el.style.opacity   = '1';
    el.style.transform = 'translateY(0)';
  }, 180);
}

/**
 * Atualiza texto e classe CSS do badge de variação.
 * @param {string}  id     - ID do elemento badge
 * @param {string}  text   - Texto a exibir (ex: "+8,3%")
 * @param {boolean} isDown - true = variação negativa (vermelho)
 */
function setBadge(id, text, isDown) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'badge ' + (isDown ? 'down' : 'up');
}


/* ═══════════════════════════════════════════════════════════
   8. updateYearLabels() — Atualiza labels de ano inline
   Pequenas spans dentro de subtítulos que mostram o ano
   selecionado; atualizadas junto com o restante do dashboard.
════════════════════════════════════════════════════════════ */
function updateYearLabels(year) {
  document.getElementById('chartYear').textContent    = year;
  document.getElementById('progressYear').textContent = year;
}


/* ═══════════════════════════════════════════════════════════
   9. buildCharts() — Cria instâncias Chart.js do zero
   Chamada apenas na inicialização e ao trocar de tema,
   pois as cores de grade/tooltip precisam ser recalculadas.
   Em troca de ano, prefira updateCharts() (mais performático).
════════════════════════════════════════════════════════════ */
function buildCharts(year) {
  // Destroi instâncias anteriores para evitar canvas duplicado
  if (lineChart)  lineChart.destroy();
  if (donutChart) donutChart.destroy();

  const d = DATA[year];

  // Cores ajustadas por tema (Chart.js não lê variáveis CSS)
  const gridColor  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const tickColor  = isDark ? '#6b7e95' : '#8a9bac';
  const tooltipBg  = isDark ? '#19232f' : '#ffffff';
  const tooltipTxt = isDark ? '#e8f0f8' : '#0f1923';

  /* ── Gráfico de Linha: Produção Mensal ──────────────── */
  const lCtx = document.getElementById('lineChart').getContext('2d');

  // Gradientes de área preenchida sob cada linha
  const gWind = lCtx.createLinearGradient(0, 0, 0, 280);
  gWind.addColorStop(0, 'rgba(56,182,255,0.28)');
  gWind.addColorStop(1, 'rgba(56,182,255,0.00)');

  const gSolar = lCtx.createLinearGradient(0, 0, 0, 280);
  gSolar.addColorStop(0, 'rgba(245,197,24,0.28)');
  gSolar.addColorStop(1, 'rgba(245,197,24,0.00)');

  lineChart = new Chart(lCtx, {
    type: 'line',
    data: {
      labels: MONTHS,
      datasets: [
        {
          label: 'Eólica',
          data: d.monthly.wind,
          borderColor: '#38b6ff',
          backgroundColor: gWind,
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: '#38b6ff',
          tension: 0.42,
          fill: true,
        },
        {
          label: 'Solar',
          data: d.monthly.solar,
          borderColor: '#f5c518',
          backgroundColor: gSolar,
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: '#f5c518',
          tension: 0.42,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tickColor,
          bodyColor: tooltipTxt,
          borderColor: gridColor,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} GWh`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { family: 'DM Mono', size: 11 } },
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: tickColor,
            font: { family: 'DM Mono', size: 11 },
            callback: v => v + ' GWh',
          },
        },
      },
    },
  });

  /* ── Gráfico Donut: Participação na Matriz ──────────── */
  const dCtx = document.getElementById('donutChart').getContext('2d');

  donutChart = new Chart(dCtx, {
    type: 'doughnut',
    data: {
      labels: ['Eólica', 'Solar', 'Outras'],
      datasets: [{
        data: d.matrix,
        backgroundColor:      ['#38b6ff', '#f5c518', '#2adf8f'],
        hoverBackgroundColor: ['#5dc5ff', '#f8d24d', '#50e8a5'],
        borderWidth: 0,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: tickColor,
            font: { family: 'DM Mono', size: 11 },
            padding: 18,
            usePointStyle: true,
            pointStyleWidth: 10,
          },
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tickColor,
          bodyColor: tooltipTxt,
          borderColor: gridColor,
          borderWidth: 1,
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed}%`,
          },
        },
      },
    },
  });
}


/* ═══════════════════════════════════════════════════════════
   10. updateCharts() — Atualiza dados sem recriar gráficos
   Ao trocar de ano, apenas os arrays de dados dos datasets
   são substituídos e chart.update('active') é chamado.
   Isso é mais performático que buildCharts() pois preserva
   as instâncias Canvas e aproveita a animação nativa do
   Chart.js para transicionar entre os valores antigos e novos.
════════════════════════════════════════════════════════════ */
function updateCharts(year) {
  const d = DATA[year];

  // Substitui os dados e aciona animação suave no gráfico de linha
  lineChart.data.datasets[0].data = d.monthly.wind;
  lineChart.data.datasets[1].data = d.monthly.solar;
  lineChart.update('active');

  // Substitui os dados e aciona animação no donut
  donutChart.data.datasets[0].data = d.matrix;
  donutChart.update('active');
}


/* ═══════════════════════════════════════════════════════════
   11. updateProgress() — Renderiza barras de progresso
   Limpa e recria os elementos da lista de metas.
   O requestAnimationFrame garante que o DOM seja pintado
   com width:0 antes de animar para o valor-alvo,
   ativando a transição CSS definida em .progress-fill.
════════════════════════════════════════════════════════════ */
function updateProgress(year) {
  const goals     = DATA[year].goals;
  const container = document.getElementById('progressList');

  container.innerHTML = ''; // Limpa estado anterior

  goals.forEach(g => {
    container.innerHTML += `
      <div class="progress-row">
        <div class="progress-meta">
          <strong>${g.label}</strong>
          <span>${g.pct}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill"
               style="width:0%; background:${g.color}"
               data-target="${g.pct}">
          </div>
        </div>
      </div>`;
  });

  // Aguarda um frame para que o browser pinte width:0,
  // então aplica o target — isso aciona a transição CSS
  requestAnimationFrame(() => {
    document.querySelectorAll('.progress-fill').forEach(el => {
      el.style.width = el.dataset.target + '%';
    });
  });
}


/* ═══════════════════════════════════════════════════════════
   12. renderTable() — Renderiza/filtra a tabela de complexos
   Aceita uma string de filtro opcional; compara contra nome
   e município em lowercase para busca case-insensitive.
   A mini-barra de capacidade é calculada proporcionalmente
   ao maior valor do array (normalização local).
════════════════════════════════════════════════════════════ */
function renderTable(filter = '') {
  const tbody  = document.getElementById('tableBody');
  const maxCap = Math.max(...COMPLEXOS.map(c => c.cap)); // Maior capacidade para normalizar
  const lf     = filter.toLowerCase();

  tbody.innerHTML = '';

  COMPLEXOS
    .filter(c =>
      c.name.toLowerCase().includes(lf) ||
      c.city.toLowerCase().includes(lf)
    )
    .forEach((c, i) => {
      // Largura da mini-barra: proporcional ao maior complexo (max = 100px)
      const barW = Math.round((c.cap / maxCap) * 100);

      // Cor da barra por tipo de fonte
      const barColor = c.type === 'eolica'  ? 'var(--blue)'
                     : c.type === 'solar'   ? 'var(--yellow)'
                     :                        'var(--green)';

      // Ícone e rótulo por tipo
      const typeLabel = c.type === 'eolica'  ? '💨 Eólica'
                      : c.type === 'solar'   ? '☀️ Solar'
                      :                        '⚡ Híbrida';

      tbody.innerHTML += `
        <tr>
          <td><span style="color:var(--muted);font-size:11px">${String(i + 1).padStart(2, '0')}</span></td>
          <td style="font-weight:500">${c.name}</td>
          <td style="color:var(--muted)">${c.city}</td>
          <td><span class="type-badge ${c.type}">${typeLabel}</span></td>
          <td>
            <div class="cap-bar">
              <div class="cap-mini" style="width:${barW}px; max-width:100px; background:${barColor}"></div>
              <span>${c.cap} MW</span>
            </div>
          </td>
          <td>
            <span class="status-dot ${c.status}"></span>
            ${c.status === 'op' ? 'Operacional' : 'Em construção'}
          </td>
        </tr>`;
    });
}


/* ═══════════════════════════════════════════════════════════
   13. BUSCA NA TABELA
   Ouve o evento 'input' em tempo real e re-renderiza
   a tabela passando o valor digitado como filtro.
════════════════════════════════════════════════════════════ */
document.getElementById('searchInput').addEventListener('input', e => {
  renderTable(e.target.value);
});


/* ═══════════════════════════════════════════════════════════
   14. INICIALIZAÇÃO
   Constrói todos os componentes ao carregar a página.
   A ordem importa: gráficos antes, pois dependem do canvas
   já estar no DOM (garantido pelo defer ou posição do script).
════════════════════════════════════════════════════════════ */

// Data no rodapé
document.getElementById('footerDate').textContent =
  new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

// Renderiza os componentes com o ano inicial (2025)
buildCharts(currentYear);
updateKPIs(currentYear);
updateProgress(currentYear);
renderTable();
