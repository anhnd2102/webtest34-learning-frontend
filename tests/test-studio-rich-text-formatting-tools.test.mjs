import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderRichHtmlEditor,
  sanitizeRichContent,
  ICONS
} from '../term-tests/teacher-dashboard/app.js';

test('ICONS dictionary contains minimalist monochrome line icons for rich text formatting', () => {
  const requiredIcons = [
    'bold',
    'italic',
    'underline',
    'strike',
    'heading',
    'listUl',
    'listOl',
    'alignLeft',
    'alignCenter',
    'alignRight',
    'removeFormat'
  ];

  requiredIcons.forEach(iconName => {
    assert.ok(ICONS[iconName], `ICONS should contain '${iconName}'`);
    assert.ok(ICONS[iconName].includes('<svg'), `'${iconName}' must be an SVG icon`);
    assert.ok(ICONS[iconName].includes('stroke="currentColor"') || ICONS[iconName].includes('fill="currentColor"'), `'${iconName}' must use currentColor for monochrome styling`);
    assert.ok(!/[⚡📥🚢📝📖]/.test(ICONS[iconName]), `'${iconName}' must not contain emojis`);
  });
});

test('renderRichHtmlEditor renders heading selector and all inline formatting buttons with monochromatic SVG line icons', () => {
  const container = {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => []
  };

  renderRichHtmlEditor(container, {
    value: '<p>Sample passage text</p>',
    placeholder: 'Nhập nội dung đề bài...'
  });

  const html = container.innerHTML;

  // Heading control
  assert.ok(
    html.includes('select-format-heading') || html.includes('btn-format-heading'),
    'Renders heading selector control'
  );

  // Inline formatting buttons
  assert.ok(html.includes('btn-format-bold'), 'Renders bold button (.btn-format-bold)');
  assert.ok(html.includes('btn-format-italic'), 'Renders italic button (.btn-format-italic)');
  assert.ok(html.includes('btn-format-underline'), 'Renders underline button (.btn-format-underline)');
  assert.ok(html.includes('btn-format-strike'), 'Renders strikethrough button (.btn-format-strike)');

  // Lists
  assert.ok(html.includes('btn-format-ul'), 'Renders bullet list button (.btn-format-ul)');
  assert.ok(html.includes('btn-format-ol'), 'Renders numbered list button (.btn-format-ol)');

  // Alignment
  assert.ok(html.includes('btn-format-align-left'), 'Renders align left button');
  assert.ok(html.includes('btn-format-align-center'), 'Renders align center button');
  assert.ok(html.includes('btn-format-align-right'), 'Renders align right button');

  // Clear formatting
  assert.ok(html.includes('btn-format-clear'), 'Renders clear formatting button (.btn-format-clear)');

  // Must not contain colorful emojis in toolbar buttons
  assert.ok(!html.includes('⚡'), 'Does not use emoji ⚡ in toolbar');
  assert.ok(!html.includes('📥'), 'Does not use emoji 📥 in toolbar');
  assert.ok(html.includes('icon-inline'), 'Uses icon-inline SVG class');
});

test('sanitizeRichContent preserves semantic headers, text formatting, lists and alignment markup', () => {
  const richInput = `
    <h2>The Great Migration</h2>
    <p>In the spring, <strong>millions</strong> of <em>animals</em> travel across the <u>plains</u>.</p>
    <p>Do not confuse with <s>autumn hibernation</s>.</p>
    <ul>
      <li>Zebra and gazelle herds</li>
      <li>Predator movements</li>
    </ul>
    <ol>
      <li>Cross the Mara River</li>
      <li>Reach the lush grasslands</li>
    </ol>
    <p style="text-align: center;">(1) __________ is the critical obstacle.</p>
  `;

  const cleaned = sanitizeRichContent(richInput);

  assert.ok(cleaned.includes('<h2>The Great Migration</h2>'), 'Preserves <h2> header tag');
  assert.ok(cleaned.includes('<strong>millions</strong>'), 'Preserves <strong> tag');
  assert.ok(cleaned.includes('<em>animals</em>'), 'Preserves <em> tag');
  assert.ok(cleaned.includes('<u>plains</u>'), 'Preserves <u> underline tag');
  assert.ok(cleaned.includes('<s>autumn hibernation</s>'), 'Preserves <s> strikethrough tag');
  assert.ok(cleaned.includes('<ul>') && cleaned.includes('<li>Zebra and gazelle herds</li>'), 'Preserves <ul> and <li> tags');
  assert.ok(cleaned.includes('<ol>') && cleaned.includes('<li>Cross the Mara River</li>'), 'Preserves <ol> and <li> tags');
  assert.ok(cleaned.includes('(1) __________'), 'Preserves cloze token intact');
});

test('Formatting buttons wire mousedown preventDefault to persist editor selection and trigger formatting command', () => {
  const listeners = {};
  let defaultPrevented = false;

  const fakeButton = {
    addEventListener: (event, handler) => {
      listeners[event] = handler;
    }
  };

  const container = {
    innerHTML: '',
    querySelector: (sel) => {
      if (sel === '.btn-format-bold') return fakeButton;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.rich-editor-visual') return [{ innerHTML: '' }];
      return [];
    }
  };

  let changeValue = null;
  renderRichHtmlEditor(container, {
    value: '<p>Initial text</p>',
    onChange: (val) => {
      changeValue = val;
    }
  });

  // Verify mousedown preventDefault registration
  assert.ok(typeof listeners['mousedown'] === 'function', 'Registers mousedown listener on format button');
  listeners['mousedown']({
    preventDefault: () => {
      defaultPrevented = true;
    }
  });
  assert.ok(defaultPrevented, 'Calls preventDefault on mousedown to retain text selection');
});

test('renderTestBuilderView renders rich text formatting tools in inline cloze builder item card', async () => {
  const { renderTestBuilderView } = await import('../term-tests/teacher-dashboard/app.js');

  const mockContainer = {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const mockForm = {
    id: '48010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Rich Editor Format Tools Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '48010000-0000-4000-8000-000000000001',
      title: 'Rich Editor Format Tools Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Inline Cloze Block',
          items: [
            {
              itemFamilyId: 'f1',
              itemVersionId: 'it-cloze-1',
              position: 1,
              prompt: 'The cruise departs from Miami: (1) __________ Caribbean islands.',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'inline_cloze',
              layoutType: 'inline_cloze',
              graderType: 'accepted_text',
              maxScore: 1,
              options: []
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'it-cloze-1': { graderType: 'accepted_text', accepted: ['six'] }
      }
    }
  };

  renderTestBuilderView(mockContainer, mockForm);

  const html = mockContainer.innerHTML;

  // Heading dropdown in inline cloze card
  assert.ok(html.includes('select-format-heading'), 'Inline cloze card contains select-format-heading');

  // Inline formatting buttons in inline cloze card
  assert.ok(html.includes('btn-format-bold'), 'Inline cloze card contains btn-format-bold');
  assert.ok(html.includes('btn-format-italic'), 'Inline cloze card contains btn-format-italic');
  assert.ok(html.includes('btn-format-underline'), 'Inline cloze card contains btn-format-underline');
  assert.ok(html.includes('btn-format-strike'), 'Inline cloze card contains btn-format-strike');

  // Lists in inline cloze card
  assert.ok(html.includes('btn-format-ul'), 'Inline cloze card contains btn-format-ul');
  assert.ok(html.includes('btn-format-ol'), 'Inline cloze card contains btn-format-ol');

  // Alignment buttons in inline cloze card
  assert.ok(html.includes('btn-format-align-left'), 'Inline cloze card contains btn-format-align-left');
  assert.ok(html.includes('btn-format-align-center'), 'Inline cloze card contains btn-format-align-center');
  assert.ok(html.includes('btn-format-align-right'), 'Inline cloze card contains btn-format-align-right');

  // Clear format button
  assert.ok(html.includes('btn-format-clear'), 'Inline cloze card contains btn-format-clear');

  // Toolbar dividers
  assert.ok(html.includes('toolbar-divider'), 'Inline cloze card contains toolbar-divider');
});

