export { RichText } from './components/RichText';
export { LinkPreviewCard } from './components/LinkPreviewCard';
export { CommentLinkAttachment } from './components/CommentLinkAttachment';
export { ComposerLinkPreview } from './components/ComposerLinkPreview';

export { useLinkPreview } from './hooks/useLinkPreview';

export { fetchLinkPreview, type LinkPreview } from './services/linkPreview';
export { showPhoneContactOptions } from './services/phoneActions';
export {
  resolveInternalShare,
  internalShareLabel,
  internalShareIcon,
  type InternalShareRef,
  type InternalShareKind,
} from './services/internalShareCard';

export {
  splitMessageText,
  firstUrlInText,
  isPreviewableUrl,
  type RichTextSegment,
  type SplitOptions,
} from './utils/textSegments';
export { formatUrlDisplay, hostnameFromUrl } from './utils/urlDisplay';
export {
  digitsOnly,
  isPhoneCandidate,
  splitTextByPhoneNumbers,
  textContainsPhoneNumber,
  toTelUri,
  toWhatsAppPhone,
  type PhoneTextSegment,
} from './utils/phone';
