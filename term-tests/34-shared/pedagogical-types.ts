// NGUỒN: file .ts này; file .js cạnh nó do `npm run build` sinh ra (xem candidate/text-utils.ts). Đây là script cổ điển nạp bằng
// thẻ <script>, không có import/export; kiểu toàn cục khai báo ở webtest-34-demo/globals.d.ts.
(function () {
  'use strict';

  type TypeDefinition = [canonicalCode: string, aliases: string[], answerPrefix: string, sectionId: string];

  const definitions: TypeDefinition[] = [
    ['vocabulary_listen_write', [], 'vocab1', 'vocabulary'],
    ['vocabulary_picture_write', [], 'vocab2', 'vocabulary'],
    ['listening_order', ['listening_choice'], 'listen_p1', 'listening'],
    ['listening_gap', [], 'listen_p2', 'listening'],
    ['listening_true_false', ['listening_tf'], 'listen_p3', 'listening'],
    ['pronunciation_word', ['pronunciation_ipa_to_word'], 'pron_p1', 'pronunciation'],
    ['pronunciation_choice', ['pronunciation_word_to_ipa'], 'pron_p2', 'pronunciation'],
    ['translation', ['translation_sentence'], 'translation', 'translation'],
    ['speaking', ['writing_speaking'], 'speaking', 'speaking']
  ];

  const byCode = new Map<string, PedagogicalTypeMetadata>();
  const canonical = definitions.map(([canonicalCode, aliases, answerPrefix, sectionId]) => {
    const metadata: PedagogicalTypeMetadata = Object.freeze({
      canonicalCode,
      aliases: Object.freeze([...aliases]),
      answerPrefix,
      sectionId
    });
    byCode.set(canonicalCode, metadata);
    for (const alias of aliases) byCode.set(alias, metadata);
    return metadata;
  });

  function resolvePedagogicalType(code: unknown): PedagogicalTypeMetadata {
    const value = String(code || '');
    const metadata = byCode.get(value);
    if (!metadata) {
      throw new Error(`WEBTEST34_PEDAGOGICAL_TYPE_UNSUPPORTED: ${value || '(empty)'}`);
    }
    return metadata;
  }

  window.WEBTEST34_PEDAGOGICAL_TYPES = Object.freeze({
    definitions: Object.freeze(canonical),
    resolvePedagogicalType
  });
}());
