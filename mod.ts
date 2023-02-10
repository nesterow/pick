import {
  cacheDir,
  copy,
  GzDecoder,
  join,
  readerFromStreamReader,
  TarMeta,
  Transform,
  Untar,
} from "./deps.ts";

export const CACHE_DIR = join((await cacheDir()) ?? ".cache", "__pick_cache0");
Deno.mkdir(CACHE_DIR).catch((_) => {});

type TarEntry = TarMeta & Deno.Reader;
interface GithubPickOptions {
  repo: string;
  version: string;
  pick: RegExp[];
}

export async function* githubPick({ repo, version, pick }: GithubPickOptions) {
  const _cached = await getFetchCache(`${repo}@${version}`);
  if (_cached) {
    const reader = await Deno.open(_cached);
    yield* tarGzPickFiles(reader, pick);
  } else {
    yield* githubPickFiles({ repo, version, pick });
  }
}

/**
 * Reads *.tar.gz file from a version tag and returns generator of the files that match the pick regex.
 *
 * @param {GithubPickOptions} opts - { repo: "denoland/deno", version: "v1.0.0", pick: [/\.ts$/] }
 * @returns {AsyncGenerator<TarEntry>}
 */
export async function* githubPickFiles(
  { repo, version, pick }: GithubPickOptions,
): AsyncGenerator<TarEntry> {
  const targz = await fetch(
    `https://github.com/${repo}/archive/refs/tags/${version}.tar.gz`,
  );
  await putFetchCache(targz.body, `${repo}@${version}`);
  const reader = readerFromStreamReader(targz.body!.getReader());
  yield* tarGzPickFiles(reader, pick);
}

/**
 * Pick files from a tar.gz archive.
 *
 * @param {Deno.Reader} tar - Deno.open('archive.tar.gz')
 * @param {RegExp[]} pick - [ /\.ts$/ ]
 */
export async function* tarGzPickFiles(
  targz: Deno.Reader | Deno.FsFile,
  pick: RegExp[],
) {
  const untar = new Untar(
    Transform.newReader(
      targz,
      new GzDecoder(),
    ),
  );
  for await (const entry of untar) {
    if (entry.type === "file" && pick.some((re) => re.test(entry.fileName))) {
      yield entry;
    }
  }
}

/**
 * Writes fetch body to a cache file.
 * @param body
 * @param name
 * @param opts
 */
export async function putFetchCache(body: Response["body"], name: string) {
  const reader = readerFromStreamReader(body!.getReader());
  const writer = await Deno.open(join(CACHE_DIR, name), { write: true });
  await copy(reader, writer);
  writer.close();
}

/**
 * Get either the path to the cache file or null if it doesn't exist.
 * @param {string} name
 * @returns {Promise<string | null>}
 */
export async function getFetchCache(name: string) {
  try {
    const _file = join(CACHE_DIR, name);
    await Deno.lstat(_file);
    return _file;
  } catch (_) {
    return null;
  }
}

/**
 * Clean the fetch cache.
 * @returns {Promise<void>}
 */
export async function cleanFetchCache() {
  return Deno.remove(CACHE_DIR, { recursive: true });
}

export async function writeTarEntry(
  entry: TarEntry,
  dir: string,
  formatWritePath: (path: string) => string = (path) => path,
) {
  const path = formatWritePath(entry.fileName);
  const file = await Deno.open(dir + path, {
    create: true,
    write: true,
  });
  await copy(entry, file);
  file.close();
}
