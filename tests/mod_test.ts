import { assert } from "https://deno.land/std@0.144.0/_util/assert.ts";
import { join } from "../deps.ts";
import * as mod from "../mod.ts";
import type { FileMeta, PickConfig } from "../mod.d.ts";
const { test } = Deno;

test("mod", async (t) => {
  const repo = "saadeghi/daisyui";
  const version = "v2.47.0";

  await t.step("mod.githubPick", async () => {
    const pick = [
      /^.*\/base\/.*\.css$/,
      /src\/index\.js/,
    ];
    const files: FileMeta[] = [];
    for await (const file of mod.githubPick({ repo, version, pick })) {
      files.push(file);
    }
    assert(files.length > 0);
    assert(files.filter((f) => f.fileName?.endsWith(".js")).length == 1);
    assert(files.filter((f) => f.fileName?.endsWith(".css")).length == 2);
  });

  await t.step("mod.getFetchCache", async () => {
    const name = `${repo}@${version}`;
    const cached = await mod.getFetchCache(name);
    assert(cached?.endsWith(version));
    assert(cached == join(mod.CACHE_DIR, name));
  });

  await t.step("mod.write: autoStrategy", async () => {
    const output = ".daisyui";
    const config: PickConfig = [
      {
        source: `${repo}@${version}`,
        output,
        pick: [
          /^.*\/base\/.*\.css$/,
          /src\/index\.js/,
        ],
      },
    ];
    await mod.write(config);
    const files = await Deno.readDir(output);
    for await (const file of files) {
      assert(file.isFile);
      assert(file.name.endsWith(".js") || file.name.endsWith(".css"));
      await Deno.remove(join(output, file.name));
    }
    await Deno.remove(output);
  });

  await t.step("mod.write: use glob", async () => {
    const output = ".daisyui";
    const config: PickConfig = [
      {
        source: `${repo}@${version}`,
        output,
        pick: [
          "**/base/*.css",
          "src/index.js",
        ],
      },
    ];
    await mod.write(config);
    const files = await Deno.readDir(output);
    for await (const file of files) {
      assert(file.isFile);
      assert(file.name.endsWith(".js") || file.name.endsWith(".css"));
      await Deno.remove(join(output, file.name));
    }
    await Deno.remove(output);
  });
});

test("cmd line interface", async () => {
  const p = await Deno.run({
    cmd: [
      "deno",
      "run",
      "-A",
      "pickit.ts",
      "saadeghi/daisyui@v2.47.0",
      "daisyui",
      "**/src/index.js",
      "**/base/*.css",
    ],
  });
  const status = await p.status();
  assert(status.success);
  await Deno.remove("daisyui", { recursive: true });
  await p.close();
});
