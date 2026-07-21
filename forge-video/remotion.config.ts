import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");
Config.setCrf(18);           // visually lossless
Config.setOverwriteOutput(true);
Config.setEntryPoint("./src/index.ts");
