export type ReadStrategy =
  | "tar"
  | "targz"
  | "github";

export type ReadPredicate = (
  entry: ConfigEntry,
) => AsyncGenerator<Deno.Reader | Deno.Reader & FileMeta>;

export type GlobLike = string | RegExp;
export interface ConfigEntry {
  strategy?: ReadStrategy;
  read?: ReadPredicate;
  source: string;
  output: string;
  pick: GlobLike[];
}

export type PickConfig = ConfigEntry[];

export interface FileMeta extends Deno.Reader {
  fileName?: string;
}

export interface ReadableEntry extends ConfigEntry {
  read: () => AsyncGenerator<FileMeta>;
}

export type PathLike = string | URL;
export interface GithubPickOptions {
  repo: string;
  version: string;
  pick: RegExp[];
}
