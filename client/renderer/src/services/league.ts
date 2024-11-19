'use client';
import { type LeagueHandler } from '../../../main/preload'

// @ts-ignore
const leagueHandler: LeagueHandler = (window as any)?.league;

export default leagueHandler;