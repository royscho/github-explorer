import { StyleSheet, Text, View } from 'react-native';
import { APP_NAME } from '@shared/constants';

function App(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_NAME}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});

export default App;
