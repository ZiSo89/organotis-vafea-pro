/* ========================================
   Shared UI Primitives
   ======================================== */

const UIPrimitives = {
  icon(name) {
    return name ? `<i class="${Utils.escapeHtml(name)}"></i>` : '';
  },

  statusBadge(label, variant = '') {
    const safeLabel = Utils.escapeHtml(label || '-');
    const safeVariant = Utils.escapeHtml(String(variant || label || '').toLowerCase().replace(/\s+/g, '-'));
    return `<span class="status-pill status-${safeVariant}">${safeLabel}</span>`;
  },

  emptyState({ icon = 'fas fa-inbox', title = 'Δεν υπάρχουν δεδομένα', description = '', cta = '' } = {}) {
    return `
      <div class="empty-state">
        ${this.icon(icon)}
        <h3>${Utils.escapeHtml(title)}</h3>
        ${description ? `<p>${Utils.escapeHtml(description)}</p>` : ''}
        ${cta}
      </div>
    `;
  },

  actionButton({ className = '', icon = '', label = '', title = '', data = {} } = {}) {
    const dataAttrs = Object.entries(data)
      .map(([key, value]) => `data-${Utils.escapeHtml(key)}="${Utils.escapeHtml(String(value))}"`)
      .join(' ');

    return `
      <button class="btn-icon ${Utils.escapeHtml(className)}" ${dataAttrs} title="${Utils.escapeHtml(title || label)}">
        ${this.icon(icon)}
      </button>
    `;
  },

  pageHeader({ title = '', icon = '', subtitle = '', actions = [] } = {}) {
    const actionHtml = actions.map(action => `
      <button type="button" class="btn ${Utils.escapeHtml(action.className || 'btn-primary')}" id="${Utils.escapeHtml(action.id || '')}">
        ${action.icon ? this.icon(action.icon) : ''} ${Utils.escapeHtml(action.label || '')}
      </button>
    `).join('');

    return `
      <div class="view-header ui-page-header">
        <div>
          <h1>${icon ? this.icon(icon) : ''} ${Utils.escapeHtml(title)}</h1>
          ${subtitle ? `<p class="view-subtitle">${Utils.escapeHtml(subtitle)}</p>` : ''}
        </div>
        ${actions.length ? `<div class="view-actions">${actionHtml}</div>` : ''}
      </div>
    `;
  },

  filterBar({ searchId = 'viewSearch', searchPlaceholder = 'Αναζήτηση...', filters = [], chips = [] } = {}) {
    const filterHtml = filters.map(filter => {
      if (filter.type === 'select') {
        return `
          <select id="${Utils.escapeHtml(filter.id)}" class="input filter-bar-select" aria-label="${Utils.escapeHtml(filter.label || '')}">
            ${(filter.options || []).map(opt => `
              <option value="${Utils.escapeHtml(String(opt.value ?? ''))}">${Utils.escapeHtml(opt.label || '')}</option>
            `).join('')}
          </select>
        `;
      }
      return '';
    }).join('');

    const chipsHtml = chips.length ? `
      <div class="filter-chip-row" role="tablist" aria-label="Φίλτρα">
        ${chips.map(chip => `
          <button type="button"
            class="filter-chip ${chip.active ? 'is-active' : ''}"
            data-filter-chip="${Utils.escapeHtml(chip.value)}"
            data-filter-target="${Utils.escapeHtml(chip.target || '')}">
            ${Utils.escapeHtml(chip.label)}
          </button>
        `).join('')}
      </div>
    ` : '';

    return `
      <div class="card filters-card ui-filter-bar">
        <div class="filters">
          <div class="search-box">
            ${this.icon('fas fa-search')}
            <input type="search" id="${Utils.escapeHtml(searchId)}" placeholder="${Utils.escapeHtml(searchPlaceholder)}" />
          </div>
          ${filterHtml}
        </div>
        ${chipsHtml}
      </div>
    `;
  },

  kpiCard({ label, value, icon = '', variant = '', onclick = '' } = {}) {
    return `
      <div class="ui-kpi-card ${variant ? `ui-kpi-card-${Utils.escapeHtml(variant)}` : ''} ${onclick ? 'clickable' : ''}" ${onclick ? `onclick="${onclick}"` : ''}>
        ${icon ? `<div class="ui-kpi-card-icon">${this.icon(icon)}</div>` : ''}
        <div class="ui-kpi-card-body">
          <span class="ui-kpi-card-label">${Utils.escapeHtml(label || '')}</span>
          <strong class="ui-kpi-card-value">${value}</strong>
        </div>
      </div>
    `;
  },

  kpiScrollStrip(cards = []) {
    return `
      <div class="ui-kpi-scroll-strip" aria-label="Σύνοψη KPI">
        ${cards.join('')}
      </div>
    `;
  },

  tabNav({ tabs = [], activeId = '', variant = 'tabs' } = {}) {
    const navClass = variant === 'segmented' ? 'segmented-control' : 'tabs';
    return `
      <div class="${navClass} ui-tab-nav" role="tablist">
        ${tabs.map(tab => `
          <button type="button"
            class="${variant === 'segmented' ? 'segmented-btn' : 'tab-btn'} ${tab.id === activeId ? 'active is-active' : ''}"
            data-tab="${Utils.escapeHtml(tab.id)}"
            role="tab"
            aria-selected="${tab.id === activeId ? 'true' : 'false'}">
            ${tab.icon ? this.icon(tab.icon) : ''} ${Utils.escapeHtml(tab.label || '')}
          </button>
        `).join('')}
      </div>
    `;
  },

  formSection({ title = '', description = '', content = '', span = 2 } = {}) {
    return `
      <div class="form-section span-${span} ui-form-section">
        <h3>${Utils.escapeHtml(title)}</h3>
        ${description ? `<p class="ui-form-section-lead">${Utils.escapeHtml(description)}</p>` : ''}
        ${content}
      </div>
    `;
  },

  formActions({ primary = null, secondary = null, sticky = false } = {}) {
    return `
      <div class="form-actions ui-form-actions ${sticky ? 'is-sticky' : ''}">
        ${primary ? `<button type="${primary.type || 'button'}" class="btn btn-primary" id="${Utils.escapeHtml(primary.id || '')}">${primary.icon ? this.icon(primary.icon) : ''} ${Utils.escapeHtml(primary.label || '')}</button>` : ''}
        ${secondary ? `<button type="${secondary.type || 'button'}" class="btn btn-ghost" id="${Utils.escapeHtml(secondary.id || '')}">${secondary.icon ? this.icon(secondary.icon) : ''} ${Utils.escapeHtml(secondary.label || '')}</button>` : ''}
      </div>
    `;
  },

  mobileListCard({ title = '', subtitle = '', meta = [], actions = [], status = '' } = {}) {
    return `
      <article class="entity-mobile-card">
        <div class="entity-mobile-card-header">
          <div class="entity-mobile-card-title">
            <strong>${title}</strong>
            ${subtitle ? `<span>${Utils.escapeHtml(subtitle)}</span>` : ''}
          </div>
          <div class="entity-mobile-card-actions">
            ${actions.join('')}
          </div>
        </div>
        ${status ? `<div class="entity-mobile-card-status">${status}</div>` : ''}
        ${meta.length ? `
          <div class="entity-mobile-card-meta">
            ${meta.map(item => `
              <div class="entity-mobile-card-meta-item">
                ${item.icon ? this.icon(item.icon) : ''}
                <span>${item.label ? `<small>${Utils.escapeHtml(item.label)}</small>` : ''}${item.value || ''}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </article>
    `;
  },

  collapsiblePanel({ id = '', title = '', content = '', open = false } = {}) {
    return `
      <details class="ui-collapsible ${open ? 'is-open' : ''}" ${open ? 'open' : ''} id="${Utils.escapeHtml(id)}">
        <summary class="ui-collapsible-summary">${Utils.escapeHtml(title)}</summary>
        <div class="ui-collapsible-body">${content}</div>
      </details>
    `;
  },

  accordionItem({ id = '', title = '', icon = '', content = '', open = false } = {}) {
    return `
      <details class="ui-accordion-item" ${open ? 'open' : ''} data-accordion-id="${Utils.escapeHtml(id)}">
        <summary class="ui-accordion-summary">
          ${icon ? this.icon(icon) : ''}
          <span>${Utils.escapeHtml(title)}</span>
        </summary>
        <div class="ui-accordion-body">${content}</div>
      </details>
    `;
  }
};

window.UIPrimitives = UIPrimitives;

/** Global boot / data-load overlay (visible before JS runs via index.html). */
window.AppLoading = {
  get el() {
    return document.getElementById('appLoading');
  },

  show(text = 'Φόρτωση δεδομένων...') {
    const el = this.el;
    const contentArea = document.getElementById('contentArea');
    if (!el) return;
    const textEl = el.querySelector('.app-loading-text');
    if (textEl) textEl.textContent = text;
    el.classList.add('is-visible');
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-app-loading');
    if (contentArea) contentArea.setAttribute('aria-busy', 'true');
  },

  hide() {
    const el = this.el;
    const contentArea = document.getElementById('contentArea');
    if (!el) return;
    el.classList.remove('is-visible');
    el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-app-loading');
    if (contentArea) contentArea.setAttribute('aria-busy', 'false');
  },
};
