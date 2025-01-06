#!/usr/bin/env -S npx ts-node
import { parseArgs } from "node:util";
import { promises as fs } from "node:fs";
import { RankScoreService } from "../src/rankscore.service";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { Logger } from "@nestjs/common";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const rankScoreService = app.get(RankScoreService);
  const args = parseArgs({
    args: process.argv.slice(2),
    options: {
      server: {
        type: "string",
        default: "HN1"
      },
    },
    allowPositionals: true,
  });

  const files = args.positionals;
  const logger = new Logger("ImportGame");

  if (!files.length) {
    logger.error("No files to process.");
    return;
  }

  for (const file of files) {
    logger.log(`Processing ${file}...`);
    const data = JSON.parse(await fs.readFile(file, "utf-8"))
    await rankScoreService.handleEndOfGameData(data, args.values.server);
  }
}

main();
