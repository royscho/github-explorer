import { makeStyles } from '@shared/theme';

export const useRepoCardStyles = makeStyles(theme => ({
  wrapper: {
    position: 'relative',
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  description: {
    marginBottom: theme.spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  favoriteToggle: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
  },
}));
