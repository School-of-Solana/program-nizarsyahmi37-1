'use client'

import { useCallback } from 'react'
import { event } from '@/lib/gtag'

export const useAnalytics = () => {
  const trackEvent = useCallback(
    ({
      action,
      category,
      label,
      value,
    }: {
      action: string
      category: string
      label?: string
      value?: number
    }) => {
      event({ action, category, label, value })
    },
    []
  )

  // Predefined tracking functions for common DAO actions
  const trackProposalView = useCallback((proposalId: string) => {
    trackEvent({
      action: 'view_proposal',
      category: 'governance',
      label: proposalId,
    })
  }, [trackEvent])

  const trackVote = useCallback((proposalId: string, voteType: 'for' | 'against' | 'abstain') => {
    trackEvent({
      action: 'cast_vote',
      category: 'governance',
      label: `${proposalId}_${voteType}`,
    })
  }, [trackEvent])

  const trackProposalCreate = useCallback(() => {
    trackEvent({
      action: 'create_proposal',
      category: 'governance',
    })
  }, [trackEvent])

  const trackWalletConnect = useCallback((walletType: string) => {
    trackEvent({
      action: 'connect_wallet',
      category: 'wallet',
      label: walletType,
    })
  }, [trackEvent])

  const trackWalletDisconnect = useCallback(() => {
    trackEvent({
      action: 'disconnect_wallet',
      category: 'wallet',
    })
  }, [trackEvent])

  return {
    trackEvent,
    trackProposalView,
    trackVote,
    trackProposalCreate,
    trackWalletConnect,
    trackWalletDisconnect,
  }
}
