import type { ToolConfig } from '@itsjust/core';

const toolConfig = {
  id: 'timezone-converter',
  name: 'Timezone Converter',
  description:
    'Convert a date and time between world timezones instantly with live offset info, DST awareness and comparison cards.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: false,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#0ea5e9',
    accentHover: '#0284c7',
    accentSubtle: 'rgba(14, 165, 233, 0.12)',
    brand: 'Timezone Converter',
    icon: '🌍',
  },
  shortcuts: [
    {
      title: 'Timezone Converter',
      shortcuts: [
        {
          keys: 'N',
          label: 'Use now',
          description: 'fill the input with the current date and time',
        },
        { keys: 'S', label: 'Swap zones', description: 'swap source and target timezone' },
        { keys: 'Y', label: 'Copy ISO', description: 'copy the converted ISO 8601 string' },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
