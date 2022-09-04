const functions = require('./exports');
const source = '/home/paddy/development/luddite/content';
const dest = './trash/out.yml';
const jsYamlOptions = {
  noRefs: true
};

functions.run({
  source: source,
  dest: dest,
  jsYamlOptions: jsYamlOptions || {},
  keyMappings: [{
    keys: ['date', 'publishdate'],
    field: {
      widget: 'datetime',
      date_format: 'YYYY-MM-DD',
      time_format: 'HH:mm:ss',
      format: 'YYYY-MM-DD',
    }
  }, {
    keys: ['cover_image'],
    field: {
      name: 'cover_image',
      widget: 'image',
      required: true,
      media_folder: '/static/media/images/wines',
      public_folder: '/media/images/wines'
    }
  }, {
    keys: ['type'],
    field: {
      name: 'type',
      widget: 'hidden',
      default: function(frontMatter, opts) {
        return frontMatter.type;
      }
    }
  }],
  defaultFields: [{
    field: {
      name: 'body',
      label: 'Body',
      widget: 'markdown'
    }, 
    exclude: ['importers']
  }],
  collectionDefaults: [{
    paths: ['content/blog'],
    props: {
      create: true,
      slug: '{{year}}-{{month}}-{{day}}-{{slug}}',
      filter: function(collection, opts) {
        return `{field: type, value: ${collection.name}}`;
      }
    }
  }]
});