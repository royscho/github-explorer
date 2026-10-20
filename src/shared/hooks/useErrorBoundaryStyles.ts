import { makeStyles } from '@shared/theme';

export const useErrorBoundaryStyles = makeStyles(theme => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
  message: {
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    color: theme.colors.textOnAccent,
    fontWeight: '600',
  },
}));
