// Modèle de données Cap Gabriel. Instants : ISO UTC. Dates civiles : "YYYY-MM-DD" (Europe/Paris).

export type ID = string

export interface Profile {
  firstName: string
  birthDate: string // civil
  timezone: string
  priority: 'pass' | 'sommeil' | 'controle' | 'forme' | 'social'
  wakeTarget: string // "HH:MM"
}

export interface Settings {
  onboardingDone: boolean
  reducedTransparency: boolean
  hideSensitivePreviews: boolean
  lastBackupAt: string | null // instant
  hintsDismissed: string[]
  lastSeenVersion: string // dernière version dont les nouveautés ont été vues
  appearance: 'sobre' | 'clair' | 'glass' | 'glass-clair' // sombre, clair iOS, verre sombre, verre clair
  accent: string // id de couleur d'accent (voir ui/accents.ts)
  dailyFocusGoalMin: number // objectif de focus quotidien en minutes (0 = désactivé)
  shortcuts?: string[] // raccourcis de l'accueil (ids de ui/shortcuts.ts), ordonnés
}

export type CaptureKind = 'task' | 'note' | 'idea' | 'question' | 'error' | 'trigger' | 'event'

export interface Capture {
  id: ID
  text: string
  kind: CaptureKind | null
  createdAt: string
  processedAt: string | null
}

export type Energy = 'basse' | 'moyenne' | 'haute'
export type Priority = 'basse' | 'normale' | 'haute'

export interface Task {
  id: ID
  title: string
  note: string
  plannedDate: string | null // "je veux le faire ce jour-là"
  deadline: string | null // "doit être fini avant"
  plannedTime: string | null // "HH:MM" facultatif
  durationMin: number | null
  energy: Energy | null
  priority: Priority
  category?: string | null // id de catégorie colorée (domain/categories.ts)
  projectId: ID | null
  subjectId: ID | null
  someday: boolean
  top3Rank: number | null // 1..3 si dans le Top 3 du jour
  top3Date: string | null
  done: boolean
  createdAt: string
  completedAt: string | null
  deletedAt: string | null
}

export interface Project {
  id: ID
  name: string
  outcome: string
  nextAction: string
  deadline: string | null
  status: 'actif' | 'pause' | 'termine'
  notes: string
  createdAt: string
}

export interface Goal {
  id: ID
  result: string
  reason: string
  indicator: string
  horizon: string | null // date civile
  nextAction: string
  obstacles: string
  ifThenPlan: string
  createdAt: string
  done: boolean
}

export interface Routine {
  id: ID
  name: string
  schedule: 'daily' | 'weekdays' | 'custom'
  customDays: number[] // ISO weekdays 1..7
  timesPerWeek?: number | null // objectif souple : X fois par semaine (au lieu du quotidien strict)
  negative: boolean // "éviter un comportement"
  archived: boolean
  createdAt: string
}

export interface RoutineLog {
  id: ID
  routineId: ID
  date: string // civil
  done: boolean
}

export interface Subject {
  id: ID
  name: string
  examDate: string | null
  createdAt: string
}

export type UnitKind = 'factuel' | 'conceptuel' | 'procedural' | 'spatial' | 'demonstratif'

export interface StudyUnit {
  id: ID
  subjectId: ID
  name: string
  kind: UnitKind
  mastery: 0 | 1 | 2 | 3 // découverte, fragile, correct, solide
  source: string
  createdAt: string
  archived: boolean
}

export type ReviewRating = 'oublie' | 'difficile' | 'moyen' | 'facile'

export interface ReviewPlan {
  id: ID
  unitId: ID
  learnedOn: string // civil, J0
  stage: number // index dans la séquence
  intervalDays: number // intervalle courant effectif
  nextDue: string // civil
  active: boolean
  createdAt: string
}

export interface ReviewLog {
  id: ID
  planId: ID
  unitId: ID
  date: string // civil
  rating: ReviewRating
  createdAt: string
}

export interface FocusSession {
  id: ID
  label: string
  taskId: ID | null
  unitId: ID | null
  goal: string
  plannedMin: number
  startedAt: string // instant
  endedAt: string | null
  outcome: 'termine' | 'partiel' | 'abandonne' | null
  focusQuality: number | null // 1..5
  proof: string
  interruptions: number
  workedMin: number | null // minutes réellement travaillées (hors pauses)
  createdAt: string
}

export interface ActiveTimer {
  label: string
  taskId: ID | null
  unitId: ID | null
  goal: string
  plannedMin: number
  startedAt: string // instant
  targetEndAt: string // instant
  pausedAt: string | null // instant
  totalPausedMs: number
  interruptions: number
}

export interface ErrorLog {
  id: ID
  subjectId: ID | null
  error: string
  cause: string
  rule: string
  retestOn: string | null // civil
  retested: boolean
  createdAt: string
}

export interface CheckIn {
  id: ID
  date: string // civil
  at: string // instant
  energy: Energy
  stress: 'bas' | 'moyen' | 'haut'
  sleepFelt: 'mauvais' | 'moyen' | 'bon'
  urge: number // 0..10
  mood: string
}

export interface CommitmentState {
  startDate: string // civil — départ de la série actuelle
  originalStart: string // civil — tout premier départ
  bestStreak: number
}

export interface UrgeEvent {
  id: ID
  at: string // instant
  intensityBefore: number
  intensityAfter: number | null
  emotion: string
  place: string
  trigger: string
  helped: string
  completed: boolean
}

export interface LapseEvent {
  id: ID
  at: string // instant
  date: string // civil
  context: string[]
  lesson: string
  protectiveAction: string
  previousStreak: number
}

export interface IfThenPlan {
  id: ID
  ifPart: string
  thenPart: string
  createdAt: string
}

export interface SleepLog {
  id: ID
  date: string // civil (nuit se terminant ce matin)
  bedTime: string | null // "HH:MM"
  sleepLatencyMin: number | null
  wakeTime: string | null // "HH:MM"
  quality: 'mauvais' | 'moyen' | 'bon' | null
  screenInBed: boolean | null
  lateCaffeine: boolean | null
  morningLight: boolean | null
  note: string
}

export interface BodyLog {
  id: ID
  date: string
  type: string
  durationMin: number | null
  effort: number | null // 1..10
  pain: string
  note: string
}

export interface JournalEntry {
  id: ID
  date: string
  format: 'phrase' | 'points' | 'libre' | 'vdl' | 'decision'
  text: string
  createdAt: string
}

export interface SocialExercise {
  id: ID
  date: string
  level: number // 1..7 de l'échelle
  anxietyBefore: number | null // 0..10
  anxietyAfter: number | null
  learned: string
  createdAt: string
}

export interface AnkiLog {
  id: ID
  date: string
  cardsGoal: number | null
  cardsDone: number
  durationMin: number | null
  successRate: number | null // 0..100
  createdAt: string
}

export interface Note {
  id: ID
  title: string
  body: string
  pinned: boolean
  subjectId: ID | null
  projectId: ID | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface WeeklyReview {
  id: ID
  weekOf: string // civil du lundi
  priorities: string[]
  notes: string
  completedAt: string
}

export interface AppState {
  schemaVersion: number
  profile: Profile
  settings: Settings
  captures: Capture[]
  tasks: Task[]
  projects: Project[]
  goals: Goal[]
  routines: Routine[]
  routineLogs: RoutineLog[]
  subjects: Subject[]
  studyUnits: StudyUnit[]
  reviewPlans: ReviewPlan[]
  reviewLogs: ReviewLog[]
  focusSessions: FocusSession[]
  errorLogs: ErrorLog[]
  checkIns: CheckIn[]
  commitment: CommitmentState
  urgeEvents: UrgeEvent[]
  lapseEvents: LapseEvent[]
  ifThenPlans: IfThenPlan[]
  sleepLogs: SleepLog[]
  bodyLogs: BodyLog[]
  journalEntries: JournalEntry[]
  socialExercises: SocialExercise[]
  ankiLogs: AnkiLog[]
  weeklyReviews: WeeklyReview[]
  notes: Note[]
  activeTimer: ActiveTimer | null
}

export const SCHEMA_VERSION = 1
export const APP_VERSION = '3.4.1'

export function defaultState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: {
      firstName: 'Gabriel',
      birthDate: '2008-07-29',
      timezone: 'Europe/Paris',
      priority: 'pass',
      wakeTarget: '07:00'
    },
    settings: {
      onboardingDone: false,
      reducedTransparency: false,
      hideSensitivePreviews: false,
      lastBackupAt: null,
      hintsDismissed: [],
      lastSeenVersion: '',
      appearance: 'sobre',
      accent: 'bleu',
      dailyFocusGoalMin: 0
    },
    captures: [],
    tasks: [],
    projects: [],
    goals: [],
    routines: [],
    routineLogs: [],
    subjects: [],
    studyUnits: [],
    reviewPlans: [],
    reviewLogs: [],
    focusSessions: [],
    errorLogs: [],
    checkIns: [],
    commitment: {
      startDate: '2026-07-12',
      originalStart: '2026-07-12',
      bestStreak: 0
    },
    urgeEvents: [],
    lapseEvents: [],
    ifThenPlans: [],
    sleepLogs: [],
    bodyLogs: [],
    journalEntries: [],
    socialExercises: [],
    ankiLogs: [],
    weeklyReviews: [],
    notes: [],
    activeTimer: null
  }
}
