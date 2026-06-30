import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { CHAT_COMPOSER_MIN_HEIGHT } from '@/features/messaging/constants';
import { useChatTheme } from '@/features/messaging/hooks/useChatTheme';
import {
  MAX_LIVE_SUPPORT_MESSAGE_LENGTH,
  MIN_LIVE_SUPPORT_MESSAGE_LENGTH,
} from '@/features/live-support/constants';
import { SUPPORT_FEATURE } from '@/features/live-support/featureFlags';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type LiveSupportComposerHandle = {
  clearDraft: () => void;
  setDraft: (value: string) => void;
};

type LiveSupportComposerProps = {
  defaultDraft?: string;
  onSend: (content: string) => void;
  onPickImage: () => void;
  onPickVideo: () => void;
  sending: boolean;
  closedNote?: string | null;
  error?: string | null;
  topicChips?: ReactNode;
};

type ComposerInputRowProps = {
  defaultDraft?: string;
  onSend: (content: string) => void;
  onPickImage: () => void;
  onPickVideo: () => void;
  sending: boolean;
};

const ComposerInputRow = memo(
  forwardRef<LiveSupportComposerHandle, ComposerInputRowProps>(function ComposerInputRow(
    { defaultDraft = '', onSend, onPickImage, onPickVideo, sending },
    ref,
  ) {
    const { colors } = useTheme();
    const chat = useChatTheme();
    const showSend = useFeatureVisible(SUPPORT_FEATURE.liveSend);
    const showAttachImage = useFeatureVisible(SUPPORT_FEATURE.liveAttachImage);
    const showAttachVideo = useFeatureVisible(SUPPORT_FEATURE.liveAttachVideo);
    const inputRef = useRef<TextInput>(null);
    const [draft, setDraft] = useState(defaultDraft);
    const defaultDraftAppliedRef = useRef(false);
    const canSend = draft.trim().length >= MIN_LIVE_SUPPORT_MESSAGE_LENGTH && !sending;

    useImperativeHandle(ref, () => ({
      clearDraft: () => setDraft(''),
      setDraft,
    }));

    useEffect(() => {
      if (defaultDraftAppliedRef.current || !defaultDraft) return;
      defaultDraftAppliedRef.current = true;
      setDraft(defaultDraft);
    }, [defaultDraft]);

    const handleSend = useCallback(() => {
      const content = draft.trim();
      if (content.length < MIN_LIVE_SUPPORT_MESSAGE_LENGTH || sending) return;
      setDraft('');
      onSend(content);
    }, [draft, onSend, sending]);

    return (
      <View style={styles.row}>
        {showAttachImage ? (
        <Pressable
          onPress={onPickImage}
          disabled={sending}
          style={[styles.iconBtn, { backgroundColor: chat.inputBg, opacity: sending ? 0.5 : 1 }]}
        >
          <Ionicons name="image-outline" size={20} color={colors.primary} />
        </Pressable>
        ) : null}

        {showAttachVideo ? (
        <Pressable
          onPress={onPickVideo}
          disabled={sending}
          style={[styles.iconBtn, { backgroundColor: chat.inputBg, opacity: sending ? 0.5 : 1 }]}
        >
          <Ionicons name="videocam-outline" size={20} color={colors.primary} />
        </Pressable>
        ) : null}

        {(showSend || showAttachImage || showAttachVideo) ? (
        <View style={[styles.inputWrap, { backgroundColor: chat.inputBg }]} collapsable={false}>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            placeholder="Mesaj yazın…"
            placeholderTextColor={chat.inputPlaceholder}
            multiline
            maxLength={MAX_LIVE_SUPPORT_MESSAGE_LENGTH}
            style={[styles.input, { color: colors.text }]}
            textAlignVertical="center"
            scrollEnabled
            blurOnSubmit={false}
            underlineColorAndroid="transparent"
            keyboardType="default"
            showSoftInputOnFocus
          />
        </View>
        ) : null}

        {showSend ? (
        <Pressable onPress={handleSend} disabled={!canSend} style={{ opacity: canSend ? 1 : 0.45 }}>
          <LinearGradient
            colors={canSend ? [colors.primary, colors.primaryMuted] : ['#94A3B8', '#64748B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sendBtn}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={17} color="#fff" />
            )}
          </LinearGradient>
        </Pressable>
        ) : null}
      </View>
    );
  }),
);

export const LiveSupportComposer = memo(
  forwardRef<LiveSupportComposerHandle, LiveSupportComposerProps>(function LiveSupportComposer(
    {
      defaultDraft = '',
      onSend,
      onPickImage,
      onPickVideo,
      sending,
      closedNote,
      error,
      topicChips,
    },
    ref,
  ) {
    const { colors, isDark } = useTheme();
    const chat = useChatTheme();
    const inputRowRef = useRef<LiveSupportComposerHandle>(null);

    useImperativeHandle(
      ref,
      () => ({
        clearDraft: () => inputRowRef.current?.clearDraft(),
        setDraft: (value: string) => inputRowRef.current?.setDraft(value),
      }),
      [],
    );

    const containerStyle = [
      styles.container,
      {
        borderTopColor: chat.composerBorder,
        backgroundColor: Platform.OS === 'ios' ? chat.composerBgSolid : chat.composerBg,
      },
    ];

    const content = (
      <>
        {topicChips}
        {error ? (
          <Text variant="caption" style={{ color: colors.danger, paddingHorizontal: spacing.xs }}>
            {error}
          </Text>
        ) : null}
        {closedNote ? (
          <Text secondary variant="caption" style={styles.closedNote}>
            {closedNote}
          </Text>
        ) : null}
        <ComposerInputRow
          ref={inputRowRef}
          defaultDraft={defaultDraft}
          onSend={onSend}
          onPickImage={onPickImage}
          onPickVideo={onPickVideo}
          sending={sending}
        />
      </>
    );

    if (Platform.OS === 'ios') {
      return (
        <View style={containerStyle}>
          <BlurView
            pointerEvents="none"
            intensity={55}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFillObject}
          />
          {content}
        </View>
      );
    }

    return <View style={containerStyle}>{content}</View>;
  }),
);

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
    paddingHorizontal: 10,
    gap: 8,
    overflow: 'hidden',
  },
  closedNote: { lineHeight: 16, paddingHorizontal: 4, fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    minHeight: CHAT_COMPOSER_MIN_HEIGHT,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    borderRadius: 22,
    minHeight: 40,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 9 : 7,
    paddingBottom: Platform.OS === 'ios' ? 9 : 7,
    maxHeight: 120,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
