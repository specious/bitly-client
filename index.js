#!/usr/bin/env node --harmony

'use strict'

const APP_NAME = 'bitly-client'
const BITLY_MAX_HISTORY_CHUNK = 100

var Bitly = require('bitly'),
    app = require('commander'),
    readline = require('readline-sync'),
    rc = require('rc')(APP_NAME),
    print = console.log.bind( console )

require('colors')

app
  .description( 'Access Bitly from the command line' )
  .option( '-v, --verbose', 'verbose output' )
  .option( '-c, --count <n>', 'limit results', parseCount, Infinity )
  .parse( process.argv )

var key = rc.key

if( !preValidateToken( key ) ) {
  key = getBitlyToken()

  if( !preValidateToken( key ) )
    print( "Please check your token, it doesn't look valid.".red )
}

var bitly = new Bitly( key )
getLinkHistory()

function parseCount( n ) {
  n = parseInt( n )

  // Clamp input to range [0..Infinity]
  return isNaN(n) ? Infinity : (n > 0 ? n : 0)
}

function preValidateToken( token ) {
  return typeof token === 'string' && token.length !== 0 && ( /^[0-9a-f]+$/ ).test( token )
}

function getBitlyToken() {
  print( "Please enter your Bitly OAuth access token." )
  print( "You can obtain your token from: " + "https://bitly.com/a/oauth_apps".yellow )
  print()

  var key = readline.question( 'Token: ', { history: false } )

  print()
  print( "You can save your token to " + ("~/." + APP_NAME + "rc").yellow + " like this:" )
  print()
  print( ("{ \"key\": \"" + key + "\" }").yellow )
  print()

  return key
}

function getLinkHistory( offset ) {
  offset = offset || 0
  let count = Math.min( app.count, BITLY_MAX_HISTORY_CHUNK )

  if( count !== 0 ) {
    app.count -= count

    bitly._doRequest( bitly._generateNiceUrl( { offset, limit: count }, 'user/link_history' ) ).then( res => {
      printLinkHistory( res.data.link_history )

      if( offset + count < res.data.result_count )
        getLinkHistory( offset + count )
    } ).catch( err => {
      print( (err.toString() + " (code: " + err.code + ")").red )
    } )
  }
}

function printLinkHistory( link_history ) {
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