// brain_explorer.js - Interactive Brain Explorer for AI Cognitive Dependence

let brainData = null;
let currentRegion = "pfc";

document.addEventListener("DOMContentLoaded", async () => {
  setupSectionNavigation();
  try {
    if (window.BRAIN_DATA) {
      brainData = window.BRAIN_DATA;
    } else {
      const res = await fetch("data/brain_data.json");
      if (!res.ok) throw new Error("Could not load data/brain_data.json");
      brainData = await res.json();
    }
    initExplorer();
  } catch (err) {
    console.error("Failed to load brain data:", err);
  }
});

function setupSectionNavigation() {
  const validSections = ["home", "teenage-brain", "ai-thinking", "research-data", "the-future"];

  function activateSection(hashId) {
    const cleanId = (hashId || "").replace(/^#/, "");
    const targetId = validSections.includes(cleanId) ? cleanId : "home";

    document.querySelectorAll(".page-section").forEach(sec => {
      if (sec.id === `sec-${targetId}`) {
        sec.classList.add("active-section");
      } else {
        sec.classList.remove("active-section");
      }
    });

    // Highlight active link in top navbar
    document.querySelectorAll(".navbar-nav .nav-link").forEach(link => {
      const href = link.getAttribute("href") || "";
      if (href.endsWith(`#${targetId}`)) {
        link.classList.add("active-tab");
      } else {
        link.classList.remove("active-tab");
      }
    });

    window.scrollTo({ top: 0, behavior: "instant" });

    // Resize Plotly charts when Research & Data section becomes visible
    if (targetId === "research-data") {
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 60);
    }
  }

  // Intercept navbar and quick-nav hash clicks
  document.querySelectorAll('a[href*="#"]').forEach(link => {
    const href = link.getAttribute("href") || "";
    const hashIdx = href.indexOf("#");
    if (hashIdx !== -1) {
      const hashId = href.substring(hashIdx + 1);
      if (validSections.includes(hashId)) {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          history.pushState(null, "", `#${hashId}`);
          activateSection(hashId);
        });
      }
    }
  });

  window.addEventListener("hashchange", () => {
    activateSection(window.location.hash);
  });

  activateSection(window.location.hash);
}

function initExplorer() {
  if (!brainData || !brainData.regions) return;

  // Add click & hover listeners to SVG regions
  const svgRegions = document.querySelectorAll(".brain-region");
  svgRegions.forEach(el => {
    const regId = el.getAttribute("data-region");
    
    // Hover & click events - reveal info on hover!
    el.addEventListener("mouseenter", (e) => {
      selectRegion(regId);
      showTooltip(e, regId);
    });
    el.addEventListener("click", () => selectRegion(regId));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectRegion(regId);
      }
    });
    el.addEventListener("mousemove", (e) => moveTooltip(e));
    el.addEventListener("mouseleave", hideTooltip);
  });

  // Region nav buttons
  const navBtns = document.querySelectorAll(".region-btn");
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const regId = btn.getAttribute("data-reg");
      selectRegion(regId);
    });
  });

  // Select initial region
  selectRegion("pfc");
}

function selectRegion(regId) {
  if (!brainData.regions[regId]) return;
  currentRegion = regId;
  const reg = brainData.regions[regId];

  // Update SVG highlights
  document.querySelectorAll(".brain-region").forEach(el => {
    if (el.getAttribute("data-region") === regId) {
      el.classList.add("selected");
      el.setAttribute("aria-selected", "true");
    } else {
      el.classList.remove("selected");
      el.setAttribute("aria-selected", "false");
    }
  });

  // Update nav buttons
  document.querySelectorAll(".region-btn").forEach(btn => {
    if (btn.getAttribute("data-reg") === regId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Render detail card
  renderDetailCard(reg);
}

function renderDetailCard(reg) {
  const badge = document.getElementById("detail-badge");
  const title = document.getElementById("detail-title");
  const scoreNum = document.getElementById("detail-score-num");
  const highPct = document.getElementById("detail-high-pct");
  const progressBar = document.getElementById("detail-progress-bar");
  const domain = document.getElementById("detail-domain");
  const role = document.getElementById("detail-role");
  const neuro = document.getElementById("detail-neuro");
  const questionsList = document.getElementById("detail-questions");
  const subgroupContainer = document.getElementById("detail-subgroups");

  if (!badge) return;

  const paletteMap = {
    pfc: { hex: "#17283D", rgb: "23, 40, 61" },
    hippocampus: { hex: "#767B6D", rgb: "118, 123, 109" },
    acc: { hex: "#B69A78", rgb: "182, 154, 120" },
    nac: { hex: "#8F7657", rgb: "143, 118, 87" },
    parietal: { hex: "#30343B", rgb: "48, 52, 59" }
  };
  const pal = paletteMap[currentRegion] || { hex: "#17283D", rgb: "23, 40, 61" };

  badge.textContent = reg.domain;
  badge.style.backgroundColor = pal.hex;
  title.textContent = reg.name;
  scoreNum.textContent = reg.mean_score.toFixed(2);
  scoreNum.style.color = pal.hex;
  highPct.textContent = `${reg.high_dependence_pct}% of students score high (≥ 3.5 / 5)`;
  
  // Progress bar out of 5
  const pctOf5 = ((reg.mean_score - 1) / 4) * 100;
  progressBar.style.width = `${pctOf5}%`;
  progressBar.style.backgroundColor = pal.hex;

  domain.textContent = reg.domain;
  role.textContent = reg.role;
  neuro.textContent = reg.neuro_note;
  neuro.style.borderLeftColor = pal.hex;

  // Render questions
  questionsList.innerHTML = reg.questions.map((q, idx) => {
    const d = q.distribution;
    const total = d["Strongly Disagree"] + d["Disagree"] + d["Neutral"] + d["Agree"] + d["Strongly Agree"];
    const pSD = (d["Strongly Disagree"] / total * 100).toFixed(1);
    const pD  = (d["Disagree"] / total * 100).toFixed(1);
    const pN  = (d["Neutral"] / total * 100).toFixed(1);
    const pA  = (d["Agree"] / total * 100).toFixed(1);
    const pSA = (d["Strongly Agree"] / total * 100).toFixed(1);

    return `
      <div class="q-item">
        <div class="q-header">
          <span>${idx + 1}. ${escapeHtml(q.question)}</span>
          <span class="q-score" style="color: ${pal.hex}; background: rgba(${pal.rgb}, 0.14)">${q.mean.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748b; margin-top: 2px;">
          <span>Agreement: <strong>${q.agree_pct}%</strong></span>
          <span>Likert: 1 to 5</span>
        </div>
        <div class="likert-mini-bar" title="SD: ${pSD}%, D: ${pD}%, N: ${pN}%, A: ${pA}%, SA: ${pSA}%">
          <div class="likert-seg seg-sd" style="width: ${pSD}%"></div>
          <div class="likert-seg seg-d"  style="width: ${pD}%"></div>
          <div class="likert-seg seg-n"  style="width: ${pN}%"></div>
          <div class="likert-seg seg-a"  style="width: ${pA}%"></div>
          <div class="likert-seg seg-sa" style="width: ${pSA}%"></div>
        </div>
      </div>
    `;
  }).join("");

  // Subgroup cards
  const acadLevels = reg.by_academic_level;
  const uniTypes = reg.by_university_type.filter(u => u["University Type"] !== "Other");

  let subHtml = "";
  if (acadLevels && acadLevels.length >= 2) {
    acadLevels.forEach(item => {
      subHtml += `
        <div class="subgroup-card">
          <div class="title">${escapeHtml(item["Academic Level"])}</div>
          <div class="val">${item.mean.toFixed(2)} <span style="font-size:0.7rem; font-weight:normal; color:#64748b;">(n=${item.n})</span></div>
        </div>
      `;
    });
  }

  if (uniTypes && uniTypes.length >= 2) {
    uniTypes.forEach(item => {
      subHtml += `
        <div class="subgroup-card">
          <div class="title">${escapeHtml(item["University Type"])}</div>
          <div class="val">${item.mean.toFixed(2)} <span style="font-size:0.7rem; font-weight:normal; color:#64748b;">(n=${item.n})</span></div>
        </div>
      `;
    });
  }

  subgroupContainer.innerHTML = subHtml;
}

// Tooltip logic
let tooltipEl = null;

function getTooltip() {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "brain-tooltip";
    tooltipEl.style.position = "fixed";
    tooltipEl.style.pointerEvents = "none";
    tooltipEl.style.zIndex = "9999";
    tooltipEl.style.background = "#0f172a";
    tooltipEl.style.color = "#ffffff";
    tooltipEl.style.padding = "6px 12px";
    tooltipEl.style.borderRadius = "6px";
    tooltipEl.style.fontSize = "0.8rem";
    tooltipEl.style.fontWeight = "600";
    tooltipEl.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    tooltipEl.style.display = "none";
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function showTooltip(e, regId) {
  if (!brainData || !brainData.regions[regId]) return;
  const reg = brainData.regions[regId];
  const tip = getTooltip();
  tip.style.background = "#17283D";
  tip.style.color = "#E9E4D9";
  tip.style.borderRadius = "0px";
  tip.style.fontFamily = "'Inter', sans-serif";
  tip.style.letterSpacing = "0.04em";
  tip.innerHTML = `<strong>${reg.name}</strong> &mdash; ${reg.mean_score.toFixed(2)} / 5.0`;
  tip.style.display = "block";
  moveTooltip(e);
}

function moveTooltip(e) {
  const tip = getTooltip();
  tip.style.left = `${e.clientX + 14}px`;
  tip.style.top = `${e.clientY + 14}px`;
}

function hideTooltip() {
  const tip = getTooltip();
  tip.style.display = "none";
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
