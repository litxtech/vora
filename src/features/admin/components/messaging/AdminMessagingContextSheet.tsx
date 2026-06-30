import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import {
  AdminMessagingReportMeta,
  AdminMessagingReportSummary,
} from '@/features/admin/components/messaging/AdminMessagingStatusBadge';
import {
  formatMessagingDateTime,
  MESSAGING_TARGET_LABELS,
  type MessagingTargetType,
} from '@/features/admin/services/messagingPresentation';
import type {
  MessagingContext,
  MessagingReportRow,
} from '@/features/admin/services/messagingModeration';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  report: MessagingReportRow | null;
  context: MessagingContext | null;
  contextLoading: boolean;
  contextError: string | null;
  busy?: boolean;
  onClose: () => void;
  onOpenUser?: (userId: string, username: string) => void;
  onAssign?: (report: MessagingReportRow) => void;
  onResolve?: (report: MessagingReportRow, action: 'approve' | 'reject' | 'warn' | 'hide' | 'remove') => void;
  onLock?: (report: MessagingReportRow) => void;
  onMute?: (report: MessagingReportRow) => void;
};

function ContextBody({
  context,
  onOpenUser,
}: {
  context: MessagingContext;
  onOpenUser?: (userId: string, username: string) => void;
}) {
  const { colors } = useTheme();

  if (context.type === 'message') {
    return (
      <View style={styles.section}>
        <Text variant="label">Mesaj içeriği</Text>
        <View style={[styles.messageBox, { borderColor: colors.border, backgroundColor: `${colors.surface}AA` }]}>
          <Text variant="body">{context.content?.trim() || '— (boş veya silinmiş)'}</Text>
        </View>
        <Text secondary variant="caption">
          Gönderen: @{context.sender_username ?? '—'}
          {context.created_at ? ` · ${formatMessagingDateTime(context.created_at)}` : ''}
        </Text>
        {context.sender_id && onOpenUser ? (
          <AdminActionChip
            label="Göndereni aç"
            icon="person-outline"
            tone="primary"
            compact
            onPress={() => onOpenUser(context.sender_id!, context.sender_username ?? 'kullanıcı')}
          />
        ) : null}
      </View>
    );
  }

  if (context.type === 'conversation') {
    return (
      <View style={styles.section}>
        <Text variant="label">{context.title?.trim() || 'Sohbet'}</Text>
        <Text secondary variant="caption">
          Tür: {context.conversation_type ?? '—'} · {context.member_count} üye
          {context.admin_locked ? ' · Kilitli' : ''}
        </Text>
        <Text variant="label" style={styles.subHeading}>
          Son mesajlar
        </Text>
        {context.recent_messages.length === 0 ? (
          <Text secondary variant="caption">
            Mesaj bulunamadı.
          </Text>
        ) : (
          context.recent_messages.map((msg, index) => (
            <View
              key={`${msg.created_at}-${index}`}
              style={[styles.messageRow, { borderColor: colors.border }]}
            >
              <Text variant="caption" style={{ fontWeight: '700' }}>
                @{msg.sender ?? '—'}
              </Text>
              <Text variant="body" numberOfLines={4}>
                {msg.content?.trim() || '—'}
              </Text>
              {msg.created_at ? (
                <Text secondary variant="caption">
                  {formatMessagingDateTime(msg.created_at)}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text variant="label">
        @{context.caller_username} → @{context.callee_username}
      </Text>
      <Text secondary variant="caption">
        {context.call_type === 'video' ? 'Görüntülü' : 'Sesli'} · {context.status}
      </Text>
      {context.started_at ? (
        <Text secondary variant="caption">
          Başlangıç: {formatMessagingDateTime(context.started_at)}
        </Text>
      ) : null}
      {context.ended_at ? (
        <Text secondary variant="caption">
          Bitiş: {formatMessagingDateTime(context.ended_at)}
        </Text>
      ) : null}
      <View style={styles.userActions}>
        {onOpenUser ? (
          <>
            <AdminActionChip
              label={`@${context.caller_username}`}
              icon="person-outline"
              compact
              onPress={() => onOpenUser(context.caller_id, context.caller_username)}
            />
            <AdminActionChip
              label={`@${context.callee_username}`}
              icon="person-outline"
              compact
              onPress={() => onOpenUser(context.callee_id, context.callee_username)}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}

export function AdminMessagingContextSheet({
  report,
  context,
  contextLoading,
  contextError,
  busy = false,
  onClose,
  onOpenUser,
  onAssign,
  onResolve,
  onLock,
  onMute,
}: Props) {
  const { colors } = useTheme();

  if (!report) return null;

  const targetLabel = MESSAGING_TARGET_LABELS[report.target_type as MessagingTargetType] ?? report.target_type;
  const isOpen = report.status === 'pending' || report.status === 'reviewing';

  return (
    <Modal visible animationType={resolveModalAnimationType('slide')} transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={() => {}}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text variant="title">{targetLabel} detayı</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <AdminMessagingReportMeta report={report} />
            <AdminMessagingReportSummary report={report} />

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {contextLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.primary} />
                <Text secondary variant="caption">
                  İçerik yükleniyor…
                </Text>
              </View>
            ) : contextError ? (
              <View style={[styles.errorBox, { borderColor: `${colors.danger}44`, backgroundColor: `${colors.danger}10` }]}>
                <Ionicons name="warning-outline" size={18} color={colors.danger} />
                <Text variant="caption" style={{ color: colors.danger, flex: 1 }}>
                  {contextError}
                </Text>
              </View>
            ) : context ? (
              <ContextBody context={context} onOpenUser={onOpenUser} />
            ) : (
              <Text secondary variant="caption">
                Detay görüntülemek için yükleyin.
              </Text>
            )}

            {isOpen ? (
              <View style={styles.sheetActions}>
                {report.status === 'pending' && onAssign ? (
                  <AdminActionChip
                    label="İncelemeye al"
                    icon="hand-left-outline"
                    tone="primary"
                    onPress={() => onAssign(report)}
                    loading={busy}
                  />
                ) : null}

                {report.status === 'reviewing' && onResolve ? (
                  <>
                    <AdminActionChip
                      label="Uyarı gönder"
                      icon="alert-circle-outline"
                      tone="warning"
                      onPress={() => onResolve(report, 'warn')}
                      loading={busy}
                    />
                    <AdminActionChip
                      label="İçeriği gizle"
                      icon="eye-off-outline"
                      onPress={() => onResolve(report, 'hide')}
                      loading={busy}
                    />
                    <AdminActionChip
                      label="Kaldır"
                      icon="trash-outline"
                      tone="danger"
                      onPress={() => onResolve(report, 'remove')}
                      loading={busy}
                    />
                  </>
                ) : null}

                {report.target_type === 'conversation' && onLock ? (
                  <AdminActionChip
                    label="Sohbeti kilitle"
                    icon="lock-closed-outline"
                    tone="danger"
                    onPress={() => onLock(report)}
                    loading={busy}
                  />
                ) : null}

                {onMute ? (
                  <AdminActionChip
                    label="24 saat sustur"
                    icon="volume-mute-outline"
                    tone="warning"
                    onPress={() => onMute(report)}
                    loading={busy}
                  />
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  handleRow: { alignItems: 'center', paddingTop: spacing.sm },
  handle: { width: 40, height: 4, borderRadius: radius.full },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: { height: StyleSheet.hairlineWidth },
  section: { gap: spacing.sm },
  subHeading: { marginTop: spacing.xs },
  messageBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  messageRow: {
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  userActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  loadingBox: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sheetActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
