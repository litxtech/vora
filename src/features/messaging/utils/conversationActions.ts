import { ActionSheetIOS, Alert, Platform } from 'react-native';
import type { ConversationListItem } from '../types';
import {
  archiveConversation,
  deleteConversationForUser,
  muteConversation,
  pinConversation,
  unarchiveConversation,
  unmuteConversation,
  unpinConversation,
  MUTE_OPTIONS,
  type MuteDuration,
} from '../services/inboxActions';
import { conversationTitle } from '../utils';

type ActionContext = {
  item: ConversationListItem;
  archivedView?: boolean;
  onChanged: () => void;
};

async function runMutePicker(item: ConversationListItem, onChanged: () => void) {
  const options = [...MUTE_OPTIONS.map((o) => o.label), 'İptal'];
  const pick = async (index: number) => {
    if (index >= MUTE_OPTIONS.length) return;
    const duration = MUTE_OPTIONS[index].id as MuteDuration;
    const { error } = await muteConversation(item.id, duration);
    if (error) Alert.alert('Sessize alınamadı', error);
    else onChanged();
  };

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: options.length - 1 },
      pick,
    );
  } else {
    Alert.alert('Sessize Al', undefined, [
      ...MUTE_OPTIONS.map((o, i) => ({ text: o.label, onPress: () => pick(i) })),
      { text: 'İptal', style: 'cancel' },
    ]);
  }
}

export function showConversationActions({ item, archivedView, onChanged }: ActionContext) {
  const title = conversationTitle(item);
  const actions: string[] = [];

  if (archivedView) {
    actions.push('Arşivden Çıkar');
  } else {
    actions.push(item.isPinned ? 'Sabitlemeyi Kaldır' : 'Sabitle');
    actions.push('Arşivle');
    actions.push(item.isMuted ? 'Sessizi Kaldır' : 'Sessize Al');
  }
  actions.push('Sohbeti Sil');
  actions.push('İptal');

  const run = async (index: number) => {
    const action = actions[index];
    if (action === 'Sabitle') {
      const { error } = await pinConversation(item.id);
      if (error) Alert.alert('Sabitleme', error);
      else onChanged();
    } else if (action === 'Sabitlemeyi Kaldır') {
      await unpinConversation(item.id);
      onChanged();
    } else if (action === 'Arşivle') {
      await archiveConversation(item.id);
      onChanged();
    } else if (action === 'Arşivden Çıkar') {
      await unarchiveConversation(item.id);
      onChanged();
    } else if (action === 'Sessize Al') {
      await runMutePicker(item, onChanged);
    } else if (action === 'Sessizi Kaldır') {
      await unmuteConversation(item.id);
      onChanged();
    } else if (action === 'Sohbeti Sil') {
      Alert.alert(
        'Sohbeti Sil',
        `"${title}" sohbetini silmek istediğinize emin misiniz? Yeni mesaj gelirse sohbet yeniden görünür.`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: async () => {
              const { error } = await deleteConversationForUser(item.id);
              if (error) Alert.alert('Silinemedi', error);
              else onChanged();
            },
          },
        ],
      );
    }
  };

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: actions,
        cancelButtonIndex: actions.length - 1,
        destructiveButtonIndex: actions.indexOf('Sohbeti Sil'),
        title,
      },
      run,
    );
  } else {
    Alert.alert(title, undefined, [
      ...actions.slice(0, -1).map((label, i) => ({
        text: label,
        style: label === 'Sohbeti Sil' ? ('destructive' as const) : ('default' as const),
        onPress: () => run(i),
      })),
      { text: 'İptal', style: 'cancel' },
    ]);
  }
}

type ChatBlockOptions = {
  blockedByMe: boolean;
  otherUserName: string;
  onBlock: () => void;
  onUnblock: () => void;
};

export function showChatMenuActions(
  _conversationId: string,
  onClear: () => void,
  onDelete: () => void,
  blockOptions?: ChatBlockOptions,
) {
  const actions = ['Sohbet Geçmişini Temizle', 'Sohbeti Tamamen Sil'];
  if (blockOptions) {
    actions.push(blockOptions.blockedByMe ? 'Engeli Kaldır' : 'Engelle');
  }
  actions.push('İptal');

  const run = (index: number) => {
    if (actions[index] === 'Sohbet Geçmişini Temizle') {
      Alert.alert(
        'Geçmişi Temizle',
        'Mesaj geçmişi yalnızca sizin ekranınızdan silinir.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Temizle', style: 'destructive', onPress: onClear },
        ],
      );
    } else if (actions[index] === 'Sohbeti Tamamen Sil') {
      Alert.alert(
        'Sohbeti Sil',
        'Sohbet listeden kaldırılır. Karşı taraf yeni mesaj gönderirse aynı sohbet yeniden görünür.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Sil', style: 'destructive', onPress: onDelete },
        ],
      );
    } else if (actions[index] === 'Engelle' && blockOptions) {
      Alert.alert(
        'Engelle',
        `@${blockOptions.otherUserName} kullanıcısını engellemek istediğinize emin misiniz? Engel kaldırılana kadar mesaj ve arama yapılamaz.`,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Engelle', style: 'destructive', onPress: blockOptions.onBlock },
        ],
      );
    } else if (actions[index] === 'Engeli Kaldır' && blockOptions) {
      Alert.alert(
        'Engeli Kaldır',
        `@${blockOptions.otherUserName} engeli kaldırılsın mı?`,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Engeli Kaldır', onPress: blockOptions.onUnblock },
        ],
      );
    }
  };

  const destructiveIndex = actions.indexOf('Sohbeti Tamamen Sil');
  const blockIndex = blockOptions?.blockedByMe
    ? actions.indexOf('Engeli Kaldır')
    : actions.indexOf('Engelle');

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: actions,
        cancelButtonIndex: actions.length - 1,
        destructiveButtonIndex: blockOptions && !blockOptions.blockedByMe ? blockIndex : destructiveIndex,
      },
      run,
    );
  } else {
    Alert.alert('Sohbet', undefined, [
      ...actions.slice(0, -1).map((label, i) => ({
        text: label,
        style:
          label === 'Sohbeti Tamamen Sil' || label === 'Engelle'
            ? ('destructive' as const)
            : ('default' as const),
        onPress: () => run(i),
      })),
      { text: 'İptal', style: 'cancel' },
    ]);
  }
}
