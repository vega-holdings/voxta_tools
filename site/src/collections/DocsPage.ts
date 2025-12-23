import type { CollectionConfig } from 'payload'
import { vectorizeAfterChange, vectorizeAfterDelete } from '../hooks/vectorize'
import { githubSyncAfterChange } from '../hooks/github-sync'

export const DocsPage: CollectionConfig = {
  slug: 'docs-pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'updatedAt'],
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
        description: 'URL-friendly identifier (e.g., "getting-started")',
      },
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Markdown content',
        rows: 20,
      },
    },
    {
      name: 'category',
      type: 'select',
      options: [
        { label: 'Documentation', value: 'documentation' },
        { label: 'Installing', value: 'installing' },
        { label: 'Interface', value: 'interface' },
        { label: 'Creator Studio', value: 'creator-studio' },
        { label: 'Modules', value: 'modules' },
        { label: 'Articles', value: 'articles' },
      ],
      admin: {
        description: 'Documentation category',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 100,
      admin: {
        description: 'Order within category (lower = first)',
      },
    },
    {
      name: 'originalUrl',
      type: 'text',
      admin: {
        description: 'Original URL from official docs',
        readOnly: true,
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
    {
      name: 'relatedKB',
      type: 'relationship',
      relationTo: 'kb-articles',
      hasMany: true,
      admin: {
        description: 'Related KB articles',
      },
    },
  ],
}
