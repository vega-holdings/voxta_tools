import type { CollectionConfig } from 'payload'
import { vectorizeAfterChange, vectorizeAfterDelete } from '../hooks/vectorize'
import { githubSyncAfterChange } from '../hooks/github-sync'

export const KBArticle: CollectionConfig = {
  slug: 'kb-articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'type', 'confidence', 'updatedAt'],
    group: 'Content',
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [vectorizeAfterChange, githubSyncAfterChange],
    afterDelete: [vectorizeAfterDelete],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly identifier',
      },
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Markdown content',
        rows: 15,
      },
    },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Q&A', value: 'qa' },
        { label: 'Troubleshooting', value: 'troubleshooting' },
        { label: 'Tip', value: 'tip' },
        { label: 'Reference', value: 'reference' },
      ],
      defaultValue: 'qa',
    },
    {
      name: 'category',
      type: 'select',
      options: [
        { label: 'Configuration', value: 'configuration' },
        { label: 'Troubleshooting', value: 'troubleshooting' },
        { label: 'Integrations', value: 'integrations' },
        { label: 'Setup', value: 'setup' },
        { label: 'Scripting', value: 'scripting' },
        { label: 'LLM', value: 'llm' },
        { label: 'Performance', value: 'performance' },
        { label: 'Characters', value: 'characters' },
        { label: 'Scenarios', value: 'scenarios' },
        { label: 'Chat', value: 'chat' },
        { label: 'Events', value: 'events' },
        { label: 'Flags', value: 'flags' },
      ],
    },
    {
      name: 'topics',
      type: 'array',
      admin: {
        description: 'Topic tags',
      },
      fields: [
        {
          name: 'topic',
          type: 'text',
        },
      ],
    },
    {
      name: 'keywords',
      type: 'array',
      admin: {
        description: 'Search keywords',
      },
      fields: [
        {
          name: 'keyword',
          type: 'text',
        },
      ],
    },
    {
      name: 'confidence',
      type: 'number',
      min: 0,
      max: 1,
      admin: {
        description: 'Confidence score (0-1)',
        step: 0.1,
      },
    },
    {
      name: 'contributor',
      type: 'text',
      admin: {
        description: 'Original contributor from Discord',
      },
    },
    {
      name: 'githubPath',
      type: 'text',
      admin: {
        description: 'Path in GitHub repo for back-sync',
        readOnly: true,
      },
    },
  ],
}
