import { makeStyles } from '@shared/theme';

export const useScreenStyles = makeStyles(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
}));
