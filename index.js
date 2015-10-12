#!/usr/bin/env node --harmony

'use strict'

const APP_NAME = 'bitly-client',
      BITLY_MAX_HISTORY_CHUNK = 100

var Bitly = require('bitly'),
    app = require('commander'),
    rc = require('rc')(APP_NAME),
    url = require('url'),
    read = require('read'),
    print = console.log.bind( console )

require('colors')

var domains = {
  default: [
    'bit.ly',
    'bitly.com',
    'j.mp'],
  extended: [
    'www.j.mp',
    'fb.me',
    'on.fb.me',
    'amzn.to',
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
    'on.fb.me',
    'on.mtv.com',
    'on.vh1.com',
    'oreil.ly',
    'politi.co',
    'tcrn.ch',
    'usat.ly',
    'wapo.st',
    'yhoo.it'
  ]
}

app
  .description( 'Access Bitly from the command line' )
  .option( '-v, --verbose', 'verbose output' )
  .option( '-c, --count <n>', 'limit results', parseCount, Infinity )
  .option( '--ask', 'ask for Bitly access token' )
  .option( '--domain [value]', 'preferred Bitly domain for shortening: ' + domains.default.join(', ') )
  .arguments( '[arg]' )
  .parse( process.argv )

var bitly,
    action = history,
    arg = app.args[0]

if( arg ) {
  if( checkURI( arg ) ) {
    let u = url.parse( arg )

    // If the URL is a Bitly URL, then make a request to expand it
    if( domains.default.indexOf( u.hostname ) !== -1 || domains.extended.indexOf( u.hostname ) !== -1 ) {
        action = function() { expand( arg ) }
    } else {
      action = function() { shorten( arg, app.domain ) }
    }
  } else
    action = function() { expand( arg ) }
}

getBitlyToken().then( key => {
  bitly = new Bitly( key )

  action()
} )

function checkURI( s ) {
  // URI validator by Diego Perini:
  //   https://gist.github.com/dperini/729294
  return /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i.test( s )
}

function parseCount( n ) {
  n = parseInt( n )

  // Clamp input to range [0..Infinity]
  return isNaN(n) ? Infinity : (n > 0 ? n : 0)
}

function preValidateToken( token ) {
  return typeof token === 'string' && token.length !== 0 && ( /^[0-9a-f]+$/ ).test( token )
}

function getBitlyToken() {
  return new Promise( function( resolve ) {
    if( app.ask || !preValidateToken( rc.key ) ) {
      print( "Please enter your Bitly access token." )
      print( "You can obtain your token from: " + "https://bitly.com/a/oauth_apps".yellow )
      print()

      read( { prompt: "Token: " }, function( err, key ) {
        print()
        print( "You can save your token to " + ("~/." + APP_NAME + "rc").yellow + " like this:" )
        print()
        print( ("{ \"key\": \"" + key + "\" }").yellow )
        print()

        resolve( key )
      } )
    } else
      resolve( rc.key )
  } )
}

function error( error ) {
  print( (error.toString() + " (code: " + error.code + ")").red )
  process.exit( 1 )
}

function expand( shortUrl ) {
  bitly.expand( shortUrl ).then( res => {
    let ret = res.data.expand[0]
    print( (ret.short_url ? ret.short_url.yellow + " > " : "") + ret.long_url.yellow )
  } ).catch( e => {
    error( e )
  } )
}

function shorten( longUrl, preferredDomain ) {
  bitly.shorten( longUrl, preferredDomain ).then( res => {
    print( res.data.url.yellow )
  } ).catch( e => {
    error( e )
  } )
}

function history( offset ) {
  offset = offset || 0
  let count = Math.min( app.count, BITLY_MAX_HISTORY_CHUNK )

  if( count !== 0 ) {
    app.count -= count

    bitly._doRequest( bitly._generateNiceUrl( { offset, limit: count }, 'user/link_history' ) ).then( res => {
      printHistory( res.data.link_history )

      if( offset + count < res.data.result_count )
        history( offset + count )
    } ).catch( e => {
      error( e )
    } )
  }
}

function printHistory( link_history ) {
  for( let item of link_history ) {
    //
    // Print short link and long URL
    //
    print( ':: ' +
      ((item.keyword_link === undefined) ? item.link : item.keyword_link).yellow +
      ' - ' + item.long_url.red )

    //
    // Print more details (if --verbose)
    //
    if( app.verbose ) {
      const INDENT = '     ';

      if( item.title !== "" )
        print( INDENT + item.title.replace(/(\r\n|\n|\r)/gm, "") )
      if( item.tags.length !== 0 )
        print( INDENT + 'Tags: '.red + item.tags.join(', ').yellow )

      print( INDENT + 'Created: '.red + new Date(item.created_at * 1000) + "\n" )
    }
  }
}