# Pickit

This utility helps you to extract files from tarballs and github repos using
glob syntax or regular expressions. You can use either a config file or command
line arguments.

## Examples

> Pick files from a github repo to directory `scripts`:

```bash
pickit nesterow/pickit@v0.0.1a scripts **/tests/*.ts
```

> Pick files from a tarball to directory `logs`:

```bash
pickit server_logs.tar.gz logs **/error.log
```

## Installation

```bash
deno install -A https://deno.land/x/pickit/pickit.ts
```

## Using without installation

```bash
deno run -A https://deno.land/x/pickit/pickit.ts [args]...
```

## Using config file

If you need to pick files from multiple sources, you can use a config file. The
config file should export an array of `PickConfig` objects.

```typescript
import type { PickConfig } from "https://deno.land/x/pickit/mod.d.ts";
export default [
    {
        source: "username/repo@version",
        output: "./outputDir",
        pick: [
            /^.*/base/.*.css$/, // can be a regular expression
            "/src/index.js",
            "/src/**/*.yaml"
        ],
    },
] as PickConfig;
```

See the complete example
[here](https://github.com/nesterow/pickit/blob/main/tests/config_mock.ts).

> Usage:

```bash
pickit ./config.ts
```

## API

Most methods are exported from `mod.ts` and can be used within your code. Read
the [API documentation](https://deno.land/x/pickit/mod.ts)

> All functions are using RegExp to match files. So you need to convert globs
> explicitly. Example:

```typescript
import { githubPick } from "https://deno.land/x/pickit@v0.0.3/mod.ts";
import { globToRegExp, join } from "$std/path/mod.ts";
import { readAll } from "$std/streams/conversion.ts";

for await (
  const cssFile of githubPick({
    repo: "saadeghi/daisyui",
    version: "v2.47.0",
    pick: [
      globToRegExp("**/src/components/**/*.css"),
    ],
  })
) {
  const css = new TextDecoder("utf-8").decode(await readAll(cssFile));
  // do something with css
}
```

## License

```text
MIT License

Copyright (c) 2023 Pick it contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Contributors

[@nesterow](https://github.com/nesterow)
