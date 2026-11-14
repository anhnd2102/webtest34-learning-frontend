// NGUỒN: file .ts này; draft-inputs.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import type { BinderBase } from './draft-model.js';
import {
  sanitizeRichContent
} from '../ui/rich-content.js';
import {
  convertGoogleDriveAudioUrl,
  convertGoogleDriveImageUrl
} from './media.js';
import {
  tokenizeSentence
} from './question-content.js';
import {
  renderSvgIcon
} from '../ui/icons.js';

export function createDraftInputSync({ container, draftState, updateScoreBreakdownBar, hasUnsavedChanges }: Pick<BinderBase, 'container' | 'draftState'> & {
  updateScoreBreakdownBar: () => void;
  hasUnsavedChanges: () => boolean;
}) {
function syncInputs() {
    if (typeof container.querySelector !== 'function') return;

    // Sync any active visual editors to their textareas
    const activeVisuals = container.querySelectorAll<HTMLElement>('.rich-html-editor-wrap');
    if (activeVisuals && typeof activeVisuals.forEach === 'function') {
      activeVisuals.forEach(wrap => {
        const vEl = wrap.querySelector ? wrap.querySelector<HTMLElement>('.rich-editor-visual') : null;
        const cEl = wrap.querySelector ? wrap.querySelector<HTMLInputElement>('.rich-editor-code, textarea') : null;
        if (vEl && cEl && !vEl.hidden) {
          cEl.value = sanitizeRichContent(vEl.innerHTML || '');
        }
      });
    }

    const titleInput = container.querySelector<HTMLInputElement>('#builder-test-title');
    if (titleInput) draftState.title = titleInput.value.trim();

    const phaseSelect = container.querySelector<HTMLInputElement>('#builder-test-phase');
    if (phaseSelect) {
      draftState.phase = phaseSelect.value ? Number(phaseSelect.value) : null;
    }

    const sessionInput = container.querySelector<HTMLInputElement>('#builder-test-session');
    if (sessionInput) {
      const sess = Number(sessionInput.value);
      if (Number.isFinite(sess) && sess > 0) draftState.sessionNumber = sess;
    }

    const durationInput = container.querySelector<HTMLInputElement>('#builder-test-duration');
    if (durationInput) {
      const dur = Number(durationInput.value);
      if (Number.isFinite(dur) && dur > 0) draftState.durationMinutes = dur;
    }

    const policySelect = container.querySelector<HTMLInputElement>('#builder-test-policy');
    if (policySelect) draftState.answerReleasePolicy = policySelect.value;

    const blockCards = container.querySelectorAll<HTMLElement>('.builder-block-card');
    if (blockCards && typeof blockCards.forEach === 'function') {
      blockCards.forEach((bCard, bIdx) => {
        const block = draftState.blocks[bIdx];
        if (!block) return;

        const titleEl = bCard.querySelector<HTMLInputElement>('.block-title-input');
        if (titleEl) block.title = titleEl.value.trim();

        const instEl = bCard.querySelector<HTMLInputElement>('.block-instructions-input');
        if (instEl) block.instructions = instEl.value;

        const audioEl = bCard.querySelector<HTMLInputElement>('.block-audio-input');
        if (audioEl) {
          block.audioUrl = convertGoogleDriveAudioUrl(audioEl.value) || null;
          block.stimulusAudioUrl = block.audioUrl;
        }

        const readingEl = bCard.querySelector<HTMLInputElement>('.block-reading-input');
        if (readingEl) {
          block.readingPassage = readingEl.value || null;
          block.stimulusReadingPassage = block.readingPassage;
        }

        const exCards = bCard.querySelectorAll<HTMLElement>('.builder-exercise-card');
        if (exCards && typeof exCards.forEach === 'function') {
          exCards.forEach((exCard, exIdx) => {
            const ex = block.exercises?.[exIdx];
            if (!ex) return;
            const exTitleEl = exCard.querySelector<HTMLInputElement>('.exercise-title-input');
            if (exTitleEl) {
              ex.title = exTitleEl.value.trim() || `Bài tập ${ex.exerciseNumber || exIdx + 1}`;
            } else if (!ex.title || !ex.title.trim()) {
              ex.title = `Bài tập ${ex.exerciseNumber || exIdx + 1}`;
            }
            const exInstEl = exCard.querySelector<HTMLInputElement>('.exercise-instructions-input');
            if (exInstEl) ex.instructions = exInstEl.value;
            const exRefContextEl = exCard.querySelector<HTMLInputElement>('.exercise-reference-context-input');
            if (exRefContextEl) {
              ex.referenceContext = exRefContextEl.value.trim() || null;
            }
          });
        }

        for (const ex of block.exercises || []) {
          for (const itm of block.items || []) {
            if (itm.exerciseId === ex.exerciseId) {
              itm.exerciseTitle = ex.title;
            }
          }
          ex.itemIds = (block.items || []).filter(it => it.exerciseId === ex.exerciseId).map(it => it.itemVersionId);
        }

        const itemCards = bCard.querySelectorAll<HTMLElement>('.builder-item-card');
        if (itemCards && typeof itemCards.forEach === 'function') {
          itemCards.forEach((iCard, iIdx) => {
            const item = block.items?.[iIdx];
            if (!item) return;

            const promptEl = iCard.querySelector<HTMLInputElement>('.item-prompt-input');
            if (promptEl) {
              item.prompt = promptEl.value.trim() || `Câu ${item.position || iIdx + 1}`;
            } else if (!item.prompt || !item.prompt.trim()) {
              item.prompt = `Câu ${item.position || iIdx + 1}`;
            }

            const refContextEl = iCard.querySelector<HTMLInputElement>('.item-reference-context-input');
            if (refContextEl) {
              item.referenceContext = refContextEl.value.trim() || null;
            }

            const scoreEl = iCard.querySelector<HTMLInputElement>('.item-max-score-input');
            if (scoreEl) {
              const sc = Number(scoreEl.value);
              if (Number.isFinite(sc) && sc >= 0) item.maxScore = sc;
            }

            const layoutEl = iCard.querySelector<HTMLInputElement>('.select-layout');
            if (layoutEl) item.layoutType = layoutEl.value;

            // Pronunciation sync
            if (item.pedagogicalTypeCode === 'pronunciation_choice' || item.pedagogicalTypeCode === 'pronunciation_word' || item.layoutType === 'ipa_card') {
              const wordInput = iCard.querySelector<HTMLInputElement>('.input-pronunciation-word');
              const audioInput = iCard.querySelector<HTMLInputElement>('.input-pronunciation-audio');
              const ipaInput = iCard.querySelector<HTMLInputElement>('.input-ipa-transcription');

              if (wordInput) {
                item.targetWord = wordInput.value.trim();
              }
              if (audioInput) {
                item.audioUrl = convertGoogleDriveAudioUrl(audioInput.value);
              }
              if (ipaInput) {
                item.ipaTranscription = ipaInput.value.trim();
              }

              const radioChecked = iCard.querySelector<HTMLInputElement>('.radio-pron-correct:checked');
              const expectedId = radioChecked ? radioChecked.value : (item.options?.[0]?.id || 'A');

              const optInputs = iCard.querySelectorAll<HTMLInputElement>('.input-pron-option-label');
              optInputs.forEach(optIn => {
                const optId = optIn.getAttribute('data-option-id');
                const optObj = item.options.find((o: any) => o.id === optId);
                if (optObj) optObj.label = optIn.value.trim();
              });

              draftState.gradingKey.items[item.itemVersionId!] = {
                graderType: 'exact_option',
                expectedOptionId: expectedId,
                targetWord: item.targetWord || '',
                ipaTranscription: item.ipaTranscription || ''
              };
            }

            // Single choice sync
            if (item.interactionType === 'single_choice' && item.pedagogicalTypeCode !== 'pronunciation_choice' && item.pedagogicalTypeCode !== 'pronunciation_word' && item.layoutType !== 'ipa_card') {
              const radioChecked = iCard.querySelector<HTMLInputElement>('.radio-correct:checked');
              if (radioChecked) {
                draftState.gradingKey.items[item.itemVersionId!] = {
                  graderType: 'exact_option',
                  expectedOptionId: radioChecked.value
                };
              }
              const optInputs = iCard.querySelectorAll<HTMLInputElement>('.option-label-input');
              optInputs.forEach(optIn => {
                const optId = optIn.getAttribute('data-option-id');
                const optObj = item.options.find((o: any) => o.id === optId);
                if (optObj) optObj.label = optIn.value.trim();
              });
            }

            // Multi group sync
            if (item.interactionType === 'multi_choice_group' && item.graderType === 'unordered_group_slot') {
              const groupIdInput = iCard.querySelector<HTMLInputElement>('.input-group-id');
              if (groupIdInput) {
                const gid = groupIdInput.value.trim();
                if (gid) item.groupId = gid;
              }
              const checkedBoxes = iCard.querySelectorAll<HTMLElement>('.checkbox-correct:checked');
              const checkedIds = Array.from(checkedBoxes).map(cb => (cb as HTMLInputElement).value);
              if (item.groupId && checkedIds.length >= 2) {
                draftState.gradingKey.groups[item.groupId] = {
                  graderType: 'unordered_group_slot',
                  expectedOptionIds: checkedIds
                };
              }
              const optInputs = iCard.querySelectorAll<HTMLInputElement>('.option-label-input');
              optInputs.forEach(optIn => {
                const optId = optIn.getAttribute('data-option-id');
                const optObj = item.options.find((o: any) => o.id === optId);
                if (optObj) optObj.label = optIn.value.trim();
              });
            }

            // Inline cloze sync
            if (item.interactionType === 'short_text' && item.layoutType === 'inline_cloze') {
              item.clozeAnswers = item.clozeAnswers || {};
              const blankCards = iCard.querySelectorAll<HTMLElement>('.cloze-blank-config-card');
              let primaryVariants: any[] = [];

              blankCards.forEach((bCard, bIdx) => {
                const bNum = Number(bCard.getAttribute('data-blank-num')) || (bIdx + 1);
                const bTargetInput = bCard.querySelector<HTMLInputElement>('.input-cloze-blank-target');
                const bVal = bTargetInput ? bTargetInput.value.trim() : '';

                item.clozeAnswers![bNum] = item.clozeAnswers![bNum] || { accepted: [] };
                if (bVal && !/^Câu \d+/i.test(bVal)) {
                  item.clozeAnswers![bNum].targetWord = bVal;
                }

                const bChips = bCard.querySelectorAll<HTMLElement>('.variant-chip');
                const rawBVariants = Array.from(bChips).map(c => c.getAttribute('data-variant')).filter(Boolean);
                let bVariants = Array.from(new Set(rawBVariants.filter(v => v !== 'answer' && v !== 'draft_placeholder'))).slice(0, 40);

                if (bVal && !/^Câu \d+/i.test(bVal) && !bVariants.includes(bVal)) {
                  bVariants = [bVal, ...bVariants];
                }

                if (!bVariants.length && item.clozeAnswers![bNum].targetWord) {
                  bVariants.push(item.clozeAnswers![bNum].targetWord);
                }

                item.clozeAnswers![bNum].accepted = bVariants;
                if (bIdx === 0) {
                  primaryVariants = bVariants;
                  if (bVal) item.targetWord = bVal;
                }
              });

              if (!primaryVariants.length && item.targetWord) {
                primaryVariants = [item.targetWord];
              }

              item.graderType = 'inline_cloze';
              draftState.gradingKey.items[item.itemVersionId!] = {
                graderType: 'inline_cloze',
                blanks: item.clozeAnswers,
                accepted: primaryVariants.length ? primaryVariants : ['answer'],
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };
            } else if (item.interactionType === 'short_text' && item.pedagogicalTypeCode !== 'sentence_reorder' && item.layoutType !== 'token_scramble' && item.pedagogicalTypeCode !== 'sentence_rewrite' && item.layoutType !== 'keyword_transformation') {
              const rawInput = iCard.querySelector<HTMLInputElement>('.input-fitb-raw, .input-pictorial-target');
              const rawVal = rawInput ? rawInput.value.trim() : '';

              if (rawVal && !/^Câu \d+/i.test(rawVal) && !/^Từ vựng qua ảnh \d+/i.test(rawVal)) {
                item.targetWord = rawVal;
              }

              const chips = iCard.querySelectorAll<HTMLElement>('.variant-chip');
              const rawVariants = Array.from(chips).map(c => c.getAttribute('data-variant')).filter(Boolean);
              let variants = Array.from(new Set(rawVariants.filter(v => v !== 'answer' && v !== 'draft_placeholder'))).slice(0, 40);

              if (rawVal && !/^Câu \d+/i.test(rawVal) && !/^Từ vựng qua ảnh \d+/i.test(rawVal)) {
                if (!variants.includes(rawVal)) {
                  variants = [rawVal, ...variants];
                }
              }

              if (!variants.length) {
                if (item.targetWord && !/^Câu \d+/i.test(item.targetWord) && !/^Từ vựng qua ảnh \d+/i.test(item.targetWord)) {
                  variants.push(item.targetWord);
                } else if (item.prompt && !/^Câu \d+/i.test(item.prompt) && !/^Từ vựng qua ảnh \d+/i.test(item.prompt)) {
                  variants.push(item.prompt);
                }
              }

              draftState.gradingKey.items[item.itemVersionId!] = {
                graderType: 'accepted_text',
                accepted: variants,
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };
            }

            // Sentence reorder sync
            if (item.pedagogicalTypeCode === 'sentence_reorder' || item.layoutType === 'token_scramble') {
              const rawTokensInput = iCard.querySelector<HTMLInputElement>('.input-raw-tokens');
              const targetSentInput = iCard.querySelector<HTMLInputElement>('.input-target-sentence');

              if (targetSentInput) {
                item.targetSentence = targetSentInput.value.trim();
              }

              if (rawTokensInput) {
                const rawVal = rawTokensInput.value.trim();
                if (rawVal) {
                  item.tokens = tokenizeSentence(rawVal);
                }
              }

              const distractorChips = iCard.querySelectorAll<HTMLElement>('.distractor-chip');
              item.distractors = Array.from(distractorChips).map(c => c.getAttribute('data-distractor')).filter(Boolean);

              const chips = iCard.querySelectorAll<HTMLElement>('.variant-chip.accepted-chip');
              const variants = Array.from(chips).map(c => c.getAttribute('data-variant')).filter(Boolean);
              const targetSent = item.targetSentence || (item.tokens ? item.tokens.join(' ') : '');
              const acceptedList = variants.length ? variants : (targetSent ? [targetSent] : ['answer']);

              draftState.gradingKey.items[item.itemVersionId!] = {
                graderType: 'accepted_text',
                accepted: acceptedList,
                tokens: item.tokens || [],
                distractors: item.distractors || [],
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };
            }

            // Sentence transformation sync
            if (item.pedagogicalTypeCode === 'sentence_rewrite' || item.layoutType === 'keyword_transformation') {
              const kwInput = iCard.querySelector<HTMLInputElement>('.input-transformation-keyword');
              const prefixInput = iCard.querySelector<HTMLInputElement>('.input-frame-prefix');
              const suffixInput = iCard.querySelector<HTMLInputElement>('.input-frame-suffix');
              const ansInput = iCard.querySelector<HTMLInputElement>('.input-transformation-answer');

              if (kwInput) {
                item.keyword = kwInput.value.trim().toUpperCase();
              }
              if (prefixInput) {
                item.framePrefix = prefixInput.value.trim();
              }
              if (suffixInput) {
                item.frameSuffix = suffixInput.value.trim();
              }
              if (ansInput) {
                item.targetAnswer = ansInput.value.trim();
              }

              const chips = iCard.querySelectorAll<HTMLElement>('.variant-chip.accepted-chip');
              const variants = Array.from(chips).map(c => c.getAttribute('data-variant')).filter(Boolean);
              const targetAns = item.targetAnswer || '';
              const acceptedList = variants.length ? variants : (targetAns ? [targetAns] : ['answer']);

              draftState.gradingKey.items[item.itemVersionId!] = {
                graderType: 'accepted_text',
                keyword: item.keyword || '',
                framePrefix: item.framePrefix || '',
                frameSuffix: item.frameSuffix || '',
                accepted: acceptedList,
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };
            }

            // Error correction sync
            if (item.interactionType === 'correction_pair' || item.pedagogicalTypeCode === 'error_correction' || item.graderType === 'correction_pair') {
              const errorTokenInput = iCard.querySelector<HTMLInputElement>('.input-error-token');
              const correctionTokenInput = iCard.querySelector<HTMLInputElement>('.input-correction-token');
              const scoringRuleSelect = iCard.querySelector<HTMLInputElement>('.select-scoring-rule');

              const fallbackErrors = (item.expectedErrors && item.expectedErrors.length)
                ? item.expectedErrors
                : (item.targetWord ? [item.targetWord] : []);
              const fallbackCorrections = (item.expectedCorrections && item.expectedCorrections.length)
                ? item.expectedCorrections
                : (item.accepted && item.accepted.length ? item.accepted : []);

              const currentKey = draftState.gradingKey.items[item.itemVersionId!] || {
                graderType: 'correction_pair',
                expectedErrors: fallbackErrors,
                expectedCorrections: fallbackCorrections,
                scoringRule: item.scoringRule || 'split_points',
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };
              currentKey.graderType = 'correction_pair';

              if (scoringRuleSelect) {
                currentKey.scoringRule = scoringRuleSelect.value;
                item.scoringRule = scoringRuleSelect.value;
              }

              const errorChips = iCard.querySelectorAll<HTMLElement>('.btn-remove-error-chip');
              const errVariants = Array.from(errorChips).map(c => c.getAttribute('data-variant')).filter(Boolean);
              if (errVariants.length) {
                currentKey.expectedErrors = errVariants;
              } else if (errorTokenInput && errorTokenInput.value.trim()) {
                currentKey.expectedErrors = [errorTokenInput.value.trim()];
              } else if (!currentKey.expectedErrors || !currentKey.expectedErrors.length) {
                if (currentKey.targetWord) {
                  currentKey.expectedErrors = [currentKey.targetWord];
                } else {
                  currentKey.expectedErrors = fallbackErrors;
                }
              }

              const corrChips = iCard.querySelectorAll<HTMLElement>('.btn-remove-correction-chip');
              const corrVariants = Array.from(corrChips).map(c => c.getAttribute('data-variant')).filter(Boolean);
              if (corrVariants.length) {
                currentKey.expectedCorrections = corrVariants;
              } else if (correctionTokenInput && correctionTokenInput.value.trim()) {
                currentKey.expectedCorrections = [correctionTokenInput.value.trim()];
              } else if (!currentKey.expectedCorrections || !currentKey.expectedCorrections.length) {
                if (currentKey.accepted && currentKey.accepted.length) {
                  currentKey.expectedCorrections = currentKey.accepted;
                } else {
                  currentKey.expectedCorrections = fallbackCorrections;
                }
              }

              item.targetWord = (currentKey.expectedErrors && currentKey.expectedErrors[0]) || item.targetWord || '';
              item.expectedErrors = currentKey.expectedErrors || fallbackErrors;
              item.expectedCorrections = currentKey.expectedCorrections || fallbackCorrections;
              item.accepted = currentKey.expectedCorrections || item.accepted || [];
              item.scoringRule = currentKey.scoringRule || item.scoringRule || 'split_points';
              item.interactionType = 'correction_pair';
              item.graderType = 'correction_pair';
              draftState.gradingKey.items[item.itemVersionId!] = currentKey;
            }

            // Listening order sync
            if (item.pedagogicalTypeCode === 'listening_order' || item.layoutType === 'timeline_sequence') {
              const audioInput = iCard.querySelector<HTMLInputElement>('.input-listening-audio');
              if (audioInput) {
                const audVal = convertGoogleDriveAudioUrl(audioInput.value);
                item.audioUrl = audVal || null;
                item.stimulusAudioUrl = item.audioUrl;
              }
              const eventRows = iCard.querySelectorAll<HTMLElement>('.listening-event-row');
              if (eventRows.length && item.events) {
                eventRows.forEach(eRow => {
                  const eIdx = Number(eRow.getAttribute('data-event-idx'));
                  const ev = item.events![eIdx];
                  if (!ev) return;
                  const textIn = eRow.querySelector<HTMLInputElement>('.input-event-text');
                  if (textIn) ev.text = textIn.value.trim();
                  const rankSel = eRow.querySelector<HTMLInputElement>('.select-event-rank');
                  if (rankSel) ev.rank = Number(rankSel.value) || 1;
                });
                const sorted = [...item.events].sort((a, b) => (Number(a.rank) || 0) - (Number(b.rank) || 0));
                const expectedSeq = sorted.map(e => e.label);
                item.graderType = 'ordered_sequence';
                draftState.gradingKey.items[item.itemVersionId!] = {
                  graderType: 'ordered_sequence',
                  expectedSequence: expectedSeq
                };
              }
            }

            // Reading matching sync
            if (item.pedagogicalTypeCode === 'reading_matching' || item.layoutType === 'split_pane_matching' || block.layoutType === 'split_pane_matching') {
              const passageInput = iCard.querySelector<HTMLInputElement>('.input-reading-passage');
              if (passageInput) {
                const passageVal = passageInput.value;
                block.readingPassage = passageVal;
                block.stimulusReadingPassage = passageVal;
                item.readingPassage = passageVal;
              }
              const radioChecked = iCard.querySelector<HTMLInputElement>('.radio-matching-correct:checked');
              if (radioChecked) {
                draftState.gradingKey.items[item.itemVersionId!] = {
                  graderType: 'exact_option',
                  expectedOptionId: radioChecked.value
                };
              }
              const optInputs = iCard.querySelectorAll<HTMLInputElement>('.matching-heading-input');
              optInputs.forEach(optIn => {
                const optId = optIn.getAttribute('data-option-id');
                const optObj = item.options.find((o: any) => o.id === optId);
                if (optObj) optObj.label = optIn.value.trim();
              });
            }

            // Pictorial card sync
            if (item.interactionType === 'short_text' && (item.layoutType === 'pictorial_card' || item.pedagogicalTypeCode === 'pictorial_vocabulary')) {
              const targetInput = iCard.querySelector<HTMLInputElement>('.input-pictorial-target, .input-fitb-raw');
              if (targetInput) {
                const targetVal = targetInput.value.trim();
                if (targetVal && !/^Từ vựng qua ảnh \d+/i.test(targetVal)) {
                  item.targetWord = targetVal;
                }
              }
              const imgInput = iCard.querySelector<HTMLInputElement>('.input-pictorial-image');
              if (imgInput) {
                const imgVal = imgInput.value.trim();
                const converted = convertGoogleDriveImageUrl(imgVal);
                item.image = converted || null;
                item.stimulusImageUrl = converted || null;
              }
              const letterInput = iCard.querySelector<HTMLInputElement>('.input-pictorial-letter-hint');
              if (letterInput) item.letterHint = letterInput.value.trim() || null;
              const captionInput = iCard.querySelector<HTMLInputElement>('.input-pictorial-caption');
              if (captionInput) item.captionHint = captionInput.value.trim() || null;
            }

            // Vocabulary pair sync
            if (item.interactionType === 'text_select_pair') {
              const rawWordInput = iCard.querySelector<HTMLInputElement>('.input-vocab-raw');
              const rawWordVal = rawWordInput ? rawWordInput.value.trim() : '';

              if (rawWordVal && !/^Từ vựng câu \d+/i.test(rawWordVal)) {
                item.targetWord = rawWordVal;
                item.prompt = rawWordVal;
              }

              const chips = iCard.querySelectorAll<HTMLElement>('.template-vocab-pair .variant-chip');
              const rawVariants = Array.from(chips).map(c => c.getAttribute('data-variant')).filter(Boolean);
              let variants = Array.from(new Set(rawVariants.filter(v => v !== 'answer' && v !== 'draft_placeholder' && !/^Từ vựng câu \d+/i.test(v as string)))).slice(0, 40);

              const dropdownVal = iCard.querySelector<HTMLInputElement>('.select-vocab-correct-dropdown')?.value;
              const radioChecked = iCard.querySelector<HTMLInputElement>('.radio-vocab-correct:checked');
              const expectedOptId = dropdownVal || (radioChecked ? radioChecked.value : (item.options?.[0]?.id || 'opt_1'));

              if (rawWordVal && !/^Từ vựng câu \d+/i.test(rawWordVal)) {
                if (!variants.includes(rawWordVal)) {
                  variants = [rawWordVal, ...variants];
                }
              }

              if (!variants.length) {
                if (item.targetWord && !/^Từ vựng câu \d+/i.test(item.targetWord)) {
                  variants.push(item.targetWord);
                } else if (item.prompt && !/^Từ vựng câu \d+/i.test(item.prompt)) {
                  variants.push(item.prompt);
                }
              }

              draftState.gradingKey.items[item.itemVersionId!] = {
                graderType: 'accepted_text_exact_option',
                accepted: variants,
                expectedOptionId: expectedOptId,
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };

              const optInputs = iCard.querySelectorAll<HTMLInputElement>('.vocab-meaning-input');
              optInputs.forEach(optIn => {
                const optId = optIn.getAttribute('data-option-id');
                const optObj = item.options.find((o: any) => o.id === optId);
                if (optObj) optObj.label = optIn.value.trim();
              });
            }

            // Rubric async sync
            if (item.graderType === 'rubric_async') {
              const currentKey = draftState.gradingKey.items[item.itemVersionId!];
              if (currentKey && currentKey.rubric) {
                const critCards = iCard.querySelectorAll<HTMLElement>('.rubric-criterion-card');
                if (critCards && currentKey.rubric.criteria) {
                  critCards.forEach((cCard, cIdx) => {
                    const critObj = currentKey.rubric!.criteria[cIdx];
                    if (!critObj) return;
                    const labelInput = cCard.querySelector<HTMLInputElement>('.criterion-label-input');
                    if (labelInput) critObj.label = labelInput.value.trim();

                    const scoreInput = cCard.querySelector<HTMLInputElement>('.criterion-max-score-input');
                    if (scoreInput) {
                      const sc = Number(scoreInput.value);
                      if (Number.isFinite(sc) && sc >= 0) critObj.maxScore = sc;
                    }

                    const conceptsInput = cCard.querySelector<HTMLInputElement>('.criterion-concepts-input');
                    if (conceptsInput) {
                      const raw = conceptsInput.value.trim();
                      critObj.requiredConcepts = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
                    }
                  });
                  // recompute total maxScore
                  const totalScore = currentKey.rubric.criteria.reduce((sum: any, c: any) => sum + (c.maxScore || 0), 0);
                  currentKey.rubric.maxScore = totalScore;
                  item.maxScore = totalScore;
                }

                const guidanceEl = iCard.querySelector<HTMLInputElement>('.input-rubric-guidance');
                if (guidanceEl) {
                  currentKey.rubric.promptGuidance = guidanceEl.value.trim();
                }
              }
            }
          });
        }
      });
    }

    updateScoreBreakdownBar();
    if (hasUnsavedChanges() && typeof container.querySelector === 'function') {
      const statusMsg = container.querySelector<HTMLElement>('#builder-status-msg');
      if (statusMsg && !statusMsg.classList.contains('saving') && !statusMsg.classList.contains('forked')) {
        statusMsg.className = 'builder-status-pill unsaved';
        statusMsg.innerHTML = `${renderSvgIcon('edit', 'icon-inline')} <span>Có thay đổi chưa lưu</span>`;
      }
    }
  }
  return syncInputs;
}
