import {
  IOSConfig,
  type ConfigPlugin,
  withDangerousMod,
  withPodfile,
  withXcodeProject,
} from 'expo/config-plugins';

const RESOURCE_BUNDLE_SNIPPET = `
    # CocoaPods resource bundle imzalama (Xcode 14+)
    installer.target_installation_results.pod_target_installation_results.each do |_pod_name, target_installation_result|
      target_installation_result.resource_bundle_targets.each do |resource_bundle_target|
        resource_bundle_target.build_configurations.each do |config|
          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
        end
      end
    end`;

function mergePodfilePostInstall(contents: string, snippet: string): string {
  if (contents.includes('CODE_SIGNING_ALLOWED')) {
    return contents;
  }

  const postInstallMatch = contents.match(/post_install do \|installer\|/);
  if (postInstallMatch?.index != null) {
    const insertAt = postInstallMatch.index + postInstallMatch[0].length;
    return `${contents.slice(0, insertAt)}${snippet}${contents.slice(insertAt)}`;
  }

  return `${contents}

post_install do |installer|${snippet}
end
`;
}

/** Tüm native target'lara DEVELOPMENT_TEAM + Pod resource bundle imzalama. */
const withIosProductionSigning: ConfigPlugin = (config) => {
  const appleTeamId = config.ios?.appleTeamId;
  if (!appleTeamId) {
    return config;
  }

  config = IOSConfig.DevelopmentTeam.withDevelopmentTeam(config, { appleTeamId });

  config = withXcodeProject(config, (mod) => {
    mod.modResults = IOSConfig.DevelopmentTeam.updateDevelopmentTeamForPbxproj(
      mod.modResults,
      appleTeamId,
    );
    return mod;
  });

  config = withDangerousMod(config, [
    'ios',
    async (mod) => {
      IOSConfig.DevelopmentTeam.setDevelopmentTeamForPbxproj(mod.modRequest.projectRoot, appleTeamId);
      return mod;
    },
  ]);

  config = withPodfile(config, (mod) => {
    mod.modResults.contents = mergePodfilePostInstall(
      mod.modResults.contents,
      RESOURCE_BUNDLE_SNIPPET,
    );
    return mod;
  });

  return config;
};

export default withIosProductionSigning;
