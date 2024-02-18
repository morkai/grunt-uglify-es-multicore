'use strict';

const fs = require('fs');
const zlib = require('zlib');
const step = require('h5.step');
const uglify = require('uglify-es');

const {options, files} = require(process.argv[2]);
let brotliOptions = null;

if (options.brotli)
{
  brotliOptions = options.brotli;
  delete options.brotli;
}

step(
  function()
  {
    for (let i = 0; i < 4; ++i)
    {
      processNext(this.group());
    }
  },
  function(err)
  {
    fs.unlinkSync(process.argv[2]);

    if (err)
    {
      throw err;
    }
  }
);

function processNext(done)
{
  if (files.length === 0)
  {
    return done();
  }

  const file = files.shift();

  step(
    function()
    {
      fs.readFile(file.src, 'utf8', this.next());
    },
    function(err, code)
    {
      if (err)
      {
        return this.skip(err);
      }

      const input = {
        [file.src]: code
      };

      const result = uglify.minify(input, options);

      if (result.error)
      {
        return this.skip(result.error);
      }

      fs.writeFile(file.dst, result.code, this.parallel());

      if (brotliOptions && !brotliOptions?.skipFiles[file.dst])
      {
        compress(`${file.dst}.br`, result.code, brotliOptions);
      }
    },
    function(err)
    {
      if (err)
      {
        done(err);
      }
      else
      {
        processNext(done);
      }
    }
  );

  function compress(dst, uncompressed, options)
  {
    step(
      function()
      {
        zlib.brotliCompress(uncompressed, options, this.next());
      },
      function(err, compressed)
      {
        if (err)
        {
          return this.skip(err);
        }

        fs.writeFile(dst, compressed, this.next());
      },
      function(err)
      {
        if (err)
        {
          throw err;
        }
      }
    );
  }
}
