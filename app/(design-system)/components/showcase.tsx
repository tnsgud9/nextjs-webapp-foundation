"use client"

import { StyleOverview } from "@/app/(design-system)/components/cards/style-overview"
import { TypographySpecimen } from "@/app/(design-system)/components/cards/typography-specimen"
import { UIElements } from "@/app/(design-system)/components/cards/ui-elements"
import { CodespacesCard } from "@/app/(design-system)/components/cards/codespaces-card"
import { Invoice } from "@/app/(design-system)/components/cards/invoice"
import { IconPreviewGrid } from "@/app/(design-system)/components/cards/icon-preview-grid"
import { ObservabilityCard } from "@/app/(design-system)/components/cards/observability-card"
import { ShippingAddress } from "@/app/(design-system)/components/cards/shipping-address"
import { EnvironmentVariables } from "@/app/(design-system)/components/cards/environment-variables"
import { CodeBlockCard } from "@/app/(design-system)/components/cards/code-block-card"
import { AgentTrace } from "@/app/(design-system)/components/cards/agent-trace"
import { BarChartCard } from "@/app/(design-system)/components/cards/bar-chart-card"
import { InviteTeam } from "@/app/(design-system)/components/cards/invite-team"
import { ActivateAgentDialog } from "@/app/(design-system)/components/cards/activate-agent-dialog"
import { SkeletonLoading } from "@/app/(design-system)/components/cards/skeleton-loading"
import { PieChartCard } from "@/app/(design-system)/components/cards/pie-chart-card"
import { NoTeamMembers } from "@/app/(design-system)/components/cards/no-team-members"
import { ReportBug } from "@/app/(design-system)/components/cards/report-bug"
import { Contributors } from "@/app/(design-system)/components/cards/contributors"
import { FeedbackForm } from "@/app/(design-system)/components/cards/feedback-form"
import { BookAppointment } from "@/app/(design-system)/components/cards/book-appointment"
import { SleepReport } from "@/app/(design-system)/components/cards/sleep-report"
import { GithubProfile } from "@/app/(design-system)/components/cards/github-profile"
import { WeeklyFitnessSummary } from "@/app/(design-system)/components/cards/weekly-fitness-summary"
import { FileUpload } from "@/app/(design-system)/components/cards/file-upload"
import { AnalyticsCard } from "@/app/(design-system)/components/cards/analytics-card"
import { UsageCard } from "@/app/(design-system)/components/cards/usage-card"
import { Shortcuts } from "@/app/(design-system)/components/cards/shortcuts"
import { AnomalyAlert } from "@/app/(design-system)/components/cards/anomaly-alert"
import { Visitors } from "@/app/(design-system)/components/cards/visitors"
import { ContributionsActivity } from "@/app/(design-system)/components/cards/contributions-activity"
import { NotFound } from "@/app/(design-system)/components/cards/not-found"
import { ContributionHistory } from "@/app/(design-system)/components/cards/contribution-history"
import { EmptyDistributeTrack } from "@/app/(design-system)/components/cards/empty-distribute-track"
import { DividendIncome } from "@/app/(design-system)/components/cards/dividend-income"
import { IndexInvesting } from "@/app/(design-system)/components/cards/index-investing"
import { SyncingState } from "@/app/(design-system)/components/cards/syncing-state"
import { PayoutThreshold } from "@/app/(design-system)/components/cards/payout-threshold"
import { ClaimableBalance } from "@/app/(design-system)/components/cards/claimable-balance"
import { Preferences } from "@/app/(design-system)/components/cards/preferences"
import { SavingsProgress } from "@/app/(design-system)/components/cards/savings-progress"
import { KitchenIsland } from "@/app/(design-system)/components/cards/kitchen-island"
import { BuyInvestment, SavingsTargets } from "@/app/(design-system)/components/cards/savings-targets"
import { RecentTransactions } from "@/app/(design-system)/components/cards/recent-transactions"
import { SidebarNav } from "@/app/(design-system)/components/cards/sidebar-nav"
import { Faq } from "@/app/(design-system)/components/cards/faq"
import { Payments } from "@/app/(design-system)/components/cards/payments"
import { FrontDoor } from "@/app/(design-system)/components/cards/front-door"
import { ReleaseCatalog } from "@/app/(design-system)/components/cards/release-catalog"
import { AccountAccess } from "@/app/(design-system)/components/cards/account-access"
import { CardOverview } from "@/app/(design-system)/components/cards/card-overview"
import { TransferFunds } from "@/app/(design-system)/components/cards/transfer-funds"
import { CoverArt } from "@/app/(design-system)/components/cards/cover-art"
import { LoadingCard } from "@/app/(design-system)/components/cards/loading-card"
import { ReceivingMethod } from "@/app/(design-system)/components/cards/receiving-method"
import { PowerUsage } from "@/app/(design-system)/components/cards/power-usage"
import { EmptyConnectBank } from "@/app/(design-system)/components/cards/empty-connect-bank"
import { UpcomingPayments } from "@/app/(design-system)/components/cards/upcoming-payments"
import { RollerShades } from "@/app/(design-system)/components/cards/roller-shades"
import { StockPerformance } from "@/app/(design-system)/components/cards/stock-performance"
import { EmptyExploreCatalog } from "@/app/(design-system)/components/cards/empty-explore-catalog"
import { NewMilestone } from "@/app/(design-system)/components/cards/new-milestone"
import { SocialLinks } from "@/app/(design-system)/components/cards/social-links"
import { NotificationSettings } from "@/app/(design-system)/components/cards/notification-settings"
import { Overlays } from "@/app/(design-system)/components/cards/overlays"
import { NavigationPatterns } from "@/app/(design-system)/components/cards/navigation-patterns"
import { MediaGallery } from "@/app/(design-system)/components/cards/media-gallery"
import { LayoutPanels } from "@/app/(design-system)/components/cards/layout-panels"
import { ChatThread } from "@/app/(design-system)/components/cards/chat-thread"
import { VerifyCode } from "@/app/(design-system)/components/cards/verify-code"
import { QuickSurvey } from "@/app/(design-system)/components/cards/quick-survey"
import { AlbumCard } from "@/app/(design-system)/components/cards/album-card"
import { AssignIssue } from "@/app/(design-system)/components/cards/assign-issue"
import { CatalogToolbar } from "@/app/(design-system)/components/cards/catalog-toolbar"

const CARDS = [
  StyleOverview,
  TypographySpecimen,
  UIElements,
  CodespacesCard,
  Invoice,
  IconPreviewGrid,
  ObservabilityCard,
  ShippingAddress,
  EnvironmentVariables,
  CodeBlockCard,
  AgentTrace,
  BarChartCard,
  InviteTeam,
  ActivateAgentDialog,
  SkeletonLoading,
  PieChartCard,
  NoTeamMembers,
  ReportBug,
  Contributors,
  FeedbackForm,
  BookAppointment,
  SleepReport,
  GithubProfile,
  WeeklyFitnessSummary,
  FileUpload,
  AnalyticsCard,
  UsageCard,
  Shortcuts,
  AnomalyAlert,
  Visitors,
  ContributionsActivity,
  NotFound,
  ContributionHistory,
  EmptyDistributeTrack,
  DividendIncome,
  IndexInvesting,
  SyncingState,
  PayoutThreshold,
  ClaimableBalance,
  Preferences,
  SavingsProgress,
  KitchenIsland,
  SavingsTargets,
  BuyInvestment,
  RecentTransactions,
  SidebarNav,
  Faq,
  Payments,
  FrontDoor,
  ReleaseCatalog,
  AccountAccess,
  CardOverview,
  TransferFunds,
  CoverArt,
  LoadingCard,
  ReceivingMethod,
  PowerUsage,
  EmptyConnectBank,
  UpcomingPayments,
  RollerShades,
  StockPerformance,
  EmptyExploreCatalog,
  NewMilestone,
  SocialLinks,
  NotificationSettings,
  Overlays,
  NavigationPatterns,
  MediaGallery,
  LayoutPanels,
  ChatThread,
  VerifyCode,
  QuickSurvey,
  AlbumCard,
  AssignIssue,
  CatalogToolbar,
]

export default function DesignSystemShowcase() {
  return (
    <div className="min-h-svh bg-muted dark:bg-background">
      <div className="mx-auto max-w-[1800px] columns-1 gap-4 p-4 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5">
        {CARDS.map((CardComponent, index) => (
          <div key={index} className="mb-4 inline-block w-full break-inside-avoid align-top">
            <CardComponent />
          </div>
        ))}
      </div>
    </div>
  )
}
