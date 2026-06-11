/* ========================================
   Material Identity Helpers
   ======================================== */

const MaterialIdentity = {
  categories: [
    'Χρώμα',
    'Αστάρι',
    'Βερνίκι / Λούστρο',
    'Στόκος / Σπατουλάρισμα',
    'Διαλυτικό / Καθαριστικό',
    'Ταινίες / Προστασία',
    'Ρολά / Πινέλα',
    'Εργαλεία',
    'Άλλο'
  ],

  normalizeText(value) {
    return String(value || '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  greeklishToGreek(value) {
    let text = String(value || '').toLowerCase();
    const replacements = [
      ['th', 'θ'],
      ['ch', 'χ'],
      ['ps', 'ψ'],
      ['ks', 'ξ'],
      ['x', 'ξ'],
      ['mp', 'μπ'],
      ['nt', 'ντ'],
      ['gk', 'γκ'],
      ['ou', 'ου'],
      ['ai', 'αι'],
      ['ei', 'ει'],
      ['oi', 'οι'],
      ['ay', 'αυ'],
      ['av', 'αυ'],
      ['ey', 'ευ'],
      ['ev', 'ευ'],
      ['a', 'α'],
      ['b', 'β'],
      ['c', 'κ'],
      ['d', 'δ'],
      ['e', 'ε'],
      ['f', 'φ'],
      ['g', 'γ'],
      ['h', 'η'],
      ['i', 'ι'],
      ['j', 'τζ'],
      ['k', 'κ'],
      ['l', 'λ'],
      ['m', 'μ'],
      ['n', 'ν'],
      ['o', 'ο'],
      ['p', 'π'],
      ['q', 'κ'],
      ['r', 'ρ'],
      ['s', 'σ'],
      ['t', 'τ'],
      ['u', 'υ'],
      ['v', 'β'],
      ['w', 'ω'],
      ['y', 'υ'],
      ['z', 'ζ']
    ];

    for (const [from, to] of replacements) {
      text = text.replaceAll(from, to);
    }

    return text;
  },

  normalizeSearchText(value) {
    return this.normalizeText(this.greeklishToGreek(value));
  },

  normalizeCode(value) {
    return String(value || '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^\p{L}\p{N}]+/gu, '');
  },

  nameKey(value) {
    const normalized = this.normalizeText(value);
    if (!normalized) return '';
    return normalized.split(' ').filter(Boolean).sort().join(' ');
  },

  normalizeCategory(category) {
    const normalized = this.normalizeText(category);
    if (!normalized) return 'Άλλο';

    const aliases = {
      'χρωματα': 'Χρώμα',
      'χρωμα': 'Χρώμα',
      'ασταρια': 'Αστάρι',
      'ασταρι': 'Αστάρι',
      'βερνικι λουστρο': 'Βερνίκι / Λούστρο',
      'βερνικια λουστρα': 'Βερνίκι / Λούστρο',
      'στοκος σπατουλαρισμα': 'Στόκος / Σπατουλάρισμα',
      'στοκοι σπατουλαρισματα': 'Στόκος / Σπατουλάρισμα',
      'διαλυτικο καθαριστικο': 'Διαλυτικό / Καθαριστικό',
      'διαλυτικα καθαριστικα': 'Διαλυτικό / Καθαριστικό',
      'ταινιες προστασια': 'Ταινίες / Προστασία',
      'ρολα πινελα': 'Ρολά / Πινέλα',
      'εργαλεια': 'Εργαλεία',
      'αλλο': 'Άλλο'
    };

    if (aliases[normalized]) return aliases[normalized];

    const match = this.categories.find(option => this.normalizeText(option) === normalized);
    return match || 'Άλλο';
  },

  buildKey(material = {}) {
    const category = this.normalizeCategory(material.category);
    const categoryKey = this.normalizeText(category);
    const colorCode = material.colorCode ?? material.color_code;
    const codeKey = this.normalizeCode(colorCode);

    if (category === 'Χρώμα' && codeKey) {
      return `category:${categoryKey}|color_code:${codeKey}`;
    }

    return `category:${categoryKey}|name:${this.nameKey(material.name)}`;
  },

  prepare(material = {}) {
    const category = this.normalizeCategory(material.category);
    const colorCode = category === 'Χρώμα'
      ? String(material.colorCode ?? material.color_code ?? '').trim()
      : '';

    const prepared = {
      ...material,
      name: String(material.name || '').trim(),
      category,
      colorCode,
      canonicalKey: ''
    };
    prepared.canonicalKey = this.buildKey(prepared);
    return prepared;
  },

  findDuplicate(materials = [], material = {}, excludeId = null) {
    const key = this.buildKey(material);
    return materials.find(existing => {
      if (excludeId !== null && Number(existing.id) === Number(excludeId)) return false;
      return (existing.canonicalKey || existing.canonical_key || this.buildKey(existing)) === key;
    }) || null;
  },

  similarityScore(a, b) {
    const left = this.normalizeSearchText(a);
    const right = this.normalizeSearchText(b);
    if (!left || !right) return 0;
    if (left === right) return 1;
    if (left.includes(right) || right.includes(left)) return 0.85;

    const leftWords = new Set(left.split(' '));
    const rightWords = right.split(' ');
    const common = rightWords.filter(word => leftWords.has(word)).length;
    return common / Math.max(leftWords.size, rightWords.length);
  },

  findSimilar(materials = [], material = {}, excludeId = null) {
    const category = this.normalizeCategory(material.category);
    const code = this.normalizeCode(material.colorCode ?? material.color_code);
    const exact = this.findDuplicate(materials, material, excludeId);
    if (exact) return exact;

    return materials
      .filter(existing => excludeId === null || Number(existing.id) !== Number(excludeId))
      .filter(existing => this.normalizeCategory(existing.category) === category)
      .map(existing => {
        const existingCode = this.normalizeCode(existing.colorCode ?? existing.color_code);
        const codeMatch = category === 'Χρώμα' && code && existingCode && code === existingCode;
        const score = codeMatch ? 1 : this.similarityScore(existing.name, material.name);
        return { existing, score };
      })
      .filter(result => result.score >= 0.8)
      .sort((a, b) => b.score - a.score)[0]?.existing || null;
  },

  async confirmUseExisting(candidate, existing) {
    if (!existing || typeof Modal === 'undefined' || !Modal.confirm) return false;

    const escape = typeof Utils !== 'undefined' && Utils.escapeHtml
      ? Utils.escapeHtml.bind(Utils)
      : (value) => String(value || '');
    const code = existing.colorCode || existing.color_code;
    const codeText = code ? `, κωδικός ${escape(code)}` : '';

    return await Modal.confirm({
      title: 'Πιθανό διπλό υλικό',
      message: `Βρέθηκε ήδη το υλικό <strong>${escape(existing.name)}</strong> (${escape(existing.category || 'Άλλο')}${codeText}). Θέλετε να χρησιμοποιηθεί αυτό αντί να δημιουργηθεί/γραφτεί νέο;`,
      confirmText: 'Χρήση υπάρχοντος',
      cancelText: 'Συνέχεια με νέο'
    });
  },

  displayLabel(material = {}) {
    const code = material.colorCode || material.color_code;
    const codePart = code ? ` • ${code}` : '';
    return `${material.name || ''}${codePart} • ${material.category || 'Άλλο'} • ${parseFloat(material.stock || 0).toFixed(2)} ${material.unit || ''}`;
  },

  search(materials = [], query = '', limit = 12) {
    const normalizedQuery = this.normalizeSearchText(query);
    const source = Array.isArray(materials) ? materials : [];
    if (!normalizedQuery) return source.slice(0, limit);

    const words = normalizedQuery.split(' ').filter(Boolean);
    return source
      .map(material => {
        const haystack = this.normalizeSearchText([
          material.name,
          material.category,
          material.colorCode || material.color_code,
          this.displayLabel(material)
        ].filter(Boolean).join(' '));
        const matches = words.every(word => haystack.includes(word));
        const startsWithName = this.normalizeSearchText(material.name).startsWith(normalizedQuery);
        return { material, matches, startsWithName };
      })
      .filter(result => result.matches)
      .sort((a, b) => Number(b.startsWithName) - Number(a.startsWithName) || String(a.material.name).localeCompare(String(b.material.name), 'el'))
      .slice(0, limit)
      .map(result => result.material);
  },

  categoryOptions(selected = '') {
    const normalizedSelected = this.normalizeCategory(selected);
    return this.categories.map(category => {
      const isSelected = category === normalizedSelected;
      return `<option value="${category}" ${isSelected ? 'selected' : ''}>${category}</option>`;
    }).join('');
  }
};
