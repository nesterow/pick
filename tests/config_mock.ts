import type { PickConfig } from "../mod.d.ts";

export default [
  {
    source: "saadeghi/daisyui@v2.47.0",
    output: ".basestyles",
    pick: [
      /^.*\/base\/.*\.css$/,
    ],
  },
] as PickConfig;
