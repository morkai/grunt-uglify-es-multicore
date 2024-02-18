'use strict';

const {join} = require('path');
const {writeFile, stat} = require('fs');
const {execFile} = require('child_process');
const {cpus, tmpdir} = require('os');
const step = require('h5.step');
const chalk = require('chalk');
const coreCount = cpus().length;

module.exports = function(grunt)
{
  grunt.registerMultiTask('uglify', 'Minify files with UglifyJS.', function()
  {
    const startTime = Date.now();
    const done = this.async();
    const files = this.files;
    const totalCount = files.length;
    const processCount = Math.floor(coreCount / 2);
    const options = this.options();

    grunt.log.write(`Found ${hl(totalCount)} files... `);

    step(
      function()
      {
        grunt.log.write(`stat... `);

        files.forEach(file =>
        {
          stat(file.src[0], this.group());
        });
      },
      function(err, stats)
      {
        if (err)
        {
          return this.skip(err);
        }

        grunt.log.write(`sort... `);

        const remainingFiles = files.map((file, i) =>
        {
          return {
            file: {src: file.src[0], dst: file.dest},
            size: stats[i].size
          };
        });

        remainingFiles.sort((a, b) => b.size - a.size);

        const chunks = [];

        for (let i = 0; i < processCount; ++i)
        {
          chunks.push({
            size: 0,
            files: []
          });
        }

        for (let i = 0; i < remainingFiles.length; ++i)
        {
          chunks.sort((a, b) => a.size - b.size);

          chunks[0].size += remainingFiles[i].size;
          chunks[0].files.push(remainingFiles[i].file);
        }

        grunt.log.writeln(`minifying x${hl(processCount)}...`);

        for (let i = 0; i < processCount; ++i)
        {
          minify(i, chunks[i].files, options, this.group());
        }
      },
      function(err)
      {
        if (!err)
        {
          grunt.log.ok(`Completed in ${hl((Date.now() - startTime) / 1000)}s!`)
        }

        done(err);
      }
    );
  });

  function hl(n)
  {
    return chalk.cyan(n.toString());
  }

  function minify(i, files, options, done)
  {
    grunt.log.writeln(`${hl(i + 1)} started (${hl(files.length)} files)...`);

    const optionsFile = join(tmpdir(), `grunt-uglify-es-multicore__${Date.now()}__${i}.json`);

    step(
      function()
      {
        writeFile(optionsFile, JSON.stringify({options, files}), this.next());
      },
      function(err)
      {
        if (err)
        {
          return this.skip(err);
        }

        execFile(process.execPath, [`${__dirname}/lib/minify.js`, optionsFile], this.next());
      },
      function(err)
      {
        grunt.log.writeln(`${hl(i + 1)} completed!`);

        done(err);
      }
    );
  }
};
