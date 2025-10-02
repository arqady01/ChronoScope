import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text } from 'react-native';

export default function PlaceholderScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>功能即将上线</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 16,
    color: '#B9B9B9',
  },
});
