import { makeStyles } from '@shared/theme';

export const useCardStyles = makeStyles(theme => ({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    ...theme.elevation.card,
  },
}));
