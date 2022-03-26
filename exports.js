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
    dirs.forEach(dir => {
      const collection = {
        name: path.basename(dir),
        label: lib.capitaliseFirstChar(path.basename(dir).replace(/_/g, ' ').replace('-', ' ')),
        folder: `content/${path.basename(dir)}`,
        create: true,
        slug: '{{year}}-{{month}}-{{day}}-{{slug}}',
        filter: `{field: type, value: ${dir}}`
      };
      const combinedFrontmatterJS = {};
      lib.getFiles(dir).forEach(file => {
        merge(combinedFrontmatterJS, this.getFrontMatter(file));
      });
      collection.fields = this.generateFieldsFromFrontmatter(combinedFrontmatterJS, opts).concat(this.defaultFields(dir, opts));
      final.collections.push(collection);
    });
    fs.writeFileSync('./trash/out.json', JSON.stringify(final, null, 2));
  },

  defaultFields(file, opts) {
    return (opts.defaultFields || []).filter(defaultField => {
      return (defaultField.exclude || []).indexOf(path.basename(file, '.md'));
    }).map(defaultField => defaultField.field);
  },

  doFile(file, opts) {
    const frontmatterJS = this.getFrontMatter(file);
    const defaultFields = this.defaultFields(file, opts);
    return {
      label: lib.capitaliseFirstChar(lib.basenameNoExt(file).replace(/_/g, ' ')),
      name: lib.basenameNoExt(file),
      file: `/content/${path.basename(file)}`,
      fields: this.generateFieldsFromFrontmatter(frontmatterJS, opts).concat(defaultFields)
    };
  },

  generateFieldsFromFrontmatter(frontmatterJS, opts) {
    const parseLevel = (obj) => {
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
          const matchField = match.field;
          for (const key in matchField) {
            if (typeof matchField[key] === 'function') {
              console.log(key);
              const newValue = matchField[key](field.name, opts);
              matchField[key] = newValue;
            }
          }

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
    return parseLevel(frontmatterJS);
  },

  getFrontMatter(file) {
    const fileContents = fs.readFileSync(file, 'utf8');
    const firstLine = fileContents.split(/\r?\n/)[0].trim();    
    const frontMatter = fileContents.split(firstLine)[1];
    return (lib.yamlToJs(frontMatter) || [])[0];
  }
};