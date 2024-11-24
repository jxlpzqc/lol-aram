'use client';
import { type LeagueHandler } from '@main/preload'

// @ts-ignore
const leagueHandler: LeagueHandler = (global as any)?.league;

export default leagueHandler;