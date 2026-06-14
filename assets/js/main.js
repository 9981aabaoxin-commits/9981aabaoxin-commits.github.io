const REQUIRED_YEARS = [2026, 2027, 2028];
const TOPIC_OPTIONS = [
  "锂离子电池",
  "钠离子电池",
  "固态电池",
  "锌离子电池",
  "储能系统",
  "电池安全",
  "电池材料"
];

const state = {
  projects: [],
  filters: {
    search: "",
    year: "all",
    topic: "all",
    featured: false
  }
};

const els = {
  statProjects: document.querySelector("#stat-projects"),
  yearNavList: document.querySelector("#year-nav-list"),
  resultCount: document.querySelector("#result-count"),
  filtersForm: document.querySelector("#project-filters"),
  searchInput: document.querySelector("#search-input"),
  yearFilter: document.querySelector("#year-filter"),
  topicFilter: document.querySelector("#topic-filter"),
  featuredFilter: document.querySelector("#featured-filter"),
  backToTop: document.querySelector("#back-to-top")
};

async function loadProjects() {
  try {
    const response = await fetch("data/projects.json");
    if (!response.ok) {
      throw new Error(`项目数据加载失败：${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data.projects) ? data.projects : [];
  } catch (error) {
    return loadEmbeddedProjects(error);
  }
}

function loadEmbeddedProjects(originalError) {
  const fallback = document.querySelector("#project-data-fallback");
  if (!fallback) {
    throw originalError;
  }

  try {
    const data = JSON.parse(fallback.textContent);
    return Array.isArray(data.projects) ? data.projects : [];
  } catch {
    throw originalError;
  }
}

function uniqueValues(projects, key) {
  return [...new Set(projects.map((project) => project[key]).filter(Boolean))];
}

function sortProjects(projects) {
  return [...projects].sort((a, b) => {
    if (b.featured !== a.featured) {
      return Number(b.featured) - Number(a.featured);
    }
    return String(a.group).localeCompare(String(b.group), "zh-CN", { numeric: true });
  });
}

function setupFilters(projects) {
  fillSelect(els.yearFilter, REQUIRED_YEARS, "学年");
  fillSelect(els.topicFilter, TOPIC_OPTIONS, "");

  els.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    renderPage();
  });

  els.yearFilter.addEventListener("change", (event) => {
    state.filters.year = event.target.value;
    renderPage();
  });

  els.topicFilter.addEventListener("change", (event) => {
    state.filters.topic = event.target.value;
    renderPage();
  });

  els.featuredFilter.addEventListener("change", (event) => {
    state.filters.featured = event.target.checked;
    renderPage();
  });

  els.filtersForm.addEventListener("reset", () => {
    window.setTimeout(() => {
      state.filters.search = "";
      state.filters.year = "all";
      state.filters.topic = "all";
      state.filters.featured = false;
      renderPage();
    }, 0);
  });
}

function fillSelect(select, values, suffix) {
  select.insertAdjacentHTML(
    "beforeend",
    values.map((value) => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}${suffix}</option>`).join("")
  );
}

function renderPage() {
  const filtered = getFilteredProjects();
  renderStats();
  renderYearNavigation(filtered);
  renderYearSections(filtered);
  els.resultCount.textContent = `${filtered.length} 个项目`;
}

function renderStats() {
  els.statProjects.textContent = state.projects.length;
}

function renderYearNavigation(projects) {
  els.yearNavList.innerHTML = REQUIRED_YEARS.map((year) => {
    const allCount = projects.filter((project) => project.year === year).length;
    const featuredCount = projects.filter((project) => project.year === year && project.featured).length;
    const status = allCount > 0 ? `${allCount} 个项目 · ${featuredCount} 个优秀作品` : "待更新";
    return `
      <a class="year-nav-card" href="#year-${year}" data-scroll-year="${year}">
        <span>${year}学年</span>
        <strong>${status}</strong>
      </a>
    `;
  }).join("");
}

function renderYearSections(projects) {
  REQUIRED_YEARS.forEach((year) => {
    const section = document.querySelector(`[data-year-section="${year}"]`);
    const yearProjects = sortProjects(projects.filter((project) => project.year === year));
    const featuredProjects = yearProjects.filter((project) => project.featured);
    const allGrid = document.querySelector(`[data-render="all"][data-year="${year}"]`);
    const featuredGrid = document.querySelector(`[data-render="featured"][data-year="${year}"]`);
    const count = document.querySelector(`[data-year-count="${year}"]`);

    section.hidden = state.filters.year !== "all" && state.filters.year !== String(year);
    count.textContent = yearProjects.length > 0 ? `${yearProjects.length} 个项目` : "待更新";
    featuredGrid.innerHTML = renderProjectList(featuredProjects, "优秀作品待更新");
    allGrid.innerHTML = renderProjectList(yearProjects, "全部作品待更新");
  });
}

function renderProjectList(projects, emptyText) {
  if (projects.length === 0) {
    return `
      <div class="empty-state">
        <strong>本学年作品待更新。</strong>
        <span>${escapeHtml(emptyText)}</span>
      </div>
    `;
  }
  return projects.map((project) => projectCard(project)).join("");
}

function getFilteredProjects() {
  return sortProjects(state.projects).filter((project) => {
    const yearMatch = state.filters.year === "all" || String(project.year) === state.filters.year;
    const topicMatch = state.filters.topic === "all" || getProjectTopics(project).includes(state.filters.topic);
    const featuredMatch = !state.filters.featured || project.featured;
    return yearMatch && topicMatch && featuredMatch && matchesSearch(project, state.filters.search);
  });
}

function matchesSearch(project, search) {
  if (!search) {
    return true;
  }

  const haystack = [
    project.year,
    project.group,
    project.title,
    project.category,
    project.description,
    ...getProjectTopics(project),
    ...(project.members || []),
    ...(project.keywords || [])
  ].join(" ").toLowerCase();

  return haystack.includes(search);
}

function getProjectTopics(project) {
  const text = [
    project.title,
    project.category,
    project.description,
    ...(project.keywords || [])
  ].join(" ");
  const topics = [];

  if (/(锂离子|锂硫|磷酸铁锂)/.test(text)) {
    topics.push("锂离子电池");
  }
  if (/钠离子/.test(text)) {
    topics.push("钠离子电池");
  }
  if (/固态/.test(text)) {
    topics.push("固态电池");
  }
  if (/锌/.test(text)) {
    topics.push("锌离子电池");
  }
  if (/(储能系统|储能|BMS|系统分析)/i.test(text)) {
    topics.push("储能系统");
  }
  if (/(安全|热失控|热管理|保护|预警|副反应)/.test(text)) {
    topics.push("电池安全");
  }
  if (/(材料|正极|负极|电解液|隔膜|电解质|界面|硫正极)/.test(text)) {
    topics.push("电池材料");
  }

  return topics;
}

function projectCard(project) {
  const hasWebsite = project.url && project.url !== "#";
  const action = hasWebsite
    ? `<a class="button work-button" href="${escapeAttribute(project.url)}" target="_blank" rel="noopener noreferrer">查看作品</a>`
    : `<span class="button work-button disabled" aria-disabled="true">待更新</span>`;

  return `
    <article class="work-card">
      <a class="work-cover ${hasWebsite ? "" : "cover-disabled"}" ${hasWebsite ? `href="${escapeAttribute(project.url)}" target="_blank" rel="noopener noreferrer"` : ""} aria-label="${escapeAttribute(project.title)}">
        <img src="${escapeAttribute(project.cover)}" alt="${escapeAttribute(project.title)}封面">
      </a>
      <div class="work-body">
        <div class="work-meta">
          <span>${escapeHtml(project.year)}学年</span>
          <span>${escapeHtml(formatGroup(project.group))}</span>
          <time datetime="${escapeAttribute(project.date)}">${escapeHtml(project.date)}</time>
        </div>
        <h3>${escapeHtml(project.title)}</h3>
        <p class="work-description">${escapeHtml(project.description)}</p>
        <div class="work-info">
          <strong>小组成员</strong>
          <span>${escapeHtml((project.members || []).join("、"))}</span>
        </div>
        <div class="work-footer">
          <span class="category">${escapeHtml(project.category)}</span>
          ${action}
        </div>
      </div>
    </article>
  `;
}

function formatGroup(group) {
  const match = String(group).match(/(\d+)/);
  return match ? `第${match[1].padStart(2, "0")}组` : String(group);
}

function setupBackToTop() {
  els.backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", () => {
    els.backToTop.classList.toggle("is-visible", window.scrollY > 420);
  }, { passive: true });
}

function setupYearNavigation() {
  els.yearNavList.addEventListener("click", (event) => {
    const link = event.target.closest("[data-scroll-year]");
    if (!link) {
      return;
    }
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) {
      return;
    }
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

async function init() {
  setupBackToTop();
  setupYearNavigation();

  try {
    state.projects = await loadProjects();
    setupFilters(state.projects);
    renderPage();
  } catch (error) {
    document.querySelectorAll(".work-grid").forEach((grid) => {
      grid.innerHTML = `
        <div class="empty-state">
          <strong>待更新</strong>
          <span>${escapeHtml(error.message)}</span>
        </div>
      `;
    });
  }
}

init();
