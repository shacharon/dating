export {
  TEASER_MODE_PREVIEW_STORAGE_KEY,
  formatBrowseAge,
  matchBrowseLocation,
  matchBrowseOneLiner,
  readTeaserModePreview,
  resolveBrowseTeaserMode,
  resolveMatchBrowseHook,
  resolveMatchBrowseClaim,
  resolveMatchBrowseHybridLines,
  matchBrowseWhyBody,
  matchListPrimaryLabel,
  matchListSecondaryMeta,
  matchDetailTitle,
  matchDetailSubtitle,
} from './match-display';

export {
  formatHardBlockReason,
  formatHardBlockReasonMessage,
  type HardBlockReasonCopy,
  type FormattedHardBlockReason,
} from './hard-block-display';

export {
  resolveDetailProse,
  splitNarrativeParagraphs,
  type MatchDetailProse,
} from './match-detail-prose';
