import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { keyboardPersistPress } from '@/components/keyboard';
import { getAndroidInstantPressableProps } from '@/lib/device/androidPerfProfile';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { MESSAGING_FEATURE } from '@/features/messaging/featureFlags';
import { useTheme } from '@/providers/ThemeProvider';
import { CHAT_COMPOSER_MIN_HEIGHT } from '../constants';
import { useChatTheme } from '../hooks/useChatTheme';
import type { ChatMessage, ComposerAttachmentPreview } from '../types';
import { displayParticipantName, formatReplyPreview } from '../utils';
import { formatVoiceDuration } from '../utils/voiceMessage';
import { ChatVoiceMessage } from './ChatVoiceMessage';

export type ChatComposerHandle = {
  setDraft: (text: string) => void;
  clearDraft: () => void;
  getDraft: () => string;
  focus: () => void;
};

type ChatComposerProps = {
  onSend: (content: string) => void;
  onTyping?: () => void;
  onAttach?: () => void;
  onPickImage?: () => void;
  onQuickCapture?: () => void;
  onQuickCaptureModeToggle?: () => void;
  quickCaptureEphemeral?: boolean;
  onToggleRecording?: () => void;
  onStopRecording?: () => void;
  onCancelRecording?: () => void;
  isRecording?: boolean;
  recordingSeconds?: number;
  pendingVoice?: { uri: string; durationSec: number } | null;
  onDiscardVoice?: () => void;
  onSendVoice?: () => void;
  replyTo?: ChatMessage | null;
  onCancelReply?: () => void;
  editingMessage?: ChatMessage | null;
  onCancelEdit?: () => void;
  onLayoutHeight?: (height: number) => void;
  disabled?: boolean;
  disabledHint?: string;
  attachmentPreview?: ComposerAttachmentPreview | null;
  onClearAttachment?: () => void;
  onRemoveAttachmentAt?: (index: number) => void;
  onOpenAttachmentPreview?: (uri: string, type: 'image' | 'video') => void;
  conversationId?: string | null;
  initialDraft?: string;
  onDraftChange?: (text: string) => void;
};

export const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(function ChatComposer(
  {
    onSend,
    onTyping,
    onAttach,
    onPickImage,
    onQuickCapture,
    onQuickCaptureModeToggle,
    quickCaptureEphemeral = true,
    onToggleRecording,
    onStopRecording,
    onCancelRecording,
    isRecording,
    recordingSeconds = 0,
    pendingVoice,
    onDiscardVoice,
    onSendVoice,
    replyTo,
    onCancelReply,
    editingMessage,
    onCancelEdit,
    onLayoutHeight,
    disabled = false,
    disabledHint,
    attachmentPreview,
    onClearAttachment,
    onRemoveAttachmentAt,
    onOpenAttachmentPreview,
    conversationId,
    initialDraft = '',
    onDraftChange,
  },
  ref,
) {
  const { colors, isDark } = useTheme();
  const chat = useChatTheme();
  const showAttachBtn = useFeatureVisible(MESSAGING_FEATURE.composerAttach);
  const showVoiceBtn = useFeatureVisible(MESSAGING_FEATURE.composerVoice);
  const showCameraBtn = useFeatureVisible(MESSAGING_FEATURE.composerCamera);
  const inputRef = useRef<TextInput>(null);
  const lastTypingRef = useRef(0);
  const draftRef = useRef(initialDraft);
  const conversationIdRef = useRef(conversationId);
  const [draft, setDraftState] = useState(initialDraft);

  const setDraft = (text: string) => {
    draftRef.current = text;
    setDraftState(text);
  };

  useImperativeHandle(ref, () => ({
    setDraft: (text: string) => {
      setDraft(text);
      onDraftChange?.(text);
    },
    clearDraft: () => {
      setDraft('');
      onDraftChange?.('');
    },
    getDraft: () => draftRef.current,
    focus: () => inputRef.current?.focus(),
  }));

  useEffect(() => {
    if (editingMessage) {
      setDraft(editingMessage.content);
      return;
    }
    if (conversationIdRef.current !== conversationId) {
      conversationIdRef.current = conversationId;
      setDraft(initialDraft);
      return;
    }
    if (!draftRef.current.trim() && initialDraft.trim()) {
      setDraft(initialDraft);
    }
  }, [conversationId, initialDraft, editingMessage]);

  const handleLayout = (event: LayoutChangeEvent) => {
    onLayoutHeight?.(event.nativeEvent.layout.height);
  };

  const handleChange = (text: string) => {
    setDraft(text);
    if (!editingMessage) onDraftChange?.(text);
    const now = Date.now();
    if (onTyping && now - lastTypingRef.current > 1200) {
      lastTypingRef.current = now;
      onTyping();
    }
  };

  const canSend = draft.trim().length > 0 || !!attachmentPreview;
  const showSendButton = (canSend || !!editingMessage) && !pendingVoice && !isRecording;

  const handleSendPress = () => {
    if (disabled) return;
    const content = draftRef.current.trim();
    if (!content && !attachmentPreview && !editingMessage) return;
    onSend(content);
    if (!editingMessage) {
      setDraft('');
      onDraftChange?.('');
    }
  };

  const inner = (
    <>
      {editingMessage ? (
        <View style={[styles.replyBar, { backgroundColor: chat.inputBg, borderLeftColor: colors.accent }]}>
          <View style={styles.replyContent}>
            <Text variant="caption" style={{ color: colors.accent, fontWeight: '600' }}>
              Mesajı düzenle
            </Text>
            <Text variant="caption" secondary numberOfLines={1}>
              {editingMessage.content}
            </Text>
          </View>
          <Pressable onPress={onCancelEdit} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      {replyTo && !editingMessage ? (
        <View style={[styles.replyBar, { backgroundColor: chat.inputBg, borderLeftColor: chat.replyAccent }]}>
          <View style={styles.replyContent}>
            <Text variant="caption" style={{ color: chat.replyAccent, fontWeight: '600' }}>
              Alıntılanıyor
            </Text>
            <Text variant="caption" secondary numberOfLines={1}>
              {displayParticipantName(replyTo.sender)}: {formatReplyPreview(replyTo)}
            </Text>
          </View>
          <Pressable onPress={onCancelReply} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      {attachmentPreview && !editingMessage ? (
        attachmentPreview.type === 'video' ? (
          <View style={[styles.attachmentPreview, { backgroundColor: chat.inputBg }]}>
            <Pressable
              {...keyboardPersistPress(() =>
                onOpenAttachmentPreview?.(attachmentPreview.uri, 'video'),
              )}
              {...getAndroidInstantPressableProps()}
              style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
              accessibilityLabel="Video önizlemesini aç"
            >
              <Image source={{ uri: attachmentPreview.uri }} style={styles.attachmentThumb} contentFit="cover" />
              <View style={styles.attachmentVideoBadge}>
                <Ionicons name="play" size={14} color="#fff" />
              </View>
            </Pressable>
            <Pressable
              onPress={onClearAttachment}
              hitSlop={8}
              style={[styles.attachmentRemove, { backgroundColor: colors.surfaceElevated }]}
            >
              <Ionicons name="close-circle" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.multiAttachmentWrap, { backgroundColor: chat.inputBg }]}>
            <View style={styles.multiAttachmentHeader}>
              <Text variant="caption" secondary>
                {attachmentPreview.uris.length === 1
                  ? '1 fotoğraf — göndermek için ok (→) tuşuna bas'
                  : `${attachmentPreview.uris.length} fotoğraf — göndermek için ok (→) tuşuna bas`}
              </Text>
              <Pressable onPress={onClearAttachment} hitSlop={8}>
                <Text variant="caption" style={{ color: colors.danger, fontWeight: '600' }}>
                  Tümünü kaldır
                </Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.multiAttachmentScroll}
              keyboardShouldPersistTaps="handled"
            >
              {attachmentPreview.uris.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.multiAttachmentItem}>
                  <Pressable
                    {...keyboardPersistPress(() => onOpenAttachmentPreview?.(uri, 'image'))}
                    {...getAndroidInstantPressableProps()}
                    style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
                    accessibilityLabel={`Fotoğraf ${index + 1} önizlemesini aç`}
                  >
                    <Image source={{ uri }} style={styles.attachmentThumb} contentFit="cover" />
                    <View style={styles.attachmentExpandBadge}>
                      <Ionicons name="expand-outline" size={14} color="#fff" />
                    </View>
                  </Pressable>
                  {onRemoveAttachmentAt ? (
                    <Pressable
                      onPress={() => onRemoveAttachmentAt(index)}
                      hitSlop={8}
                      style={[styles.attachmentRemove, { backgroundColor: colors.surfaceElevated }]}
                    >
                      <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>
        )
      ) : null}

      {isRecording ? (
        <View style={[styles.recordingBar, { backgroundColor: chat.inputBg }]}>
          <Pressable
            hitSlop={8}
            {...getAndroidInstantPressableProps()}
            {...keyboardPersistPress(() => onCancelRecording?.())}
            style={({ pressed }) => [styles.recordingSideBtn, { opacity: pressed ? 0.55 : 1 }]}
          >
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
          <View style={styles.recordingCenter}>
            <View style={[styles.recordingDot, { backgroundColor: colors.danger }]} />
            <Text variant="label" style={{ color: colors.text }}>
              {formatVoiceDuration(recordingSeconds)}
            </Text>
          </View>
          <Pressable
            hitSlop={8}
            {...getAndroidInstantPressableProps()}
            {...keyboardPersistPress(() => onStopRecording?.())}
            style={[styles.stopRecord, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="stop" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : pendingVoice ? (
        <View style={[styles.voicePreviewBar, { backgroundColor: chat.inputBg }]}>
          <Pressable
            hitSlop={8}
            {...getAndroidInstantPressableProps()}
            {...keyboardPersistPress(() => onDiscardVoice?.())}
            style={({ pressed }) => [styles.recordingSideBtn, { opacity: pressed ? 0.55 : 1 }]}
          >
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
          <View style={styles.voicePreviewPlayer}>
            <ChatVoiceMessage
              uri={pendingVoice.uri}
              content={JSON.stringify({ durationSec: pendingVoice.durationSec })}
              isMine
              seed={pendingVoice.uri}
              accentColor={colors.primary}
              textColor={colors.text}
              metaColor={colors.textMuted}
              compact
            />
          </View>
          <Pressable
            hitSlop={6}
            {...getAndroidInstantPressableProps()}
            {...keyboardPersistPress(() => onSendVoice?.())}
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Ionicons name="arrow-up" size={22} color="#fff" />
          </Pressable>
        </View>
      ) : disabled ? (
        <View style={[styles.disabledBar, { backgroundColor: chat.inputBg, borderColor: colors.border }]}>
          <Ionicons name="ban-outline" size={18} color={colors.textMuted} />
          <Text variant="caption" secondary style={styles.disabledText}>
            {disabledHint ?? 'Bu sohbete mesaj gönderemezsiniz.'}
          </Text>
        </View>
      ) : (
        <View style={styles.row}>
          {onAttach && showAttachBtn ? (
            <Pressable
              hitSlop={8}
              {...getAndroidInstantPressableProps()}
              {...keyboardPersistPress(onAttach)}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: chat.inputBg, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="add" size={24} color={colors.textSecondary} />
            </Pressable>
          ) : null}

          <View style={[styles.inputWrap, { backgroundColor: chat.inputBg }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.text }]}
              placeholder={editingMessage ? 'Düzenlenmiş mesaj…' : 'Mesaj yazın…'}
              placeholderTextColor={chat.inputPlaceholder}
              value={draft}
              onChangeText={handleChange}
              onSubmitEditing={() => {
                if (draft.trim()) handleSendPress();
              }}
              multiline
              submitBehavior="submit"
              returnKeyType="send"
              enterKeyHint="send"
              maxLength={4000}
              editable
              autoCorrect
              spellCheck
              textAlignVertical="center"
              scrollEnabled
              underlineColorAndroid="transparent"
            />
          </View>

          {showSendButton ? (
            <Pressable
              hitSlop={6}
              {...getAndroidInstantPressableProps()}
              {...keyboardPersistPress(handleSendPress)}
              style={({ pressed }) => [
                styles.sendBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
              ]}
              accessibilityLabel={attachmentPreview ? 'Fotoğrafı gönder' : 'Mesajı gönder'}
            >
              <Ionicons
                name={editingMessage ? 'checkmark' : 'arrow-up'}
                size={22}
                color="#fff"
              />
            </Pressable>
          ) : onToggleRecording && !pendingVoice && showVoiceBtn ? (
            <Pressable
              hitSlop={8}
              {...getAndroidInstantPressableProps()}
              {...keyboardPersistPress(onToggleRecording)}
              style={({ pressed }) => [styles.trailingIconBtn, { opacity: pressed ? 0.55 : 1 }]}
              accessibilityLabel="Sesli mesaj kaydet"
            >
              <Ionicons name="mic-outline" size={24} color={colors.textSecondary} />
            </Pressable>
          ) : null}

          {onQuickCapture && showCameraBtn ? (
            <Pressable
              hitSlop={8}
              onLongPress={onQuickCaptureModeToggle}
              delayLongPress={280}
              {...getAndroidInstantPressableProps()}
              {...keyboardPersistPress(onQuickCapture)}
              style={({ pressed }) => [styles.trailingIconBtn, { opacity: pressed ? 0.55 : 1 }]}
              accessibilityLabel="Kamera — anlık fotoğraf çek"
            >
              <Ionicons
                name={quickCaptureEphemeral ? 'timer-outline' : 'camera-outline'}
                size={24}
                color={quickCaptureEphemeral ? colors.primary : colors.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>
      )}
    </>
  );

  const containerStyle = [
    styles.container,
    {
      borderTopColor: chat.composerBorder,
      backgroundColor:
        Platform.OS === 'ios' ? chat.composerBgSolid : chat.composerBg,
    },
  ];

  if (Platform.OS === 'ios') {
    return (
      <View onLayout={handleLayout} style={containerStyle}>
        <BlurView
          pointerEvents="none"
          intensity={55}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFillObject}
        />
        {inner}
      </View>
    );
  }

  return (
    <View onLayout={handleLayout} style={containerStyle}>
      {inner}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
    paddingHorizontal: 10,
    gap: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {},
    }),
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderLeftWidth: 3,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  replyContent: {
    flex: 1,
    gap: 2,
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    minHeight: CHAT_COMPOSER_MIN_HEIGHT,
  },
  recordingCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  recordingSideBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    minHeight: CHAT_COMPOSER_MIN_HEIGHT,
  },
  voicePreviewPlayer: {
    flex: 1,
    minWidth: 0,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stopRecord: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    minHeight: CHAT_COMPOSER_MIN_HEIGHT,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  trailingIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  inputWrap: {
    flex: 1,
    borderRadius: 24,
    minHeight: 42,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 120,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  disabledBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: CHAT_COMPOSER_MIN_HEIGHT,
  },
  disabledText: {
    flex: 1,
  },
  attachmentPreview: {
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    overflow: 'hidden',
    marginHorizontal: 2,
  },
  attachmentThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
  },
  attachmentVideoBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: radius.md,
  },
  attachmentExpandBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  attachmentRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 11,
  },
  multiAttachmentWrap: {
    borderRadius: radius.md,
    padding: 8,
    gap: 8,
    marginHorizontal: 2,
  },
  multiAttachmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  multiAttachmentScroll: {
    gap: 8,
    paddingHorizontal: 2,
  },
  multiAttachmentItem: {
    position: 'relative',
  },
});
