import fs from 'fs';
import path from 'path';
import { type ConfigPlugin, withDangerousMod } from 'expo/config-plugins';

const FILE_PATHS_XML = `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
  <files-path name="internal_files" path="." />
  <cache-path name="cache_files" path="." />
  <external-path name="external_files" path="." />
</paths>
`;

/**
 * react-native-video-trim Android manifestindeki FileProvider kaynağını üretir.
 * Paket native manifesti ekler; managed Expo projesinde xml kaynağı ayrıca gerekir.
 */
const withVideoTrimAndroidFiles: ConfigPlugin = (config) =>
  withDangerousMod(config, [
    'android',
    async (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml',
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'file_paths.xml'), FILE_PATHS_XML);
      return config;
    },
  ]);

export default withVideoTrimAndroidFiles;
