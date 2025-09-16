import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

function TestApp(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>App is working!</Text>
      <Text style={styles.subtext}>If you see this, React Native is running correctly.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
  },
  text: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 16,
    color: 'white',
  },
});

export default TestApp;