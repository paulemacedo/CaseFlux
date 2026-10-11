'use strict';

/* ==========================================================================
   CaseFlux
   1. Conversão (funções puras)   2. Estado e armazenamento
   3. Interface do conversor      4. Nomes de arquivo
   5. Tema, abas, diálogo, aviso  6. Inicialização
   ========================================================================== */

const STORE_KEY = 'caseflux:v1';
const SAMPLE = 'o senhor dos anéis';

const DEFAULT_MINOR = [
  'a', 'à', 'às', 'ao', 'aos', 'as', 'com', 'da', 'das', 'de', 'dela', 'dele', 'deles', 'delas',
  'do', 'dos', 'e', 'em', 'na', 'nas', 'no', 'nos', 'o', 'os', 'ou', 'para', 'pela', 'pelas',
  'pelo', 'pelos', 'por', 'se', 'um', 'uma', 'uns', 'umas',
  'y', 'en', 'el', 'la', 'las', 'los', 'del', 'al', 'con', 'sin', 'sobre', 'un', 'una', 'unos', 'unas',
  'the', 'of', 'and', 'in', 'on', 'to', 'for', 'from', 'with', 'without', 'over', 'under'
].join(', ');

/* ---------- 1. Conversão ---------- */

let minorSet = new Set();

function words(text) {
  return text
    .normalize('NFC')
    .replace(/['’]/g, '')
    .replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean);
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function titleCase(text, useMinorWords = true) {
  let wordIndex = 0;

  return text
    .toLowerCase()
    .split(/(\s+)/)
    .map(part => {
      if (!part || /^\s+$/.test(part)) return part;
      const keepLower = useMinorWords && wordIndex > 0 && minorSet.has(part);
      wordIndex += 1;
      return keepLower ? part : capitalize(part);
    })
    .join('');
}

function smartCleanup(text) {
  if (!text) return '';

  // \u0000 protege o separador " - " (e "_by_") das trocas seguintes
  return text
    .replace(/_by_/gi, '\u0000')
    .replace(/\s-\s/g, '\u0000')
    .replace(/[_\-+=]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ ?\u0000 ?/g, ' - ');
}

const lowerWords = text => words(text).map(word => word.toLowerCase());

const FORMATS = [
  {
    id: 'sentence', label: 'Frase', group: 'text',
    run: text => text.toLowerCase().replace(
      /(^\s*|[.!?]\s+|\n\s*)(\p{L})/gu,
      (_, prefix, character) => prefix + character.toUpperCase()
    )
  },
  { id: 'lower', label: 'minúsculas', group: 'text', run: text => text.toLowerCase() },
  { id: 'upper', label: 'MAIÚSCULAS', group: 'text', run: text => text.toUpperCase() },
  {
    id: 'alternating', label: 'aLtErNaDo', group: 'text',
    run: text => [...text].map((character, index) => (
      index % 2 ? character.toUpperCase() : character.toLowerCase()
    )).join('')
  },
  { id: 'title', label: 'Título', group: 'text', run: text => titleCase(text, true) },
  { id: 'title-all', label: 'Título (todas as iniciais)', group: 'text', run: text => titleCase(text, false) },

  {
    id: 'camel', label: 'camelCase', group: 'code',
    run: text => words(text).map((word, index) => (index ? capitalize(word) : word.toLowerCase())).join('')
  },
  { id: 'pascal', label: 'PascalCase', group: 'code', run: text => words(text).map(capitalize).join('') },
  { id: 'snake', label: 'snake_case', group: 'code', run: text => lowerWords(text).join('_') },
  { id: 'kebab', label: 'kebab-case', group: 'code', run: text => lowerWords(text).join('-') },
  { id: 'constant', label: 'CONSTANT_CASE', group: 'code', run: text => lowerWords(text).join('_').toUpperCase() },
  { id: 'dot', label: 'dot.case', group: 'code', run: text => lowerWords(text).join('.') }
];

const FORMAT_BY_ID = Object.fromEntries(FORMATS.map(format => [format.id, format]));

/* ---------- 2. Estado e armazenamento ---------- */

const TABS = ['converter', 'files'];

const DEFAULTS = {
  theme: 'auto',
  tab: 'converter',
  minorEnabled: true,
  minorWords: DEFAULT_MINOR,
  autoCleanup: true,
  unknownAuthor: false,
  invert: false,
  stripInvalid: true
};

function readStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

const state = { ...DEFAULTS, ...readStore() };
if (!TABS.includes(state.tab)) state.tab = DEFAULTS.tab;
if (typeof state.minorWords !== 'string') state.minorWords = DEFAULT_MINOR;

function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* armazenamento indisponível: o app continua funcionando sem salvar */
  }
}

function refreshMinorWords() {
  minorSet = state.minorEnabled
    ? new Set(state.minorWords.toLowerCase().split(',').map(word => word.trim()).filter(Boolean))
    : new Set();
}

/* ---------- referências ---------- */

const $ = id => document.getElementById(id);
const root = document.documentElement;

const els = {
  input: $('converterInput'),
  formats: $('formats'),
  wordCount: $('wordCount'),
  charCount: $('charCount'),
  pasteBtn: $('pasteBtn'),
  clearBtn: $('clearBtn'),
  author: $('authorInput'),
  title: $('titleInput'),
  fileResult: $('fileResult'),
  fileCopy: $('fileCopy'),
  fileClear: $('fileClear'),
  tablist: $('tablist'),
  themeBtn: $('themeToggle'),
  themeIcon: $('themeIcon'),
  minorOpen: $('minorOpen'),
  minorDialog: $('minorDialog'),
  minorEnabled: $('minorEnabled'),
  minorWords: $('minorWords'),
  minorReset: $('minorReset'),
  toast: $('toast')
};

const previews = {};

/* ---------- 3. Interface do conversor ---------- */

function buildFormatLists() {
  const lists = { text: $('listText'), code: $('listCode') };

  FORMATS.forEach(format => {
    const item = document.createElement('li');
    item.className = 'spec';
    item.dataset.id = format.id;
    item.innerHTML = `
      <button class="spec-main" type="button" data-copy="${format.id}">
        <span class="spec-name"></span>
        <span class="spec-text"><span></span></span>
        <svg class="spec-copy" aria-hidden="true"><use href="#i-copy"/></svg>
      </button>
      <button class="spec-apply" type="button" data-apply="${format.id}" title="Usar como texto">
        <svg class="ico" aria-hidden="true"><use href="#i-apply"/></svg>
      </button>`;

    const name = item.querySelector('.spec-name');
    name.textContent = format.label;
    item.querySelector('.spec-main').insertAdjacentHTML('afterbegin', '<span class="sr-only">Copiar </span>');
    item.querySelector('.spec-apply').setAttribute('aria-label', `Usar ${format.label} como texto`);

    previews[format.id] = item.querySelector('.spec-text > span');
    lists[format.group].appendChild(item);
  });
}

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

function renderCounts(text) {
  const trimmed = text.trim();
  const wordTotal = trimmed ? trimmed.split(/\s+/).length : 0;
  els.wordCount.textContent = plural(wordTotal, 'palavra', 'palavras');
  els.charCount.textContent = plural([...text].length, 'caractere', 'caracteres');
}

function renderFormats() {
  const raw = els.input.value;
  const isSample = !raw.trim();
  const source = isSample ? SAMPLE : raw;

  els.formats.dataset.sample = String(isSample);
  FORMATS.forEach(format => {
    previews[format.id].textContent = format.run(source);
  });
  renderCounts(raw);
}

let frame = 0;
function scheduleRender() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    renderFormats();
  });
}

function markCopied(item) {
  if (!item) return;
  item.classList.remove('copied');
  void item.offsetWidth; // reinicia a animação se o usuário copiar de novo
  item.classList.add('copied');
  setTimeout(() => item.classList.remove('copied'), 1300);
}

async function copyFormat(id) {
  const format = FORMAT_BY_ID[id];
  const value = els.input.value;

  if (!value.trim()) {
    showToast('Digite ou cole um texto primeiro.');
    els.input.focus();
    return;
  }

  const copied = await writeClipboard(format.run(value));
  if (copied) {
    markCopied(els.formats.querySelector(`.spec[data-id="${id}"]`));
    showToast(`Copiado: ${format.label}`);
  } else {
    showToast('Não foi possível copiar.');
  }
}

function applyFormat(id) {
  const format = FORMAT_BY_ID[id];
  if (!els.input.value.trim()) {
    showToast('Digite ou cole um texto primeiro.');
    els.input.focus();
    return;
  }

  els.input.value = format.run(els.input.value);
  renderFormats();
  els.input.focus();
  showToast(`Aplicado: ${format.label}`);
}

async function pasteIntoInput() {
  try {
    els.input.value = await navigator.clipboard.readText();
    renderFormats();
    els.input.focus();
  } catch {
    showToast('Não foi possível colar. Use Ctrl+V.');
    els.input.focus();
  }
}

/* ---------- 4. Nomes de arquivo ---------- */

function buildFileName() {
  let title = els.title.value;
  let author = els.author.value;

  if (state.autoCleanup) {
    title = smartCleanup(title);
    author = smartCleanup(author);
  }

  const formattedTitle = titleCase(title.trim(), true);
  let formattedAuthor = titleCase(author.trim(), true);

  if (!formattedAuthor && state.unknownAuthor && formattedTitle) {
    formattedAuthor = 'Autor Desconhecido';
  }

  const parts = [formattedAuthor, formattedTitle].filter(Boolean);
  if (state.invert) parts.reverse();

  let name = parts.join(' - ');
  if (state.stripInvalid) name = name.replace(/[\\/:*?"<>|]/g, '');
  return name.replace(/\s{2,}/g, ' ').trim();
}

function renderFile() {
  const name = buildFileName();
  els.fileResult.textContent = name || 'O nome do arquivo aparece aqui.';
  els.fileResult.dataset.empty = String(!name);
}

async function copyFileName() {
  const name = buildFileName();
  if (!name) {
    showToast('Preencha autor ou título primeiro.');
    return;
  }
  const copied = await writeClipboard(name);
  showToast(copied ? 'Nome copiado' : 'Não foi possível copiar.');
}

function clearFileFields() {
  els.author.value = '';
  els.title.value = '';
  renderFile();
  els.author.focus();
}

/* ---------- 5. Tema, abas, diálogo, aviso ---------- */

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.cssText = 'position:fixed;top:0;opacity:0';
    document.body.appendChild(helper);
    helper.select();

    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    helper.remove();
    return ok;
  }
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = '';
  // limpa e preenche no quadro seguinte para o leitor de tela anunciar de novo
  requestAnimationFrame(() => {
    els.toast.textContent = message;
    els.toast.classList.add('show');
  });
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1800);
}

const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function effectiveTheme() {
  if (state.theme === 'light' || state.theme === 'dark') return state.theme;
  return darkQuery && darkQuery.matches ? 'dark' : 'light';
}

function applyTheme() {
  if (state.theme === 'light' || state.theme === 'dark') root.dataset.theme = state.theme;
  else delete root.dataset.theme;

  const dark = effectiveTheme() === 'dark';
  const label = dark ? 'Usar tema claro' : 'Usar tema escuro';
  els.themeIcon.setAttribute('href', dark ? '#i-sun' : '#i-moon');
  els.themeBtn.setAttribute('aria-label', label);
  els.themeBtn.title = label;
}

function showTab(tab, moveFocus = false) {
  state.tab = tab;

  TABS.forEach(name => {
    const button = $(`tab-${name}`);
    const selected = name === tab;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    $(`panel-${name}`).hidden = !selected;
    if (selected && moveFocus) button.focus();
  });

  persist();
}

function openMinorDialog() {
  els.minorEnabled.checked = state.minorEnabled;
  els.minorWords.value = state.minorWords;
  els.minorWords.disabled = !state.minorEnabled;

  if (typeof els.minorDialog.showModal === 'function') els.minorDialog.showModal();
  else els.minorDialog.setAttribute('open', '');
}

function onMinorChange() {
  state.minorEnabled = els.minorEnabled.checked;
  state.minorWords = els.minorWords.value;
  els.minorWords.disabled = !state.minorEnabled;
  refreshMinorWords();
  persist();
  renderFormats();
  renderFile();
}

/* ---------- 6. Inicialização ---------- */

function bindEvents() {
  // conversor
  els.input.addEventListener('input', scheduleRender);
  els.pasteBtn.addEventListener('click', pasteIntoInput);
  els.clearBtn.addEventListener('click', () => {
    els.input.value = '';
    renderFormats();
    els.input.focus();
  });

  els.formats.addEventListener('click', event => {
    const copyButton = event.target.closest('[data-copy]');
    const applyButton = event.target.closest('[data-apply]');
    if (copyButton) copyFormat(copyButton.dataset.copy);
    else if (applyButton) applyFormat(applyButton.dataset.apply);
  });

  // nomes de arquivo
  els.author.addEventListener('input', renderFile);
  els.title.addEventListener('input', renderFile);
  els.fileCopy.addEventListener('click', copyFileName);
  els.fileClear.addEventListener('click', clearFileFields);

  const toggles = {
    optAutoClean: 'autoCleanup',
    optUnknown: 'unknownAuthor',
    optInvert: 'invert',
    optStrip: 'stripInvalid'
  };
  Object.entries(toggles).forEach(([id, key]) => {
    const checkbox = $(id);
    checkbox.checked = Boolean(state[key]);
    checkbox.addEventListener('change', () => {
      state[key] = checkbox.checked;
      persist();
      renderFile();
    });
  });

  // abas
  els.tablist.addEventListener('click', event => {
    const button = event.target.closest('[data-tab]');
    if (button) showTab(button.dataset.tab);
  });

  els.tablist.addEventListener('keydown', event => {
    const current = TABS.indexOf(state.tab);
    let next;
    if (event.key === 'ArrowRight') next = (current + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;

    event.preventDefault();
    showTab(TABS[next], true);
  });

  // tema
  els.themeBtn.addEventListener('click', () => {
    state.theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
    persist();
    applyTheme();
  });
  if (darkQuery && darkQuery.addEventListener) {
    darkQuery.addEventListener('change', () => {
      if (state.theme === 'auto') applyTheme();
    });
  }

  // palavras menores
  els.minorOpen.addEventListener('click', openMinorDialog);
  els.minorEnabled.addEventListener('change', onMinorChange);
  els.minorWords.addEventListener('input', onMinorChange);
  els.minorReset.addEventListener('click', () => {
    els.minorWords.value = DEFAULT_MINOR;
    onMinorChange();
  });
  els.minorDialog.addEventListener('click', event => {
    if (event.target === els.minorDialog) els.minorDialog.close();
  });
}

function init() {
  refreshMinorWords();
  buildFormatLists();
  bindEvents();
  applyTheme();
  showTab(state.tab);
  renderFormats();
  renderFile();
}

init();