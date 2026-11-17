// Biến toàn cục do exam-guard.js gắn vào globalThis (nạp bằng thẻ <script> trước content-preview.mjs).
export {};

declare global {
  // Cấu hình học viên do config.js gắn vào window (nạp bằng thẻ <script> trước content-preview.mjs).
  interface Window { WEBTEST_34_PREVIEW_CONFIG?: Record<string, any> }
  // eslint-disable-next-line no-var
  var isIosDevice: ((nav: { userAgent?: string, maxTouchPoints?: number }) => boolean) | undefined;
  // eslint-disable-next-line no-var
  var examGuardReducer: (
    state: { running: boolean, fullscreenSupported: boolean, ignoreFocusSignals: boolean, prompt?: boolean, superseded?: boolean, incidentId?: string, lastIncidentAt?: number },
    event: { type: 'device_superseded' | 'left_exam' | 'return_click', reason?: 'blur' | 'hidden' | 'fullscreen', at?: number, incidentId?: string }
  ) => {
    state: { running: boolean, fullscreenSupported: boolean, ignoreFocusSignals: boolean, prompt?: boolean, superseded?: boolean, incidentId?: string, lastIncidentAt?: number },
    commands: ({ type: 'open_incident' | 'close_incident', incidentId: string } | { type: 'pause_audio' | 'resume_audio' | 'request_fullscreen' })[]
  };
  // eslint-disable-next-line no-var
  var selfProctoringNotice: (selfProctoring: { exitLimit: number, exitCount?: number, autoSubmitted?: boolean }) => { level: 'info' | 'danger' | 'submitted', text: string };
  // Hợp đồng loại câu sư phạm: 34-shared/pedagogical-types.ts gắn vào window (script cổ điển).
  interface PedagogicalTypeMetadata { readonly canonicalCode: string, readonly aliases: readonly string[], readonly answerPrefix: string, readonly sectionId: string }
  interface PedagogicalTypesContract { readonly definitions: readonly PedagogicalTypeMetadata[], resolvePedagogicalType(code: unknown): PedagogicalTypeMetadata }
  // Câu của đề/kết quả mà key-map và result chỉ đọc vài trường; phần còn lại giữ nguyên (`[key: string]: any` có chủ đích).
  interface KeyMapItem { itemVersionId?: string, position?: number | string, pedagogicalTypeCode?: string, options?: { id?: unknown }[], [key: string]: any }
  interface KeyMapContract {
    answerKeyForPosition(position: unknown): string,
    answerPrefixForItem(item: KeyMapItem | null | undefined): string,
    buildResponses(input: { items?: KeyMapItem[], blocks?: { items?: KeyMapItem[] }[], answers?: Record<string, unknown> }): Record<string, string | string[]>,
    isCompleteTextSelectPair(value: unknown, item?: KeyMapItem | null): boolean,
    resolvePedagogicalType(code: unknown): PedagogicalTypeMetadata
  }
  interface GroupResultItem { itemVersionId: string, pedagogicalTypeCode?: string, verdict?: string, maxScore?: number | string, scoreEarned?: number | string, [key: string]: any }
  interface GroupResultBlock { blockId?: string, title?: string, items?: GroupResultItem[] }
  interface GroupResultInput { blocks?: GroupResultBlock[], sections?: { id: string, label: string }[], items?: GroupResultItem[] }
  interface ResultGroup { id: string, fallbackId: string, label: string, score: number, maxScore: number, gradedMaxScore: number, correct: number, graded: number, items: GroupResultItem[] }
  type ResultGroupList = ResultGroup[] & { incomplete: boolean, unmatchedItems: GroupResultItem[] }
  type GroupResultFn = (input: GroupResultInput) => ResultGroupList;
  // eslint-disable-next-line no-var
  var WEBTEST34_PEDAGOGICAL_TYPES: PedagogicalTypesContract | undefined;
  // eslint-disable-next-line no-var
  var WEBTEST34_LEARNING_KEY_MAP: Readonly<KeyMapContract> | undefined;
  // eslint-disable-next-line no-var
  var WEBTEST34_LEARNING_RESULT: Readonly<{ groupResultItems: GroupResultFn }> | undefined;
  // eslint-disable-next-line no-var
  var examDeviceRequestBody: ((body: Record<string, any>, deviceId: string) => Record<string, any>) | undefined;
  type ExamGuardCommand = { type: 'open_incident' | 'close_incident', incidentId: string } | { type: 'pause_audio' | 'resume_audio' | 'request_fullscreen' };
}
