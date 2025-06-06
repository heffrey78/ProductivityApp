import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { dbConnection } from './src/database/DatabaseConnection';

export default function App() {
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log('App state changed to:', nextAppState);
      
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App is going to background, close database connection to prevent locks
        console.log('App backgrounding, closing database connection');
        await dbConnection.close();
      } else if (nextAppState === 'active') {
        // App is coming to foreground, database will be re-initialized when needed
        console.log('App foregrounding, database will re-initialize when needed');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup on unmount
    return () => {
      subscription?.remove();
      // Close database connection when app unmounts
      dbConnection.close().catch(console.error);
    };
  }, []);

  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}
