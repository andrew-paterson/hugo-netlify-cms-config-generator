const lib = require('node-sundries');
const fs   = require('fs');
const yaml = require('js-yaml');
const merge = require('lodash.merge');
const path = require('path');
const chalk = require('chalk');

module.exports = {
  run(opts) {
    try {
      opts.absoluteSourcePath = path.resolve(process.cwd(), ((opts.source || './content')));
      const files = lib.getFiles(opts.absoluteSourcePath, false);
      const dirs = lib.getDirs(opts.absoluteSourcePath, false);
      const collections = [{
        name: 'single-pages',
        label: 'Single pages',
        files: files.map(file => this.doFile(file, opts))
      }];
      dirs.forEach(dir => {
        const collection = {
          name: path.basename(dir),
          label: lib.capitaliseFirstChar(path.basename(dir).replace(/_/g, ' ').replace('-', ' ')),
          folder: `content/${path.basename(dir)}`,
        };
        const combinedFrontmatterJS = {};
        lib.getFiles(dir).forEach(file => {
          merge(combinedFrontmatterJS, this.getFrontMatter(file));
        });
        collection.fields = this.generateFieldsFromFrontmatter(combinedFrontmatterJS, opts, dir).concat(this.defaultFields(dir, opts));
        this.collectionTransforms(collection, opts);
        collections.push(collection);
      });
      const configFilePath = opts.configFilePath || './static/admin/config.yml';
      const configFileContents = lib.yamlFileToJs(configFilePath);
      configFileContents.collections = collections;
      fs.writeFileSync(configFilePath, yaml.dump(configFileContents, opts.jsYamlOptions));
      console.log(chalk.green(`${configFilePath} was updated successfully.`));
    } catch (err) {
      console.log(chalk.red(err));
    }
  },

  collectionTransforms(collection, opts) {
    const defaults = opts.collectionDefaults.filter(obj => {
      return (obj.paths || []).indexOf(collection.folder) > -1;
    });
    defaults.forEach(obj => {
      collection = merge(collection, obj.props);
    });
    for (const key in collection) {
      this.applyPropFunction(collection, key, [collection, opts]);
    }
  },

  applyPropFunction(obj, key, functionArgs) {
    if (typeof obj[key] === 'function') {
      const newValue = obj[key](...functionArgs);
      obj[key] = newValue;
    }
  },

  trim(str, char) {
    return str.split(char).filter(item => item.length).join(char);
  },

  filePathRelativeToSource(filePath, opts) {
    return this.trim(filePath.replace(opts.absoluteSourcePath, ''), '/');
  },

  filterByExcludeFilePaths(opts, objects, file) {
    return (objects || []).filter(object => {
      return (object.excludeFilePaths || []).indexOf(this.filePathRelativeToSource(file, opts)) < 0;
    });
  },

  defaultFields(file, opts) {
    return this.filterByExcludeFilePaths(opts, opts.defaultFields, file).map(defaultField => defaultField.field);
  },

  doFile(file, opts) {
    const frontmatterJS = this.getFrontMatter(file);
    const defaultFields = this.defaultFields(file, opts);
    const customLabel = (opts.fileLabels || []).find(item => item.filePath === this.filePathRelativeToSource(file, opts)) || {};
    // TODO custom label must be capable of being a function- so much everything else.
    return {
      label: customLabel.label || lib.capitaliseFirstChar(lib.basenameNoExt(file).replace(/[_-]/g, ' ')),
      name: lib.basenameNoExt(file),
      file: `/content/${path.basename(file)}`,
      fields: this.generateFieldsFromFrontmatter(frontmatterJS, opts, file).concat(defaultFields)
    };
  },

  generateFieldsFromFrontmatter(frontmatterJS, opts, file) {
    const parseLevel = (obj) => {
      const fields = [];
      for (const key in obj) {
        const omitKeys = this.filterByExcludeFilePaths(opts, opts.omitProps, file).map(item => item.propName);
        if (omitKeys.indexOf(key) > -1) {
          continue;
        }
        let widgetType;
        if (Array.isArray(obj[key])) {
          widgetType = 'list';
        } else if (obj[key] === null) {
          widgetType = 'string';
        } else {
          widgetType = typeof obj[key];
        }
        let field = {
          label: lib.capitaliseFirstChar(key.replace(/_/g, ' ')),
          name: key,
          widget: widgetType,
          required: false
        };
        const mergeFields = opts.mergeFields || [];
        const match  = mergeFields.find(item => item.fieldNames.indexOf(field.name) > -1);
       
        if (match) {
          field = merge(field, match.mergeData);
          for (const key in field) {
            this.applyPropFunction(field, key, [frontmatterJS, opts]);
          }
        }
        if (widgetType === 'object') {
          field['fields'] = parseLevel(obj[key]);
        } else if (widgetType === 'list') {
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
    return (lib.yamlToJs(frontMatter) || []);
  }
};