#!/usr/bin/env node

'use strict'

var manifest = require('./package.json'),
    { BitlyClient } = require('bitly'),
    app = require('commander'),
    rc = require('rc')(manifest.name),
    homedir = require('os').homedir(),
    url = require('url'),
    read = require('read'),
    print = console.log.bind( console )

require('colors')

const BITLY_MAX_HISTORY_CHUNK = 100

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
    'lat.ms',
    'ind.pn',
    'es.pn',
    'chn.ge',
    'engt.co',
    'bzfd.it',
    'shebpr.es',
    'pj.pizza',
    'b-gat.es',
    'm-gat.es',
    'theatln.tc',
    'go.nasa.gov',
    'red.ht',
    'wef.ch',
    'vz.to'
  ]
}

app
  .version( manifest.version )
  .description( 'Access Bitly from the command line' )
  .option( '-v, --verbose', 'verbose output' )
  .option( '-c, --count <n>', 'limit results', parseCount, Infinity )
  .option( '-<n>', 'limit results (same as --count <n>)' )
  .option( '-a, --archive', 'archive the following bitlink' )
  .option( '--key <key>', 'provide a Bitly access token', String )
  .option( '--ask', 'ask for Bitly access token (overrides --key)' )
  .option( '--save', 'save Bitly access token (use with --key or --ask)' )
  .option( '--domain <value>', 'preferred Bitly domain for shortening: ' + domains.default.join(', ') )
  .arguments( '[args]' )
  .allowUnknownOption()
  .parse( process.argv )

applyAltCount( app.rawArgs )

var bitly,
    action = history,
    arg0 = app.args[0]

if ( app.archive ) {
  if ( arg0 ) {
    action = archive
  } else {
    process.exit( 0 )
  }
} else if ( arg0 ) {
  action = expandOrShorten
}

getBitlyToken().then( key => {
  bitly = new BitlyClient( key )

  if ( arg0 ) {
    for( let i = 0; i < app.args.length; i++ )
      action( app.args[i] )
  } else {
    action()
  }
}, ( e ) => abort( e ) )

function warn( e ) {
  if ( e ) {
    if ( app.verbose )
      print( e.stack )
    else
      print( e.message + " " + ("(" + e.name + ")").red )
  }
}

function abort( e ) {
  warn( e )
  process.exit( 1 )
}

function isQualifiedURI( s ) {
  // Small but effective URI validator by Diego Perini:
  //   https://gist.github.com/dperini/729294
  return /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i.test( s )
}

function validateURI( s ) {
  if ( isQualifiedURI( s ) ) {
    return s
  } else {
    s = 'http://' + s

    if ( isQualifiedURI( s ) )
      return s
    else
      return null
  }
}

function parseCount( n ) {
  n = parseInt( n )

  // Clamp input to range [0..Infinity]
  return isNaN(n) ? Infinity : (n > 0 ? n : 0)
}

//
// Let last occurring -<n> arg override any passed --count
//
function applyAltCount( args ) {
  for( let i = args.length - 1; i >= 0; i-- ) {
    let arg = args[i], rest = arg.slice( 1 )

    if ( arg[0] === "-" && /^\d+$/.test( rest ) ) {
      app.count = parseInt( rest )
      break
    }
  }
}

function saveConfig( key ) {
  let fs = require('fs'),
      file = homedir + "/." + manifest.name + "rc"

  try {
    fs.writeFileSync( file, 'key = ' + key )
    print( "Key has been saved to: " + file.yellow )
  } catch( e ) {
    print( e.toString().red )
  }

  print()
}

//
// Brief sanity check (not full validation)
//
function preValidateToken( token ) {
  return typeof token === 'string' && token.length !== 0 && ( /^[0-9a-f]+$/ ).test( token )
}

function getBitlyToken() {
  return new Promise( function( resolve, reject ) {
    if ( app.ask || ( !app.key && !preValidateToken( rc.key ) ) ) {
      print( "Please enter your Bitly access token." )
      print( "You can obtain your token from: " + "https://bitly.com/a/oauth_apps".yellow )
      print()

      read( { prompt: "Token: " }, function( err, key ) {
        print()
        if ( key !== undefined ) {
          // Save the key if there isn't one saved already, or if --save option is passed
          if ( app.save || !rc.key )
            saveConfig( key )

          resolve( key )
        } else {
          reject()
        }
      } )
    } else if ( app.key ) {
      if ( !preValidateToken( app.key ) ) {
        reject( 'The authentication token you have provided does not appear to be valid' )
      } else {
        if ( app.save )
          saveConfig( app.key )

        resolve( app.key )
      }
    } else {
      resolve( rc.key )
    }
  } )
}

function makeHttps( url ) {
  return url.replace( /^http:/, "https:" )
}

function replaceDomain( url, desiredDomain ) {
  return url.replace( /:\/\/(.*?)\//, "://" + desiredDomain + "/" )
}

function normalizeLink( url ) {
  return app.domain
    ? makeHttps( replaceDomain( url, app.domain ) )
    : makeHttps( url )
}

function shortLinkFromKey( key ) {
  return "https://" + (app.domain || "bit.ly") + "/" + key
}

function expandOrShorten( arg ) {
  let uri = validateURI( arg )

  if ( uri ) {
    let u = url.parse( uri )

    // If the URL is a bitlink, then send a request to expand it
    if ( domains.default.indexOf( u.hostname ) !== -1 || domains.extended.indexOf( u.hostname ) !== -1 ) {
      expand( arg )
    } else {
      shorten( uri, app.domain )
    }
  } else
    expand( arg )
}

function expand( shortUrl ) {
  bitly.expand( shortUrl ).then( res => {
    let ret = res.expand[0]

    if ( ret.error ) {
      if ( ret.error === "NOT_FOUND" )
        print( shortUrl.grey + " is not yet a bitlink" )
      else
        warn( "error trying to expand " + shortUrl + ": " + ret.error )
    } else {
      print(
        ( ret.short_url
          ? normalizeLink( ret.short_url )
          : shortLinkFromKey( ret.hash )
        ).yellow + " > " + ret.long_url.yellow
      )
    }
  } ).catch( e => {
    warn( e )
  } )
}

function shorten( longUrl, preferredDomain ) {
  bitly.shorten( longUrl, preferredDomain ).then( res => {
    print( makeHttps( res.url ).yellow + " (" + longUrl.grey + ")" )
  } ).catch( e => {
    warn( e )
  } )
}

function archive( shortUrl ) {
  if ( !validateURI( shortUrl ) )
    shortUrl = shortLinkFromKey( shortUrl )

  bitly.bitlyRequest(
    'user/link_edit',
    {
      link: shortUrl,
      edit: 'archived',
      archived: 'true'
    }
  ).then( res => {
    print( 'Archived: ' + res.link_edit.link.yellow )
  } ).catch( e => {
    switch( e.code ) {
      case 400: // INVALID_ARG_LINK, which really means it exists but it's not yours
        warn( shortUrl + " is not your bitlink" )
        break
      case 404: // NOT_FOUND
        warn( shortUrl + " is not yet a bitlink" )
        break
      default:
        abort( e )
    }
  } )
}

function history( offset ) {
  offset = offset || 0
  let count = Math.min( app.count, BITLY_MAX_HISTORY_CHUNK )

  if ( count !== 0 ) {
    app.count -= count

    bitly.bitlyRequest(
      'user/link_history',
      {
        offset,
        limit: count
      }
    ).then( res => {
      printHistory( res.link_history )

      if ( offset + count < res.result_count )
        history( offset + count )
    } ).catch( e => {
      abort( e )
    } )
  }
}

function printHistory( link_history ) {
  for ( let item of link_history ) {
    // Print bitlink followed by original URL
    print(
      ( (item.keyword_link === undefined)
        ? normalizeLink( item.link ).yellow         // item.link is a default named bitlink, e.g. https://j.mp/2p8n9WY
        : normalizeLink( item.keyword_link ).yellow // item.keyword_link is a customized bitlink, like: https://j.mp/a
      ) +' > ' + item.long_url.red )

    // Print additional details (if "--verbose")
    if ( app.verbose ) {
      const INDENT = '     '

      if ( item.title !== "" )
        print( INDENT + item.title.replace( /(\r\n|\n|\r)/gm, "") )
      if ( item.tags.length !== 0 )
        print( INDENT + 'Tags: '.red + item.tags.join(', ').yellow )

      print( INDENT + 'Created: '.red + new Date(item.created_at * 1000) + "\n" )
    }
  }
}