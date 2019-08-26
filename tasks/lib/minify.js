'use strict';

const fs = require('fs');
const step = require('h5.step');
const uglify = require('uglify-es');

const {options, files} = require(process.argv[2]);

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

      fs.writeFile(file.dst, uglify.minify(input, options).code, this.next());
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
}
