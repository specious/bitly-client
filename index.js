#!/usr/bin/env node

'use strict'

const manifest = require('./package.json')
const app = require('commander')
const rc = require('rc')(manifest.name)
const homedir = require('os').homedir()
const readline = require('readline')
const { promisify }= require('util')
const url = require('url')
const print = console.log.bind(console)
const c = require('ansi-colors')

const fetch = (...args) => import('node-fetch').then(
  ({default: fetch}) => fetch(...args)
)

const indent = (...args) => { console.log("  ", ...args) }

var domains = {
  default: [
    'bit.ly',
    'bitly.com',
    'j.mp'
  ],
  extended: [
    'www.j.mp',
    'bitly.is',
    'on.fb.me',
    'amzn.to',
    'ebay.to',
    'apple.co',
    'urls.im',
    'aol.it',
    'atmlb.com',
    'bbc.in',
    'bhpho.to',
    'binged.it',
    'bloom.bg',
    'buff.ly',
    'cnet.co',
    'huff.to',
    'lat.ms',
    'nyr.kr',
    'nyti.ms',
    'n.pr',
    'pep.si',
    'win.gs',
    'pdora.co',
    'on.fb.me',
    'on.mtv.com',
    'on.vh1.com',
    'on.msnbc.com',
    'on.mash.to',
    'oreil.ly',
    'che.gg',
    'cs.pn',
    'politi.co',
    'tcrn.ch',
    'usat.ly',
    'wapo.st',
    'yhoo.it',
    '4sq.com',
    'abcn.ws',
    'wapo.st',
    'abt.cm',
    'lat.ms',
    'ind.pn',
    'es.pn',
    'chn.ge',
    'engt.co',
    'bzfd.it',
    'shebpr.es',
    'sforce.co',
    'pj.pizza',
    'b-gat.es',
    'm-gat.es',
    'theatln.tc',
    'go.nasa.gov',
    '1.usa.gov',
    'red.ht',
    'wef.ch',
    'vz.to'
  ]
}

app
  .version(manifest.version)
  .description('Use Bitly from the command line')
  .option('-c, --count <n>', 'limit results', parseCount, Infinity)
  .option('-<n>', 'limit results (same as --count <n>)')
  .option('-a, --archive', 'archive the following bitlink')
  .option('--key <key>', 'provide a Bitly access token', String)
  .option('--ask', 'ask for Bitly access token (overrides --key)')
  .option('--save', 'save Bitly access token (use with --key or --ask)')
  .option('--domain <value>', 'preferred Bitly domain for shortening: ' + domains.default.join(', '))
  .option('-v, --verbose', 'verbose output')
  .option('--raw', 'raw output')
  .arguments('[args...]')
  .allowUnknownOption()
  .parse(process.argv)

let accessToken,
    action = history,
    opts = app.opts(),
    args = findCountValue(app.args)

//
// Which action are we taking
//
if (opts.archive) {
  if (args[0]) {
    action = archive
  } else {
    process.exit(0)
  }
} else if (args[0]) {
  action = expandOrShorten
}

;(async () => {
  try {
    accessToken = await getAccessToken()
  } catch (e) { abort(e) }

  try {
    if (args[0]) {
      for (let i = 0; i < args.length; i++)
        await action(args[i])
    } else {
      await action()
    }
  } catch(e) { error(e) }
})()

function abort(msg) {
  print(c.red(msg))
  process.exit(1)
}

function error(code) {
  abort('Bitly service returned: ' + code)
}

function parseCount(n) {
  n = parseInt(n)

  // Constrain count argument to non-negative values
  return isNaN(n) ? Infinity : (n > 0 ? n : 0)
}

//
// Let last occurring -<n> arg override any passed --count
//
function findCountValue(args) {
  for (let i = args.length - 1; i >= 0; i--) {
    let arg = args[i], rest = arg.slice(1)

    if (arg[0] === "-" && /^\d+$/.test(rest)) {
      opts.count = parseInt(rest)
      args.splice(i, 1)
      return args
    }
  }

  return args
}

async function getAccessToken() {
  if (opts.ask || (!opts.key && !tokenLooksRealistic(rc.key))) {
    print("Please enter your Bitly access token.")
    print("Get an API access token here:", c.yellow("https://app.bitly.com/settings/api/"))
    print()

    let prompt = readline.createInterface({ input: process.stdin, output: process.stdout })

    prompt.question[promisify.custom] = (question) => {
      return new Promise(
        resolve => prompt.question(question, resolve)
      )
    }

    let key = (await promisify(prompt.question)("Access token: ")).trim()
    prompt.close()
    print()

    if (tokenLooksRealistic(key)) {
      // Save the key if there isn't one saved already or if --save option is passed
      if (opts.save || !rc.key)
        saveConfig(key)

      return key
    } else {
      throw "Invalid access token"
    }
  } else if (opts.key) {
    if (!tokenLooksRealistic(opts.key)) {
      throw 'The access token you have provided does not appear to be valid'
    } else {
      if (opts.save)
        saveConfig(opts.key)

      return opts.key
    }
  } else {
    return rc.key
  }
}

function tokenLooksRealistic(token) {
  // Quick check if API access token looks realistic (not full validation)
  return typeof token === 'string' && /^[\da-f]+$/.test(token)
}

function saveConfig(key) {
  let fs = require('fs'),
      file = homedir + "/." + manifest.name + "rc"

  try {
    fs.writeFileSync(file, 'key = ' + key)
    print("Access token has been saved to: " + c.yellow(file))
  } catch(e) {
    print(c.red(e))
  }

  print()
}

async function request(method, endpoint, data) {
  let res

  try {
    res = await fetch(
      'https://api-ssl.bitly.com/v4/' + endpoint, {
        method,
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        },
        body: data ? JSON.stringify(data) : undefined
      }
    )
  } catch(e) { abort(e) }

  if (res.status >= 300)
    throw res.status

  try {
    res = await res.json()
  } catch(e) { error(e) }

  return res
}

function printItem(item) {
  if (opts.raw) {
    print(item)
    return
  }

  print(
    c.yellow(
      normalizeBitlink((item.custom_bitlinks && item.custom_bitlinks[0]) || item.link)
    ) + ' > ' + c.red(item.long_url)
  )

  if (opts.verbose) {
    if (item.title && item.title !== '')
      indent('Title:', item.title.replace(/(\r\n|\n|\r)/gm, ""))

    if (item.tags && item.tags.length !== 0)
      indent('Tags:', item.tags.join(', '))

    if (item.created_at)
      indent('Created:', new Date(item.created_at), "\n")
  }
}

async function expandOrShorten(arg) {
  let argUrl = makeValidURL(arg)

  if (argUrl) {
    let parts = url.parse(argUrl)

    if (isBitlyDomain(parts.hostname)) {
      await expand(parts.pathname.slice(1))
    } else {
      await shorten(argUrl, opts.domain)
    }
  } else {
    await expand(arg)
  }
}

async function expand(slug) {
  try {
    printItem(
      await request('GET', 'bitlinks/bit.ly/' + slug)
    )
  } catch(e) {
    switch (e) {
      case 404:
        print(c.grey(slugToBitlink(slug)) + " is not a bitlink")
        break
      case 403:
        // The bitlink belongs to someone else, so expand it a different way
        try {
          await expandManually(slug)
        } catch(e) { abort(e) }
    }
  }
}

async function expandManually(slug) {
  let link = slugToBitlink(slug)
  let res

  try {
    res = await fetch(
      link, {
        method: 'HEAD'
      }
    )
  } catch(e) { abort(e) }

  printItem({
    link,
    long_url: res.url
  })
}

async function shorten(longUrl, preferredDomain) {
  let item = await request("POST", 'bitlinks', {
    domain: preferredDomain,
    long_url: longUrl
  })

  if (opts.raw)
    print(item)
  else
    print(c.yellow(makeHttps(item.link)), "(" + c.grey(item.long_url) + ")")
}

async function archive(arg) {
  if (isURL(arg)) {
    let parts = url.parse(arg)

    if (!isBitlyDomain(parts.hostname))
      abort(parts.hostname + ' is not a Bitly domain')

    arg = parts.pathname.substr(1)
  }

  try {
    let item = await request('PATCH', 'bitlinks/bit.ly/' + arg, {
      edit: 'archived',
      archived: true
    })

    if (opts.raw)
      print(item)
    else
      print('Archived: ' + c.yellow(makeHttps(item.link)))
  } catch(e) {
    if (e === 403)
      print(c.gray(arg) + " is not your bitlink")
    else if (e === 404)
      print(c.gray(arg) + " is not a bitlink")
  }
}

async function history(groupId, page) {
  const maxItems = 100

  let num = Math.min(opts.count, maxItems)
  opts.count -= num

  let results

  if (!page) {
    let user = await request('GET', 'user')

    groupId = user.default_group_guid
    page = 1

    results = await request('GET', `groups/${groupId}/bitlinks?size=${num}`)
  } else
    results = await request('GET', `groups/${groupId}/bitlinks?page=${page}&size=${num}`)

  results.links.forEach(
    item => {
      printItem(item)
    }
  )

  if (opts.count > 0 && results.pagination.next !== '')
    history(groupId, page + 1)
}

function isBitlyDomain(domain) {
  return domains.default.includes(domain) || domains.extended.includes(domain)
}

function slugToBitlink(slug) {
  return "https://" + (opts.domain || "bit.ly") + "/" + slug
}

function normalizeBitlink(url) {
  return opts.domain
    ? makeHttps(replaceDomain(url, opts.domain))
    : makeHttps(url)
}

function replaceDomain(url, desiredDomain) {
  return url.replace(/:\/\/(.*?)\//, "://" + desiredDomain + "/")
}

function makeHttps(url) {
  return url.replace(/^http:/, "https:")
}

function makeValidURL(s) {
  if (isURL(s)) {
    return s
  } else {
    s = 'https://' + s

    return isURL(s) ? s : null
  }
}

function isURL(s) {
  // Small but effective URI validator by Diego Perini:
  //   https://gist.github.com/dperini/729294
  return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u00a1-\uffff][a-z0-9\u00a1-\uffff_-]{0,62})?[a-z0-9\u00a1-\uffff]\.)+(?:[a-z\u00a1-\uffff]{2,}\.?))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(s)
}