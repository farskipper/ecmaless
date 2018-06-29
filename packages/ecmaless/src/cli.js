var _ = require('lodash')
var fs = require('fs')
var main = require('./')
var path = require('path')
var btoa = require('btoa')
var chalk = require('chalk')
var escodegen = require('escodegen')
var excerptAtLineCol = require('excerpt-at-line-col')

var basePath = process.cwd()

var printErr = function (err) {
  if (err.ecmaless && err.ecmaless.loc && err.ecmaless.loc.source) {
    fs.readFile(err.ecmaless.loc.source, 'utf-8', function (ferr, src) {
      if (ferr) {
        printErr(ferr)
        return
      }

      var startloc = err.ecmaless.loc.start
      var excerpt = excerptAtLineCol(src, startloc.line - 1, startloc.column, 0)
      var fileinfo = path.relative(basePath, err.ecmaless.loc.source) +
                ' ' + err.ecmaless.loc.start.line +
                ':' + err.ecmaless.loc.start.column +
                ',' + err.ecmaless.loc.end.line +
                ':' + err.ecmaless.loc.end.column

      console.error(chalk.red(err + ''))
      console.error()
      console.error(excerpt)
      console.error(chalk.dim(fileinfo))
    })
    return
  }
  console.error(chalk.red(err + ''))
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

  main({
    start_path: path.resolve(basePath, args._[0]),
    loadPath: function (path, callback) {
      fs.readFile(path, 'utf-8', callback)
    }
  }, function (err, est) {
    if (err) {
      printErr(err)
      return
    }

    var out = escodegen.generate(est, {
      sourceMap: true,
      sourceMapRoot: basePath,
      sourceMapWithCode: true
    })

    var code = out.code
    var map = JSON.parse(out.map.toString())
    map.sources = map.sources.map(function (source) {
      return path.relative(map.sourceRoot, source)
    })
    delete map.sourceRoot
    code += '\n//# sourceMappingURL=data:application/json;base64,' +
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
