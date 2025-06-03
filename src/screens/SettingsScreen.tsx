import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { theme } from '../constants/theme';

export const SettingsScreen: React.FC = () => {
  const [darkMode, setDarkMode] = React.useState(false);
  const [notifications, setNotifications] = React.useState(true);

  const settingsSections = [
    {
      title: 'Appearance',
      items: [
        {
          label: 'Dark Mode',
          value: darkMode,
          onToggle: setDarkMode,
          type: 'switch' as const,
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          label: 'Push Notifications',
          value: notifications,
          onToggle: setNotifications,
          type: 'switch' as const,
        },
      ],
    },
    {
      title: 'Data',
      items: [
        {
          label: 'Export Data',
          onPress: () => console.log('Export data'),
          type: 'button' as const,
        },
        {
          label: 'Clear All Data',
          onPress: () => console.log('Clear data'),
          type: 'button' as const,
          destructive: true,
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {settingsSections.map((section, index) => (
        <View key={index} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item, itemIndex) => (
            <View key={itemIndex} style={styles.settingItem}>
              {item.type === 'switch' ? (
                <>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <Switch
                    value={item.value}
                    onValueChange={item.onToggle}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  />
                </>
              ) : (
                <TouchableOpacity onPress={item.onPress} style={styles.button}>
                  <Text
                    style={[
                      styles.buttonText,
                      item.destructive && styles.destructiveText,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  button: {
    flex: 1,
  },
  buttonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
  },
  destructiveText: {
    color: theme.colors.error,
  },
});