import { makeStyles } from '@shared/theme';

export const useRepoDetailsScreenStyles = makeStyles(theme => ({
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  description: {
    marginBottom: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  placeholderValue: {
    fontStyle: 'italic',
  },
  link: {
    marginTop: theme.spacing.sm,
  },
  linkLabel: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
}));
