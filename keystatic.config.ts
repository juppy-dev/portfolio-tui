import { config, fields, collection, singleton } from '@keystatic/core';

const links = fields.array(
  fields.object({
    label: fields.text({ label: 'Label' }),
    url: fields.text({ label: 'URL' }),
  }),
  { label: 'Links', itemLabel: (props) => props.fields.label.value }
);

const kvRows = fields.array(
  fields.object({
    key: fields.text({ label: 'Key' }),
    value: fields.text({ label: 'Value' }),
  }),
  {
    label: 'Rows',
    itemLabel: (props) => `${props.fields.key.value}: ${props.fields.value.value}`,
  }
);

export default config({
  storage: { kind: 'local' },
  singletons: {
    about: singleton({
      label: 'About',
      path: 'content/about',
      format: { data: 'yaml' },
      schema: {
        name: fields.text({ label: 'Name' }),
        intro: fields.text({ label: 'Intro', multiline: true }),
        links,
      },
    }),
    now: singleton({
      label: 'Now',
      path: 'content/now',
      format: { data: 'yaml' },
      schema: {
        art: fields.text({
          label: 'ASCII art',
          multiline: true,
          description: 'Rendered beside the rows, macchina-style. Leave empty for none.',
        }),
        artColor: fields.select({
          label: 'Art color',
          options: [
            { label: 'Accent', value: 'accent' },
            { label: 'Cyan', value: 'cyan' },
            { label: 'Violet', value: 'violet' },
            { label: 'Blue', value: 'blue' },
            { label: 'Green', value: 'green' },
            { label: 'Yellow', value: 'yellow' },
            { label: 'Red', value: 'red' },
          ],
          defaultValue: 'accent',
        }),
        rows: kvRows,
      },
    }),
    highlights: singleton({
      label: 'Highlights',
      path: 'content/highlights',
      format: { data: 'yaml' },
      schema: {
        items: fields.array(
          fields.object({
            text: fields.text({ label: 'Highlight' }),
            year: fields.text({ label: 'Year' }),
          }),
          { label: 'Highlights', itemLabel: (props) => props.fields.text.value }
        ),
      },
    }),
    tech: singleton({
      label: 'Tech',
      path: 'content/tech',
      format: { data: 'yaml' },
      schema: {
        groups: fields.array(
          fields.object({
            name: fields.text({ label: 'Group' }),
            items: fields.array(fields.text({ label: 'Item' }), {
              label: 'Items',
              itemLabel: (props) => props.value,
            }),
          }),
          { label: 'Groups', itemLabel: (props) => props.fields.name.value }
        ),
      },
    }),
    hero: singleton({
      label: 'Hero',
      path: 'content/hero',
      format: { data: 'yaml' },
      schema: {
        art: fields.text({ label: 'ASCII banner', multiline: true }),
        tagline: fields.text({ label: 'Tagline' }),
      },
    }),
    uses: singleton({
      label: 'Uses',
      path: 'content/uses',
      format: { data: 'yaml' },
      schema: {
        rows: kvRows,
      },
    }),
    vitals: singleton({
      label: 'Vitals',
      path: 'content/vitals',
      format: { data: 'yaml' },
      schema: {
        rows: kvRows,
        heatmapLabel: fields.text({ label: 'Heatmap label' }),
        heatmap: fields.array(
          fields.integer({ label: 'Intensity (0-4)', defaultValue: 0 }),
          { label: 'Heatmap weeks', itemLabel: (props) => String(props.value) }
        ),
      },
    }),
    processes: singleton({
      label: 'Processes (ps aux)',
      path: 'content/processes',
      format: { data: 'yaml' },
      schema: {
        items: fields.array(
          fields.object({
            name: fields.text({ label: 'Name' }),
            state: fields.select({
              label: 'State',
              options: [
                { label: 'running', value: 'running' },
                { label: 'sleeping', value: 'sleeping' },
                { label: 'zombie', value: 'zombie' },
              ],
              defaultValue: 'running',
            }),
            note: fields.text({ label: 'Note' }),
          }),
          { label: 'Processes', itemLabel: (props) => props.fields.name.value }
        ),
      },
    }),
  },
  collections: {
    projects: collection({
      label: 'Projects',
      slugField: 'name',
      path: 'content/projects/*',
      format: { data: 'yaml' },
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        blurb: fields.text({ label: 'One-line blurb' }),
        details: fields.text({ label: 'Details', multiline: true }),
        year: fields.text({ label: 'Year' }),
        links,
      },
    }),
    experience: collection({
      label: 'Experience',
      slugField: 'role',
      path: 'content/experience/*',
      format: { data: 'yaml' },
      schema: {
        role: fields.slug({ name: { label: 'Role' } }),
        company: fields.text({ label: 'Company' }),
        period: fields.text({ label: 'Period', description: 'e.g. 2023 — now' }),
        order: fields.integer({
          label: 'Sort order',
          description: 'Lower = listed first',
          defaultValue: 0,
        }),
        bullets: fields.array(fields.text({ label: 'Bullet' }), {
          label: 'Bullets',
          itemLabel: (props) => props.value,
        }),
      },
    }),
  },
});
