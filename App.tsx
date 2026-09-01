import React from 'react';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { useGameStore } from './src/store/gameStore';
import { StoryRecorderScreen } from './src/screens/StoryRecorderScreen';
import { ProcessingScreen } from './src/screens/ProcessingScreen';
import { GameCanvasScreen } from './src/screens/GameCanvasScreen';
import { BookshelfScreen } from './src/screens/BookshelfScreen';

export default function App() {
  const { screen } = useGameStore();

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <StatusBar style="dark" />
          {screen === 'RECORDER' && <StoryRecorderScreen />}
          {screen === 'PROCESSING' && <ProcessingScreen />}
          {screen === 'GAME' && <GameCanvasScreen />}
          {screen === 'BOOKSHELF' && <BookshelfScreen />}
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(App);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
});