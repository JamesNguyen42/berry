import {readFileSync, copyFileSync, mkdtempSync, rmSync} from 'fs';
import {tmpdir}                                          from 'os';
import {join, resolve}                                   from 'path';

jest.mock(`vscode`, () => ({
  Disposable: class {
    constructor(private readonly disposeCallback: () => void) {}

    dispose() {
      this.disposeCallback();
    }
  },
  EventEmitter: class {
    event = () => {};
  },
  FileSystemError: {
    FileExists: jest.fn(),
    FileNotFound: jest.fn(),
  },
  FileType: {
    Unknown: 0,
    File: 1,
    Directory: 2,
    SymbolicLink: 64,
  },
  Range: class {
    constructor(
      public readonly startLine: number,
      public readonly startColumn: number,
      public readonly endLine: number,
      public readonly endColumn: number,
    ) {}
  },
  Uri: {
    joinPath: (uri: {fsPath: string}, ...segments: Array<string>) => ({
      fsPath: join(uri.fsPath, ...segments),
    }),
  },
  window: {
    registerTerminalLinkProvider: jest.fn(provider => provider),
  },
}), {virtual: true});

const vscode = jest.requireMock(`vscode`);
const {ZIP_ARCHIVE_EXTENSIONS}: typeof import('../sources/archiveExtensions') = require(`../sources/archiveExtensions`);
const {registerTerminalLinkProvider} = require(`../sources/TerminalLinkProvider`);
const {ZipFSProvider} = require(`../sources/ZipFSProvider`);

const archiveExtensions: Array<string> = [`.zip`, `.jar`, `.war`, `.apk`, `.ipa`, `.crx`];

describe(`ZipFS archive extensions`, () => {
  it.each(archiveExtensions)(`mounts %s archives as directories`, extension => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), `vscode-zipfs-`));
    const archivePath = join(temporaryDirectory, `example${extension}`);

    try {
      copyFileSync(resolve(__dirname, `../example.zip`), archivePath);

      const provider = new ZipFSProvider();
      const uri = {fsPath: archivePath};

      expect(provider.stat(uri).type).toBe(vscode.FileType.Directory);
      expect(provider.readDirectory(uri).length).toBeGreaterThan(0);
    } finally {
      rmSync(temporaryDirectory, {recursive: true, force: true});
    }
  });

  it.each(archiveExtensions)(`links to files inside %s archives from terminals`, extension => {
    const provider = registerTerminalLinkProvider();
    const archivePath = `/tmp/example${extension}/sources/Example.java:12:3`;

    expect(provider.provideTerminalLinks({
      line: `Failure at ${archivePath}`,
      terminal: {},
    }, {})).toEqual([
      expect.objectContaining({
        data: archivePath,
      }),
    ]);
  });

  it(`registers every supported extension with VS Code`, () => {
    const manifest = JSON.parse(
      readFileSync(resolve(__dirname, `../package.json`), `utf8`),
    );

    expect(ZIP_ARCHIVE_EXTENSIONS).toEqual(archiveExtensions);
    expect(manifest.contributes.languages[0].extensions).toEqual(archiveExtensions);
    expect(manifest.activationEvents).toEqual(expect.arrayContaining(
      archiveExtensions.map(extension => `workspaceContains:**/*${extension}`),
    ));
  });
});
