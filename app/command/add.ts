/**
 * Created by axetroy on 17-2-14.
 */

const path = require("path");
const gitUrlParse = require("git-url-parse");
const fs = require("fs-extra");
const _ = require("lodash");
const inquirer = require("inquirer");
const prompt = inquirer.createPromptModule();
const which = require("which");
const uniqueString = require("unique-string");
const clipboardy = require("clipboardy");
import chalk from "chalk";
const __ = require("i18n").__;

import { isExistPath, isLink, normalizePath, runShell } from "../utils";
import config from "../config";
import registry from "../registry";
import globalConfig from "../global-config";
import Gpmrc from "../gpmrc";
import { info, warn } from "../logger";
import { IAddOption } from "../type";

export default async function add(repo: string, options: IAddOption) {
  const gitInfo = gitUrlParse(repo);

  if (!gitInfo || !gitInfo.owner || !gitInfo.name) {
    throw new Error(__("commands.add.log.invalid_url", { repo }));
  }

  const randomTemp: string = path.join(config.paths.temp, uniqueString());
  const tempDir: string = path.join(randomTemp, gitInfo.name);
  const baseDir: string = path.join(
    config.paths.home,
    globalConfig.entity.base || config.defaults.base
  );
  const sourceDir: string = path.join(baseDir, gitInfo.source);
  const ownerDir: string = path.join(sourceDir, gitInfo.owner);
  let repoDir: string = path.join(
    ownerDir,
    typeof options.name === "string" ? options.name : gitInfo.name
  );

  let confirmCover: boolean = false;
  if (await isExistPath(repoDir)) {
    if (options.force) {
      confirmCover = true;
    } else {
      confirmCover = (await prompt({
        type: "confirm",
        name: "result",
        message: chalk.white(
          __("commands.add.log.confirm_cover", {
            path: chalk.yellow.underline(normalizePath(repoDir, options))
          })
        ),
        ["default"]: false
      })).result;
    }
    if (!confirmCover) {
      !options.nolog && info(__("global.tips.good_bye"));
      return process.exit(1);
    }
  }

  await fs.ensureDir(baseDir);
  await fs.ensureDir(sourceDir);
  await fs.ensureDir(ownerDir);
  await fs.ensureDir(randomTemp);

  try {
    const git = which.sync("git");
    if (!git) {
      return Promise.reject(
        new Error(
          __("commands.add.log.make_sure_install", { bin: chalk.green("Git") })
        )
      );
    }
  } catch (err) {
    throw err;
  }

  await runShell(`git clone ${gitInfo.href}`, {
    cwd: randomTemp,
    stdio: "inherit"
  });

  // if it's a link, then unlink first
  if (await isLink(repoDir)) await fs.unlink(repoDir);
  await fs.remove(repoDir);
  await fs.move(tempDir, repoDir);
  await fs.remove(randomTemp);

  /**
   * parse the .gpmrc
   * valid argument:
   *    name: the repo's name
   *    hooks:
   *      add: run command after add repo
   */
  if (!options.ignoreRc) {
    const gpmrc = new Gpmrc();
    await gpmrc.load(repoDir);
    if (gpmrc.exist) {
      const alias: string = gpmrc.rc.name;
      if (alias && alias !== gitInfo.name) {
        let newRepoDir: string = path.join(
          ownerDir,
          _.isString(options.name) ? options.name : alias
        );
        await fs.move(repoDir, newRepoDir);
        repoDir = newRepoDir;
      }
      await gpmrc.runHook("add", { cwd: repoDir }).catch(err => {
        console.error(err);
        return Promise.resolve();
      });
    }
  }

  const entity = _.extend({}, gitInfo, { path: repoDir });
  delete entity.toString;
  await registry.add(entity);

  if (!options.nolog) {
    let finallyPath = normalizePath(repoDir, options);
    info(
      __("commands.add.log.info_add_success", {
        path: chalk.green.underline(finallyPath)
      })
    );
    try {
      clipboardy.writeSync(finallyPath);
      info(
        __("commands.add.log.info_copy_clipboard", {
          key: chalk.green("<CTRL+V>")
        })
      );
    } catch (err) {
      warn(__("commands.add.log.warn_copy_clipboard"));
    }
  }
}
