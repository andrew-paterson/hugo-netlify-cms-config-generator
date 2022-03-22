const lib = require('node-sundries');
const fs   = require('fs');
const yaml = require('js-yaml');
const merge = require('lodash.merge');
const path = require('path');

module.exports = {
  run(contentDirPath, opts) {
    const files = lib.getFiles(contentDirPath, false);
    const dirs = lib.getDirs(contentDirPath, false);
    const final = {
      collections: [
        {
          name: 'single-pages',
          label: 'Single pages',
          files: files.map(file => this.doFile(file, opts))
        }
      ]
    };
    fs.writeFileSync('./trash/out.json', JSON.stringify(final, null, 2));

  },
  doFile(file, opts) {
    const fileContents = fs.readFileSync(file, 'utf8');
    const firstLine = fileContents.split(/\r?\n/)[0].trim();    
    const frontMatter = fileContents.split(firstLine)[1];
    const frontmatterJS = (lib.yamlToJs(frontMatter) || [])[0];
    fs.writeFileSync('./trash/frontmatter.json', JSON.stringify(frontmatterJS, null, 2));
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
        let field = {
          label: lib.capitaliseFirstChar(key.replace(/_/g, ' ')),
          name: key,
          widget: type,
          required: false
        };

        const keyMappings = opts.keyMappings || [];
        const match  = keyMappings.find(item => item.keys.indexOf(field.name) > -1);
        if (match) {
          field = merge(field, match.field);
        }

        if (type === 'object') {
          field['fields'] = parseLevel(obj[key]);
        } else if (type === 'list') {
          const childPojos = obj[key].filter(item => lib.isPojo(item));
          if (childPojos.length) {
            field.summary = '{{fields.name}}';
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
    return {
      label: lib.capitaliseFirstChar(lib.basenameNoExt(file).replace(/_/g, ' ')),
      name: lib.basenameNoExt(file),
      file: `/content/${path.basename(file)}`,
      fields: parseLevel(frontmatterJS)
    };
  }
};