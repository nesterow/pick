import {
  cacheDir,
  copy,
  globToRegExp,
  GzDecoder,
  join,
  readerFromStreamReader,
  Transform,
  Untar,
} from "./deps.ts";
import type {
  ConfigEntry,
  GithubPickOptions,
  PathLike,
  PickConfig,
  ReadableEntry,
  ReadPredicate,
  ReadStrategy,
} from "./mod.d.ts";

export const CACHE_DIR = join((await cacheDir()) ?? ".cache", "__pick_cache0");
await Deno.mkdir(CACHE_DIR).catch((_) => {});

/**
 * Read config and write files
 */
export async function write(entires: PickConfig) {
  const _entries: ReadableEntry[] = entires.map(asReadable$);
  for (const entry of _entries) {
    const output = entry.output;
    await Deno.mkdir(output, { recursive: true });
    for await (const reader of entry.read()) {
      const file = await Deno.open(
        join(output, filename(reader.fileName ?? "")),
        { create: true, write: true },
      );
      await copy(reader, file);
      file.close();
    }
  }
}

/**
 * Decorator which makes config entries readable
 */
function asReadable$(entry: ConfigEntry): ReadableEntry {
  // convert globs to regex if required
  const pick = entry.pick.map((p) => {
    if (typeof p === "string") {
      return globToRegExp(p);
    }
    return p;
  });

  // if read is a function, use it
  let read: ReadableEntry["read"];
  if (typeof entry.read === "function") {
    read = () => (entry.read as ReadPredicate)(entry);
  } else {
    // otherwise, use a specific strategy
    const strategy = entry.strategy ?? autoStrategy$(entry.source);
    switch (strategy) {
      case "tar": {
        read = () => tarPickFiles(entry.source, pick);
        break;
      }
      case "targz": {
        read = () => tarGzPickFiles(entry.source, pick);
        break;
      }
      case "github": {
        const [repo, ...version] = entry.source.split("@");
        if (!version) {
          throw new Error(
            `Invalid source format: ${entry.source}
            Expected: <repo>@<version>`,
          );
        }
        read = () => githubPick({ repo, version: version.join(""), pick });
        break;
      }
      default: {
        throw new Error(`Unknown strategy: ${entry.strategy}`);
      }
    }
  }
  return {
    ...entry,
    read,
  };
}

function autoStrategy$(source: string): ReadStrategy {
  if (source.endsWith(".tar")) {
    return "tar";
  } else if (source.endsWith(".tar.gz")) {
    return "targz";
  } else if (source.includes("@")) {
    return "github";
  } else {
    throw new Error(`Unknown strategy for source: ${source}`);
  }
}

function filename(path: string) {
  return path.split("/").pop() ?? "";
}

/**
 * Pick files from a github repo.
 * @param {GithubPickOptions} opts - { repo: "denoland/deno", version: "v1.0.0", pick: [/\.ts$/] }
 */
export async function* githubPick(
  { repo, version, pick }: GithubPickOptions,
): ReturnType<ReadableEntry["read"]> {
  await Deno.mkdir(join(CACHE_DIR, repo.split("/").shift() ?? "")).catch(
    (_) => {},
  );
  const _cached = await getFetchCache(`${repo}@${version}`);
  if (_cached) {
    const reader = await Deno.open(_cached);
    yield* tarGzPickFiles(reader, pick);
    reader.close();
  } else {
    yield* githubPickFiles({ repo, version, pick });
  }
}

/**
 * Reads *.tar.gz file from a version tag and returns generator of the files that match the pick regex.
 *
 * @param {GithubPickOptions} opts - { repo: "denoland/deno", version: "v1.0.0", pick: [/\.ts$/] }
 */
export async function* githubPickFiles(
  { repo, version, pick }: GithubPickOptions,
): ReturnType<ReadableEntry["read"]> {
  const targz = await fetch(
    `https://github.com/${repo}/archive/refs/tags/${version}.tar.gz`,
  );
  const name = `${repo}@${version}`;
  await putFetchCache(targz.body, name);
  const file = await Deno.open(join(CACHE_DIR, name));
  yield* tarGzPickFiles(file, pick);
  file.close();
}

/**
 * Pick files from a tar.gz archive.
 *
 * @param {Deno.Reader} targz - Deno.open('archive.tar.gz')
 * @param {RegExp[]} pick - [ /\.ts$/ ]
 */
export async function* tarGzPickFiles(
  targz: Deno.Reader | Deno.FsFile | PathLike,
  pick: RegExp[],
): ReturnType<ReadableEntry["read"]> {
  if (typeof targz === "string" || targz instanceof URL) {
    targz = await Deno.open(targz);
  }
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
 * Pick files from a tar.gz archive.
 *
 * @param {Deno.Reader} tar - Deno.open('archive.tar')
 * @param {RegExp[]} pick - [ /\.ts$/ ]
 */
export async function* tarPickFiles(
  tar: Deno.Reader | Deno.FsFile | PathLike,
  pick: RegExp[],
): ReturnType<ReadableEntry["read"]> {
  if (typeof tar === "string" || tar instanceof URL) {
    tar = await Deno.open(tar);
  }
  const untar = new Untar(tar);
  for await (const entry of untar) {
    if (entry.type === "file" && pick.some((re) => re.test(entry.fileName))) {
      yield entry;
    }
  }
}

/**
 * Writes fetch body to a cache file.
 */
export async function putFetchCache(body: Response["body"], name: string) {
  const reader = readerFromStreamReader(body!.getReader());
  const _file = join(CACHE_DIR, name);
  await Deno.remove(_file).catch((_) => {});
  const writer = await Deno.open(_file, {
    write: true,
    create: true,
  });
  await copy(reader, writer);
  writer.close();
}

/**
 * Get either the path to the cache file or null if it doesn't exist.
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
 */
export async function cleanFetchCache() {
  return await Deno.remove(CACHE_DIR, { recursive: true });
}
