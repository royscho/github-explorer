import { makeStyles } from '@shared/theme';

export const useEmptyViewStyles = makeStyles(theme => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  message: {
    textAlign: 'center',
  },
}));
