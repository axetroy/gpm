/**
 * Created by axetroy on 17-2-15.
 */

const os = require("os");

const prettyjson = require("prettyjson");

const pkg = require("../../package.json");
const config = require("../config");
import { IRuntimeOption } from "../type";

export interface RuntimeInfo$ {
  node: string;
  arch: string;
  os: string;
  platform: string;
  [configName: string]: string;
}

export default async function runtime(
  options: IRuntimeOption
): Promise<RuntimeInfo$> {
  const info: RuntimeInfo$ = {
    node: process.version,
    [config.name]: pkg.version,
    arch: os.arch(),
    os: os.type() + " " + os.release(),
    platform: os.platform()
  };

  !options.nolog && process.stdout.write(prettyjson.render(info) + "\n");
  return info;
}
