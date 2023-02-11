// command line interface for pickit
// semantics:
//   - pickit [source] [outputDir] [glob1] [glob2]...
//   - pickit ./config.ts (default: ./.pickit.ts)

import { cleanFetchCache, write } from "./mod.ts";

if (Deno.args.length == 1) {
  if (Deno.args[0] == "clean") {
    await cleanFetchCache();
  } else if (Deno.args[0] == "help") {
    printHelp();
  } else {
    const config = await import(Deno.args[0]);
    await write(config.default);
  }
} else if (Deno.args.length >= 3) {
  const [source, output, ...pick] = Deno.args;
  await write([{ source, output, pick }]);
} else {
  printHelp();
}

function printHelp() {
  console.log(
    `
  %cPickIt
  `,
    "font-size: 1.5em; font-weight: bold",
  );
  console.log(
    `
        This utility helps you to extract files from tarballs and github repos using glob syntax or regular expressions.
        You can use either a config file or command line arguments.

          pickit %cclean - cleans the cache of fetched files.
          %cpickit %chelp - prints this help message.
    `,
    "color: #ccb;",
    "",
    "color: #ccb;",
  );
  console.log(
    `
  %cUsage:
  `,
    "font-size: 1.5em; font-weight: bold",
  );
  console.log(
    `
        pickit %c[source] [outputDir] [glob1] [glob2]...
        %cpickit %c./config.ts
    `,
    "color: #ccb;",
    "",
    "color: #ccb;",
  );
  console.log(
    `
  %cExample:
  `,
    "font-size: 1.5em; font-weight: bold",
  );
  console.log(
    `
        %cpickit nesterow/pickit@v0.0.1 scripts *.d.ts **/tests/*.ts
    `,
    "color: #aab;",
  );
  console.log(
    `
  %cConfiguring (ts):
  `,
    "font-size: 1.5em; font-weight: bold",
  );
  console.log(
    `%c
        import type { PickConfig } from "https://deno.land/x/pickit/mod.d.ts";
        export default [
            {
                source: "username/repo@version",
                output: "./outputDir",
                pick: [
                    /^.*\/base\/.*\.css$/,
                    "/src/index.js",
                    "/src/**/*.yaml"
                ],
            },
        ] as PickConfig;


    `,
    "color: #aab;",
  );
}
