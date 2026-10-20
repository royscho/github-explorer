import { makeStyles } from '@shared/theme';

export const useFavoriteButtonStyles = makeStyles(theme => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  compactContainer: {
    padding: theme.spacing.xs,
  },
}));
