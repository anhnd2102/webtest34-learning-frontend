// Compatibility exports for existing callers. Browser startup lives in main.js.
export {
  parseVocabPairCsv,
  parseCsvRows,
  generateSingleChoiceTemplateCsv,
  parseSingleChoiceCsv,
  generateFitbTemplateCsv,
  parseFitbCsv,
  generateErrorCorrectionTemplateCsv,
  parseErrorCorrectionCsv,
  generateSentenceTransformationTemplateCsv,
  parseSentenceTransformationCsv,
  generateListeningOrderTemplateCsv,
  parseListeningOrderCsv,
  generateVocabPairTemplateCsv,
  generateSentenceReorderTemplateCsv,
  parseSentenceReorderCsv,
  generatePronunciationTemplateCsv,
  parsePronunciationCsv,
  generatePictorialVocabTemplateCsv,
  parsePictorialVocabCsv,
  generateReadingMatchingTemplateCsv,
  parseReadingMatchingCsv,
  generateRubricAsyncTemplateCsv,
  parseRubricAsyncCsv,
  generateBlockExercisesTemplateCsv,
  parseBlockExercisesCsv,
  normalizeQuestionType
} from './studio/content-import.js';

export { defaultApiBase, fixtureHeaders, authLoginPath, authLogoutPath, authMePath, authHeaders, assignmentResultsPath, assignmentResultsExportPath, assignmentExamModePath, assignmentSelfProctoringPath, assignmentExamRoomPath, assignmentExamEventsPath, assignmentExamStartPath, assignmentExamExtendPath, attemptDetailPath, manualGradingDraftPath, manualGradingCompletePath, attemptPublishPath, assignmentPublishAllPath, assignmentRosterPath, eligibleStudentsPath, studentTransferPath, grantRetakePath, courseTestCatalogPath, formDraftPath, formDetailPath, previewSandboxPath, formPublishPath, formPublishPreviewPath } from './api/teacher.js';
export { localStudentUrl, readDashboardState, SUPPORTED_DASHBOARD_TABS, DEFAULT_DASHBOARD_TAB, readDashboardTab, switchDashboardTab, assignmentUrl, resetDashboardState, filterClasses, formatClassFilterCountLabel, formatClassOptionLabel, extractPhase, formatAssignmentMeta, renderAssignmentChipsView } from './shell/dashboard-state.js';
export { teacherRoleLabel, formatPublicationStatus, validateManualGradingScores, formatDashboardScore, resultStatusLabel, attemptStatusLabel, verdictLabel, formatAssignmentWindow, formatCurrentTime, incidentTypeLabel, formatIncidentDuration, formatIncidentTimeline, extractAttemptSkills, formatCompactPrompt, resolveStudentAnswerDisplay, resolveExpectedAnswerDisplay, getScoreTier, computeClassSkillSummary, formatCompactScore, formatSubmissionTimestamp, AVATAR_PALETTES, getStudentInitials, getAvatarColor } from './results/presentation.js';
export { toggleExportXlsxButton, downloadResultsXlsx } from './results/export.js';
export { examModeLockReason, selfProctoringLockReason, selfProctoringRequestBody, examSwitchRequestBody, formatExamDeadline, examSwitchView, examSwitchErrorView, examSwitchSuccessText, incidentCellText, formatExamRoomStatus, formatExamReadyCount, applyExamProgress, applyExamIncident, formatExamProgress, applyExamConnection, formatExamConnectionStatus } from './exam-room/presentation.js';
export { getCourseCodeFromCourseId, filterClassesForCourse } from './studio/catalog.js';
export { generateUuid } from './studio/draft-model.js';

export {
  expandSentenceVariants,
  generateHangmanHint,
  validateListeningOrderUniqueness,
  extractParagraphLabels,
  computeCorrectionScore,
  tokenizeSentence,
  scrambleTokens,
  scoreTransformationAnswer,
  COMMON_IPA_SYMBOLS,
  formatIpaTranscription,
  formatOptionDisplayLetter,
  isShortQaEligibleFor2Col,
  batchGenerateExerciseVocabVariants
} from './studio/question-content.js';

export {
  ICONS,
  renderSvgIcon
} from './ui/icons.js';

export {
  registerUnsavedChangesGuard,
  unregisterUnsavedChangesGuard,
  hasActiveUnsavedChanges,
  clearActiveUnsavedChanges,
  openUnsavedChangesModal
} from './navigation/unsaved-changes.js';

export {
  openConfirmDeleteTestModal,
  openCreateTestModal,
  renderCourseTestCatalogView
} from './studio/catalog.js';

export {
  parseClozeBlanks,
  pruneOrphanClozeKeys,
  getItemSpanCount,
  scaleRubricCriteriaScores,
  findPrecedingClozeScript,
  updatePromptPosition,
  insertItemsIntoBlockExercise,
  reorderBlockItem,
  moveItemToExercise,
  computeTestBuilderScoreSummary
} from './studio/draft-model.js';

export {
  convertGoogleDriveImageUrl,
  convertGoogleDriveAudioUrl,
  renderStrictCandidateAudioDock,
  initStrictCandidateAudioDocks,
  validateImageUrl
} from './studio/media.js';

export {
  sanitizeRichContent,
  generateTableHtml,
  renderInlineClozeMarkup
} from './ui/rich-content.js';

export {
  renderRichHtmlEditor
} from './studio/rich-editor.js';

export {
  parseUploadedFileToCsv,
  openGenericBatchModal,
  openCsvQuickGuideModal,
  openBlockCsvUploadModal,
  openCsvUploadModal
} from './studio/batch-import.js';

export {
  renderScoreSkillChipsHtml,
  renderBlockJumpTagsHtml,
  renderBlocksNavCardHtml,
  renderScoreBreakdownBarHtml
} from './studio/builder-summary.js';

export {
  mountBuilder,
  renderTestBuilderView
} from './studio/builder.js';

export {
  CANONICAL_SKILL_LABELS,
  normalizeSkillCode,
  escapeHtml
} from './ui/presentation.js';

export { isComprehensionExercise } from './studio/draft-model.js';
