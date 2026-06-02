let mode = 'sentence';

function showTab(tab) {
  const converterTab = document.getElementById('converterTab');
  const advancedTab = document.getElementById('advancedTab');

  const converterButton = document.getElementById('converterTabButton');
  const advancedButton = document.getElementById('advancedTabButton');

  if (tab === 'converter') {
    converterTab.classList.remove('hidden');
    advancedTab.classList.add('hidden');

    converterButton.classList.add('active');
    advancedButton.classList.remove('active');
  } else {
    advancedTab.classList.remove('hidden');
    converterTab.classList.add('hidden');

    advancedButton.classList.add('active');
    converterButton.classList.remove('active');
  }
}

function setMode(newMode, el) {
  // atualiza estado lógico
  mode = newMode;

  // remove active anterior
  const container = document.querySelector('.conversion-grid');
  if (container) {
    const prev = container.querySelector('button.active');
    if (prev) prev.classList.remove('active');
  }

  // se um elemento foi passado, marca ele; senão procura pelo data-mode
  let btn = el;
  if (!btn) btn = container ? container.querySelector(`button[data-mode="${newMode}"]`) : null;
  if (btn) btn.classList.add('active');
}

function smartCleanup(text) {
  if (!text) return '';

  // Preserve author separators like " - " or patterns like "_by_"
  // placeholder must NOT contain '_' or '-' to survive replacement step
  const SEP_PLACEHOLDER = '<<<AUTHORSEP123>>>';
  let hadSep = false;

  // Normalize common "by" filename markers to a separator placeholder
  if (/_by_/i.test(text)) {
    text = text.replace(/_by_/ig, SEP_PLACEHOLDER);
    hadSep = true;
  }

  // Preserve spaced hyphen separators (e.g. "Author Name - Title")
  if (!hadSep && /\s-\s/.test(text)) {
    text = text.replace(/\s-\s/g, SEP_PLACEHOLDER);
    hadSep = true;
  }

  // Replace remaining underscores, hyphens, pluses and equals with a single space
  text = text.replace(/[_\-\+=]+/g, ' ');

  // Collapse consecutive whitespace and trim
  text = text.replace(/\s+/g, ' ').trim();

  // Restore preserved separator as ` - ` (space-dash-space)
  if (hadSep) {
    text = text.replace(new RegExp(SEP_PLACEHOLDER, 'g'), ' - ');
  }

  return text;
}

function cleanInvalidManual() {
  // kept for compatibility: no-op (use cleanField instead)
}

function invertContentManual() {
  // kept for compatibility: no-op (use invertField instead)
}

function cleanField(fieldId) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  const cleaned = smartCleanup(input.value).replace(/[\\/:*?"<>|]/g, '');
  input.value = cleaned;
}

function invertField(fieldId) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  const value = (input.value || '').trim();
  if (!value) return;

  // If contains ' - ' assume "left - right" and invert
  if (value.indexOf(' - ') !== -1) {
    const idx = value.lastIndexOf(' - ');
    const left = value.slice(0, idx).trim();
    const right = value.slice(idx + 3).trim();
    if (left && right) {
      input.value = `${right} - ${left}`;
      return;
    }
  }

  // Otherwise, just reverse the whole string
  input.value = value.split('').reverse().join('');
}

function showCopyMessage() {
  const message = document.getElementById('copyMessage');

  message.style.opacity = '1';

  setTimeout(() => {
    message.style.opacity = '0';
  }, 1400);
}

function converterTitleCase(returnOnly = false, useMinorWords = true) {
  let text = document.getElementById('converterInput').value || '';
  text = smartCleanup(text);
  const minorWords = useMinorWords ? getMinorWords() : [];

  text = text
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index !== 0 && minorWords.includes(word)) return word;
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

  if (returnOnly) return text;
  document.getElementById('converterInput').value = text;
  return text;
}

// Title-case a standalone string (doesn't read/write DOM)
function titleCaseString(input, useMinorWords = true) {
  let text = input || '';
  text = smartCleanup(text);
  const minorWords = useMinorWords ? getMinorWords() : [];

  text = text
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index !== 0 && minorWords.includes(word)) return word;
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

  return text;
}

// If text contains a separator indicating an author, reorder to "Author - Title"
function reorderAuthorIfNeeded(text) {
  if (!text || text.indexOf(' - ') === -1) return text;

  // Use last ' - ' as separator (in case title contains dashes)
  const idx = text.lastIndexOf(' - ');
  const left = text.slice(0, idx).trim();
  const right = text.slice(idx + 3).trim();

  const rightWords = right.split(' ').filter(Boolean).length;
  const leftWords = left.split(' ').filter(Boolean).length;

  // Heuristic: shorter right side and few words -> likely author
  const likelyAuthor = (rightWords <= 4 && right.length < left.length) || /[A-Z]\./.test(right) || /by\b/i.test(text);

  if (!likelyAuthor) return text;

  const author = titleCaseString(right, false);
  const title = titleCaseString(left, true);

  return `${author} - ${title}`;
}

function generateConverter() {
  let text = document.getElementById('converterInput').value;

  switch (mode) {
    case 'sentence':
      text = text.toLowerCase();
      text = text.charAt(0).toUpperCase() + text.slice(1);
      break;

    case 'lower':
      text = text.toLowerCase();
      break;

    case 'upper':
      text = text.toUpperCase();
      break;

    case 'title':
      text = converterTitleCase(true, true);
      break;

    case 'camel':
      text = smartCleanup(text)
        .toLowerCase()
        .split(' ')
        .map((word, index) => {
          if (index === 0) return word;

          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join('');
      break;

    case 'pascal':
      text = smartCleanup(text)
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
      break;

    case 'snake':
      text = smartCleanup(text)
        .toLowerCase()
        .replace(/\s+/g, '_');
      break;

    case 'kebab':
      text = smartCleanup(text)
        .toLowerCase()
        .replace(/\s+/g, '-');
      break;

    case 'alternating':
      text = text
        .split('')
        .map((char, index) => {
          return index % 2 === 0 ? char.toLowerCase() : char.toUpperCase();
        })
        .join('');
      break;

    case 'title-case':
    case 'title-no-minor':
      text = converterTitleCase(true, false);
      break;
  }

  // Final cleanup and author reordering detection
  text = smartCleanup(text);
  text = reorderAuthorIfNeeded(text);

  document.getElementById('converterInput').value = text;
}

function copyConverter() {
  navigator.clipboard
    .writeText(document.getElementById('converterInput').value)
    .then(showCopyMessage);
}

function clearConverter() {
  document.getElementById('converterInput').value = '';
}

function getMinorWords() {
  return document
    .getElementById('minorWords')
    .value
    .toLowerCase()
    .split(',')
    .map(word => word.trim())
    .filter(Boolean);
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

  const minorWords = getMinorWords();

  const formattedTitle = title
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (minorWordsEnabled && minorWords.includes(word) && index !== 0) return word;
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

  const formattedAuthor = author
    .toLowerCase()
    .split(' ')
    .map(word => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .filter(Boolean)
    .join(' ');

  let output = formattedTitle;
  if (!formattedAuthor && unknownAuthor) {
    output = `Autor Desconhecido - ${formattedTitle}`;
  } else if (formattedAuthor) {
    output = `${formattedAuthor} - ${formattedTitle}`;
  }

  document.getElementById('resultOutput').value = output;
}

function copyAdvanced() {
  const value = document.getElementById('resultOutput').value || '';
  if (!value) return;
  navigator.clipboard.writeText(value).then(() => {
    // briefly select the output to give a visual cue
    const out = document.getElementById('resultOutput');
    out.focus();
    out.select();
    showCopyMessage();
  });
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
  // init settings panel hidden
  const panel = document.getElementById('settingsPanel');
  if (panel) panel.classList.add('hidden');
  // ensure minor words box respects checkbox
  toggleMinorWords();
});