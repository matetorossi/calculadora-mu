// =============================
// MU Dark Epoch - Calculadora
// Aba "Aprimorar" (+0 a +11)
// Modal de configurações + Persistência (localStorage)
// =============================

const PARTES_SET = ["Arma 1", "Arma 2", "Elmo", "Armadura", "Luvas", "Calça", "Botas"];
const NIVEL_MIN = 0;
const NIVEL_MAX = 11;
const PARTES_IMG = ["arma1.png", "arma2.png", "elmo.png", "armadura.png", "luvas.png", "calcas.png", "botas.png"];


// Chave de persistência
const STORAGE_KEY = "mu_refino_calc_v1";

const $ = (sel) => document.querySelector(sel);

const clampInt = (v, min, max) => {
    const n = Number.parseInt(v, 10);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
};

const moeda = (n) => Math.round(Number(n || 0)).toString();

const DEFAULTS = {
    precoBencao: 0,   // usuário define no modal
    precoAlma: 150,
    precoLuar: 500,
};

// Quantidades fixas por evolução (hardcoded)
const REFINE_STEPS = {
    // +6 -> +9 (Alma)
    alma_6_7: 1,
    alma_7_8: 2,
    alma_8_9: 3,

    // +9 -> +11 (Benção + Alma + Luar)
    bencao_9_10: 3,
    alma_9_10: 4,
    luar_9_10: 0,

    bencao_10_11: 3,
    alma_10_11: 5,
    luar_10_11: 1,
};


function makeLevelOptions(selectEl, selected = 0) {
    selectEl.innerHTML = "";
    for (let i = NIVEL_MIN; i <= NIVEL_MAX; i++) {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = `+${i}`;
        if (i === selected) opt.selected = true;
        selectEl.appendChild(opt);
    }
}

function buildSetRows() {
    const container = $("#set-list");
    container.innerHTML = "";

    PARTES_SET.forEach((parte, idx) => {
        const row = document.createElement("div");
        row.className = "item-row";
        row.dataset.index = String(idx);

        // Thumbnail quadrada (preparada pra imagem da peça)
        const thumb = document.createElement("div");
        thumb.className = "part-thumb";

        const img = document.createElement("img");
        img.src = `./imgs/${PARTES_IMG[idx]}`;
        img.alt = parte;

        // Se a imagem não existir ainda, não quebra o layout:
        img.onerror = () => {
            img.remove();
            thumb.textContent = "—";
            thumb.style.color = "rgba(231,238,252,0.6)";
            thumb.style.fontWeight = "900";
        };

        thumb.appendChild(img);

        const name = document.createElement("div");
        name.className = "item-name";
        name.textContent = parte;

        const colAtual = document.createElement("div");
        colAtual.className = "item-mini";
        const lblAtual = document.createElement("label");
        lblAtual.textContent = "Atual";
        const selAtual = document.createElement("select");
        selAtual.className = "sel-atual";
        makeLevelOptions(selAtual, 0);
        colAtual.appendChild(lblAtual);
        colAtual.appendChild(selAtual);

        const colDesejado = document.createElement("div");
        colDesejado.className = "item-mini";
        const lblDesejado = document.createElement("label");
        lblDesejado.textContent = "Desejado";
        const selDesejado = document.createElement("select");
        selDesejado.className = "sel-desejado";
        makeLevelOptions(selDesejado, 0);
        colDesejado.appendChild(lblDesejado);
        colDesejado.appendChild(selDesejado);

        const cost = document.createElement("div");
        cost.className = "item-cost";
        cost.innerHTML = `<div><strong>Recursos:</strong> <span class="item-rec">-</span></div>
                      <div><strong>Custo:</strong> <span class="item-custo">-</span> granadas</div>`;

        row.appendChild(thumb);
        row.appendChild(name);
        row.appendChild(colAtual);
        row.appendChild(colDesejado);
        row.appendChild(cost);

        container.appendChild(row);
    });
}


// --------------------
// Modal settings
// --------------------
function openSettings() {
    const overlay = $("#settings-overlay");
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeSettings() {
    const overlay = $("#settings-overlay");
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}


// --------------------
// Leitura config atual da UI
// --------------------
function readConfigFromUI() {
    const precoBencao = Math.max(0, Number($("#preco-bencao")?.value || DEFAULTS.precoBencao));
    const precoAlma = Math.max(0, Number($("#preco-alma")?.value || DEFAULTS.precoAlma));
    const precoLuar = Math.max(0, Number($("#preco-luar")?.value || DEFAULTS.precoLuar));

    return {
        prices: { precoBencao, precoAlma, precoLuar },
        steps: { ...REFINE_STEPS }, // <- hardcoded
    };
}

// --------------------
// Cálculo de consumo por upgrade
// --------------------
function calcForRange(atual, desejado, config) {
    const res = { bencao: 0, alma: 0, luar: 0 };
    if (desejado <= atual) return res;

    for (let lvl = atual; lvl < desejado; lvl++) {
        const from = lvl;
        const to = lvl + 1;

        // +0 -> +6 (0->1 ... 5->6): 1 Benção
        if (from >= 0 && from <= 5) {
            res.bencao += 1;
            continue;
        }

        // +6 -> +9: Alma (editável por passo)
        if (from === 6 && to === 7) {
            res.alma += config.steps.alma_6_7;
            continue;
        }
        if (from === 7 && to === 8) {
            res.alma += config.steps.alma_7_8;
            continue;
        }
        if (from === 8 && to === 9) {
            res.alma += config.steps.alma_8_9;
            continue;
        }

        // +9 -> +11: Benção + Alma + Luar (editável)
        if (from === 9 && to === 10) {
            res.bencao += config.steps.bencao_9_10;
            res.alma += config.steps.alma_9_10;
            res.luar += config.steps.luar_9_10;
            continue;
        }
        if (from === 10 && to === 11) {
            res.bencao += config.steps.bencao_10_11;
            res.alma += config.steps.alma_10_11;
            res.luar += config.steps.luar_10_11;
            continue;
        }
    }

    return res;
}

function sumResources(a, b) {
    return {
        bencao: (a.bencao || 0) + (b.bencao || 0),
        alma: (a.alma || 0) + (b.alma || 0),
        luar: (a.luar || 0) + (b.luar || 0),
    };
}

function resourceCost(res, prices) {
    const cB = (res.bencao || 0) * prices.precoBencao;
    const cA = (res.alma || 0) * prices.precoAlma;
    const cL = (res.luar || 0) * prices.precoLuar;
    return { cB, cA, cL, total: cB + cA + cL };
}

function getRowsData() {
    const rows = [...document.querySelectorAll(".item-row")];
    return rows.map((row) => {
        const atual = clampInt(row.querySelector(".sel-atual").value, NIVEL_MIN, NIVEL_MAX);
        const desejado = clampInt(row.querySelector(".sel-desejado").value, NIVEL_MIN, NIVEL_MAX);
        return { row, atual, desejado };
    });
}

// --------------------
// Persistência (localStorage)
// --------------------
function collectStateForSave() {
    const config = readConfigFromUI();

    const rows = getRowsData().map(({ atual, desejado }) => ({ atual, desejado }));

    return {
        version: 1,
        config: { ...config.prices },

        set: rows,
        bulk: {
            atual: $("#bulk-atual")?.value ?? "0",
            desejado: $("#bulk-desejado")?.value ?? "0",
        },
        owned: {
            bencao: $("#owned-bencao")?.value ?? "0",
            alma: $("#owned-alma")?.value ?? "0",
            luar: $("#owned-luar")?.value ?? "0",
        },
    };

}

function saveState() {
    try {
        const state = collectStateForSave();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        // se der erro por storage cheio, só ignora
        console.warn("Falha ao salvar no localStorage:", e);
    }
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        console.warn("Falha ao ler localStorage:", e);
        return null;
    }
}

function applyStateToUI(state) {
    if (!state) return;

    // config
    const c = state.config || {};

    const setVal = (id, v, fallback) => {
        const el = document.getElementById(id);
        if (!el) return;
        const val = v ?? fallback;
        el.value = String(val);
    };
    setVal("preco-bencao", c.precoBencao, DEFAULTS.precoBencao);
    setVal("preco-alma", c.precoAlma, DEFAULTS.precoAlma);
    setVal("preco-luar", c.precoLuar, DEFAULTS.precoLuar);

    // bulk
    if (state.bulk) {
        if ($("#bulk-atual")) $("#bulk-atual").value = String(state.bulk.atual ?? "0");
        if ($("#bulk-desejado")) $("#bulk-desejado").value = String(state.bulk.desejado ?? "0");
    }

    // set (por peça)
    if (Array.isArray(state.set)) {
        const rows = [...document.querySelectorAll(".item-row")];
        rows.forEach((row, idx) => {
            const item = state.set[idx];
            if (!item) return;
            row.querySelector(".sel-atual").value = String(clampInt(item.atual, 0, 11));
            row.querySelector(".sel-desejado").value = String(clampInt(item.desejado, 0, 11));
        });
    }

    if (state.owned) {
        $("#owned-bencao").value = String(Math.max(0, Number(state.owned.bencao ?? 0)));
        $("#owned-alma").value = String(Math.max(0, Number(state.owned.alma ?? 0)));
        $("#owned-luar").value = String(Math.max(0, Number(state.owned.luar ?? 0)));
    }
}

// Reset para default
function resetToDefaults() {
    // config
    $("#preco-bencao").value = String(DEFAULTS.precoBencao);
    $("#preco-alma").value = String(DEFAULTS.precoAlma);
    $("#preco-luar").value = String(DEFAULTS.precoLuar);

    $("#alma-6-7").value = String(DEFAULTS.alma_6_7);
    $("#alma-7-8").value = String(DEFAULTS.alma_7_8);
    $("#alma-8-9").value = String(DEFAULTS.alma_8_9);

    $("#bencao-9-10").value = String(DEFAULTS.bencao_9_10);
    $("#alma-9-10").value = String(DEFAULTS.alma_9_10);
    $("#luar-9-10").value = String(DEFAULTS.luar_9_10);

    $("#bencao-10-11").value = String(DEFAULTS.bencao_10_11);
    $("#alma-10-11").value = String(DEFAULTS.alma_10_11);
    $("#luar-10-11").value = String(DEFAULTS.luar_10_11);

    $("#owned-bencao").value = "0";
    $("#owned-alma").value = "0";
    $("#owned-luar").value = "0";

    // set
    document.querySelectorAll(".sel-atual").forEach((s) => (s.value = "0"));
    document.querySelectorAll(".sel-desejado").forEach((s) => (s.value = "0"));

    // bulk
    $("#bulk-atual").value = "0";
    $("#bulk-desejado").value = "0";

    saveState();
    updateAll();
}

// --------------------
// Update / Render
// --------------------
function updateAll() {
    const warnEl = $("#out-warn");
    if (warnEl) {
        warnEl.hidden = true;
        warnEl.textContent = "";
    }

    const config = readConfigFromUI();

    // Total de recursos necessários
    let totalRes = { bencao: 0, alma: 0, luar: 0 };

    const rowsData = getRowsData();
    for (const { row, atual, desejado } of rowsData) {
        if (desejado < atual && warnEl) {
            warnEl.hidden = false;
            warnEl.textContent =
                "Tem peça com 'Desejado' menor que 'Atual'. Ajuste para calcular corretamente (o sistema ignora custo nesses casos).";
        }

        const r = calcForRange(atual, desejado, config);
        totalRes = sumResources(totalRes, r);

        const { total } = resourceCost(r, config.prices);

        const recEl = row.querySelector(".item-rec");
        const custoEl = row.querySelector(".item-custo");
        if (recEl) recEl.textContent = `Bênção: ${r.bencao} | Alma: ${r.alma} | Luar: ${r.luar}`;
        if (custoEl) custoEl.textContent = moeda(total);
    }

    // Custo TOTAL (comprando tudo)
    const costsAll = resourceCost(totalRes, config.prices);

    // Lê "joias que já tem" (se o HTML ainda não tiver, assume 0 sem quebrar)
    const ownedB = Math.max(0, Number($("#owned-bencao")?.value || 0));
    const ownedA = Math.max(0, Number($("#owned-alma")?.value || 0));
    const ownedL = Math.max(0, Number($("#owned-luar")?.value || 0));

    // Quanto pode ser abatido (não usa mais do que o necessário)
    const usedFromOwned = {
        bencao: Math.min(totalRes.bencao, ownedB),
        alma: Math.min(totalRes.alma, ownedA),
        luar: Math.min(totalRes.luar, ownedL),
    };

    // O que falta comprar
    const needNow = {
        bencao: Math.max(0, totalRes.bencao - ownedB),
        alma: Math.max(0, totalRes.alma - ownedA),
        luar: Math.max(0, totalRes.luar - ownedL),
    };

    // Custos
    const discountCosts = resourceCost(usedFromOwned, config.prices);
    const costsNow = resourceCost(needNow, config.prices);

    // Totais de recursos necessários (cards de total)
    const outB = $("#out-bencao");
    const outA = $("#out-alma");
    const outL = $("#out-luar");
    if (outB) outB.textContent = String(totalRes.bencao);
    if (outA) outA.textContent = String(totalRes.alma);
    if (outL) outL.textContent = String(totalRes.luar);

    // Campos do resumo (se existirem no HTML)
    const outTotalAll = $("#out-total-all");
    const outDiscount = $("#out-discount");
    const outCusto = $("#out-custo");
    if (outTotalAll) outTotalAll.textContent = moeda(costsAll.total);
    if (outDiscount) outDiscount.textContent = moeda(discountCosts.total);

    // Se você ainda não atualizou o HTML do resumo,
    // #out-custo continua existindo e vai mostrar o custo "agora"
    if (outCusto) outCusto.textContent = moeda(costsNow.total);

    // Breakdown (total)
    const outBreakdownNow = $("#out-breakdown-now");
    if (outBreakdownNow) {
        outBreakdownNow.textContent =
            `Você deve comprar Alma: ${needNow.alma}, Luar: ${needNow.luar}`;
    }


    // Salva automaticamente
    saveState();
}



// --------------------
// Tabs
// --------------------
function setupTabs() {
    const buttons = [...document.querySelectorAll(".tab-btn")];

    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            buttons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");

            const key = btn.dataset.tab;
            document.querySelectorAll(".tab-content").forEach((sec) => sec.classList.remove("active"));
            if (key === "aprimorar") $("#tab-aprimorar").classList.add("active");
            if (key === "evolucao") $("#tab-evolucao").classList.add("active");
            if (key === "opcao") $("#tab-opcao").classList.add("active");

            saveState();
        });
    });
}

// --------------------
// Bulk apply
// --------------------
function setupBulkControls() {
    const bulkAtual = $("#bulk-atual");
    const bulkDesejado = $("#bulk-desejado");
    makeLevelOptions(bulkAtual, 0);
    makeLevelOptions(bulkDesejado, 0);

    $("#btn-aplicar-atual").addEventListener("click", () => {
        const v = bulkAtual.value;
        document.querySelectorAll(".sel-atual").forEach((s) => (s.value = v));
        updateAll();
    });

    $("#btn-aplicar-desejado").addEventListener("click", () => {
        const v = bulkDesejado.value;
        document.querySelectorAll(".sel-desejado").forEach((s) => (s.value = v));
        updateAll();
    });

    // salvando quando muda bulk também
    bulkAtual.addEventListener("change", () => saveState());
    bulkDesejado.addEventListener("change", () => saveState());
}

function limparTudo() {
    // limpa localStorage
    localStorage.removeItem(STORAGE_KEY);

    // zera selects do set
    document.querySelectorAll(".sel-atual").forEach((s) => (s.value = "0"));
    document.querySelectorAll(".sel-desejado").forEach((s) => (s.value = "0"));

    // zera bulk
    if ($("#bulk-atual")) $("#bulk-atual").value = "0";
    if ($("#bulk-desejado")) $("#bulk-desejado").value = "0";

    // zera joias que já tem
    if ($("#owned-bencao")) $("#owned-bencao").value = "0";
    if ($("#owned-alma")) $("#owned-alma").value = "0";
    if ($("#owned-luar")) $("#owned-luar").value = "0";

    // zera avisos
    const warnEl = $("#out-warn");
    if (warnEl) {
        warnEl.hidden = true;
        warnEl.textContent = "";
    }

    // recalcula tudo (volta tudo pra zero)
    updateAll();
}


// --------------------
// Wire recalc + modal handlers
// --------------------
function wireRecalc() {
    // inputs do modal
    const configInputs = [
        "#preco-bencao",
        "#preco-alma",
        "#preco-luar",
    ];

    configInputs.forEach((sel) => $(sel).addEventListener("input", updateAll));

    // changes nos selects do set
    document.addEventListener("change", (e) => {
        if (e.target.classList.contains("sel-atual") || e.target.classList.contains("sel-desejado")) {
            updateAll();
        }
    });

    // modal open/close
    $("#btn-settings").addEventListener("click", openSettings);
    $("#btn-close-settings").addEventListener("click", closeSettings);
    $("#btn-close-settings-2").addEventListener("click", closeSettings);

    // fechar clicando fora do modal
    $("#settings-overlay").addEventListener("click", (e) => {
        // fecha se clicar fora do "conteúdo" do modal
        const modal = e.target.closest(".modal");
        if (!modal) closeSettings();
    });

    // ESC fecha
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const overlay = $("#settings-overlay");
            if (overlay.classList.contains("open")) closeSettings();

        }
    });

    // reset
    $("#btn-reset").addEventListener("click", resetToDefaults);

    ["#owned-bencao", "#owned-alma", "#owned-luar"].forEach((sel) => {
        $(sel).addEventListener("input", updateAll);
    });

    const btnLimpar = $("#btn-limpar-tudo");
    if (btnLimpar) {
        btnLimpar.addEventListener("click", () => {
            if (confirm("Deseja limpar todos os dados e começar do zero?")) {
                limparTudo();
            }
        });
    }
}

// --------------------
// Init
// --------------------
document.addEventListener("DOMContentLoaded", () => {
    setupTabs();
    buildSetRows();
    setupBulkControls();

    const state = loadState();
    applyStateToUI(state);

    wireRecalc();
    updateAll();

    closeSettings(); // <- força iniciar fechado
});
