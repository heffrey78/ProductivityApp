import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { MainNavigator } from './MainNavigator';
import { NoteEditorScreen } from '../screens/NoteEditorScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';
import { theme } from '../constants/theme';

export type RootStackParamList = {
  Main: undefined;
  NoteEditor: { noteId: number | null };
  TaskDetail: { taskId: number };
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 4,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: theme.fontWeight.semibold as any,
          },
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="NoteEditor"
          component={NoteEditorScreen}
          options={({ route }) => ({
            title: route.params?.noteId ? 'Edit Note' : 'New Note',
          })}
        />
        <Stack.Screen
          name="TaskDetail"
          component={TaskDetailScreen}
          options={{
            title: 'Task Details',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};