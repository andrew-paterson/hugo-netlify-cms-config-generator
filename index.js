const functions = require('./exports');
const path = '/home/paddy/development/luddite/content';

functions.run(path, {
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
  }]
});