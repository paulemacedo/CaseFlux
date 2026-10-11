let mode = 'sentence';

const CONVERTERS = {
  sentence: text => text.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (_, prefix, character) => (
    `${prefix}${character.toUpperCase()}`
  )),
  lower: text => text.toLowerCase(),
  upper: text => text.toUpperCase(),
  alternating: text => [...text].map((character, index) => (
    index % 2 ? character.toUpperCase() : character.toLowerCase()
  )).join(''),
  title: text => titleCase(text, true),
  'title-case': text => titleCase(text, false),
  'title-no-minor': text => titleCase(text, false),
  camel: text => words(text).map((word, index) => (
    index ? capitalize(word) : word.toLowerCase()
  )).join(''),
  pascal: text => words(text).map(capitalize).join(''),
  snake: text => words(text).map(word => word.toLowerCase()).join('_'),
  kebab: text => words(text).map(word => word.toLowerCase()).join('-')
};

function words(text) {
  return text
    .replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
    .split(/[\s_\-+=.]+/)
    .filter(Boolean);
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function titleCase(text, useMinorWords = true) {
  const minorWords = useMinorWords ? new Set(getMinorWords()) : new Set();

  return text
    .toLowerCase()
    .split(/(\s+)/)
    .map((part, index, parts) => {
      if (/^\s+$/.test(part) || !part) return part;
      const wordIndex = parts.slice(0, index).filter(item => !/^\s+$/.test(item) && item).length;
      return wordIndex > 0 && minorWords.has(part) ? part : capitalize(part);
    })
    .join('');
}

function showTab(tab) {
  const converterTab = document.getElementById('converterTab');
  const advancedTab = document.getElementById('advancedTab');
  const converterButton = document.getElementById('converterTabButton');
  const advancedButton = document.getElementById('advancedTabButton');
  const isConverter = tab === 'converter';

  converterTab.classList.toggle('hidden', !isConverter);
  advancedTab.classList.toggle('hidden', isConverter);
  converterButton.classList.toggle('active', isConverter);
  advancedButton.classList.toggle('active', !isConverter);
  converterButton.setAttribute('aria-selected', String(isConverter));
  advancedButton.setAttribute('aria-selected', String(!isConverter));
}

function setMode(newMode, element) {
  mode = newMode;
  const container = document.querySelector('.conversion-grid');
  if (!container) return;

  container.querySelectorAll('button').forEach(button => button.classList.remove('active'));
  const button = element || container.querySelector(`button[data-mode="${newMode}"]`);
  if (button) button.classList.add('active');
}

function smartCleanup(text) {
  if (!text) return '';

  return text
    .replace(/_by_/gi, ' - ')
    .replace(/[_\-\+=]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanField(fieldId) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  input.value = smartCleanup(input.value).replace(/[\\/:*?"<>|]/g, '');
}

function invertField(fieldId) {
  const input = document.getElementById(fieldId);
  if (!input) return;

  const value = input.value.trim();
  const separatorIndex = value.lastIndexOf(' - ');
  if (separatorIndex < 0) return;

  const left = value.slice(0, separatorIndex).trim();
  const right = value.slice(separatorIndex + 3).trim();
  if (left && right) input.value = `${right} - ${left}`;
}

function showCopyMessage() {
  const message = document.getElementById('copyMessage');
  message.style.opacity = '1';
  setTimeout(() => {
    message.style.opacity = '0';
  }, 1400);
}

function converterTitleCase(returnOnly = false, useMinorWords = true) {
  const input = document.getElementById('converterInput');
  const result = titleCase(input.value || '', useMinorWords);
  if (!returnOnly) input.value = result;
  return result;
}

function titleCaseString(input, useMinorWords = true) {
  return titleCase(input || '', useMinorWords);
}

function generateConverter() {
  const input = document.getElementById('converterInput');
  const converter = CONVERTERS[mode] || CONVERTERS.sentence;
  input.value = converter(input.value || '');
}

function copyText(value, selectOutput = false) {
  if (!value) return;

  navigator.clipboard.writeText(value).then(() => {
    if (selectOutput) {
      const output = document.getElementById('resultOutput');
      output.focus();
      output.select();
    }
    showCopyMessage();
  }).catch(error => {
    console.error('Não foi possível copiar o texto:', error);
  });
}

function copyConverter() {
  copyText(document.getElementById('converterInput').value);
}

function clearConverter() {
  document.getElementById('converterInput').value = '';
}

function getMinorWords() {
  const input = document.getElementById('minorWords');
  if (!input) return [];

  return [...new Set(input.value
    .toLowerCase()
    .split(',')
    .map(word => word.trim())
    .filter(Boolean))];
}

function generateAdvanced() {
  let title = document.getElementById('titleInput').value || '';
  let author = document.getElementById('authorInput').value || '';
  const minorWordsEnabled = document.getElementById('minorWordsEnabled').checked;
  const autoCleanup = document.getElementById('autoCleanup').checked;
  const unknownAuthor = document.getElementById('unknownAuthor').checked;

  if (autoCleanup) {
    title = smartCleanup(title);
    author = smartCleanup(author);
  }

  const formattedTitle = titleCase(title, minorWordsEnabled);
  const formattedAuthor = titleCase(author, false);
  let output = formattedTitle;

  if (!formattedAuthor && unknownAuthor) {
    output = `Autor Desconhecido - ${formattedTitle}`;
  } else if (formattedAuthor) {
    output = `${formattedAuthor} - ${formattedTitle}`;
  }

  document.getElementById('resultOutput').value = output;
}

function copyAdvanced() {
  copyText(document.getElementById('resultOutput').value || '', true);
}

function clearAdvanced() {
  document.getElementById('titleInput').value = '';
  document.getElementById('authorInput').value = '';
  document.getElementById('resultOutput').value = '';
}

function toggleMinorWords() {
  const enabled = document.getElementById('minorWordsEnabled').checked;
  document.getElementById('minorWordsBox').style.display = enabled ? 'block' : 'none';
}

function toggleAuthorField() {
  const enabled = document.getElementById('detectAuthor').checked;
  document.getElementById('authorField').style.display = enabled ? 'none' : 'block';
}

function toggleSettings() {
  const panel = document.getElementById('settingsPanel');
  const gear = document.getElementById('gearToggle');
  if (!panel || !gear) return;
  const isHidden = panel.classList.toggle('hidden');
  gear.setAttribute('aria-pressed', String(!isHidden));
}

window.addEventListener('DOMContentLoaded', () => {
  setMode(mode);
  showTab('converter');
  document.getElementById('settingsPanel').classList.add('hidden');
  toggleMinorWords();
});
