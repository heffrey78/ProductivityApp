import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
} from 'react-native';
import TaskList from '../components/TaskList';
import AddTaskForm from '../components/AddTaskForm';
import { databaseManager, Task } from '../database/database';
import { theme } from '../constants/theme';

export const TasksScreen: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    initializeAndLoadTasks();
  }, []);

  const initializeAndLoadTasks = async () => {
    try {
      await databaseManager.initializeDatabase();
      await loadTasks();
    } catch (error) {
      console.error('Failed to initialize tasks:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const allTasks = await databaseManager.getAllTasks();
      setTasks(allTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleAddTask = async (title: string, description: string) => {
    try {
      await databaseManager.createTask(title, description);
      await loadTasks();
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleToggleTask = async (taskId: number) => {
    try {
      await databaseManager.toggleTaskComplete(taskId);
      await loadTasks();
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await databaseManager.deleteTask(taskId);
      await loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TaskList
          tasks={tasks}
          onToggleComplete={handleToggleTask}
          onDelete={handleDeleteTask}
        />
        <AddTaskForm onAddTask={handleAddTask} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
});