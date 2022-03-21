const lib = require('node-sundries');
const fs   = require('fs');
const yaml = require('js-yaml');
const merge = require('lodash.merge');

module.exports = {
  run(path) {
    const final = {};
    const files = lib.getFiles(path, false);
    console.log(files);
    const dirs = lib.getDirs(path, false);
    // files.forEach(file => {
    //   this.doFile(file);
    // });
    this.doFile(files[3]);
  },
  doFile(file) {
    const frontmatterJS = (lib.yamlFileToJs(file) || [])[0];
    fs.writeFileSync('./test.json', JSON.stringify(frontmatterJS, null, 2));
    const parseLevel = (obj, parents) => {
      const fields = [];
      for (const key in obj) {
        let type;
        if (Array.isArray(obj[key])) {
          type = 'list';
        } else if (obj[key] === null) {
          type = 'string';
        } else {
          type = typeof obj[key];
        }
        const field = {
          label: lib.capitaliseFirstChar(key.replace(/_/g, ' ')),
          name: key,
          widget: type,
          required: false
        };
        if (type === 'object') {
          field['fields'] = parseLevel(obj[key]);
        } else if (type === 'list') {
          const childPojos = obj[key].filter(item => lib.isPojo(item));
          if (childPojos.length) {
            const mergedObjects = childPojos.reduce((item, acc) => {
              return merge(item, acc);
            }, {});
         
            field['fields'] = parseLevel(mergedObjects);
          }
        }
        fields.push(field);
      }
      return fields;

    };
    const final = parseLevel(frontmatterJS);
    fs.writeFileSync('./out.json', JSON.stringify(final, null, 2));

  }
};