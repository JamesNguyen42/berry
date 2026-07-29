import {npath} from '@yarnpkg/fslib';

export const ZIP_ARCHIVE_EXTENSIONS = [
  `.zip`,
  `.jar`,
  `.war`,
  `.apk`,
  `.ipa`,
  `.crx`,
];

export const ZIP_ARCHIVE_EXTENSION_PATTERN = ZIP_ARCHIVE_EXTENSIONS
  .map(extension => `\\${extension}`)
  .join(`|`);

export function isZipArchivePath(path: string) {
  return ZIP_ARCHIVE_EXTENSIONS.includes(npath.extname(path));
}
