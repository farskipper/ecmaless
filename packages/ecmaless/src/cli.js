var _ = require('lodash')
var fs = require('fs')
var main = require('./')
var path = require('path')
var btoa = require('btoa')
var chalk = require('chalk')
var astring = require('astring')
var EStreeLoc = require('estree-loc')
var SourceMapGenerator = require('source-map').SourceMapGenerator

var basePath = process.cwd()

var exrpt = function (src, loc) {
  var around = 3

  var pad = (function () {
    var padL = ((loc.end.line + around) + '').length
    return function (n) {
      return _.padStart(n + '', padL, ' ')
    }
  }())
  var inHl = false

  var out = ''
  var lines = src.split('\n')
  var i = Math.max(0, loc.start.line - around - 1)
  while (i < Math.min(lines.length, loc.end.line + around)) {
    var lineN = i + 1
    var line = lines[i]
    i++
    out += chalk.gray(pad(lineN) + '|')
    if (lineN === loc.start.line) {
      inHl = true
      out += line.substring(0, loc.start.column)
      if (loc.end.line === loc.start.line) {
        out += chalk.bgRed(line.substring(loc.start.column, loc.end.column))
        out += line.substring(loc.end.column)
        inHl = false
      } else {
        out += chalk.bgRed(line.substring(loc.start.column))
      }
    } else if (inHl) {
      if (lineN === loc.end.line) {
        out += chalk.bgRed(line.substring(0, loc.end.column))
        out += line.substring(loc.end.column)
        inHl = false
      } else {
        out += chalk.bgRed(line)
      }
    } else {
      out += line
    }
    out += '\n'
  }

  return out
}

var printErr = function (err) {
  if (err &&
    err.type === 'Error' &&
    typeof err.message === 'string' &&
    err.loc &&
    typeof err.loc.src === 'string' &&
    typeof err.loc.file === 'string'
  ) {
    var toLoc = EStreeLoc(err.loc.src, err.loc.file)
    // {type:'Error', loc, message: String}
    var loc = toLoc(err.loc.start, err.loc.end)

    var fileinfo = path.relative(basePath, loc.source) +
                ' ' + loc.start.line +
                ':' + loc.start.column +
                ',' + loc.end.line +
                ':' + loc.end.column
    console.error(chalk.grey(fileinfo))
    console.error()
    console.error(exrpt(err.loc.src, loc))
    console.error()
    console.error(chalk.red(err.message))
    return
  }
  console.error(chalk.red(JSON.stringify(err)))
}

function runCli () {
  if (args.help) {
    console.log('')
    console.log('Usage:')
    console.log('')
    console.log('    ecmaless [options] <path>')
    console.log('')
    console.log('Options:')
    console.log('    -v, --version        print ecmaless version')
    console.log('    -h, --help           show this message')
    console.log('    -o, --out            instead of running write the compiled javascript to stdout')
    console.log('')
    return
  }
  if (args.version) {
    console.log(require('../package.json').version)
    return
  }

  if (_.size(args._) === 0) {
    printErr('ERROR missing file path')
    return
  } else if (_.size(args._) > 1) {
    printErr('ERROR too many file paths given: ' + args._.join(' '))
    return
  }

  var startPath = path.resolve(basePath, args._[0])

  main({
    base: basePath,
    startPath: startPath,
    loadPath: function (path, callback) {
      fs.readFile(path, 'utf-8', callback)
    }
  }, function (err, est) {
    if (err) {
      printErr(err)
      return
    }

    var map = new SourceMapGenerator({
      file: path.basename(startPath),
      sourceRoot: basePath
    })

    var code = astring.generate(est, {sourceMap: map})

    map = JSON.parse(map.toString())
    map.sources = map.sources.map(function (source) {
      return path.relative(map.sourceRoot, source)
    })
    delete map.sourceRoot
    code += '//# sourceMappingURL=data:application/json;base64,' +
        btoa(JSON.stringify(map)) +
        '\n'

    if (args.out) {
      process.stdout.write(code)
    } else {
      eval(code)//eslint-disable-line
    }
  })
}

// parse the CLI args
var args = require('minimist')(process.argv.slice(2), {
  'boolean': [
    'help',
    'version',
    'out'
  ],
  'alias': {
    'help': 'h',
    'version': 'v',
    'out': 'o'
  }
})
runCli(args)
