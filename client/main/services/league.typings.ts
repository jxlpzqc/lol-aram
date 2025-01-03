export interface RecentGamesResult {
  accountId: number
  games: {
    gameBeginDate: string
    gameCount: number
    gameEndDate: string
    gameIndexBegin: number
    gameIndexEnd: number
    games: RecentGameData[]
  }
}

export interface RecentGameData {
  endOfGameResult: string
  gameCreation: number
  gameCreationDate: string
  gameDuration: number
  gameId: number
  gameMode: string
  gameType: string
  gameVersion: string
  mapId: number
  participantIdentities: ParticipantIdentity[]
  participants: Participant[]
  platformId: string
  queueId: number
  seasonId: number
  teams: Team[]
}

export interface ParticipantIdentity {
  participantId: number
  player: Player
}

export interface Player {
  accountId: number
  currentAccountId: number
  currentPlatformId: string
  gameName: string
  matchHistoryUri: string
  platformId: string
  profileIcon: number
  puuid: string
  summonerId: number
  summonerName: string
  tagLine: string
}

export interface Participant {
  championId: number
  highestAchievedSeasonTier: string
  participantId: number
  spell1Id: number
  spell2Id: number
  stats: Stats
  teamId: number
  timeline: Timeline
}

export interface Stats {
  assists: number
  causedEarlySurrender: boolean
  champLevel: number
  combatPlayerScore: number
  damageDealtToObjectives: number
  damageDealtToTurrets: number
  damageSelfMitigated: number
  deaths: number
  doubleKills: number
  earlySurrenderAccomplice: boolean
  firstBloodAssist: boolean
  firstBloodKill: boolean
  firstInhibitorAssist: boolean
  firstInhibitorKill: boolean
  firstTowerAssist: boolean
  firstTowerKill: boolean
  gameEndedInEarlySurrender: boolean
  gameEndedInSurrender: boolean
  goldEarned: number
  goldSpent: number
  inhibitorKills: number
  item0: number
  item1: number
  item2: number
  item3: number
  item4: number
  item5: number
  item6: number
  killingSprees: number
  kills: number
  largestCriticalStrike: number
  largestKillingSpree: number
  largestMultiKill: number
  longestTimeSpentLiving: number
  magicDamageDealt: number
  magicDamageDealtToChampions: number
  magicalDamageTaken: number
  neutralMinionsKilled: number
  neutralMinionsKilledEnemyJungle: number
  neutralMinionsKilledTeamJungle: number
  objectivePlayerScore: number
  participantId: number
  pentaKills: number
  perk0: number
  perk0Var1: number
  perk0Var2: number
  perk0Var3: number
  perk1: number
  perk1Var1: number
  perk1Var2: number
  perk1Var3: number
  perk2: number
  perk2Var1: number
  perk2Var2: number
  perk2Var3: number
  perk3: number
  perk3Var1: number
  perk3Var2: number
  perk3Var3: number
  perk4: number
  perk4Var1: number
  perk4Var2: number
  perk4Var3: number
  perk5: number
  perk5Var1: number
  perk5Var2: number
  perk5Var3: number
  perkPrimaryStyle: number
  perkSubStyle: number
  physicalDamageDealt: number
  physicalDamageDealtToChampions: number
  physicalDamageTaken: number
  playerAugment1: number
  playerAugment2: number
  playerAugment3: number
  playerAugment4: number
  playerAugment5: number
  playerAugment6: number
  playerScore0: number
  playerScore1: number
  playerScore2: number
  playerScore3: number
  playerScore4: number
  playerScore5: number
  playerScore6: number
  playerScore7: number
  playerScore8: number
  playerScore9: number
  playerSubteamId: number
  quadraKills: number
  sightWardsBoughtInGame: number
  subteamPlacement: number
  teamEarlySurrendered: boolean
  timeCCingOthers: number
  totalDamageDealt: number
  totalDamageDealtToChampions: number
  totalDamageTaken: number
  totalHeal: number
  totalMinionsKilled: number
  totalPlayerScore: number
  totalScoreRank: number
  totalTimeCrowdControlDealt: number
  totalUnitsHealed: number
  tripleKills: number
  trueDamageDealt: number
  trueDamageDealtToChampions: number
  trueDamageTaken: number
  turretKills: number
  unrealKills: number
  visionScore: number
  visionWardsBoughtInGame: number
  wardsKilled: number
  wardsPlaced: number
  win: boolean
}

export interface Timeline {
  creepsPerMinDeltas: CreepsPerMinDeltas
  csDiffPerMinDeltas: CsDiffPerMinDeltas
  damageTakenDiffPerMinDeltas: DamageTakenDiffPerMinDeltas
  damageTakenPerMinDeltas: DamageTakenPerMinDeltas
  goldPerMinDeltas: GoldPerMinDeltas
  lane: string
  participantId: number
  role: string
  xpDiffPerMinDeltas: XpDiffPerMinDeltas
  xpPerMinDeltas: XpPerMinDeltas
}

export interface CreepsPerMinDeltas { }

export interface CsDiffPerMinDeltas { }

export interface DamageTakenDiffPerMinDeltas { }

export interface DamageTakenPerMinDeltas { }

export interface GoldPerMinDeltas { }

export interface XpDiffPerMinDeltas { }

export interface XpPerMinDeltas { }

export interface Team {
  bans: any[]
  baronKills: number
  dominionVictoryScore: number
  dragonKills: number
  firstBaron: boolean
  firstBlood: boolean
  firstDargon: boolean
  firstInhibitor: boolean
  firstTower: boolean
  hordeKills: number
  inhibitorKills: number
  riftHeraldKills: number
  teamId: number
  towerKills: number
  vilemawKills: number
  win: string
}

export type CurrentSummonerInfo = {
  accountId: number;
  displayName: string;
  gameName: string;
  internalName: string;
  nameChangeFlag: boolean;
  percentCompleteForNextLevel: number;
  privacy: string;
  profileIconId: number;
  puuid: string;
  rerollPoints: CurrentSummonerInfoRerollPoints;
  summonerId: number;
  summonerLevel: number;
  tagLine: string;
  unnamed: boolean;
  xpSinceLastLevel: number;
  xpUntilNextLevel: number;
}

export type CurrentSummonerInfoRerollPoints = {
  currentPoints: number;
  maxRolls: number;
  numberOfRolls: number;
  pointsCostToRoll: number;
  pointsToReroll: number;
}

export type ChampionSelectSession = {
  actions: Array<ChampionSelectSessionAction[]>;
  allowBattleBoost: boolean;
  allowDuplicatePicks: boolean;
  allowLockedEvents: boolean;
  allowRerolling: boolean;
  allowSkinSelection: boolean;
  bans: ChampionSelectSessionBans;
  benchChampions: any[];
  benchEnabled: boolean;
  boostableSkinCount: number;
  chatDetails?: any;
  counter: number;
  gameId: number;
  hasSimultaneousBans: boolean;
  hasSimultaneousPicks: boolean;
  isCustomGame: boolean;
  isSpectating: boolean;
  localPlayerCellId: number;
  lockedEventIndex: number;
  myTeam: ChampionSelectSessionMyTeam[];
  pickOrderSwaps: any[];
  recoveryCounter: number;
  rerollsRemaining: number;
  skipChampionSelect: boolean;
  theirTeam: any[];
  timer: ChampionSelectSessionTimer;
  trades: any[];
}

export type ChampionSelectSessionAction = {
  actorCellId: number;
  championId: number;
  completed: boolean;
  id: number;
  isAllyAction: boolean;
  isInProgress: boolean;
  pickTurn: number;
  type: string;
}

export type ChampionSelectSessionBans = {
  myTeamBans: any[];
  numBans: number;
  theirTeamBans: any[];
}

export type ChampionSelectSessionMyTeam = {
  assignedPosition: string;
  cellId: number;
  championId: number;
  championPickIntent: number;
  nameVisibilityType: string;
  obfuscatedPuuid: string;
  obfuscatedSummonerId: number;
  puuid: string;
  selectedSkinId: number;
  spell1Id: number;
  spell2Id: number;
  summonerId: number;
  team: number;
  wardSkinId: number;
}

export type ChampionSelectSessionTimer = {
  adjustedTimeLeftInPhase: number;
  internalNowInEpochMs: number;
  isInfinite: boolean;
  phase: string;
  totalTimeInPhase: number;
}

export type ChampionsMinimal = {
  active: boolean;
  alias: string;
  banVoPath: string;
  baseLoadScreenPath: string;
  baseSplashPath: string;
  botEnabled: boolean;
  chooseVoPath: string;
  disabledQueues: any[];
  freeToPlay: boolean;
  id: number;
  name: string;
  ownership: ChampionsMinimalOwnership;
  purchased: number;
  rankedPlayEnabled: boolean;
  roles: ChampionsMinimalRole[];
  squarePortraitPath: string;
  stingerSfxPath: string;
  title: string;
}

export type ChampionsMinimalOwnership = {
  loyaltyReward: boolean;
  owned: boolean;
  rental: ChampionsMinimalRental;
  xboxGPReward: boolean;
}

export type ChampionsMinimalRental = {
  endDate: number;
  purchaseDate: number;
  rented: boolean;
  winCountRemaining: number;
}

export type ChampionsMinimalRole = "mage" | "support" | "fighter" | "tank" | "marksman" | "assassin";

export type LobbyData = {
  canStartActivity: boolean;
  gameConfig: LobbyDataGameConfig;
  invitations: any[];
  localMember: LobbyDataMember;
  members: LobbyDataMember[];
  mucJwtDto?: any;
  multiUserChatId: string;
  multiUserChatPassword: string;
  partyId: string;
  partyType: string;
  popularChampions: any[];
  restrictions: null;
  scarcePositions: any[];
  warnings: null;
}

export type LobbyDataGameConfig = {
  allowablePremadeSizes: any[];
  customLobbyName: string;
  customMutatorName: string;
  customRewardsDisabledReasons: any[];
  customSpectatorPolicy: string;
  customSpectators: any[];
  customTeam100: LobbyDataMember[];
  customTeam200: any[];
  gameMode: string;
  isCustom: boolean;
  isLobbyFull: boolean;
  isTeamBuilderManaged: boolean;
  mapId: number;
  maxHumanPlayers: number;
  maxLobbySize: number;
  maxTeamSize: number;
  pickType: string;
  premadeSizeAllowed: boolean;
  queueId: number;
  shouldForceScarcePositionSelection: boolean;
  showPositionSelector: boolean;
  showQuickPlaySlotSelection: boolean;
}

export type LobbyDataMember = {
  allowedChangeActivity: boolean;
  allowedInviteOthers: boolean;
  allowedKickOthers: boolean;
  allowedStartActivity: boolean;
  allowedToggleInvite: boolean;
  autoFillEligible: boolean;
  autoFillProtectedForPromos: boolean;
  autoFillProtectedForRemedy: boolean;
  autoFillProtectedForSoloing: boolean;
  autoFillProtectedForStreaking: boolean;
  botChampionId: number;
  botDifficulty: string;
  botId: string;
  botPosition: string;
  botUuid: string;
  firstPositionPreference: string;
  intraSubteamPosition: null;
  isBot: boolean;
  isLeader: boolean;
  isSpectator: boolean;
  playerSlots: any[];
  puuid: string;
  quickplayPlayerState: null;
  ready: boolean;
  secondPositionPreference: string;
  showGhostedBanner: boolean;
  strawberryMapId: null;
  subteamIndex: null;
  summonerIconId: number;
  summonerId: number;
  summonerInternalName: string;
  summonerLevel: number;
  summonerName: string;
  teamId: number;
}