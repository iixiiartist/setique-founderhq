import type { DocType, DashboardData, PlanType, WorkspaceRole, BusinessProfile, GTMDocMetadata } from '../../types'

export type CommandInsertMode = 'replace' | 'append' | 'block'

export interface CommandRuntimeContext {
  docType: DocType
  docTitle: string
  tags: string[]
  planType?: PlanType | null
  workspaceRole?: WorkspaceRole | null
  hasSelection: boolean
  selectionText: string
  selectionWordCount: number
  workspaceName: string | null
  dashboardData: DashboardData
  businessProfile: BusinessProfile | null
  relatedDocs: Pick<GTMDocMetadata, 'title' | 'docType' | 'tags'>[]
}

export interface CommandBuildResult {
  prompt: string
  toneId?: string
  formatId?: string
  insertMode?: CommandInsertMode
}

export interface CommandDefinition {
  id: string
  title: string
  description: string
  keywords: string[]
  icon?: string
  priority?: number
  requiresSelection?: boolean
  docTypes?: DocType[]
  minPlan?: PlanType
  requiresRole?: WorkspaceRole
  build: (context: CommandRuntimeContext) => CommandBuildResult
}

export interface CommandMatch {
  definition: CommandDefinition
  score: number
  isLocked: boolean
  lockedReason?: string
}

const PLAN_RANK: Record<PlanType, number> = {
  free: 0,
  'power-individual': 1,
  'team-pro': 2,
}

const planRank = (plan?: PlanType | null): number => {
  if (!plan) return PLAN_RANK.free
  return PLAN_RANK[plan] ?? PLAN_RANK.free
}

const hasPlanAccess = (userPlan: PlanType | null | undefined, minPlan?: PlanType): boolean => {
  if (!minPlan) return true
  return planRank(userPlan) >= planRank(minPlan)
}

const getAvailability = (
  definition: CommandDefinition,
  context: CommandRuntimeContext,
): { allowed: boolean; reason?: string } => {
  if (definition.requiresSelection && !context.hasSelection) {
    return { allowed: false, reason: 'Select text to unlock this command' }
  }
  if (definition.docTypes && !definition.docTypes.includes(context.docType)) {
    return { allowed: false, reason: 'Not relevant for this doc type' }
  }
  if (!hasPlanAccess(context.planType ?? null, definition.minPlan)) {
    return { allowed: false, reason: 'Upgrade to run this command' }
  }
  if (definition.requiresRole && definition.requiresRole !== (context.workspaceRole ?? 'member')) {
    return { allowed: false, reason: 'Only workspace owners can run this command' }
  }
  return { allowed: true }
}

const tokensFromQuery = (query: string): string[] =>
  query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)

const textIncludesToken = (value: string, token: string): boolean => value.toLowerCase().includes(token)

const baseSummarySnippet = (context: CommandRuntimeContext): string => {
  const docLabel = context.docTitle || 'this document'
  const workspace = context.workspaceName || 'the workspace'
  const tagSummary = context.tags.length ? `Tags: ${context.tags.join(', ')}` : ''
  return `${docLabel} (${context.docType}) for ${workspace}. ${tagSummary}`.trim()
}

const highlightSelection = (context: CommandRuntimeContext): string =>
  context.selectionText
    ? `Focus on the highlighted section (about ${context.selectionWordCount} words):\n"""${context.selectionText}"""`
    : 'No specific selection was provided.'

const sumRecentResearch = (context: CommandRuntimeContext): string => {
  if (!context.relatedDocs?.length) {
    return 'No related GTM docs were referenced.'
  }
  const lines = context.relatedDocs.slice(0, 3).map((doc, index) => `${index + 1}. ${doc.title} (${doc.docType})`)
  return `Reference the following related docs for consistency:\n${lines.join('\n')}`
}

const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    id: 'selection-summary',
    title: 'Summarize highlighted section',
    description: 'Convert the selected passage into an investor-ready TL;DR with citations.',
    keywords: ['summary', 'investor', 'selection', 'highlight'],
    priority: 9,
    requiresSelection: true,
    build: (context) => ({
      prompt: `Summarize the highlighted content for an investor update. ${highlightSelection(context)}\n${sumRecentResearch(context)}`,
      toneId: 'authoritative',
      formatId: 'summary',
      insertMode: 'replace',
    }),
  },
  {
    id: 'selection-rewrite-friendly',
    title: 'Rewrite in friendlier voice',
    description: 'Keep the intent but make the paragraph more conversational and clear.',
    keywords: ['rewrite', 'friendly', 'voice'],
    priority: 8,
    requiresSelection: true,
    build: (context) => ({
      prompt: `Rewrite the selected content in a friendly, confident tone without losing facts. ${highlightSelection(context)}\nConclude with a motivating CTA.`,
      toneId: 'friendly',
      formatId: 'auto',
      insertMode: 'replace',
    }),
  },
  {
    id: 'exec-brief',
    title: 'Executive snapshot',
    description: 'Generate a sharp executive-ready summary highlighting signals, risks, and asks.',
    keywords: ['executive', 'brief', 'snapshot'],
    priority: 8,
    docTypes: ['brief', 'campaign', 'meeting_notes'],
    build: (context) => ({
      prompt: `Create an executive-ready snapshot for ${baseSummarySnippet(context)}. Highlight momentum signals, blockers, and a final CTA.`,
      toneId: 'authoritative',
      formatId: 'summary',
      insertMode: context.hasSelection ? 'replace' : 'append',
    }),
  },
  {
    id: 'risk-register',
    title: 'Risk register + mitigations',
    description: 'List top risks, impact, owners, and mitigation steps.',
    keywords: ['risk', 'mitigation', 'register'],
    priority: 7,
    docTypes: ['campaign', 'brief', 'competitive_snapshot'],
    build: (context) => ({
      prompt: `Identify the top risks for ${baseSummarySnippet(context)}. Share impact, owner, mitigation plan, and worst-case signal.`,
      formatId: 'table',
      toneId: 'urgent',
      insertMode: 'append',
    }),
  },
  {
    id: 'battlecard-objections',
    title: 'Objection handling cheatsheet',
    description: 'Produce objection ➜ response pairs grounded in workspace positioning.',
    keywords: ['battlecard', 'objection', 'sales'],
    priority: 6,
    docTypes: ['battlecard', 'competitive_snapshot'],
    build: (context) => ({
      prompt: `Draft objection handling bullets for ${baseSummarySnippet(context)}. Use workspace positioning and competitors to craft concise responses.`,
      formatId: 'bullets',
      toneId: 'bold',
      insertMode: 'append',
    }),
  },
  {
    id: 'outbound-sequence',
    title: '4-touch outbound sequence',
    description: 'Plan a multi-touch outbound flow with hooks, CTA, and channel guidance.',
    keywords: ['outbound', 'sequence', 'campaign'],
    priority: 5,
    docTypes: ['outbound_template', 'campaign'],
    minPlan: 'power-individual',
    build: (context) => ({
      prompt: `Develop a four-touch outbound sequence for ${baseSummarySnippet(context)}. Include channel, hook, CTA, suggested timing, and personalization angle for each touch.`,
      formatId: 'table',
      toneId: 'bold',
      insertMode: 'append',
    }),
  },
  {
    id: 'persona-talk-track',
    title: 'Persona talk track',
    description: 'Turn persona insights into pains, triggers, and talk tracks.',
    keywords: ['persona', 'talk track', 'sales'],
    priority: 6,
    docTypes: ['persona', 'icp_sheet'],
    build: (context) => ({
      prompt: `Create a talk track for the persona in ${baseSummarySnippet(context)}. Include pains, triggers, hero statement, and follow-up questions.`,
      formatId: 'bullets',
      toneId: 'neutral',
      insertMode: context.hasSelection ? 'replace' : 'append',
    }),
  },
  {
    id: 'owner-board-update',
    title: 'Board update draft',
    description: 'Owners can spin up a board-ready paragraph with asks, metrics, and risks.',
    keywords: ['board', 'owner', 'update'],
    priority: 4,
    requiresRole: 'owner',
    docTypes: ['brief', 'campaign', 'meeting_notes'],
    minPlan: 'team-pro',
    build: (context) => ({
      prompt: `Write a board-ready update referencing ${baseSummarySnippet(context)}. Include latest signal, key risk, hiring or budget ask, and next milestone.`,
      formatId: 'summary',
      toneId: 'authoritative',
      insertMode: 'append',
    }),
  },
]

const computeScore = (definition: CommandDefinition, queryTokens: string[], context: CommandRuntimeContext): number => {
  let score = definition.priority ?? 1
  if (definition.docTypes?.includes(context.docType)) {
    score += 2
  }
  if (definition.requiresSelection) {
    score += context.hasSelection ? 4 : -4
  }
  if (!definition.requiresSelection && !context.hasSelection) {
    score += 1
  }
  if (!queryTokens.length) {
    return score
  }

  const haystack = [definition.title, definition.description, definition.keywords.join(' ')].join(' ').toLowerCase()
  queryTokens.forEach((token) => {
    if (textIncludesToken(haystack, token)) {
      score += 3
    }
  })

  return score
}

export const searchCommands = (query: string, context: CommandRuntimeContext): CommandMatch[] => {
  const tokens = tokensFromQuery(query)

  return COMMAND_DEFINITIONS.map((definition) => {
    const availability = getAvailability(definition, context)
    const score = computeScore(definition, tokens, context)
    return {
      definition,
      score,
      isLocked: !availability.allowed,
      lockedReason: availability.reason,
    }
  })
    .filter((match) => match.score > 0)
    .filter((match) => {
      if (tokens.length) {
        return match.score > (match.isLocked ? 2 : 3)
      }
      if (match.definition.requiresSelection && !context.hasSelection) {
        return false
      }
      return true
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
}

export const getCommandById = (id: string): CommandDefinition | undefined =>
  COMMAND_DEFINITIONS.find((command) => command.id === id)

export const commandRegistry = {
  search: searchCommands,
  get: getCommandById,
}
