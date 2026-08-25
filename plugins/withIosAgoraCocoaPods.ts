import {
  type ConfigPlugin,
  withPodfile,
} from 'expo/config-plugins';
import {
  mergeContents,
  removeContents,
} from '@expo/config-plugins/build/utils/generateCode';

const AGORA_PODS = `  pod 'AgoraRtcEngine_Special_iOS', :podspec => '../vendor/ios-podspecs/AgoraRtcEngine_Special_iOS.podspec.json'
  pod 'AgoraIrisRTC_iOS', :podspec => '../vendor/ios-podspecs/AgoraIrisRTC_iOS.podspec.json'`;

/**
 * EAS pod install, Agora spec'lerini CocoaPods trunk üzerinden GitHub raw'dan çekerken
 * 429 rate-limit alıyor. Yerel podspec + doğrudan Agora CDN indirmesi bunu önler.
 */
const withIosAgoraCocoaPods: ConfigPlugin = (config) =>
  withPodfile(config, (mod) => {
    let contents = mod.modResults.contents;

    const withoutOld = removeContents({
      src: contents,
      tag: 'with-ios-agora-cocoapods',
    });
    contents = withoutOld.contents;

    const merged = mergeContents({
      src: contents,
      newSrc: AGORA_PODS,
      tag: 'with-ios-agora-cocoapods',
      anchor: /use_expo_modules!/,
      offset: 1,
      comment: '#',
    });

    if (merged.didMerge || merged.didClear) {
      contents = merged.contents;
    }

    mod.modResults.contents = contents;
    return mod;
  });

export default withIosAgoraCocoaPods;
