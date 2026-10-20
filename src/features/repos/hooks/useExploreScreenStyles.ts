import { makeStyles } from '@shared/theme';

export const useExploreScreenStyles = makeStyles(theme => ({
  container: {
    flex: 1,
  },
  footerError: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  footerErrorMessage: {
    textAlign: 'center',
  },
  footerRetryLabel: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
}));
