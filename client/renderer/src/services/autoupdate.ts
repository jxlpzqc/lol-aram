'use client';
import { type AutoUpdateHandler } from '@main/preload'

// @ts-ignore
const autoUpdateHandler: AutoUpdateHandler = (global as any)?.autoupdate;

export default autoUpdateHandler;