
export type GameDataDTO = {
  champion: number;
  remainRandom: number;
};

export type UserDTO = {
  id: string | "<hidden>";
  name: string;
  gameID: string;
  gameData?: GameDataDTO;
  ownedChampions?: number[];
  rankScore?: number;
};

export type RoomStatus = 'waiting' | 'playing' | 'executing';


export type RoomDTO = {
  id: string;
  name: string;
  status: RoomStatus;
  avaliableChampions: number[];
  users: (UserDTO | null)[];
  totalTime: number;
}

export type RoomInListDTO = {
  id: string;
  name: string;
  status: RoomStatus;
  playerNumber: number;
};

export type CreateRoomRequest = {
  team: 'blue' | 'red';
}

export type JoinRoomRequest = {
  roomName: string;
  password: string;
  team?: 'blue' | 'red';
}

export type ProgressDTO = {
  id: number;
  message: string;
  status: 0 | 1 | 2;
}

export type RankingDTO = {
  summonerId: string;
  name: string;
  nickname: string;
  rankScore: number;
  games: number;
};

export interface LeagueGameEogData {
  basePoints: number
  battleBoostIpEarned: number
  boostIpEarned: number
  boostXpEarned: number
  causedEarlySurrender: boolean
  currentLevel: number
  difficulty: string
  earlySurrenderAccomplice: boolean
  experienceEarned: number
  experienceTotal: number
  firstWinBonus: number
  gameEndedInEarlySurrender: boolean
  gameId: number
  gameLength: number
  gameMode: string
  gameMutators: string[]
  gameType: string
  globalBoostXpEarned: number
  invalid: boolean
  ipEarned: number
  ipTotal: number
  leveledUp: boolean
  // NOTE: hide it when transfer to client
  localPlayer: LeagueGameEogPlayer
  loyaltyBoostXpEarned: number
  missionsXpEarned: number
  // NOTE: hide it when transfer to client
  mucJwtDto?: LeagueGameEogMucJwtDto
  // NOTE: hide it when transfer to client
  multiUserChatId?: string
  // NOTE: hide it when transfer to client
  multiUserChatPassword?: string
  myTeamStatus: string
  newSpells: any[]
  nextLevelXp: number
  preLevelUpExperienceTotal: number
  preLevelUpNextLevelXp: number
  previousLevel: number
  previousXpTotal: number
  queueType: string
  ranked: boolean
  reportGameId: number
  rerollData: LeagueGameEogRerollData
  rpEarned: number
  teamBoost: any
  teamEarlySurrendered: boolean
  teams: LeagueGameEogTeam[]
  timeUntilNextFirstWinBonus: number
  xbgpBoostXpEarned: number
}

export interface LeagueGameEogPlayer {
  botPlayer: boolean
  championId: number
  championName: string
  championSquarePortraitPath: string
  detectedTeamPosition: string
  gameId: number
  isLocalPlayer: boolean
  items: number[]
  leaver: boolean
  leaves: number
  level: number
  losses: number
  profileIconId: number
  puuid: string
  selectedPosition: string
  skinEmblemPaths: any[]
  skinSplashPath: string
  skinTilePath: string
  spell1Id: number
  spell2Id: number
  stats: LeagueGameEogStats
  summonerId: number
  summonerName: string
  teamId: number
  wins: number
}

export interface LeagueGameEogStats {
  ASSISTS: number
  BARRACKS_KILLED: number
  CHAMPIONS_KILLED: number
  GAME_ENDED_IN_EARLY_SURRENDER: number
  GAME_ENDED_IN_SURRENDER: number
  GOLD_EARNED: number
  LARGEST_CRITICAL_STRIKE: number
  LARGEST_KILLING_SPREE: number
  LARGEST_MULTI_KILL: number
  LEVEL: number
  MAGIC_DAMAGE_DEALT_PLAYER: number
  MAGIC_DAMAGE_DEALT_TO_CHAMPIONS: number
  MAGIC_DAMAGE_TAKEN: number
  MINIONS_KILLED: number
  NEUTRAL_MINIONS_KILLED: number
  NUM_DEATHS: number
  PERK0: number
  PERK0_VAR1: number
  PERK0_VAR2: number
  PERK0_VAR3: number
  PERK1: number
  PERK1_VAR1: number
  PERK1_VAR2: number
  PERK1_VAR3: number
  PERK2: number
  PERK2_VAR1: number
  PERK2_VAR2: number
  PERK2_VAR3: number
  PERK3: number
  PERK3_VAR1: number
  PERK3_VAR2: number
  PERK3_VAR3: number
  PERK4: number
  PERK4_VAR1: number
  PERK4_VAR2: number
  PERK4_VAR3: number
  PERK5: number
  PERK5_VAR1: number
  PERK5_VAR2: number
  PERK5_VAR3: number
  PERK_PRIMARY_STYLE: number
  PERK_SUB_STYLE: number
  PHYSICAL_DAMAGE_DEALT_PLAYER: number
  PHYSICAL_DAMAGE_DEALT_TO_CHAMPIONS: number
  PHYSICAL_DAMAGE_TAKEN: number
  PLAYER_AUGMENT_1: number
  PLAYER_AUGMENT_2: number
  PLAYER_AUGMENT_3: number
  PLAYER_AUGMENT_4: number
  PLAYER_AUGMENT_5: number
  PLAYER_AUGMENT_6: number
  PLAYER_SUBTEAM: number
  PLAYER_SUBTEAM_PLACEMENT: number
  SIGHT_WARDS_BOUGHT_IN_GAME: number
  SPELL1_CAST: number
  SPELL2_CAST: number
  TEAM_EARLY_SURRENDERED: number
  TEAM_OBJECTIVE: number
  TIME_CCING_OTHERS: number
  TOTAL_DAMAGE_DEALT: number
  TOTAL_DAMAGE_DEALT_TO_BUILDINGS: number
  TOTAL_DAMAGE_DEALT_TO_CHAMPIONS: number
  TOTAL_DAMAGE_DEALT_TO_OBJECTIVES: number
  TOTAL_DAMAGE_DEALT_TO_TURRETS: number
  TOTAL_DAMAGE_SELF_MITIGATED: number
  TOTAL_DAMAGE_SHIELDED_ON_TEAMMATES: number
  TOTAL_DAMAGE_TAKEN: number
  TOTAL_HEAL: number
  TOTAL_HEAL_ON_TEAMMATES: number
  TOTAL_TIME_CROWD_CONTROL_DEALT: number
  TOTAL_TIME_SPENT_DEAD: number
  TRUE_DAMAGE_DEALT_PLAYER: number
  TRUE_DAMAGE_DEALT_TO_CHAMPIONS: number
  TRUE_DAMAGE_TAKEN: number
  TURRETS_KILLED: number
  VISION_WARDS_BOUGHT_IN_GAME: number
  WAS_AFK: number
  WIN: number
}

export interface LeagueGameEogMucJwtDto {
  channelClaim: string
  domain: string
  jwt: string
  targetRegion: string
}

export interface LeagueGameEogRerollData {
  pointChangeFromChampionsOwned: number
  pointChangeFromGameplay: number
  pointsUntilNextReroll: number
  pointsUsed: number
  previousPoints: number
  rerollCount: number
  totalPoints: number
}

export interface LeagueGameEogTeam {
  fullId: string
  isBottomTeam: boolean
  isPlayerTeam: boolean
  isWinningTeam: boolean
  memberStatusString: string
  name: string
  players: LeagueGameEogPlayer[]
  stats: LeagueGameEogStats
  tag: string
  teamId: number
}

export type UserGameSummaryDTO = {
  gameId: string;
  playerData: LeagueGameEogPlayer;
}