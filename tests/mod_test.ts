import { assert } from "https://deno.land/std@0.144.0/_util/assert.ts";
import {join} from '../deps.ts';
import * as mod from "../mod.ts";
const { test } = Deno;

test("mod", async (t) => {
  const repo = "saadeghi/daisyui";
  const version = "v2.47.0";
  await t.step("githubPick", async () => {
    const pick = [
      /^.*\/base\/.*\.css$/,
      /src\/index\.js/,
    ];
    const files = [];
    for await (const file of mod.githubPick({ repo, version, pick })) {
      files.push(file);
    }
    assert(files.length > 0);
    assert(files.filter(f => f.fileName.endsWith(".js")).length  == 1);
    assert(files.filter(f => f.fileName.endsWith(".css")).length  == 2);
  });
  await t.step("is cached", async () => {
    const name = `${repo}@${version}`;
    const cached = await mod.getFetchCache(name);
    assert(cached?.endsWith(version));
    assert(cached == join(mod.CACHE_DIR, name));
  });
});
