/**
 * Created by axetroy on 17-2-14.
 */

const fs = require("fs-extra");
import chalk from "chalk";
import config from "../config";
import { info } from "../logger";

import relinkHandler from "./relink";
import { ICleanOption } from "../type";

export default async function clean(options: ICleanOption): Promise<void> {
  try {
    await fs.emptyDir(config.paths.temp);
  } catch (err) {
    throw new Error(
      `${err + ""}\n May be you don't have permission to access ${
        config.paths.temp
      }, try to delete in manual`
    );
  }
  // auto generate file again
  await relinkHandler({ nolog: options.nolog });
  !options.nolog &&
    info(`clean ${chalk.green.underline(config.paths.temp)} success`);
}
