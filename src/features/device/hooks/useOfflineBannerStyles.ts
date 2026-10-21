import { makeStyles } from '@shared/theme';

export const useOfflineBannerStyles = makeStyles(theme => ({
  container: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.danger,
  },
  message: {
    color: theme.colors.textOnAccent,
    textAlign: 'center',
  },
}));
